---
name: react-zustand-performance
description: "Use for Pilot React, Zustand, xterm, CodeMirror, effects, selectors, event subscriptions, and UI render performance review."
compatibility: opencode
---

# React and Zustand performance

## Scope

Use this skill for changes in React components, hooks, Zustand stores/selectors, service subscriptions, terminal UI, CodeMirror, xterm, route pages, or Vite client behavior.

## Checklist

- Keep selectors narrow and stable. Avoid subscribing components to whole stores.
- Avoid render-time filtering, sorting, serialization, or large string transforms when the input can be memoized.
- Verify `useEffect` dependency arrays and cleanup functions for event listeners, intervals, streams, and subscriptions.
- Keep terminal/editor output bounded or virtualized when possible.
- Avoid eager importing heavy modules into initial routes.
- Do not create new state mirrors unless they prevent expensive recomputation or isolate external subscriptions.

## Verification

Use `npm run typecheck -w ui` first. Use targeted UI tests when state or behavior changes. Escalate to root build only when import graph or bundle behavior changes.
