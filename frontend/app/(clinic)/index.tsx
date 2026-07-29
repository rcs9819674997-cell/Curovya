import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/src/components/UI";
import { api, ApiError } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

interface ClinicDoctor {
  id: string;
  name: string;
  specialty: string;
  photo_url: string;
  today_count: number;
  today_completed: number;
  today_revenue: number;
}

interface Dashboard {
  clinic: { id: string; name: string; address: string; phone: string; doctor_ids: string[]; departments: string[] };
  date: string;
  today: { total: number; completed: number; in_consultation: number; waiting: number; cancelled: number; revenue: number };
  monthly_revenue: number;
  total_patients: number;
  upcoming_next_7_days: number;
  doctor_count: number;
  doctors: ClinicDoctor[];
}

function currency(n: number) {
  return "Rs. " + Math.round(n).toLocaleString();
}

export default function ClinicDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<Dashboard | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.clinic_id) return;
    try {
      const d = await api.get<Dashboard>(`/clinic/${user.clinic_id}/dashboard`);
      setData(d);
    } catch (e) {
      if (e instanceof ApiError) Alert.alert("Error", e.detail);
    }
  }, [user?.clinic_id]);

  useFocusEffect(useCallback(() => { load().then(() => setLoading(false)); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const isAdmin = user?.role === "clinic_admin";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greet}>{isAdmin ? "Clinic Admin" : "Receptionist"}</Text>
            <Text style={styles.name}>{user?.full_name}</Text>
            {data?.clinic ? (
              <View style={styles.clinicPill}>
                <Ionicons name="business" size={11} color="#fff" />
                <Text style={styles.clinicPillTxt}>{data.clinic.name}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.walkinBtn}
            onPress={() => router.push("/clinic-walkin")}
            testID="walk-in-cta"
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.walkinTxt}>Walk-in</Text>
          </TouchableOpacity>
        </View>

        {/* Today Stats Grid */}
        <View style={styles.statsWrap}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="today" size={20} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{data?.today.total ?? 0}</Text>
            <Text style={styles.statLabel}>Today's Appts</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#DCFCE7" }]}>
              <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
            </View>
            <Text style={styles.statValue}>{data?.today.completed ?? 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="hourglass" size={20} color="#D97706" />
            </View>
            <Text style={styles.statValue}>{data?.today.waiting ?? 0}</Text>
            <Text style={styles.statLabel}>Waiting</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.infoLight }]}>
              <Ionicons name="videocam" size={20} color={colors.info} />
            </View>
            <Text style={styles.statValue}>{data?.today.in_consultation ?? 0}</Text>
            <Text style={styles.statLabel}>In-Consult</Text>
          </View>
        </View>

        {/* Revenue - admin only */}
        {isAdmin ? (
          <View style={styles.revenueRow}>
            <View style={styles.revenueCard}>
              <Text style={styles.revLabel}>TODAY'S REVENUE</Text>
              <Text style={styles.revValue}>{currency(data?.today.revenue ?? 0)}</Text>
              <View style={styles.revFooter}>
                <Ionicons name="trending-up" size={11} color="#22C55E" />
                <Text style={styles.revFooterTxt}>Live</Text>
              </View>
            </View>
            <View style={[styles.revenueCard, { backgroundColor: "#0F172A" }]}>
              <Text style={[styles.revLabel, { color: "rgba(255,255,255,0.6)" }]}>MONTH-TO-DATE</Text>
              <Text style={[styles.revValue, { color: "#fff" }]}>{currency(data?.monthly_revenue ?? 0)}</Text>
              <View style={styles.revFooter}>
                <Ionicons name="cash" size={11} color="#FCD34D" />
                <Text style={[styles.revFooterTxt, { color: "#FCD34D" }]}>Gross</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Snapshot chips */}
        <View style={styles.chipsRow}>
          <View style={styles.snapChip}>
            <Ionicons name="people" size={14} color={colors.primary} />
            <Text style={styles.snapNum}>{data?.total_patients ?? 0}</Text>
            <Text style={styles.snapLbl}>Patients</Text>
          </View>
          <View style={styles.snapChip}>
            <Ionicons name="medkit" size={14} color={colors.info} />
            <Text style={styles.snapNum}>{data?.doctor_count ?? 0}</Text>
            <Text style={styles.snapLbl}>Doctors</Text>
          </View>
          <View style={styles.snapChip}>
            <Ionicons name="calendar" size={14} color="#8B5CF6" />
            <Text style={styles.snapNum}>{data?.upcoming_next_7_days ?? 0}</Text>
            <Text style={styles.snapLbl}>Upcoming (7d)</Text>
          </View>
        </View>

        {/* Doctor Performance */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Doctors Today</Text>
            <TouchableOpacity onPress={() => router.push("/(clinic)/doctors")}>
              <Text style={styles.sectionLink}>View all ›</Text>
            </TouchableOpacity>
          </View>
          {data && data.doctors.length === 0 ? (
            <Card style={{ alignItems: "center", padding: 24 }}>
              <Ionicons name="medkit-outline" size={36} color={colors.textDisabled} />
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No doctors attached yet</Text>
            </Card>
          ) : (
            data?.doctors.map((d) => (
              <TouchableOpacity
                key={d.id}
                onPress={() => router.push({ pathname: "/(clinic)/appointments", params: { doctor_id: d.id } })}
                testID={`clinic-doctor-${d.id}`}
              >
                <Card style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Image source={{ uri: d.photo_url }} style={styles.docAvatar} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.docName}>{d.name}</Text>
                      <Text style={styles.docSpec}>{d.specialty}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.docCount}>{d.today_count}</Text>
                      <Text style={styles.docCountLbl}>Today</Text>
                    </View>
                  </View>
                  <View style={styles.docFooter}>
                    <View style={styles.docStat}>
                      <View style={[styles.docDot, { backgroundColor: "#22C55E" }]} />
                      <Text style={styles.docStatTxt}>{d.today_completed} completed</Text>
                    </View>
                    {isAdmin ? (
                      <View style={styles.docStat}>
                        <Ionicons name="cash-outline" size={12} color={colors.textSecondary} />
                        <Text style={styles.docStatTxt}>{currency(d.today_revenue)}</Text>
                      </View>
                    ) : null}
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", padding: spacing.lg, paddingBottom: spacing.md },
  greet: { fontSize: 12, color: colors.textSecondary, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  name: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 2 },
  clinicPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primary, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, marginTop: 6 },
  clinicPillTxt: { color: "#fff", fontSize: 11, fontWeight: "700" },

  walkinBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  walkinTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },

  statsWrap: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.lg, gap: 10 },
  statCard: { flexBasis: "48%", flexGrow: 1, backgroundColor: "#fff", padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderLight },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statValue: { fontSize: 26, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3, marginTop: 2 },

  revenueRow: { flexDirection: "row", paddingHorizontal: spacing.lg, gap: 10, marginTop: spacing.md },
  revenueCard: { flex: 1, backgroundColor: colors.primary, padding: spacing.lg, borderRadius: radius.xl, overflow: "hidden" },
  revLabel: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  revValue: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 4, letterSpacing: -0.5 },
  revFooter: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 6 },
  revFooterTxt: { color: "#DCFCE7", fontSize: 10, fontWeight: "700" },

  chipsRow: { flexDirection: "row", paddingHorizontal: spacing.lg, gap: 8, marginTop: spacing.md },
  snapChip: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, gap: 6 },
  snapNum: { fontSize: 16, fontWeight: "800", color: colors.text },
  snapLbl: { fontSize: 10, color: colors.textSecondary, fontWeight: "600" },

  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md, marginBottom: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  sectionLink: { color: colors.primary, fontWeight: "600", fontSize: 13 },

  docAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.bgMuted },
  docName: { fontSize: 15, fontWeight: "700", color: colors.text },
  docSpec: { fontSize: 12, color: colors.primary, marginTop: 2 },
  docCount: { fontSize: 22, fontWeight: "800", color: colors.text, lineHeight: 26 },
  docCountLbl: { fontSize: 9, color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase" },
  docFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderLight },
  docStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  docDot: { width: 6, height: 6, borderRadius: 3 },
  docStatTxt: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
});
