/**
 * EmptyState: shown when a memory list is empty.
 */
import { Text, View } from "react-native";
import { colors, fonts, fontSizes } from "../../../../theme";

type Props = {
  message?: string;
};

export function EmptyState({ message = "no memories yet" }: Props) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      <Text
        style={{
          color: colors.mutedAlt,
          fontFamily: fonts.mono,
          fontSize: fontSizes.md,
          textAlign: "center",
        }}
      >
        {message}
      </Text>
      <Text
        style={{
          color: colors.mutedAlt,
          fontFamily: fonts.mono,
          fontSize: fontSizes.xs,
          textAlign: "center",
          marginTop: 8,
          lineHeight: fontSizes.xs * 1.6,
        }}
      >
        {"memories are extracted automatically\nafter each conversation ends"}
      </Text>
    </View>
  );
}
