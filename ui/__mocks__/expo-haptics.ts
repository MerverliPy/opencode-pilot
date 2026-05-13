/**
 * Mock for expo-haptics.
 */
export function notificationAsync(_style: unknown): void {}
export function impactAsync(_style: unknown): Promise<void> {
  return Promise.resolve();
}
