#!/usr/bin/env node
/**
 * Pilot push-notification relay.
 *
 * Subscribes to a single OpenCode server's /event SSE stream and forwards
 * notification-worthy events (session.idle, permission.requested, session.error)
 * to one or more Expo push tokens.
 *
 * Configuration is read from environment variables:
 *
 *   OPENCODE_URL              Required. e.g. http://127.0.0.1:4096
 *   OPENCODE_USERNAME         Optional Basic Auth user
 *   OPENCODE_PASSWORD         Optional Basic Auth password
 *   PILOT_TOKENS              Required. Comma-separated Expo push tokens
 *                             (ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]).
 *   PILOT_TOKENS_FILE         Optional. Path to a file containing tokens
 *                             one per line (ignored if PILOT_TOKENS is set).
 *   PILOT_RELAY_NAME          Optional friendly name shown in notifications.
 *                             Defaults to "opencode".
 *
 * Run as a long-lived process (systemd unit included alongside this file).
 */

import { Expo } from 'expo-server-sdk';
import EventSource from 'eventsource';
import fs from 'node:fs';

const URL = process.env.OPENCODE_URL;
const USER = process.env.OPENCODE_USERNAME;
const PASS = process.env.OPENCODE_PASSWORD;
const NAME = process.env.PILOT_RELAY_NAME || 'opencode';

if (!URL) {
  console.error('OPENCODE_URL is required');
  process.exit(1);
}

let tokens = (process.env.PILOT_TOKENS || '')
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean);

if (tokens.length === 0 && process.env.PILOT_TOKENS_FILE) {
  try {
    tokens = fs
      .readFileSync(process.env.PILOT_TOKENS_FILE, 'utf8')
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);
  } catch (e) {
    console.error('Could not read PILOT_TOKENS_FILE:', e.message);
  }
}

if (tokens.length === 0) {
  console.error('No push tokens configured. Set PILOT_TOKENS or PILOT_TOKENS_FILE.');
  process.exit(1);
}

const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));
if (validTokens.length !== tokens.length) {
  console.warn(`Ignoring ${tokens.length - validTokens.length} invalid token(s).`);
}
if (validTokens.length === 0) {
  console.error('No valid Expo push tokens after filtering.');
  process.exit(1);
}

const expo = new Expo();

function authHeaders() {
  if (!USER && !PASS) return {};
  const b64 = Buffer.from(`${USER ?? 'opencode'}:${PASS ?? ''}`).toString('base64');
  return { Authorization: `Basic ${b64}` };
}

async function send(title, body, data, categoryId) {
  const messages = validTokens.map((to) => ({
    to,
    sound: 'default',
    title,
    body,
    data,
    ...(categoryId ? { categoryId } : {}),
  }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (const t of tickets) {
        if (t.status === 'error') {
          console.warn('push error:', t.message, t.details);
        }
      }
    } catch (e) {
      console.error('failed to send chunk:', e.message);
    }
  }
}

const lastTitleBySession = new Map();

function handleEvent(evt) {
  const t = evt.type;
  const p = evt.properties || {};
  const sessionID = p.sessionID;
  // Cache session.updated titles so we can include them in notifications.
  if (t === 'session.updated' && p.info) {
    lastTitleBySession.set(p.info.id, p.info.title);
    return;
  }
  if (!sessionID) return;
  const title = lastTitleBySession.get(sessionID) || 'session';

  if (t === 'session.idle') {
    send(`${NAME}: idle`, title, { sessionID });
  } else if (t === 'session.error') {
    send(`${NAME}: error`, title, { sessionID });
  } else if (t === 'permission.requested') {
    const what = p.title || 'permission requested';
    send(`${NAME}: permission`, `${title} — ${what}`, { sessionID, permissionID: p.id }, 'PILOT_PERMISSION');
  }
}

let backoffMs = 1000;
const maxBackoffMs = 30_000;

function connect() {
  const url = `${URL.replace(/\/$/, '')}/event`;
  console.log(`[pilot-relay] connecting to ${url}`);
  const es = new EventSource(url, { headers: authHeaders() });

  es.onopen = () => {
    console.log('[pilot-relay] connected');
    backoffMs = 1000;
  };

  es.onmessage = (msg) => {
    if (!msg.data) return;
    try {
      const evt = JSON.parse(msg.data);
      handleEvent(evt);
    } catch (e) {
      console.warn('bad event:', e.message);
    }
  };

  es.onerror = (err) => {
    console.warn('[pilot-relay] sse error, reconnecting in', backoffMs, 'ms', err?.message ?? '');
    es.close();
    setTimeout(connect, backoffMs);
    backoffMs = Math.min(backoffMs * 2, maxBackoffMs);
  };
}

connect();

process.on('SIGINT', () => {
  console.log('[pilot-relay] shutting down');
  process.exit(0);
});
