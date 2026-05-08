import { useCallback, useEffect, useMemo } from 'react';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { TopBar } from '@/components/tui/TopBar';
import { MessageStream } from '@/components/tui/MessageStream';
import { PromptInput } from '@/components/tui/PromptInput';
import { StatusBar } from '@/components/tui/StatusBar';
import { useServerStore } from '@/store/server';
import { useSessionStore } from '@/store/session';
import { useUIStore } from '@/store/ui';
import { useEventStream } from '@/services/sse';
import { OpencodeClient } from '@/services/api';
import type { ServerEvent } from '@/services/types';
import { loadLastSessionId, saveLastSessionId } from '@/services/auth';
import { log } from '@/services/logger';
import { colors } from '@/theme';
import { useMemoryStore } from '@/plugin/memory/store/memoryStore';
import { useMemoryExtraction } from '@/plugin/memory/hooks/useMemoryExtraction';
import { useMemoryInjection } from '@/plugin/memory/hooks/useMemoryInjection';

export default function TuiHome() {
  const nav = useNavigation();
  const server = useServerStore((s) => s.active());
  // Stable client — only recreated when server config fields actually change.
  // Do NOT use useServerStore(s => s.client()): that returns `new OpencodeClient`
  // on every selector call, making the reference unstable and causing an infinite
  // bootstrap loop (maximum update depth exceeded).
  const client = useMemo(
    () => (server ? new OpencodeClient(server) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [server?.id, server?.url, server?.username, server?.password],
  );

  const session = useSessionStore((s) => s.session);
  const status = useSessionStore((s) => s.status);
  const turns = useSessionStore((s) => s.turns);
  const modelID = useSessionStore((s) => s.modelID);
  const providerID = useSessionStore((s) => s.providerID);
  const agent = useSessionStore((s) => s.agent);
  const permissions = useSessionStore((s) => s.permissions);
  const setSession = useSessionStore((s) => s.setSession);
  const setStatus = useSessionStore((s) => s.setStatus);
  const setModel = useSessionStore((s) => s.setModel);
  const hydrateTurns = useSessionStore((s) => s.hydrateTurns);
  const upsertMessage = useSessionStore((s) => s.upsertMessage);
  const upsertPart = useSessionStore((s) => s.upsertPart);
  const removeMessage = useSessionStore((s) => s.removeMessage);
  const removePart = useSessionStore((s) => s.removePart);
  const pushPermission = useSessionStore((s) => s.pushPermission);
  const resolvePermission = useSessionStore((s) => s.resolvePermission);

  const openModal = useUIStore((s) => s.openModal);

  // ---- Memory plugin ----
  const loadMemoryForServer = useMemoryStore((s) => s.loadForServer);
  // Load memory state whenever the active server changes.
  useEffect(() => {
    if (server?.id) void loadMemoryForServer(server.id);
  }, [server?.id]);

  useMemoryExtraction({
    client,
    serverId: server?.id ?? null,
    serverUrl: server?.url,
    status,
    turns,
  });

  const { buildPrefix } = useMemoryInjection({
    serverId: server?.id ?? null,
    serverUrl: server?.url,
  });
  // ---- Initial bootstrap: pick / create a session ----
  useEffect(() => {
    if (!client || !server) return;
    let cancelled = false;
    (async () => {
      try {
        const lastId = await loadLastSessionId(server.id);
        let sess = null;
        if (lastId) {
          try { sess = await client.getSession(lastId); } catch { log.debug('bootstrap', `last session ${lastId} not found — skipping`); }
        }
        if (!sess) {
          const all = await client.listSessions();
          sess = all.sort((a, b) => b.time.updated - a.time.updated)[0] ?? null;
        }
        if (!sess) {
          sess = await client.createSession({ title: 'new session' });
        }
        if (cancelled) return;
        setSession(sess);
        await saveLastSessionId(server.id, sess.id);

        // Load initial messages.
        const msgs = await client.listMessages(sess.id);
        hydrateTurns(msgs.map((m) => ({ message: m.info, parts: m.parts })));

        // Load default model if not set.
        if (!modelID) {
          try {
            const cfg = await client.configProviders();
            const firstProviderID = Object.keys(cfg.default)[0];
            const firstModelID = firstProviderID ? cfg.default[firstProviderID] : null;
            if (firstProviderID && firstModelID) {
              setModel(firstProviderID, firstModelID);
            }
          } catch (e) { log.warn('bootstrap', 'configProviders failed', (e as Error).message); }
        }

        // Initial status.
        try {
          const all = await client.sessionStatus();
          setStatus(all[sess.id] ?? 'idle');
        } catch (e) { log.warn('bootstrap', 'sessionStatus failed', (e as Error).message); }
      } catch (e) {
        log.error('bootstrap', 'failed to load session', (e as Error).message);
        // Only show an alert for API errors (server returned an error status).
        // Bare fetch failures (network unavailable) are transient — SSE will
        // reconnect and the next mount will retry bootstrap automatically.
        if ((e as { status?: number }).status !== undefined) {
          Alert.alert('Failed to load session', (e as Error).message);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [server?.id]); // client is memoized from server — no need to double-list it

  // ---- SSE event handler ----
  const onEvent = useCallback((e: ServerEvent) => {
    const sid = session?.id;
    switch (e.type) {
      case 'message.updated': {
        const info = (e.properties as { info: import('@/services/types').Message }).info;
        if (sid && info.sessionID === sid) upsertMessage(info);
        break;
      }
      case 'message.removed': {
        const p = e.properties as { sessionID: string; messageID: string };
        if (sid && p.sessionID === sid) removeMessage(p.sessionID, p.messageID);
        break;
      }
      case 'message.part.updated': {
        const p = (e.properties as { part: import('@/services/types').Part }).part;
        if (sid && p.sessionID === sid) upsertPart(p);
        break;
      }
      case 'message.part.removed': {
        const p = e.properties as { sessionID: string; messageID: string; partID: string };
        if (sid && p.sessionID === sid) removePart(p.sessionID, p.messageID, p.partID);
        break;
      }
      case 'session.idle': {
        const p = e.properties as { sessionID: string };
        if (sid && p.sessionID === sid) setStatus('idle');
        break;
      }
      case 'session.error': {
        const p = e.properties as { sessionID: string };
        if (sid && p.sessionID === sid) {
          log.error('sse', 'session.error received', { sessionID: p.sessionID });
          setStatus('error');
        }
        break;
      }
      case 'permission.requested': {
        const p = e.properties as import('@/services/types').PermissionRequest;
        if (sid && p.sessionID === sid) pushPermission(p);
        break;
      }
      case 'permission.replied': {
        const p = e.properties as { id: string };
        resolvePermission(p.id);
        break;
      }
      default:
        break;
    }
  }, [session?.id, upsertMessage, upsertPart, removeMessage, removePart, setStatus, pushPermission, resolvePermission]);

  useEventStream(server, onEvent);

  // ---- Actions ----
  const onSubmit = async (text: string) => {
    if (!client || !session) return;
    setStatus('busy');
    try {
      // Prepend relevant memories as a context block (silent — empty string if none).
      const prefix = await buildPrefix(text);
      await client.promptAsync(session.id, {
        agent,
        model: modelID && providerID ? { providerID, modelID } : undefined,
        parts: [{ type: 'text', text: prefix ? `${prefix}${text}` : text }],
      });
    } catch (e) {
      log.error('prompt', 'promptAsync failed', (e as Error).message);
      setStatus('error');
      Alert.alert('Send failed', (e as Error).message);
    }
  };

  const onAbort = async () => {
    if (!client || !session) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await client.abortSession(session.id);
      setStatus('aborted');
    } catch (e) { log.warn('abort', 'abortSession failed', (e as Error).message); }
  };

  const onPermission = async (id: string, sessionID: string, response: 'always' | 'once' | 'reject') => {
    if (!client) return;
    try {
      await client.respondPermission(sessionID, id, { response, remember: response === 'always' });
      resolvePermission(id);
    } catch (e) {
      log.error('permission', 'respondPermission failed', (e as Error).message);
      Alert.alert('Permission failed', (e as Error).message);
    }
  };

  const modelLabel = useMemo(() => {
    if (!modelID) return 'no model';
    return modelID.length > 20 ? `${modelID.slice(0, 18)}…` : modelID;
  }, [modelID]);

  const tokens = useMemo(() => {
    return turns.reduce((sum, t) => sum + (t.message.tokens?.input ?? 0) + (t.message.tokens?.output ?? 0), 0);
  }, [turns]);

  const title = session?.title ?? 'no session';

  const openDrawer = () => nav.dispatch(DrawerActions.openDrawer());
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar
        title={title}
        status={status}
        onMenu={openDrawer}
        onTitlePress={() => openModal({ kind: 'sessions' })}
        onAbort={onAbort}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={{ flex: 1 }}>
          <MessageStream turns={turns} permissions={permissions} onPermission={onPermission} />
        </View>
        <PromptInput
          onSubmit={onSubmit}
          onSlash={() => openModal({ kind: 'slash' })}
          onMention={() => openModal({ kind: 'mention' })}
          disabled={!session}
        />
        <StatusBar
          status={status}
          modelLabel={modelLabel}
          agent={agent}
          tokens={tokens || undefined}
          onModelPress={() => openModal({ kind: 'model' })}
          onAgentPress={() => openModal({ kind: 'agent' })}
        />
      </KeyboardAvoidingView>
      {/* Home-indicator spacer — lives outside KAV so keyboard height
          (which already includes the home-indicator area on iOS) does not
          double-count this padding when the keyboard is open. */}
      <View style={{ height: insets.bottom, backgroundColor: colors.background }} />
    </SafeAreaView>
  );
}
