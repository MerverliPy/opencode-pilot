---
description: Score a UI surface across product clarity, visual hierarchy, PWA feel, accessibility, performance risk, consistency, conversion, and differentiation.
agent: pwa-ui-designer
---
Create a UI scorecard for the requested surface.
User request or target:
$ARGUMENTS
Use this workflow:
1. Identify the UI surface, route, component, or flow.
2. Read `docs/ui-design-memory.md` if available.
3. Inspect only relevant UI, layout, component, style, token, and theme files.
4. Separate known facts from assumptions.
5. Score the UI from 1 to 5 in each category.
6. Explain each score with concrete evidence.
7. Identify the top 3 improvements.
8. Do not edit files unless the user explicitly asks for implementation after the scorecard.
Scoring scale:
```text
5 = Excellent; production-ready and distinctive.
4 = Strong; minor improvement available.
3 = Usable but noticeably improvable.
2 = Weak; significant UI/UX issue.
1 = Poor; blocks trust, usability, or task completion.
0 = Not enough evidence to score.
```
Score categories:
- Product clarity
- Visual hierarchy
- First impression
- Mobile ergonomics
- PWA app-like feel
- Accessibility
- Performance-sensitive UI risk
- Design-system consistency
- Conversion or task-completion clarity
- Differentiation
- Generic-SaaS risk
- Overall ship confidence
Output format:
## UI scorecard
- Surface:
- Product goal:
- Known facts:
- Assumptions:
| Category | Score | Evidence | Highest-leverage improvement |
|---|---:|---|---|
| Product clarity | 0-5 | | |
| Visual hierarchy | 0-5 | | |
| First impression | 0-5 | | |
| Mobile ergonomics | 0-5 | | |
| PWA app-like feel | 0-5 | | |
| Accessibility | 0-5 | | |
| Performance-sensitive UI risk | 0-5 | | |
| Design-system consistency | 0-5 | | |
| Conversion/task clarity | 0-5 | | |
| Differentiation | 0-5 | | |
| Generic-SaaS risk | 0-5 | | |
| Overall ship confidence | 0-5 | | |
## Top 3 improvements
1. 
2. 
3. 
## Recommendation
State one of:
- Ship as-is.
- Ship with follow-ups.
- Improve before ship.
- Redesign direction needed.
- Not enough evidence.
## Approval needed
State whether implementation approval is needed.
