import { useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { ModalShell } from "./ModalShell";
import { colors, fonts, fontSizes } from "@/theme";
import { useServerStore } from "@/store/server";
import { useSessionStore } from "@/store/session";

type Props = { onClose: () => void };

export function TitleEditModal({ onClose }: Props) {
  const client = useServerStore((s) => s.client());
  const session = useSessionStore((s) => s.session);
  const updateTitle = useSessionStore((s) => s.updateTitle);

  const [value, setValue] = useState(session?.title ?? "");
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!client || !session) return;
    const trimmed = value.trim();
    if (!trimmed) {
      Alert.alert("Title required", "Please enter a session title.");
      return;
    }
    setSaving(true);
    try {
      const updated = await client.updateSession(session.id, {
        title: trimmed,
      });
      updateTitle(updated.title);
      onClose();
    } catch (e) {
      Alert.alert("Save failed", (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="rename session"
      onClose={onClose}
      rightAction={{
        label: saving ? "saving…" : "save",
        onPress: onSave,
      }}
    >
      <View style={{ padding: 16, gap: 12 }}>
        <Text
          style={{
            color: colors.muted,
            fontFamily: fonts.mono,
            fontSize: fontSizes.xs,
            letterSpacing: 1,
          }}
        >
          SESSION TITLE
        </Text>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="session title"
          placeholderTextColor={colors.mutedAlt}
          autoFocus
          selectTextOnFocus
          returnKeyType="done"
          onSubmitEditing={onSave}
          style={{
            color: colors.foreground,
            fontFamily: fonts.mono,
            fontSize: fontSizes.md,
            height: 40,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 4,
            paddingHorizontal: 10,
            backgroundColor: colors.surface,
          }}
        />
      </View>
    </ModalShell>
  );
}
