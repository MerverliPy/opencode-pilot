import { Pressable, Text, View } from "react-native";
import { colors, fonts, fontSizes } from "@/theme";
import { Spinner } from "@/components/shared/Spinner";
import type { SessionStatus } from "@/services/types";

type Props = {
  title: string;
  repoName?: string | null;
  status: SessionStatus;
  onMenu: () => void;
  onTitlePress: () => void;
  onRepoPress?: () => void;
  onAbort: () => void;
};

/**
 * Top bar: hamburger | session title + repo name (tappable) | status dot.
 * Tap status dot while busy to abort.
 */
export function TopBar({
  title,
  repoName,
  status,
  onMenu,
  onTitlePress,
  onRepoPress,
  onAbort,
}: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        height: 44,
        paddingHorizontal: 10,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Pressable
        onPress={onMenu}
        hitSlop={12}
        style={{
          width: 32,
          height: 32,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            color: colors.foreground,
            fontFamily: fonts.mono,
            fontSize: 20,
          }}
        >
          ☰
        </Text>
      </Pressable>

      <Pressable
        onPress={onTitlePress}
        style={{ flex: 1, paddingHorizontal: 8, alignItems: "center" }}
      >
        <Text
          numberOfLines={1}
          style={{
            color: colors.foreground,
            fontFamily: fonts.mono,
            fontSize: fontSizes.md,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
        <Pressable onPress={onRepoPress} hitSlop={4}>
          <Text
            numberOfLines={1}
            style={{
              color: repoName ? colors.accent : colors.muted,
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
              textAlign: "center",
              marginTop: 1,
            }}
          >
            {repoName ? `📁 ${repoName}` : "📁 set directory"}
          </Text>
        </Pressable>
      </Pressable>

      <Pressable
        onPress={status === "busy" ? onAbort : undefined}
        hitSlop={12}
        style={{
          width: 32,
          height: 32,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <StatusIndicator status={status} />
      </Pressable>
    </View>
  );
}

function StatusIndicator({ status }: { status: SessionStatus }) {
  if (status === "busy") return <Spinner />;
  const color =
    status === "error"
      ? colors.error
      : status === "aborted"
        ? colors.warning
        : colors.success;
  return <Text style={{ color, fontFamily: fonts.mono, fontSize: 14 }}>●</Text>;
}
