/**
 * Mock for react-native module.
 */
export const Platform = {
  OS: "web" as const,
  select: <T>(obj: Record<string, T>): T => obj.web ?? obj.default!,
};

export default { Platform };
