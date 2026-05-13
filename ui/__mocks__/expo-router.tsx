/**
 * Mock for expo-router.
 * The real module will be replaced by React Router in M2.
 */
import { createContext, useContext } from "react";

export function useRouter() {
  return {
    push: (_href: string) => {},
    replace: (_href: string) => {},
    back: () => {},
    setParams: (_params: Record<string, string>) => {},
  };
}

export function usePathname(): string {
  return "/";
}

export function useGlobalSearchParams(): Record<string, string> {
  return {};
}

export function useLocalSearchParams(): Record<string, string> {
  return {};
}

export function Link(_props: unknown): null {
  return null;
}

export function Redirect(_props: unknown): null {
  return null;
}

export const router = {
  push: (_href: string) => {},
  replace: (_href: string) => {},
  back: () => {},
};

export const Slot = ({ children }: { children?: React.ReactNode }) =>
  children ?? null;
export const Tabs = { Screen: () => null };
