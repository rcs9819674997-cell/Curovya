import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

interface Overview {
  users_total: number;
  doctors_total: number;
  clinics_total: number;
  appts_total: number;
  labs_total: number;
  pending_approvals: { doctors: number; clinics: number };
  active_subscribers: number;
  revenue: { appointments: number; labs: number; subscriptions: number; total: number };
}

// ── Extracted & memoized to avoid re-creation on every parent render ────
const StatCard = React.memo(function StatCard({
  icon,
  label,
  value,
  color = colors.primary,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color?: string;
  testID?: string;
}) {
  return (
    <View style={styles.statCard} testID={testID}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
});

export default function AdminOverview() {
  const { user } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.get<Overview>("/admin/overview");
      setData(d);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <LinearGradient colors={["#0F172A", "#1E293B"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.hello}>Welcome,</Text>
              <Text style={styles.name} numberOfLines={1}>{user?.full_name || "Admin"}</Text>
              <Text style={styles.role}>SUPER ADMINISTRATOR</Text>
            </View>
            <View style={styles.icon}>
              <Ionicons name="shield-checkmark" size={32} color="#FDE047" />
            </View>
          </View>

          <View style={styles.revCard}>
            <Text style={styles.revLbl}>Total Platform Revenue</Text>
            <Text style={styles.revVal}>Rs {(data?.revenue.total ?? 0).toLocaleString()}</Text>
            <View style={styles.revBreak}>
              <View style={styles.revItem}>
                <Text style={styles.revItemVal}>Rs {(data?.revenue.appointments ?? 0).toLocaleString()}</Text>
                <Text style={styles.revItemLbl}>Appointments</Text>
              </View>
              <View style={styles.divVert} />
              <View style={styles.revItem}>
                <Text style={styles.revItemVal}>Rs {(data?.revenue.labs ?? 0).toLocaleString()}</Text>
                <Text style={styles.revItemLbl}>Labs</Text>
              </View>
              <View style={styles.divVert} />
              <View style={styles.revItem}>
                <Text style={styles.revItemVal}>Rs {(data?.revenue.subscriptions ?? 0).toLocaleString()}</Text>
                <Text style={styles.revItemLbl}>Plus</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.h}>Platform Metrics</Text>
          <View style={styles.grid}>
            <StatCard icon="people" label="Total Users" value={data?.users_total ?? 0} color={colors.primary} testID="stat-users" />
            <StatCard icon="medkit" label="Doctors" value={data?.doctors_total ?? 0} color={colors.info} testID="stat-doctors" />
            <StatCard icon="business" label="Clinics" value={data?.clinics_total ?? 0} color={colors.warning} testID="stat-clinics" />
            <StatCard icon="calendar" label="Appointments" value={data?.appts_total ?? 0} color={colors.success} testID="stat-appts" />
            <StatCard icon="flask" label="Lab Tests" value={data?.labs_total ?? 0} color="#8B5CF6" testID="stat-labs" />
            <StatCard icon="ribbon" label="Plus Members" value={data?.active_subscribers ?? 0} color="#FDE047" testID="stat-plus" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.h}>Pending Approvals</Text>
          <View style={styles.pendCard}>
            <View style={styles.pendRow}>
              <Ionicons name="medkit-outline" size={20} color={colors.info} />
              <Text style={styles.pendLbl}>Doctor verifications</Text>
              <Text style={styles.pendVal}>{data?.pending_approvals.doctors ?? 0}</Text>
            </View>
            <View style={[styles.pendRow, { borderTopWidth: 1, borderTopColor: colors.borderLight }]}>
              <Ionicons name="business-outline" size={20} color={colors.warning} />
              <Text style={styles.pendLbl}>Clinic approvals</Text>
              <Text style={styles.pendVal}>{data?.pending_approvals.clinics ?? 0}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { padding: spacing.xl, paddingBottom: 30, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hello: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
  name: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 2 },
  role: { color: "#FDE047", fontSize: 11, fontWeight: "800", letterSpacing: 1, marginTop: 4 },
  icon: { width: 60, height: 60, borderRadius: 20, backgroundColor: "rgba(253,224,71,0.15)", alignItems: "center", justifyContent: "center" },
  revCard: { marginTop: 20, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: radius.xl, padding: 16 },
  revLbl: { color: "rgba(255,255,255,0.75)", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  revVal: { color: "#fff", fontSize: 30, fontWeight: "800", marginTop: 4 },
  revBreak: { flexDirection: "row", marginTop: 14, backgroundColor: "rgba(0,0,0,0.2)", borderRadius: radius.md, padding: 10 },
  revItem: { flex: 1, alignItems: "center" },
  divVert: { width: 1, backgroundColor: "rgba(255,255,255,0.15)" },
  revItemVal: { color: "#fff", fontSize: 14, fontWeight: "700" },
  revItemLbl: { color: "rgba(255,255,255,0.6)", fontSize: 10, marginTop: 2 },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  h: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "31%", backgroundColor: "#fff", padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight, flexGrow: 1 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statVal: { fontSize: 18, fontWeight: "800", color: colors.text },
  statLbl: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  pendCard: { backgroundColor: "#fff", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight, overflow: "hidden" },
  pendRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  pendLbl: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.text },
  pendVal: { fontSize: 18, fontWeight: "800", color: colors.primary },
});
