---
name: visual-direction
description: Generate 2-3 distinctive UI design directions before major PWA redesign or polish work, including safe polish, premium app-like PWA, and bold differentiated concepts.
compatibility: opencode
metadata:
  maturity: stable
---

# Visual Direction

## What this skill does

This skill forces the PWA UI Designer to behave like a design director before implementation. It prevents generic UI generation by producing distinct creative directions with tradeoffs, implementation implications, and a recommendation.

## Use when

- The user asks for a redesign.
- The user wants the UI to stand out.
- The current visual direction is unclear.
- Multiple valid UI approaches exist.
- The request involves brand feel, product personality, landing page direction, dashboard polish, onboarding, app-shell feel, or major component refresh.
- The user asks for code changes but has not selected a design direction.

## Inputs

- Product type and goal.
- Target user and primary action.
- Existing UI or files if available.
- Brand constraints if available.
- Stack and styling system if known.
- Accessibility and performance constraints.
- User preference for conservative, balanced, bold, or experimental direction.

## Procedure

1. State the design objective.
   - Use one sentence.
   - Tie it to the product goal, not only aesthetics.

2. Identify constraints.
   - Existing brand direction.
   - Existing components or design tokens.
   - Mobile/PWA expectations.
   - Accessibility and performance requirements.
   - Implementation risk.

3. Diagnose the current UI if evidence exists.
   - Hierarchy
   - Spacing
   - Typography
   - Color and contrast
   - Density
   - Layout
   - Navigation
   - Component consistency
   - State quality
   - PWA feel

4. Generate two or three directions.

   Direction A: Safe polish
   - Preserve structure.
   - Improve hierarchy, spacing, typography, contrast, and consistency.
   - Lowest risk.

   Direction B: Premium app-like PWA
   - Make the interface feel native, tactile, responsive, and app-shell-driven.
   - Prioritize mobile ergonomics, sticky actions, polished state handling, and smooth but restrained interactions.
   - Best default for PWA work.

   Direction C: Bold differentiated concept
   - Introduce a stronger visual identity.
   - May change density, layout, composition, surface language, or interaction model.
   - Requires explicit approval.

5. For each direction, include:
   - Visual feel
   - Layout approach
   - Component treatment
   - PWA/mobile behavior
   - Accessibility/performance notes
   - Implementation risk
   - Best use case

6. Recommend one direction.
   - Explain why it best fits the product.
   - Mention what is intentionally not chosen.
   - Identify files likely involved if repo evidence is available.

7. Ask for approval before implementation unless approval was already given.

## Output format

### Design objective

One sentence.

### Current diagnosis

- Strengths:
- Weaknesses:
- Biggest opportunity:

### Direction A — Safe polish

- Feel:
- Layout:
- Components:
- PWA/mobile behavior:
- Accessibility/performance:
- Risk:

### Direction B — Premium app-like PWA

- Feel:
- Layout:
- Components:
- PWA/mobile behavior:
- Accessibility/performance:
- Risk:

### Direction C — Bold differentiated concept

- Feel:
- Layout:
- Components:
- PWA/mobile behavior:
- Accessibility/performance:
- Risk:

### Recommendation

State the recommended direction and why.

### Approval gate

State what needs approval before editing.

## Anti-patterns

- Do not provide three directions that are basically the same.
- Do not make every direction a visual trend.
- Do not ignore existing brand or components.
- Do not recommend a bold redesign when a safe polish solves the problem.
- Do not implement before the direction is selected.
- Do not use words like "modern" or "clean" without concrete design choices.
- Do not add animation or dependencies as a substitute for design quality.

## Token notes

- Load only for redesign, standout UI, ambiguous UI direction, or major polish.
- Keep each direction compact.
- Avoid reading unrelated backend files.
- Once a direction is selected, summarize the decision and stop repeating the full comparison.

## Validation checklist

- [ ] Design objective is product-specific.
- [ ] Directions are meaningfully distinct.
- [ ] Premium app-like PWA option is included for PWA work.
- [ ] Recommendation is explicit.
- [ ] Accessibility and performance are mentioned.
- [ ] Implementation risk is identified.
- [ ] Approval gate is present before edits.