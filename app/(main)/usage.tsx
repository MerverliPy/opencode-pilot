import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { colors, fonts, fontSizes } from "@/theme";
import { useN9RouterStore } from "@/store/n9router";
import { N9RouterClient, ProviderSummary } from "@/services/n9router";

type PeriodOption = "1h" | "24h" | "7d" | "30d";

const PERIODS: PeriodOption[] = ["1h", "24h", "7d", "30d"];

import { ScreenHeader } from "@/components/shared/ScreenHeader";

export default function UsageScreen() {
  const nav = useNavigation();
  const n9Client = useN9RouterStore((s) => s.client());

  const [period, setPeriod] = useState<PeriodOption>("24h");
  const [summaries, setSummaries] = useState<ProviderSummary[]>([]);
  const [totalRequests, setTotalRequests] = useState(0);
  const [totalSuccess, setTotalSuccess] = useState(0);
  const [totalPromptTokens, setTotalPromptTokens] = useState(0);
  const [totalCompletionTokens, setTotalCompletionTokens] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!n9Client) {
      setError("n9router not configured. Add URL in Settings.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const stats = await n9Client.usageStats(period);
      const s = N9RouterClient.summarizeByProvider(stats);
      setSummaries(s);
      const reqs = stats.recentRequests ?? [];
      setTotalRequests(reqs.length);
      setTotalSuccess(reqs.filter((r) => r.status === "success").length);
      setTotalPromptTokens(reqs.reduce((a, r) => a + (r.promptTokens ?? 0), 0));
      setTotalCompletionTokens(
        reqs.reduce((a, r) => a + (r.completionTokens ?? 0), 0),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load usage");
    } finally {
      setLoading(false);
    }
  }, [n9Client, period]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxRequests = summaries.reduce((m, s) => Math.max(m, s.requests), 1);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top", "bottom"]}
    >
      <ScreenHeader
        title="usage"
        onMenu={() => nav.dispatch(DrawerActions.openDrawer())}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            tintColor={colors.accent}
          />
        }
      >
        {/* Period selector */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 8,
          }}
        >
          {PERIODS.map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={({ pressed }) => ({
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: period === p ? colors.accent : colors.border,
                backgroundColor: pressed
                  ? colors.surfaceAlt
                  : period === p
                    ? colors.surface
                    : "transparent",
              })}
            >
              <Text
                style={{
                  color: period === p ? colors.accent : colors.muted,
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.xs,
                }}
              >
                {p}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? (
          <Text
            style={{
              color: colors.muted,
              fontFamily: fonts.mono,
              fontSize: fontSizes.sm,
              padding: 24,
              textAlign: "center",
            }}
          >
            {error}
          </Text>
        ) : (
          <>
            {/* Summary cards */}
            <View
              style={{
                flexDirection: "row",
                paddingHorizontal: 12,
                gap: 8,
                marginBottom: 4,
              }}
            >
              <StatCard label="requests" value={String(totalRequests)} />
              <StatCard
                label="success"
                value={
                  totalRequests > 0
                    ? `${Math.round((totalSuccess / totalRequests) * 100)}%`
                    : "—"
                }
                accent={totalRequests > 0 && totalSuccess === totalRequests}
              />
              <StatCard
                label="prompt tok"
                value={fmtTokens(totalPromptTokens)}
              />
              <StatCard
                label="compl tok"
                value={fmtTokens(totalCompletionTokens)}
              />
            </View>

            {/* Per-provider breakdown */}
            <SectionHeader title="by provider" />
            {summaries.length === 0 && !loading && (
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.sm,
                  padding: 16,
                }}
              >
                no data for this period
              </Text>
            )}
            {summaries.map((s) => (
              <ProviderRow
                key={s.provider}
                summary={s}
                maxRequests={maxRequests}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 6, marginTop: 12 }}>
      <Text
        style={{
          color: colors.muted,
          fontFamily: fonts.mono,
          fontSize: fontSizes.xs,
          letterSpacing: 1,
        }}
      >
        {title.toUpperCase()}
      </Text>
    </View>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 10,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: accent ? colors.accent : colors.foreground,
          fontFamily: fonts.mono,
          fontSize: fontSizes.md,
          fontWeight: "700",
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: colors.muted,
          fontFamily: fonts.mono,
          fontSize: 9,
          marginTop: 3,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function ProviderRow({
  summary: s,
  maxRequests,
}: {
  summary: ProviderSummary;
  maxRequests: number;
}) {
  const barWidth =
    maxRequests > 0 ? `${Math.round((s.requests / maxRequests) * 100)}%` : "0%";
  const successRate =
    s.requests > 0 ? Math.round((s.success / s.requests) * 100) : 0;

  return (
    <View
      style={{
        marginHorizontal: 12,
        marginBottom: 8,
        backgroundColor: colors.surface,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
      }}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}
      >
        <Text
          style={{
            flex: 1,
            color: colors.foreground,
            fontFamily: fonts.mono,
            fontSize: fontSizes.sm,
          }}
          numberOfLines={1}
        >
          {s.provider}
        </Text>
        <Text
          style={{
            color:
              successRate === 100
                ? colors.accent
                : successRate < 50
                  ? "#e05252"
                  : colors.muted,
            fontFamily: fonts.mono,
            fontSize: fontSizes.xs,
          }}
        >
          {s.requests} req · {successRate}%
        </Text>
      </View>
      {/* Bar */}
      <View
        style={{
          height: 3,
          backgroundColor: colors.border,
          borderRadius: 2,
          overflow: "hidden",
          marginBottom: 6,
        }}
      >
        <View
          style={{
            height: 3,
            width: barWidth as `${number}%`,
            backgroundColor: colors.accent,
            borderRadius: 2,
          }}
        />
      </View>
      {/* Tokens */}
      <Text
        style={{
          color: colors.muted,
          fontFamily: fonts.mono,
          fontSize: fontSizes.xs,
        }}
      >
        {fmtTokens(s.promptTokens)} prompt · {fmtTokens(s.completionTokens)}{" "}
        completion
        {s.errors > 0 && ` · ${s.errors} err`}
      </Text>
    </View>
  );
}
