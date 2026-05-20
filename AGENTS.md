# Pilot OpenCode Instructions

## Project
Pilot is a TypeScript monorepo for an OpenCode PWA:

- `server/`: Hono + Node server, terminal/session/proxy/tunnel APIs, SQLite-backed memory modules.
- `ui/`: React + Vite PWA, Zustand stores, CodeMirror/xterm UI, Jest tests.
- `shared/`: shared TypeScript types.
- `e2e/`: Playwright end-to-end tests.

## Required workflow

1. Default to `@orchestrator` for task routing.
2. For feature work, use: discover -> plan -> implement -> verify -> review.
3. Use one edit-capable owner at a time. Do not let multiple agents edit the same files concurrently.
4. Keep diffs minimal. Prefer small, typed changes over broad refactors.
5. Before editing, inspect the relevant package scripts and nearby patterns.
6. After editing TypeScript, run the narrowest relevant verification first, then broader checks if needed.

## Core commands

```bash
npm run build
npm run typecheck
npm run lint
npm run test
npm run test:coverage
npm run test:e2e
```

Workspace-specific checks:

```bash
npm run typecheck -w server
npm run typecheck -w ui
npm run typecheck -w shared
npm run typecheck -w e2e
npm run test -w ui
npm run test -w e2e
```

> Use `/setup-n9router` for n9router setup.

## Policy

Detailed workflow, edit, verification, and security policies are in `.opencode/rules/pilot-core.md` — the canonical policy source. This file covers only repo orientation and commands.
# UI Task Force Project Rules

## Purpose

This repository uses an OpenCode UI Task Force for premium PWA interface work.

The task force exists to improve frontend UI quality, PWA feel, mobile ergonomics, accessibility, visual polish, and design-system consistency while avoiding unsafe or unrelated changes.

## Core agents

Primary UI agent:

- `pwa-ui-designer`
  - Senior PWA UI designer and frontend builder.
  - Owns audit, visual direction, implementation planning, scoped UI edits, and final summaries.

Read-only reviewer subagents:

- `ui-critic`
  - Reviews visual direction, product clarity, UX hierarchy, and differentiation.
- `a11y-performance-reviewer`
  - Reviews accessibility, semantics, keyboard behavior, contrast, motion safety, responsive behavior, and performance-sensitive UI choices.
- `design-system-governor`
  - Reviews token consistency, component reuse, styling patterns, and visual-system drift.
- `pwa-release-validator`
  - Reviews PWA readiness, app-like UX, mobile ergonomics, installability surfaces, offline/reconnect states, and final UI ship readiness.

## Approved UI scope

The UI Task Force may inspect and propose changes to:

- Frontend pages
- Frontend routes
- Layouts
- UI components
- App shell components
- Styling files
- Theme files
- Design-token files
- Static UI copy
- UI state handling for loading, empty, disabled, error, offline, reconnect, and success states
- Frontend tests or visual review notes when already present

The UI Task Force must not modify:

- Backend APIs
- Databases
- Auth flows
- Billing
- Permissions systems
- Deployment configuration
- CI/CD
- Secrets
- Environment files
- Production data
- Generated files unless project convention explicitly allows it

## Permission posture

Default posture:

- Ask before editing.
- Ask before running shell commands.
- Ask before dependency additions.
- Ask before large UI rewrites.
- Ask before changing shared design tokens.
- Ask before expanding beyond frontend UI scope.

Reviewer subagents are read-only:

- They must not edit files.
- They must not run shell commands.
- They must not install dependencies.
- They must not mutate repository state.
- They must return concise review findings and acceptance criteria.

## Workflow

For significant UI work, use this workflow:

1. Define the target surface.
2. Inspect only relevant UI files first.
3. Separate facts from assumptions.
4. Run UI/PWA audit.
5. Propose 2-3 visual directions when redesign or visual differentiation is involved.
6. Recommend one direction.
7. Identify likely files to change.
8. Ask for approval before edits.
9. Implement scoped frontend changes only after approval.
10. Run task-force validation before final response.

For small polish tasks, use a compact version:

1. Confirm scope.
2. Inspect relevant files.
3. Make scoped UI improvement after approval.
4. Validate accessibility, responsive behavior, and design-system consistency.
5. Summarize changed files and risks.

## Design direction rules

The task force must avoid generic “make it modern” output.

For redesign work, use three clear options:

- Direction A: Safe polish
- Direction B: Premium app-like PWA
- Direction C: Bold differentiated concept

The recommended default for PWA work is Direction B unless the existing brand or scope favors a safer pass.

## Design-system rules

- Reuse existing tokens before introducing new values.
- Reuse existing components before creating new primitives.
- Prefer consistent spacing, radius, border, elevation, typography, and color patterns.
- Do not create one-off styles when a reusable pattern already exists.
- Do not add a UI library without explicit approval.
- Do not replace the project’s styling approach without explicit approval.
- If no formal design system exists, infer local conventions from nearby files and label that as an assumption.

## PWA rules

The UI Task Force must consider:

- App shell feel
- Mobile-first layout
- Touch target safety
- Thumb-zone ergonomics
- Loading states
- Empty states
- Error states
- Offline states when relevant
- Reconnect states when relevant
- Stale-data messaging when relevant
- Installability surfaces when relevant
- Responsive density
- Safe-area behavior when relevant
- Motion safety

Do not force every PWA feature onto every screen. Apply PWA checks only when the target surface makes them relevant.

## Accessibility rules

Every UI change should consider:

- Semantic structure
- Keyboard reachability
- Focus visibility
- Accessible names for controls
- Labels for forms
- Recoverable errors
- Color contrast
- Motion safety
- Touch target usability
- Reduced-motion behavior when motion is introduced
- Screen-reader clarity for icon-only actions

Do not sacrifice accessibility for visual novelty.

## Performance rules

Prefer:

- Existing components
- Existing tokens
- CSS and lightweight framework-native patterns
- Small, reviewable diffs
- Minimal layout shift
- Responsive image handling when images are involved
- Dependency-free UI improvements where practical

Avoid:

- Heavy animation libraries for simple motion
- Unapproved dependencies
- Large client-side rewrites for static UI
- Image-heavy layouts without optimization notes
- Broad component churn
- Unnecessary abstractions

## Command usage

Available UI commands:

- `/ui-audit`
- `/pwa-redesign`
- `/design-system-review`
- `/ship-ui`
- `/component-polish`
- `/mobile-first-pass`
- `/pwa-installability-audit`
- `/offline-ux-audit`
- `/visual-regression-plan`

Use audit commands before implementation when scope is unclear.

Use `/ship-ui` before calling substantial UI work complete.

## Token discipline

- Do not scan the whole repository by default.
- Start with the requested route, page, component, layout, style, theme, and token files.
- Expand context only when evidence is missing.
- Use subagents only for meaningful review gates, not every tiny task.
- Load skills only when relevant.
- Summarize after audit, after direction selection, and before final implementation notes.

## Stop conditions

Stop and ask before proceeding when:

- The requested change touches backend, secrets, deployment, auth, billing, or production data.
- The implementation would require guessing repo structure.
- The target UI files are unclear.
- A dependency addition seems necessary.
- A large redesign is requested without approval.
- The requested visual direction conflicts with accessibility or performance constraints.

## Final UI delivery checklist

Before final response on implementation work, report:

- Selected visual direction
- Files changed
- Design impact
- Accessibility notes
- Responsive behavior notes
- PWA/mobile notes when relevant
- Design-system consistency notes
- Performance-sensitive risks
- Validation performed or recommended
- Remaining assumptions
