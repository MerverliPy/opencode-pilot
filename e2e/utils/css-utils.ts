/**
 * CSS inspection utilities for E2E tests.
 *
 * Pure functions that operate on browser DOM APIs (CSSRuleList, Document).
 * No Playwright page/browser dependencies — these are meant to be called
 * inside page.evaluate() blocks.
 */

/**
 * Check if a CSSRuleList contains rules matching a predicate.
 * Uses indexed access since CSSRuleList is not iterable in strict TS.
 */
export function hasMatchingRule(
  rules: CSSRuleList,
  predicate: (rule: CSSRule) => boolean,
): boolean {
  for (let i = 0; i < rules.length; i++) {
    if (predicate(rules[i])) return true;
  }
  return false;
}

/**
 * Check if any CSS rule applies env() safe-area-inset padding.
 */
export function hasEnvPadding(rules: CSSRuleList): boolean {
  return hasMatchingRule(rules, (rule) => {
    if (!(rule instanceof CSSStyleRule)) return false;
    const css = rule.cssText;
    return css.includes('env(safe-area-inset');
  });
}

/**
 * Get all CSS rules from a document that match a selector.
 */
export function getRulesForSelector(
  document: Document,
  selector: string,
): CSSRuleList | null {
  for (const sheet of document.styleSheets) {
    try {
      const rules = sheet.cssRules;
      for (let i = 0; i < rules.length; i++) {
        if (rules[i] instanceof CSSStyleRule && (rules[i] as CSSStyleRule).selectorText === selector) {
          return rules;
        }
      }
    } catch {
      // Cross-origin stylesheets throw on access
    }
  }
  return null;
}