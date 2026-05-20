# UI Design Memory
## Purpose
This file stores durable design decisions for the UI Task Force.
Use it to preserve the product’s visual DNA across redesigns, polish passes, PWA improvements, and component work. The goal is to prevent the UI team from starting from zero on every task or drifting into generic SaaS patterns.
This file should be updated after meaningful UI decisions, not after every tiny change.
## How to use this file
The `pwa-ui-designer` and related UI commands should read this file when:
- Starting a redesign.
- Running `/pwa-redesign`.
- Running `/component-polish`.
- Running `/ui-scorecard`.
- Running `/ship-ui`.
- Updating shared design tokens or reusable components.
- Making a decision that affects future UI work.
The `/design-memory-update` command should propose updates to this file after significant UI work.
## Product identity
Status: unset
Fill this in when known.
```text
Product type:
Primary audience:
Primary user goal:
Emotional tone:
Trust posture:
Differentiation goal:
PWA priority:
```
## Brand tone
Status: unset
Describe the intended feel of the product.
Examples:
```text
- Calm and premium
- Fast and tactical
- Warm and human
- Technical and precise
- Bold and high-energy
- Minimal and focused
```
Current brand tone:
```text
Unset.
```
## Visual personality
Status: unset
Define the visual qualities the UI should consistently express.
```text
Color personality:
Typography personality:
Spacing density:
Surface style:
Corner radius feel:
Shadow/elevation feel:
Icon style:
Illustration/image style:
Motion personality:
```
Current visual personality:
```text
Unset.
```
## PWA experience principles
The product should feel like an app, not just a responsive website.
Default PWA principles:
- Mobile-first layout.
- App-shell clarity.
- Touch-friendly controls.
- Stable navigation.
- Clear loading, empty, error, disabled, offline, reconnect, and success states.
- Installability surfaces should appear only when they support user value.
- Offline/reconnect UX should be considered when the product flow depends on network state.
- Motion should support orientation and feedback, not decoration.
Project-specific PWA decisions:
```text
Unset.
```
## Design-system rules
Default rules:
- Reuse existing tokens before adding new values.
- Reuse existing components before creating new primitives.
- Prefer consistent spacing, radius, border, shadow, elevation, typography, and color patterns.
- Avoid one-off styling unless the exception is documented.
- Do not add UI libraries without approval.
- Do not replace the styling system without approval.
- Keep shared tokens stable unless the design-system impact is reviewed.
Project-specific design-system rules:
```text
Unset.
```
## Approved visual patterns
Use this section to record patterns that should be repeated.
Format:
```text
Pattern:
Where used:
Why it works:
Implementation notes:
Related tokens/components:
```
Approved patterns:
```text
None recorded yet.
```
## Approved component decisions
Use this section to record reusable component decisions.
Format:
```text
Component:
Decision:
States covered:
Responsive behavior:
Accessibility notes:
Do not change:
```
Approved component decisions:
```text
None recorded yet.
```
## Approved motion and interaction rules
Default rules:
- Motion must have a purpose.
- Prefer subtle transitions.
- Prefer existing motion tokens when present.
- Avoid heavy animation dependencies.
- Respect reduced-motion patterns when available.
- Never rely on motion alone to communicate state.
Project-specific motion rules:
```text
Unset.
```
## Conversion and product UX rules
Use this section for landing pages, onboarding, pricing, signup, upgrade, install, and activation flows.
Default rules:
- Primary CTA must be unmistakable.
- Secondary CTA must not compete with the primary CTA.
- Install prompts should appear after value is established.
- Avoid dark patterns.
- Explain what happens after important actions.
- Reduce form friction on mobile.
- Make trust signals specific, not generic.
Project-specific conversion rules:
```text
Unset.
```
## Accessibility commitments
Default commitments:
- Do not sacrifice accessibility for visual novelty.
- Prefer native semantics.
- Ensure keyboard reachability.
- Keep focus states visible.
- Provide accessible names for icon-only controls.
- Keep form labels and errors clear.
- Do not rely on color alone.
- Consider target size and touch ergonomics.
- Avoid motion that causes discomfort.
Project-specific accessibility decisions:
```text
Unset.
```
## Anti-patterns to avoid
Default anti-patterns:
- Generic gradient-heavy SaaS hero sections without product specificity.
- Tiny icon-only mobile controls.
- Desktop-only layouts squeezed onto phones.
- One-off colors, spacing, radius, or shadows when tokens exist.
- Install prompts before the user understands value.
- Infinite loading states with no offline or error path.
- Empty states that do not explain what to do next.
- Decorative animation that slows task completion.
- Broad UI rewrites without approval.
Project-specific anti-patterns:
```text
Unset.
```
## Open questions
Use this section when design direction is blocked by missing product context.
```text
- What is the primary audience?
- What feeling should the product create?
- Which screens are most important for first impression?
- Which flows must feel native-app-like?
- Which design patterns are approved or forbidden?
```
Current open questions:
```text
None recorded yet.
```
## Change log
Use this format when updating the design memory:
```text
Date:
Change:
Reason:
Source task:
Affected files/routes:
Approved by:
```
Entries:
```text
No entries yet.
```
