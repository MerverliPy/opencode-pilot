# Pilot Design-System Polish — Execution Plan

## How to use

Each phase has tasks grouped by file. Each task has:
- **Files**: exact paths to edit
- **Pattern**: what to find and what to change
- **Verify**: commands to prove the change works

Open this file. Check `[ ]` → `[x]` as you complete each task.
Run verify commands after each task before moving to next.

---

## Phase 0: Token foundation

### 0.1 — Convert fontSizes from px to rem

**Why**: Accessibility. User font-size prefs ignored with px.

**Files**: `ui/src/theme.ts`

**Change**:
```
// OLD
xs: 11, sm: 13, md: 15, lg: 18, xl: 22

// NEW (baseline 16px)
xs: "0.6875rem", sm: "0.8125rem", md: "0.9375rem",
lg: "1.125rem", xl: "1.375rem"
```

Type: change `export const fontSizes` values from `number` to `string`.
Update `ThemeFontSizes` type in `theme.ts` from `number`→`string`.

**Files to update for type change**: all files that consume `fontSizes` must work with string values. Since React `fontSize` accepts both, type annotation change only.

- [x] task: convert fontSizes values to `rem` strings
- [x] task: update or verify type definition accepts strings

**Verify**: `npm run typecheck -w ui`

---

### 0.2 — Add line-height tokens

**Why**: Consistency. No shared line-height values.

**Files**: `ui/src/theme.ts`

**Add** after `fontSizes`:
```ts
export const lineHeights = {
  tight: "1.25",
  normal: "1.5",
  relaxed: "1.75",
} as const;
```

- [x] task: add lineHeights to theme.ts
- [x] task: update type definition if needed

**Verify**: `npm run typecheck -w ui`

---

### 0.3 — Add spacing-scale CSS variables

**Why**: Stop hardcoding padding/margin values in every component.

**Files**: `ui/src/index.css`

**Add** inside `:root`:
```css
--pilot-space-1: 4px;
--pilot-space-2: 8px;
--pilot-space-3: 12px;
--pilot-space-4: 16px;
--pilot-space-5: 24px;
--pilot-space-6: 32px;
--pilot-space-7: 48px;
--pilot-space-8: 64px;
```

**Add** in `theme.ts`:
```ts
export const spacing = {
  px1: "var(--pilot-space-1)",
  px2: "var(--pilot-space-2)",
  px3: "var(--pilot-space-3)",
  px4: "var(--pilot-space-4)",
  px5: "var(--pilot-space-5)",
  px6: "var(--pilot-space-6)",
  px7: "var(--pilot-space-7)",
  px8: "var(--pilot-space-8)",
} as const;
```

- [x] task: add CSS var spacing scale to index.css
- [x] task: add spacing object to theme.ts

**Verify**: `npm run typecheck -w ui`

---

### 0.4 — Add radius CSS variables

**Why**: Consistent border-radius across components.

**Files**: `ui/src/index.css`, `ui/src/theme.ts`

**index.css** in `:root`:
```css
--pilot-radius-sm: 4px;
--pilot-radius-md: 6px;
--pilot-radius-lg: 10px;
```

**theme.ts**:
```ts
export const radii = {
  sm: "var(--pilot-radius-sm)",
  md: "var(--pilot-radius-md)",
  lg: "var(--pilot-radius-lg)",
} as const;
```

- [x] task: add radius CSS vars to index.css
- [x] task: add radii object to theme.ts

**Verify**: `npm run typecheck -w ui`

---

## Phase 1: Critical — accessibility + render perf

### 1.1 — Fix focus indicators on all inputs

**Why**: WCAG 2.4.7 failure. Keyboard users invisible.
**Pattern**: Every `<input>`, `<textarea>`, `<select>` has `outline: "none"`. Replace with focus-ring via CSS.

**Files**: `ui/src/index.css`

**Add** global rule:
```css
/* Focus ring for all interactive elements */
input:focus-visible,
textarea:focus-visible,
select:focus-visible,
button:focus-visible,
a:focus-visible,
[tabindex]:focus-visible {
  outline: 2px solid var(--pilot-accent);
  outline-offset: 2px;
}
```

Then **remove** `outline: "none"` from all inline `style` props in these files:

- [x] `ui/src/pages/SimpleChat.tsx` (outline:none removed — lines stale, verified none remain in any file)
- [x] `ui/src/pages/Sessions.tsx` (3 occurrences removed)
- [x] `ui/src/pages/Memory.tsx`
- [x] `ui/src/pages/Diff.tsx`
- [x] `ui/src/pages/Login.tsx` (2 occurrences removed)
- [x] `ui/src/pages/Settings.tsx` (bonus — 4 occurrences, not in original plan)
- [x] `ui/src/pages/Chat.tsx` (also cleaned)
- [x] `ui/src/components/PromptInput.tsx`

**Verify**: `npm run typecheck -w ui && npm run test -w ui`

---

### 1.2 — Add aria-labels to emoji-based navigation

**Why**: Screen readers can't interpret emoji as navigation.
**Pattern**: Layout NavLink has emoji icon but no `aria-label` on parent `<Link>`.

**Files**: `ui/src/components/Layout.tsx`

**Change** `NavLink` component (line ~34-64): replace `label` prop usage. The Link already has emoji text but no accessible name. Add:
```tsx
<Link
  to={path}
  aria-label={label}  // ← add
  // ... rest of props
>
```

Same for `MobileNavLink` (line ~78-99).

Also fix `<button>` close buttons in `Terminal.tsx`, `DebugPanel.tsx`, `Sessions.tsx`.

- [x] `ui/src/components/Layout.tsx` — added `aria-label={label}` to NavLink and MobileNavLink
- [x] `ui/src/pages/Terminal.tsx` — verified `aria-label` on close buttons (already present, OK)
- [x] `ui/src/components/DebugPanel.tsx` — added `aria-label="Close debug panel"` to close button
- [x] `ui/src/components/InstallBanner.tsx` — already has `aria-label="Dismiss"` (verified)

**Verify**: `npm run typecheck -w ui`

---

### 1.3 — Fix `active()` selector cascade re-renders

**Why**: HIGH render perf. `active()` returns new object ref → every page re-renders on any store change.

**Pattern**: Replace `useServerStore((s) => s.active())` with primitive selects.

**Files**:
- `ui/src/pages/SimpleChat.tsx` line ~107
- `ui/src/pages/Diff.tsx` line ~178
- `ui/src/pages/Terminal.tsx` line ~63

**Change** each to:
```tsx
// OLD
const server = useServerStore((s) => s.active());

// NEW
const servers = useServerStore((s) => s.servers);
const activeId = useServerStore((s) => s.activeId);
const server = useMemo(
  () => servers.find((s) => s.id === activeId) ?? null,
  [servers, activeId]
);
```

Also fix `Sessions.tsx` line ~14.

- [x] `ui/src/pages/SimpleChat.tsx`
- [x] `ui/src/pages/Diff.tsx`
- [x] `ui/src/pages/Terminal.tsx`
- [x] `ui/src/pages/Sessions.tsx`
- [x] `ui/src/pages/Files.tsx` (bonus — not in original plan)
- [x] `ui/src/pages/Chat.tsx` — already used primitives (verified)
- [x] `ui/src/pages/Memory.tsx` (bonus — also refactored)
- [x] `ui/src/pages/Settings.tsx` — already used primitives, no change needed

**Verify**: `npm run typecheck -w ui && npm run test -w ui`

---

### 1.4 — Memo ChatMessage in SimpleChat

**Why**: Every streaming chunk re-renders ALL message bubbles.

**Files**: `ui/src/components/ChatMessage.tsx`

**Change**: Add `React.memo`:
```tsx
export const ChatMessage = memo(function ChatMessage({ message, onRetry }: Props) {
  // ... existing body
});
```

- [x] task: wrap ChatMessage in memo()

**File**: `ui/src/pages/SimpleChat.tsx` — verify `onRetry` is stable via `useCallback` (already is, line 268).

**Verify**: `npm run typecheck -w ui && npm run test -w ui`

---

### 1.5 — Fix TurnView memo comparator

**Why**: memo breaks because `turn` prop is new object each render.

**Files**: `ui/src/components/MessageList.tsx`

**Change** `TurnView` memo (line 52) to use custom comparator:
```tsx
const TurnView = memo(function TurnView({ turn }: { turn: Turn }) {
  // existing body
}, (prev, next) => {
  return prev.turn.message.id === next.turn.message.id &&
    prev.turn.parts.length === next.turn.parts.length &&
    prev.turn.parts.every((p, i) => p.id === next.turn.parts[i]?.id);
});
```

- [x] task: add custom comparator to TurnView memo

**Verify**: `npm run typecheck -w ui && npm run test -w ui`

---

### 1.6 — SimpleChat streaming: avoid full array rewrite every chunk

**Why**: Every chunk creates new array + triggers localStorage + scroll.

**Files**: `ui/src/pages/SimpleChat.tsx`

**Changes**:

1. Replace `messages` state with a ref for the latest messages array used in callbacks:
   Add `const messagesRef = useRef(messages); messagesRef.current = messages;`
2. In `onChunk` (line 208), update assistant message via a ref-based approach instead of setState map. Use `setMessages` with functional update but only once per batch.
3. Throttle `saveMessages` in the `useEffect` (line 136) — don't save on every chunk. Use a ref flag:
```tsx
const [needsPersist, setNeedsPersist] = useState(0);
useEffect(() => { if (needsPersist) saveMessages(messages); }, [needsPersist]);
```
Then in `onChunk`, debounce `setNeedsPersist` to run every 500ms.

- [x] task: add messagesRef to decouple callbacks from array ref
- [x] task: throttle localStorage persist in SimpleChat

**Verify**: `npm run typecheck -w ui && npm run test -w ui`

---

## Phase 2: Component extraction

### 2.1 — Extract Button component

**Why**: ~30 inline button patterns. Adds visual consistency + reduces code.

**New file**: `ui/src/components/ui/Button.tsx`

```tsx
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

type Props = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  "data-testid"?: string;
  "aria-label"?: string;
};
```

Styles derived from theme tokens. Map variants to color combinations.

**Files to update** (replace inline button patterns with `<Button>`):
- [x] `ui/src/pages/SimpleChat.tsx` — 5/7 buttons migrated; Debug toggle kept inline for conditional active styling
- [x] `ui/src/pages/Sessions.tsx` — 6 buttons migrated
- [x] `ui/src/pages/Memory.tsx` — export/import buttons can use Button; view/search toggles kept inline for conditional active styling
- [x] `ui/src/pages/Diff.tsx` — 2 buttons migrated
- [x] `ui/src/pages/Chat.tsx` — 3 buttons migrated
- [x] `ui/src/components/PermissionCard.tsx` — Always, Once, Reject migrated
- [x] `ui/src/components/DebugPanel.tsx` — Clear, Close migrated
- [x] `ui/src/components/Layout.tsx` — sidebar collapse button migrated

**Verify**: `npm run typecheck -w ui && npm run test -w ui && npm run lint -w ui`

---

### 2.2 — Extract Input component

**Why**: ~15 input patterns with identical styles.

**New file**: `ui/src/components/ui/Input.tsx`

```tsx
type Props = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
  "aria-label"?: string;
  "data-testid"?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
};
```

Standard: bg=`colors.surfaceAlt` or `colors.surface`, border=`colors.border`, focus-ring via CSS.

**Files to update**:
- [x] `ui/src/pages/SimpleChat.tsx` — model select (keep as select), prompt input is textarea not input
- [x] `ui/src/pages/Login.tsx` — username + password inputs
- [x] `ui/src/pages/Sessions.tsx` — rename input, tag input, folder input
- [x] `ui/src/pages/Memory.tsx` — search input
- [x] `ui/src/pages/Diff.tsx` — commit message input
- [x] `ui/src/pages/Chat.tsx` — title edit input

**Verify**: `npm run typecheck -w ui && npm run test -w ui`

---

### 2.3 — Extract Card component

**Why**: `border: 1px solid ${colors.border}, borderRadius: 6, backgroundColor: colors.surface` repeated 8+ times.

**New file**: `ui/src/components/ui/Card.tsx`

**Files to update**:
- [x] `ui/src/pages/Sessions.tsx` — session rows
- [x] `ui/src/components/PermissionCard.tsx`
- [x] `ui/src/components/DebugPanel.tsx`
- [x] `ui/src/plugin/memory/ui/components/MemoryCard.tsx`
- [x] `ui/src/plugin/memory/ui/components/ProfilePanel.tsx` — profile entries

**Verify**: `npm run typecheck -w ui && npm run test -w ui`

---

## Phase 3: Mono → Sans migration (typography hierarchy)

### 3.1 — Audit and change fonts.mono → fonts.sans for non-code UI

**Why**: Readability. Mono everywhere kills hierarchy.

**Pattern**: `fontFamily: fonts.mono` on labels, buttons, nav items, dropdowns, form labels, session titles → change to `fonts.sans`.
Keep `fonts.mono` only on: code blocks, technical output, timestamps, file paths, inline code, debug logs, terminal content.

**Files**:

| Component | Line(s) | Current | Change to |
|-----------|---------|---------|-----------|
| `Layout.tsx` (sidebar header) | 182 | mono | sans |
| `Layout.tsx` (nav items) | 47 | sans (already correct) | — |
| `Layout.tsx` (mobile nav) | 91 | sans (already correct) | — |
| `SimpleChat.tsx` (model select) | 581 | mono | **keep** (model ID is code-like) |
| `SimpleChat.tsx` (header title) | 566 | sans | — |
| `SimpleChat.tsx` (sidebar "Conversations") | 411 | sans | — |
| `SimpleChat.tsx` (new conv btn) | 428 | sans (already) | — |
| `SimpleChat.tsx` (conv items) | 472, 483 | sans | — |
| `SimpleChat.tsx` (empty state) | 649 | sans (already) | — |
| `SimpleChat.tsx` (input) | 755 | sans | — |
| `Sessions.tsx` (heading) | 186 | sans | — |
| `Sessions.tsx` (session titles) | 329 | mono | sans (it's a title, not code) |
| `Sessions.tsx` (timestamps) | 341 | mono | **keep** (time data) |
| `Sessions.tsx` (folder/tags display) | 349, 357 | mono | **keep** (technical metadata) |
| `Sessions.tsx` (buttons) | 379, 398, 413 | mono | sans |
| `Sessions.tsx` (folder filter select) | 221 | mono | sans |
| `Sessions.tsx` (no-server message) | 164 | mono | sans |
| `Chat.tsx` (title display) | 477 | mono | sans (it's a session title) |
| `Chat.tsx` (edit buttons) | 435, 453, 497 | mono | sans |
| `Chat.tsx` (status text) | 533 | mono | **keep** (status indicator) |
| `Chat.tsx` (error) | 553 | mono | **keep** (error is technical) |
| `Diff.tsx` (heading) | 296 | sans | — |
| `Diff.tsx` (branch name) | 310 | mono | **keep** (git branch) |
| `Diff.tsx` (status badges) | 131 | mono | **keep** (technical) |
| `Diff.tsx` (buttons) | 364, 430, 437 | mono | sans |
| `Diff.tsx` (commit input) | 418 | mono | **keep** (terminal-like input) |
| `Memory.tsx` (header) | 272, 283 | mono | sans |
| `Memory.tsx` (view buttons) | 318, 329 | mono | sans |
| `Memory.tsx` (search input) | 453 | mono | **keep** (code search) |
| `Memory.tsx` (export/import) | 371, 389 | mono | sans |
| `Login.tsx` (form title) | 74 | mono | sans |
| `Login.tsx` (labels) | 89, 120 | mono | sans (form labels) |
| `Login.tsx` (inputs) | 107, 142 | mono | sans (form inputs) |
| `Login.tsx` (error) | 158 | mono | sans |
| `Login.tsx` (submit button) | 173 | mono | sans |
| `Terminal.tsx` (tabs) | 309 | mono | **keep** (terminal tab labels) |
| `Terminal.tsx` (no-server) | 260 | mono | sans |
| `ConnectivityIndicator.tsx` | 24 | sans | — (already correct) |
| `ErrorBoundary.tsx` | 44, 52, 59 | sans/mono | keep as-is |
| `DebugPanel.tsx` | 79 | sans | — |
| `PermissionCard.tsx` | 26, 37, 56 | mono | **keep** (permission details) |
| `ChatMessage.tsx` (sender) | 48 | sans | — (already correct) |
| `ChatMessage.tsx` (timestamp) | 59 | sans | — |
| `MessageList.tsx` (role label) | 67 | mono | sans (role label) |
| `MessageList.tsx` (cost footer) | 40 | mono | **keep** (technical data) |
| `ProfilePanel.tsx` | 168, 179, 224 | mono | **keep** (key-value profile data) |
| `MemoryCard.tsx` | 55, 70, 79, 93 | mono | **keep** (technical card data) |
| `MarkdownContent.tsx` (inline code) | — | mono | **keep** (code) |
| `markdownComponents.tsx` (headings) | 9-25 | sans | — (already correct) |

Rationale for each:
- **Form labels, button text, navigation items, page headings, modals** → sans
- **Code blocks, terminal, git output, model IDs, timestamps, file paths, inline code, debug output, permission details** → keep mono

- [ ] task: run through all components, change fonts.mono → fonts.sans for non-code elements per table above

**Verify**: `npm run typecheck -w ui && npm run test -w ui`

---

## Phase 4: Responsive + PWA

### 4.1 — Fix SimpleChat sidebar breakpoint (CSS-based)

**Files**: `ui/src/pages/SimpleChat.tsx`

**Change**: Remove `window.innerWidth` resize handler (lines 157-163). Move sidebar visibility to CSS:
```tsx
// In component
const [sidebarOpen, setSidebarOpen] = useState(true); // default open on desktop
```
Then add `<style>` tag with:
```css
@media (max-width: 768px) {
  .simplechat-sidebar { display: none; }
}
@media (min-width: 769px) {
  .simplechat-sidebar-toggle { display: none !important; }
}
```

And add `className="simplechat-sidebar"` to sidebar div, `className="simplechat-sidebar-toggle"` to toggle button.

- [ ] task: replace JS breakpoint with CSS breakpoint in SimpleChat

**Verify**: `npm run typecheck -w ui`

---

### 4.2 — Add loading skeleton components

**Files**: New `ui/src/components/ui/Skeleton.tsx`

```tsx
export function Skeleton({ width, height, borderRadius = 4 }: {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
}) {
  return (
    <div
      className="skeleton-pulse"
      style={{
        width: width ?? "100%",
        height: height ?? 16,
        borderRadius,
        backgroundColor: "var(--pilot-surface-alt)",
        animation: "skeleton-pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}
```

Add `@keyframes skeleton-pulse` to `index.css`.

**Update**: `ui/src/App.tsx` — replace `LoadingFallback` with skeleton matching each page layout.

- [ ] task: create Skeleton component
- [ ] task: add skeleton animation to index.css
- [ ] task: update App.tsx LoadingFallback to use skeleton

**Verify**: `npm run typecheck -w ui && npm run test -w ui`

---

### 4.3 — Standardize disabled state

**Files**: `ui/src/index.css`

**Add**:
```css
:disabled,
[disabled] {
  opacity: 0.4;
  cursor: not-allowed;
}
```

Then remove inline `opacity` and `cursor` overrides from disabled buttons across all components.

- [ ] task: add global disabled styles
- [ ] task: remove inline disabled opacity/cursor overrides

**Verify**: `npm run typecheck -w ui`

---

## Phase 5: Spacing audit + standardization

### 5.1 — Map component padding/margin to spacing scale

**Why**: Consistency. Replace arbitrary values with scale tokens.

**Pattern**: For each component, replace `${N}px` padding/margin/gap with nearest spacing token:
- 2px → `spacing.px1` (or 4px... accept 2px as-is for now)
- 4px → `spacing.px1`
- 6px → `spacing.px1` (close enough)
- 8px → `spacing.px2`
- 10px → `spacing.px3` (close enough)
- 12px → `spacing.px3`
- 14px → `spacing.px3` (close enough)
- 16px → `spacing.px4`
- 20px → `spacing.px5`
- 24px → `spacing.px5`
- 32px → `spacing.px6`
- 40px → `spacing.px7`
- 48px → `spacing.px7`

**Priority files**:
- [ ] `ui/src/pages/SimpleChat.tsx`
- [ ] `ui/src/pages/Sessions.tsx`
- [ ] `ui/src/pages/Memory.tsx`
- [ ] `ui/src/components/Layout.tsx`
- [ ] `ui/src/components/ChatMessage.tsx`
- [ ] `ui/src/components/MessageList.tsx`
- [x] `ui/src/components/PermissionCard.tsx`
- [x] `ui/src/plugin/memory/ui/components/MemoryCard.tsx`

**Verify**: `npm run typecheck -w ui`

---

### 5.2 — Standardize surface padding

**Goal**: All card/surface containers use same padding: `12px 16px`.
Currently: Sessions rows use "6px 10px", memory cards use "12px 16px", ProfilePanel entries use "12px 16px", PermissionCard uses "12px 14px", Chat header uses "10px 16px".

**Files**:
- [ ] `ui/src/pages/Sessions.tsx` line 288 → `12px 16px`
- [ ] `ui/src/pages/Chat.tsx` line 374 → `12px 16px`
- [x] `ui/src/components/PermissionCard.tsx` line 17 → `12px 16px`
- [x] `ui/src/components/DebugPanel.tsx` lines 47, 114 → `8px 16px`

**Verify**: `npm run typecheck -w ui`

---

## Phase 6: Hover + interaction polish

### 6.1 — Add CSS hover states

**Files**: `ui/src/index.css`

**Add**:
```css
/* Interactive rows */
.session-row:hover,
.permission-card:hover,
.memory-card:hover,
.profile-entry:hover {
  background-color: var(--pilot-surface-alt);
}
```

Then add `className` to corresponding elements.

- [ ] `ui/src/pages/Sessions.tsx` — add `className="session-row"` to session row divs (line 284)
- [x] `ui/src/components/PermissionCard.tsx` — add `className="permission-card"`
- [x] `ui/src/plugin/memory/ui/components/MemoryCard.tsx` — add `className="memory-card"`
- [ ] `ui/src/plugin/memory/ui/components/ProfilePanel.tsx` — add `className="profile-entry"` to entry divs

**Simplify**: `Layout.tsx` NavLink (lines 50-59) — remove JS mouseenter/mouseleave handlers, replace with CSS:
```css
.nav-link:hover { background-color: var(--pilot-surface-alt); }
```

- [ ] task: add CSS hover classes to index.css
- [ ] task: add classNames to interactive rows
- [ ] task: replace JS hover handlers in Layout.tsx with CSS

**Verify**: `npm run typecheck -w ui`

---

## Phase 7: Static style extraction

### 7.1 — Extract repeated style blocks to module constants

**Why**: Performance. Inline style objects created every render.

**Pattern**: For each component file, identify style objects used inside render. Extract to module-level constants or `useMemo`.

**Example** (`SimpleChat.tsx`):
```tsx
// Before (inside component)
<div style={{
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 0",
  borderBottom: `1px solid ${colors.borderSubtle}`,
  marginBottom: 12,
  gap: 8,
  position: "sticky",
  top: 0,
  zIndex: 10,
  flexShrink: 0,
}}>

// After (module level, outside component)
const STYLES = {
  header: { display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 0", borderBottom: `1px solid ${colors.borderSubtle}`,
    marginBottom: 12, gap: 8, position: "sticky" as const, top: 0, zIndex: 10, flexShrink: 0 },
  messagesContainer: { flex: 1, overflowY: "auto", padding: "8px 0" },
  // ... etc
};
```

**Priority files** (most style objects):
- [ ] `ui/src/pages/SimpleChat.tsx` — ~15 style blocks
- [ ] `ui/src/pages/Sessions.tsx` — ~15 style blocks
- [ ] `ui/src/pages/Memory.tsx` — ~20 style blocks
- [ ] `ui/src/pages/Chat.tsx` — ~12 style blocks
- [ ] `ui/src/pages/Diff.tsx` — ~10 style blocks
- [ ] `ui/src/components/Layout.tsx` — ~10 style blocks

**Verify**: `npm run typecheck -w ui && npm run test -w ui`

---

## Verification gates

After each phase (not each task), run:

```bash
# TypeScript check
npm run typecheck -w ui

# Unit tests
npm run test -w ui

# Lint
npm run lint -w ui
```

After Phase 7 (full completion):
```bash
# Full monorepo check
npm run typecheck
npm run build
npm run test
```

---

## Status tracker

```
Phase 0: Token foundation          [x] 4/4 tasks
Phase 1: Critical a11y + perf     [x] 6/6 tasks
Phase 2: Component extraction      [x] 3/3 tasks
Phase 3: Mono → Sans migration    [ ] 0/1 tasks
Phase 4: Responsive + PWA         [ ] 0/3 tasks
Phase 5: Spacing audit            [ ] 0/2 tasks
Phase 6: Hover + interactions     [ ] 0/1 tasks
Phase 7: Static style extraction  [ ] 0/1 tasks
```

Update this table as you progress. Mark complete phase only when all tasks + verification pass.
