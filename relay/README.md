# pilot-relay

Long-running Node process that bridges an OpenCode server's SSE event stream
to Expo Push notifications, so iOS Pilot can wake you up when:

- a session goes idle (your agent finished),
- a session errors out,
- a permission is requested.

iOS doesn't keep an SSE connection alive in the background, so this relay
runs server-side instead.

## Install

```bash
# On the same machine running `opencode serve`:
sudo mkdir -p /opt/pilot-relay
sudo cp relay.js package.json /opt/pilot-relay/
cd /opt/pilot-relay
sudo npm install --omit=dev
```

## Configure

Create `/etc/pilot-relay.env`:

```
OPENCODE_URL=http://127.0.0.1:4096
OPENCODE_USERNAME=opencode
OPENCODE_PASSWORD=changeme
PILOT_TOKENS=ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
PILOT_RELAY_NAME=opencode
```

Multiple devices? Comma-separate tokens, or set `PILOT_TOKENS_FILE` to a path
with one token per line.

You can find your push token in the iOS app: **Settings → about → push token**
(once Phase 9 wiring is complete).

## Run

```bash
sudo cp pilot-relay.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now pilot-relay
sudo journalctl -fu pilot-relay
```

## Manual run (debug)

```bash
OPENCODE_URL=http://127.0.0.1:4096 \
PILOT_TOKENS=ExponentPushToken[...] \
node relay.js
```

## Notes

- The relay only sends notifications for the events listed above. Streaming
  message text is **not** pushed (too noisy and would burn through Apple's
  per-app notification budget).
- Push delivery uses Expo's free push service (`exp.host`). Notifications go
  out via FCM/APNs from there.
- If you run multiple OpenCode servers, run one relay per server, each with
  its own env file and systemd unit (e.g. `pilot-relay@home.service`).
