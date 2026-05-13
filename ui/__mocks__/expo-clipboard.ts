/**
 * Mock for expo-clipboard.
 */
export async function setStringAsync(_value: string): Promise<void> {}
export async function getStringAsync(): Promise<string> {
  return "";
}
