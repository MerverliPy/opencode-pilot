---
name: conversion-ux-review
description: Review landing pages, onboarding, pricing, signup, upgrade, and product flows for CTA clarity, trust, friction, motivation, sequencing, and conversion-focused UX.
compatibility: opencode
metadata:
  maturity: stable
---
# Conversion UX Review
## What this skill does
This skill reviews product UI for conversion and task completion. It focuses on whether the interface makes the next action obvious, trustworthy, and valuable.
It is useful for landing pages, onboarding, signup, pricing, activation, upgrade, checkout-like flows, and product tours.
## Use when
- The UI includes a call to action.
- The user asks for landing page, onboarding, signup, pricing, upgrade, or conversion improvement.
- A redesign needs product strategy input.
- The interface must explain value quickly.
- `/ui-audit`, `/pwa-redesign`, or `/ship-ui` involves conversion-sensitive flows.
## Inputs
- Target page or flow.
- Product goal.
- Primary audience if known.
- Current copy and layout.
- Relevant UI files.
- Brand or business constraints if provided.
## Procedure
1. Identify the conversion goal.
   - Sign up
   - Start trial
   - Install app
   - Complete onboarding
   - Create first item
   - Upgrade
   - Purchase
   - Book call
   - Continue task
   - Learn more
2. Separate facts from assumptions.
   - Do not invent audience data or analytics.
   - Label inferred intent.
3. Check value clarity.
   - What is the product?
   - Who is it for?
   - What problem does it solve?
   - Why now?
   - What happens after the click?
4. Check CTA hierarchy.
   - Primary CTA should be unmistakable.
   - Secondary CTA should not compete.
   - CTA copy should be specific.
   - CTA placement should match user readiness.
5. Check friction.
   - Too many choices
   - Long forms
   - Unclear pricing
   - Missing trust signals
   - Hidden next step
   - Weak error recovery
   - Mobile friction
6. Check trust.
   - Social proof when available
   - Security or privacy reassurance when relevant
   - Transparent expectations
   - Clear product screenshots or examples when available
   - No exaggerated claims
7. Check sequence.
   - Headline
   - Value proof
   - Product demonstration
   - Objection handling
   - CTA
   - Supporting details
8. Check PWA/mobile conversion.
   - Install prompts should appear after value is established.
   - Mobile CTAs should be reachable.
   - Onboarding should avoid long desktop-style forms.
9. Recommend improvements.
   - Prioritize the changes most likely to improve clarity and action.
## Output format
## Conversion UX review
- Surface:
- Conversion goal:
- Known facts:
- Assumptions:
## Findings
| Priority | Finding | Why it matters | Suggested fix |
|---|---|---|---|
## Conversion polish pass
- Value clarity:
- CTA hierarchy:
- Trust:
- Friction:
- Sequence:
- Mobile/PWA behavior:
## Suggested copy improvements
Provide concise alternate CTA, headline, helper, or state copy only when useful.
## Anti-patterns
- Do not invent analytics.
- Do not over-optimize conversion at the expense of trust.
- Do not make install prompts too aggressive.
- Do not hide pricing or expectations.
- Do not add dark patterns.
- Do not make every element a CTA.
- Do not recommend broad rewrites when focused copy/layout changes solve the issue.
## Token notes
- Load only for conversion-sensitive UI.
- Inspect relevant page, copy, and component files.
- Keep findings tied to user action.
- Avoid broad product strategy unless requested.
## Validation checklist
- [ ] Conversion goal is explicit.
- [ ] CTA hierarchy is reviewed.
- [ ] Value clarity is reviewed.
- [ ] Trust and friction are reviewed.
- [ ] Mobile/PWA behavior is considered.
- [ ] Recommendations avoid dark patterns.
