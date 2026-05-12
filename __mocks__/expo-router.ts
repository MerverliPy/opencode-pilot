export const useRouter = jest.fn(() => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
}));
export const useLocalSearchParams = jest.fn(() => ({}));
export const Stack = { Screen: jest.fn(() => null) };
