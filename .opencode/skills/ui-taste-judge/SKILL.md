---
name: ui-taste-judge
description: Score whether a UI feels premium, coherent, product-specific, differentiated, trustworthy, and free from generic SaaS visual drift.
compatibility: opencode
metadata:
  maturity: stable
---
# UI Taste Judge
## What this skill does
This skill evaluates the subjective but repeatable quality of a UI: taste, coherence, polish, product specificity, emotional pull, and differentiation.
It turns “does this look good?” into a structured design judgment.
## Use when
- The user asks whether a UI stands out.
- A redesign direction needs quality scoring.
- A UI feels generic, flat, or template-like.
- The team needs to compare design directions.
- `/ui-scorecard`, `/pwa-redesign`, or `/ship-ui` needs taste judgment.
## Inputs
- Target UI surface, screenshot, description, code, or design direction.
- Product goal.
- Audience if known.
- `docs/ui-design-memory.md` if available.
- Existing design-system constraints if available.
- Known PWA/mobile priorities.
## Procedure
1. Identify the UI surface and product goal.
2. Read design memory when available.
3. Separate facts from assumptions.
4. Score the UI on the taste dimensions.
5. Explain the score with concrete design observations.
6. Identify the strongest visual move.
7. Identify the weakest or most generic pattern.
8. Recommend one improvement that would most increase perceived quality.
9. Do not recommend novelty that harms usability, accessibility, or trust.
## Score scale
```text
5 = Distinctive, premium, coherent, product-specific.
4 = Strong and polished, with minor generic areas.
3 = Competent but not memorable.
2 = Generic or inconsistent; needs clear direction.
1 = Weak, cluttered, untrustworthy, or visually confused.
0 = Not enough evidence.
```
## Taste dimensions
- First impression
- Product specificity
- Visual hierarchy
- Typography confidence
- Spacing rhythm
- Surface quality
- Color intentionality
- Motion restraint
- Brand fit
- Native/PWA feel
- Trust
- Emotional pull
- Differentiation
- Generic-SaaS risk
## Output format
## UI taste judgment
- Surface:
- Product goal:
- Known facts:
- Assumptions:
| Dimension | Score | Evidence |
|---|---:|---|
| First impression | 0-5 | |
| Product specificity | 0-5 | |
| Visual hierarchy | 0-5 | |
| Typography confidence | 0-5 | |
| Spacing rhythm | 0-5 | |
| Surface quality | 0-5 | |
| Color intentionality | 0-5 | |
| Motion restraint | 0-5 | |
| Brand fit | 0-5 | |
| Native/PWA feel | 0-5 | |
| Trust | 0-5 | |
| Emotional pull | 0-5 | |
| Differentiation | 0-5 | |
| Generic-SaaS risk | 0-5 | |
## Judgment
- Overall taste score:
- Strongest design move:
- Weakest design move:
- Generic-SaaS risk:
- Highest-leverage improvement:
## Anti-patterns
- Do not confuse trendy visuals with taste.
- Do not recommend visual novelty without product reason.
- Do not ignore accessibility.
- Do not punish simple design if it is precise and clear.
- Do not invent audience or brand facts.
- Do not score without evidence.
- Do not give vague feedback like “make it more modern.”
## Token notes
- Load only when taste, differentiation, or design scoring matters.
- Keep scoring compact.
- Use design memory instead of re-deriving brand taste each time.
- Do not inspect unrelated repo files.
## Validation checklist
- [ ] Product goal is identified.
- [ ] Facts and assumptions are separated.
- [ ] Scores include evidence.
- [ ] Generic-SaaS risk is addressed.
- [ ] Recommendation is concrete.
- [ ] Accessibility and trust are not sacrificed for novelty.
