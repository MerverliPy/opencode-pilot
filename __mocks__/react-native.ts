export const Platform = {
  OS: "ios",
  select: jest.fn((obj: any) => obj.ios),
};
export const StyleSheet = {
  create: jest.fn((styles: any) => styles),
};
export const View = "View";
export const Text = "Text";
export const TextInput = "TextInput";
export const Pressable = "Pressable";
export const FlatList = "FlatList";
export const SectionList = "SectionList";
export const ScrollView = "ScrollView";
export const Modal = "Modal";
export const ActivityIndicator = "ActivityIndicator";
export const Switch = "Switch";
export const Alert = {
  alert: jest.fn(),
};
