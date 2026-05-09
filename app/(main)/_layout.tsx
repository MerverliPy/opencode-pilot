import { Drawer } from "expo-router/drawer";
import { View } from "react-native";
import { colors } from "@/theme";
import { DrawerContent } from "@/components/drawer/DrawerContent";
import { useUIStore } from "@/store/ui";
import { useSessionStore } from "@/store/session";
import { useServerStore } from "@/store/server";
import { saveSessionWorkdir } from "@/services/auth";
import { SessionsModal } from "@/components/modals/SessionsModal";
import { SlashModal } from "@/components/modals/SlashModal";
import { MentionModal } from "@/components/modals/MentionModal";
import { ModelModal } from "@/components/modals/ModelModal";
import { AgentModal } from "@/components/modals/AgentModal";
import { FileViewModal } from "@/components/modals/FileViewModal";
import { WorkdirSheet } from "@/components/modals/WorkdirSheet";
import { ErrorBadge } from "@/components/shared/ErrorBadge";

export default function MainLayout() {
  const modal = useUIStore((s) => s.modal);
  const closeModal = useUIStore((s) => s.closeModal);
  const session = useSessionStore((s) => s.session);
  const workdir = useSessionStore((s) => s.workdir);
  const setWorkdir = useSessionStore((s) => s.setWorkdir);
  const server = useServerStore((s) => s.active());

  return (
    <View style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <DrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerType: "front",
          drawerStyle: {
            backgroundColor: colors.background,
            width: "78%",
          },
          overlayColor: "rgba(0,0,0,0.55)",
          sceneStyle: { backgroundColor: colors.background },
          swipeEdgeWidth: 40,
        }}
      >
        <Drawer.Screen name="index" options={{ title: "opencode" }} />
        <Drawer.Screen name="files" options={{ title: "file browser" }} />
        <Drawer.Screen name="diff" options={{ title: "diff viewer" }} />
        <Drawer.Screen name="settings" options={{ title: "settings" }} />
        <Drawer.Screen name="memory" options={{ title: "memory" }} />
      </Drawer>

      <ErrorBadge />

      {modal?.kind === "sessions" && <SessionsModal onClose={closeModal} />}
      {modal?.kind === "slash" && <SlashModal onClose={closeModal} />}
      {modal?.kind === "mention" && <MentionModal onClose={closeModal} />}
      {modal?.kind === "model" && <ModelModal onClose={closeModal} />}
      {modal?.kind === "agent" && <AgentModal onClose={closeModal} />}
      {modal?.kind === "file-view" && (
        <FileViewModal path={modal.path} onClose={closeModal} />
      )}
      {modal?.kind === "workdir" && (
        <WorkdirSheet
          visible
          initialPath={workdir}
          onClose={closeModal}
          onSelect={async (path) => {
            setWorkdir(path);
            if (server && session) {
              await saveSessionWorkdir(server.id, session.id, path);
            }
          }}
        />
      )}
    </View>
  );
}
