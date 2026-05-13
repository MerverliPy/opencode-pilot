/**
 * Mock for expo-secure-store.
 * All exports are jest.fn() so tests can use mockResolvedValue / toHaveBeenCalledWith.
 * The real module was replaced by localStorage in auth.ts for the web client.
 */

const _store: Record<string, string> = {};

export const getItemAsync = jest.fn(
  async (key: string): Promise<string | null> => {
    return _store[key] ?? null;
  },
);

export const setItemAsync = jest.fn(
  async (key: string, value: string): Promise<void> => {
    _store[key] = value;
  },
);

export const deleteItemAsync = jest.fn(async (key: string): Promise<void> => {
  delete _store[key];
});
