/**
 * Mock for expo-linking.
 */
export async function openURL(_url: string): Promise<void> {}
export async function canOpenURL(_url: string): Promise<boolean> {
  return false;
}
