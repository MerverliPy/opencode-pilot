import { getSystemTheme, getResolvedColors, darkColors, lightColors, fonts, fontSizes } from "../theme";

describe("getSystemTheme", () => {
  it("returns 'dark' when matchMedia is not available", () => {
    const result = getSystemTheme();
    expect(result).toBe("dark");
  });

  it("returns 'light' when prefers-color-scheme: light matches", () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: light)",
    }));
    expect(getSystemTheme()).toBe("light");
  });

  it("returns 'dark' when prefers-color-scheme: dark is active", () => {
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
    }));
    expect(getSystemTheme()).toBe("dark");
  });
});

describe("getResolvedColors", () => {
  it("returns darkColors for 'dark' theme", () => {
    expect(getResolvedColors("dark")).toBe(darkColors);
  });

  it("returns lightColors for 'light' theme", () => {
    expect(getResolvedColors("light")).toBe(lightColors);
  });

  it("defaults to system theme when not specified", () => {
    expect(getResolvedColors()).toBe(darkColors);
  });
});

describe("fonts", () => {
  it("contains mono and sans font stacks", () => {
    expect(fonts.mono).toContain("monospace");
    expect(fonts.sans).toContain("sans-serif");
  });
});

describe("fontSizes", () => {
  it("has expected rem values", () => {
    expect(fontSizes.xs).toBe("0.6875rem");
    expect(fontSizes.sm).toBe("0.8125rem");
    expect(fontSizes.md).toBe("0.9375rem");
    expect(fontSizes.lg).toBe("1.125rem");
    expect(fontSizes.xl).toBe("1.375rem");
  });
});
