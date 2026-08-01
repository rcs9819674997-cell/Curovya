import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

interface LabDash {
  total_bookings: number;
  by_status: Record<string, number>;
  revenue: number;
  home_collections: number;
}

export default function LabDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<LabDash | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.get<LabDash>("/lab/dashboard");
      setData(d);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <LinearGradient colors={colors.primaryGradient as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.hello}>Welcome,</Text>
              <Text style={styles.name} numberOfLines={1}>{user?.full_name || "Lab Admin"}</Text>
              <Text style={styles.role}>LAB ADMINISTRATOR</Text>
            </View>
            <View style={styles.icon}>
              <Ionicons name="flask" size={32} color="#fff" />
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}><Text style={styles.statVal}>{data?.total_bookings ?? 0}</Text><Text style={styles.statLbl}>Total</Text></View>
            <View style={styles.divider} />
            <View style={styles.stat}><Text style={styles.statVal}>{data?.by_status?.processing ?? 0}</Text><Text style={styles.statLbl}>Processing</Text></View>
            <View style={styles.divider} />
            <View style={styles.stat}><Text style={styles.statVal}>{data?.by_status?.ready ?? 0}</Text><Text style={styles.statLbl}>Ready</Text></View>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.h}>Revenue</Text>
          <View style={styles.revCard}>
            <View style={styles.revIcon}><Ionicons name="cash" size={22} color={colors.success} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.revVal}>Rs {(data?.revenue ?? 0).toLocaleString()}</Text>
              <Text style={styles.revLbl}>Total collected from lab tests</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.h}>Booking Status</Text>
          {Object.entries(data?.by_status || {}).map(([k, v]) => (
            <View key={k} style={styles.row}>
              <View style={[styles.dot, styles[`dot_${k}` as keyof typeof styles] as any]} />
              <Text style={styles.rowLbl}>{k.replace(/_/g, " ")}</Text>
              <Text style={styles.rowVal}>{v}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.h}>Operations</Text>
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: colors.info }]} />
            <Text style={styles.rowLbl}>Home collections</Text>
            <Text style={styles.rowVal}>{data?.home_collections ?? 0}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: 30, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hello: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  name: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 2 },
  role: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "700", letterSpacing: 1, marginTop: 4 },
  icon: { width: 60, height: 60, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", marginTop: 20, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: radius.xl, padding: 14 },
  stat: { flex: 1, alignItems: "center" },
  divider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  statVal: { color: "#fff", fontSize: 22, fontWeight: "800" },
  statLbl: { color: "rgba(255,255,255,0.85)", fontSize: 11, marginTop: 2 },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  h: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  revCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight },
  revIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.successLight, alignItems: "center", justifyContent: "center", marginRight: 12 },
  revVal: { fontSize: 22, fontWeight: "800", color: colors.text },
  revLbl: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 14, borderRadius: radius.lg, marginBottom: 8, borderWidth: 1, borderColor: colors.borderLight },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12, backgroundColor: colors.textDisabled },
  dot_booked: { backgroundColor: colors.info },
  dot_sample_collected: { backgroundColor: "#8B5CF6" },
  dot_processing: { backgroundColor: colors.warning },
  dot_ready: { backgroundColor: colors.success },
  dot_delivered: { backgroundColor: "#64748B" },
  rowLbl: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.text, textTransform: "capitalize" },
  rowVal: { fontSize: 15, fontWeight: "800", color: colors.text },
});
