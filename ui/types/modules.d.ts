/**
 * Ambient module declarations for packages that are either:
 *  - Expo/React Native packages mocked in tests (no real install in web)
 *  - Legacy RN UI that will be rewritten in M2/M5
 *
 * These stubs let `tsc --noEmit` succeed without installing the full packages.
 * jest uses the actual __mocks__/ files at runtime.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

declare module "expo-secure-store" {
  export function getItemAsync(
    key: string,
    options?: object,
  ): Promise<string | null>;
  export function setItemAsync(
    key: string,
    value: string,
    options?: object,
  ): Promise<void>;
  export function deleteItemAsync(key: string, options?: object): Promise<void>;
}

declare module "expo-sqlite" {
  export interface SQLiteDatabase {
    execAsync(sql: string): Promise<void>;
    runAsync(
      sql: string,
      ...params: unknown[]
    ): Promise<{ lastInsertRowId: number; changes: number }>;
    getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
    getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
    closeAsync(): Promise<void>;
  }
  export function openDatabaseAsync(name: string): Promise<SQLiteDatabase>;
}

declare module "expo-notifications" {
  export interface NotificationPermissionsStatus {
    status: "granted" | "denied" | "undetermined";
  }
  export interface NotificationResponse {
    notification: { request: { content: { data: Record<string, unknown> } } };
  }
  export function getPermissionsAsync(): Promise<NotificationPermissionsStatus>;
  export function requestPermissionsAsync(): Promise<NotificationPermissionsStatus>;
  export function getExpoPushTokenAsync(
    opts?: object,
  ): Promise<{ data: string }>;
  export function addNotificationResponseReceivedListener(
    listener: (response: NotificationResponse) => void,
  ): { remove: () => void };
  export function setNotificationHandler(handler: object): void;
  export function setNotificationCategoryAsync(
    identifier: string,
    actions: unknown[],
    options?: object,
  ): Promise<void>;
}

declare module "expo-device" {
  export const isDevice: boolean;
}

declare module "react-native" {
  import type { ComponentType, ReactNode, CSSProperties } from "react";

  type RNStyle = Record<string, unknown>;
  type RNProps = {
    style?: RNStyle | RNStyle[];
    children?: ReactNode;
    [key: string]: unknown;
  };

  export const View: ComponentType<RNProps>;
  export const Text: ComponentType<RNProps>;
  export const Pressable: ComponentType<RNProps>;
  export const ScrollView: ComponentType<RNProps>;
  export const FlatList: ComponentType<RNProps>;
  export const TextInput: ComponentType<RNProps>;
  export const TouchableOpacity: ComponentType<RNProps>;
  export const TouchableHighlight: ComponentType<RNProps>;
  export const Image: ComponentType<RNProps>;
  export const Modal: ComponentType<RNProps>;
  export const ActivityIndicator: ComponentType<RNProps>;
  export const SafeAreaView: ComponentType<RNProps>;
  export const KeyboardAvoidingView: ComponentType<RNProps>;
  export const Switch: ComponentType<RNProps>;

  export const StyleSheet: {
    create: <T extends Record<string, RNStyle>>(styles: T) => T;
    flatten: (style: unknown) => RNStyle;
  };

  export const Platform: {
    OS: string;
    select: <T>(map: Record<string, T>) => T;
  };
  export const Dimensions: {
    get: (dim: string) => { width: number; height: number };
  };
  export const Alert: {
    alert: (title: string, message?: string, buttons?: unknown[]) => void;
  };
  export const Keyboard: { dismiss: () => void };
  export const Animated: any;
  export const LayoutAnimation: any;
  export const StatusBar: ComponentType<RNProps> & { setBarStyle: any };

  export type ViewStyle = RNStyle;
  export type TextStyle = RNStyle;
  export type ImageStyle = RNStyle;
  export type StyleProp<T> = T | T[] | null | undefined;
}
