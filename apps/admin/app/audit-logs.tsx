import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

interface AuditLog {
  id: string; actor_id: string; actor_email: string; actor_role: string;
  action: string; target: string; meta?: any; created_at: string;
}

function actionIcon(a: string): keyof typeof Ionicons.glyphMap {
  if (a.includes("approve")) return "checkmark-circle";
  if (a.includes("suspend")) return "ban";
  if (a.includes("unsuspend")) return "refresh-circle";
  return "shield-checkmark";
}

// ── Extracted row for React.memo — critical with 200 items ──────────────
const AuditRow = React.memo(function AuditRow({ l }: { l: AuditLog }) {
  return (
    <View style={styles.row} testID={`audit-${l.id}`}>
      <View style={styles.icon}>
        <Ionicons name={actionIcon(l.action)} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.action}>{l.action.replace(/_/g, " ")}</Text>
        <Text style={styles.sub}>{l.actor_email} · target: {l.target || "—"}</Text>
        <Text style={styles.time}>{new Date(l.created_at).toLocaleString()}</Text>
      </View>
    </View>
  );
});

export default function AuditLogs() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.get<AuditLog[]>("/admin/audit-logs?limit=200");
      setLogs(d);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const renderItem = useCallback(({ item }: { item: AuditLog }) => (
    <AuditRow l={item} />
  ), []);

  const keyExtractor = useCallback((item: AuditLog) => item.id, []);

  const renderEmpty = useCallback(() => (
    <View style={styles.empty}>
      <Ionicons name="document-text-outline" size={44} color={colors.textDisabled} />
      <Text style={styles.emptyTxt}>No audit events yet.</Text>
    </View>
  ), []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="audit-back"><Ionicons name="chevron-back" size={26} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Audit Logs</Text>
        <View style={{ width: 26 }} />
      </View>
      <FlatList
        data={logs}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        initialNumToRender={20}
        maxToRenderPerBatch={15}
        windowSize={5}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: "#fff", padding: 14, borderRadius: radius.lg, marginBottom: 8, borderWidth: 1, borderColor: colors.borderLight },
  icon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  action: { fontSize: 14, fontWeight: "700", color: colors.text, textTransform: "capitalize" },
  sub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  time: { fontSize: 11, color: colors.textDisabled, marginTop: 4 },
  empty: { alignItems: "center", padding: 40 },
  emptyTxt: { fontSize: 14, color: colors.textSecondary, marginTop: 10, fontWeight: "600" },
});
