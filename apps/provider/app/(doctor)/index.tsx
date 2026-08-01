import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Badge } from "@/src/components/UI";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

interface Stats {
  total_consultations: number;
  today_count: number;
  upcoming_count: number;
  monthly_revenue: number;
  total_revenue: number;
  followups_pending: number;
  avg_rating: number;
  review_count: number;
}
interface Appt {
  id: string;
  token_number: number;
  date: string;
  time: string;
  patient_name: string;
  patient_phone: string;
  status: string;
  consultation_type?: string;
  consultation_fee?: number;
}
interface Snap {
  currently_serving_token: number | null;
  next_token: number | null;
  counts: Record<string, number>;
  total: number;
}

const INK = "#0F172A";

export default function DoctorDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [todayAppts, setTodayAppts] = useState<Appt[]>([]);
  const [snap, setSnap] = useState<Snap | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const todayDate = new Date().toISOString().split("T")[0];
      const [s, a, q] = await Promise.all([
        api.get<Stats>("/doctor/stats").catch(() => null),
        api.get<Appt[]>("/doctor/appointments?scope=today").catch(() => []),
        user?.doctor_id
          ? api.get<Snap>(`/queue/doctor/${user.doctor_id}/${todayDate}`).catch(() => null)
          : Promise.resolve(null),
      ]);
      if (s) setStats(s);
      if (Array.isArray(a)) setTodayAppts(a);
      if (q) setSnap(q);
    } catch (err) {
      console.log("Doctor dashboard load error:", err);
    }
  }, [user?.doctor_id]);

  useEffect(() => {
    let active = true;
    (async () => {
      await load();
      if (active) setLoading(false);
    })();
    const iv = setInterval(load, 8000);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const firstName = user?.full_name?.replace(/^Dr\.?\s*/, "").split(" ")[0] || "Doctor";
  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Hero Section */}
        <LinearGradient colors={["#DC143C", "#990B26"]} style={styles.hero}>
          <View style={styles.heroHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.dateBadge}>
                <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.85)" />
                <Text style={styles.dateBadgeTxt}>{todayStr}</Text>
              </View>
              <Text style={styles.hi}>Good day, Dr. {firstName} 👨‍⚕️</Text>
              <Text style={styles.subHi}>Here&apos;s your clinical overview today</Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/(doctor)/profile")}
              style={styles.avatarWrap}
              accessibilityLabel="Doctor Profile"
            >
              <Image
                source={{
                  uri:
                    user?.avatar_url ||
                    "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
                }}
                style={styles.avatarImg}
              />
              <View style={styles.onlineBadge} />
            </TouchableOpacity>
          </View>

          {/* Quick Metrics Bar */}
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statVal}>{stats?.today_count ?? 0}</Text>
              <Text style={styles.statLbl}>Today</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statVal}>{stats?.upcoming_count ?? 0}</Text>
              <Text style={styles.statLbl}>Upcoming</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Ionicons name="star" size={14} color="#FDE047" />
                <Text style={styles.statVal}>
                  {typeof stats?.avg_rating === "number" ? stats.avg_rating.toFixed(1) : "5.0"}
                </Text>
              </View>
              <Text style={styles.statLbl}>Rating</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ padding: spacing.lg }}>
          {/* Live Queue Hero Card */}
          <TouchableOpacity
            onPress={() => router.push("/doctor-queue")}
            activeOpacity={0.92}
            testID="live-queue-card"
          >
            <LinearGradient colors={["#0F172A", "#1E293B"]} style={styles.queueCard}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={styles.queueLivePill}>
                  <View style={styles.queueDot} />
                  <Text style={styles.queueLiveTxt}>LIVE QUEUE</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={styles.queueCtaLink}>Open Live Queue</Text>
                  <Ionicons name="chevron-forward" size={16} color="#FDE047" />
                </View>
              </View>

              <View style={styles.queueMetricGrid}>
                <View style={styles.queueMetricBox}>
                  <Text style={styles.queueMiniLbl}>Now Serving</Text>
                  <Text style={styles.queueBigTok}>
                    {snap?.currently_serving_token ? `#${snap.currently_serving_token}` : "—"}
                  </Text>
                </View>
                <View style={styles.queueMetricBox}>
                  <Text style={styles.queueMiniLbl}>Waiting</Text>
                  <Text style={styles.queueMedTok}>
                    {(snap?.counts?.waiting || 0) + (snap?.counts?.skipped || 0)}
                  </Text>
                </View>
                <View style={styles.queueMetricBox}>
                  <Text style={styles.queueMiniLbl}>Completed</Text>
                  <Text style={styles.queueMedTok}>{snap?.counts?.completed || 0}</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Quick Action Buttons */}
          <Text style={styles.sectionHeading}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push("/doctor-queue")}
              testID="qa-live-queue"
            >
              <View style={[styles.quickIconBg, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="play-circle-outline" size={22} color={colors.primary} />
              </View>
              <Text style={styles.quickTitle}>Live Queue</Text>
              <Text style={styles.quickSub}>Call & Serve</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push("/doctor-availability")}
              testID="qa-availability"
            >
              <View style={[styles.quickIconBg, { backgroundColor: "#F0FDF4" }]}>
                <Ionicons name="time-outline" size={22} color="#166534" />
              </View>
              <Text style={styles.quickTitle}>Slot Times</Text>
              <Text style={styles.quickSub}>Set Hours</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push("/(doctor)/prescriptions")}
              testID="qa-prescriptions"
            >
              <View style={[styles.quickIconBg, { backgroundColor: "#F5F3FF" }]}>
                <Ionicons name="document-text-outline" size={22} color="#7C3AED" />
              </View>
              <Text style={styles.quickTitle}>Rx History</Text>
              <Text style={styles.quickSub}>Issued Rx</Text>
            </TouchableOpacity>
          </View>

          {/* Revenue Analytics */}
          <Text style={styles.sectionHeading}>Revenue & Practice</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Card style={styles.revCard}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={[styles.revIcon, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="trending-up" size={18} color={colors.success} />
                </View>
                <Text style={styles.revLbl}>This Month</Text>
              </View>
              <Text style={styles.revVal}>Rs {(stats?.monthly_revenue ?? 0).toLocaleString()}</Text>
            </Card>

            <Card style={styles.revCard}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={[styles.revIcon, { backgroundColor: colors.infoLight }]}>
                  <Ionicons name="wallet-outline" size={18} color={colors.info} />
                </View>
                <Text style={styles.revLbl}>All Time</Text>
              </View>
              <Text style={styles.revVal}>Rs {(stats?.total_revenue ?? 0).toLocaleString()}</Text>
            </Card>
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: spacing.md }}>
            <Card style={styles.miniCard}>
              <Ionicons name="people-outline" size={20} color={colors.primary} />
              <Text style={styles.miniLbl}>Total Patients</Text>
              <Text style={styles.miniVal}>{stats?.total_consultations ?? 0}</Text>
            </Card>
            <Card style={styles.miniCard}>
              <Ionicons name="sync-outline" size={20} color={colors.warning} />
              <Text style={styles.miniLbl}>Follow-ups</Text>
              <Text style={styles.miniVal}>{stats?.followups_pending ?? 0}</Text>
            </Card>
            <Card style={styles.miniCard}>
              <Ionicons name="star-outline" size={20} color="#F59E0B" />
              <Text style={styles.miniLbl}>Reviews</Text>
              <Text style={styles.miniVal}>{stats?.review_count ?? 0}</Text>
            </Card>
          </View>

          {/* Today's Schedule */}
          <View style={styles.rowBetween}>
            <Text style={styles.sectionHeading}>Today&apos;s Appointments</Text>
            <TouchableOpacity onPress={() => router.push("/(doctor)/schedule")}>
              <Text style={styles.link}>See All →</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <Card style={{ padding: spacing.xl, alignItems: "center" }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ marginTop: 8, fontSize: 13, color: colors.textSecondary }}>
                Loading schedule...
              </Text>
            </Card>
          ) : todayAppts.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="checkmark-circle-outline" size={36} color={colors.success} />
              <Text style={styles.emptyTitle}>No More Appointments Today</Text>
              <Text style={styles.emptySub}>Your schedule is clean for the rest of today.</Text>
            </Card>
          ) : (
            todayAppts.slice(0, 5).map((a) => {
              const isDone = a.status === "completed";
              return (
                <Card key={a.id} testID={`today-appt-${a.id}`} style={styles.apptCard}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={styles.tokBox}>
                      <Text style={styles.tokTxt}>#{a.token_number}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.pname}>{a.patient_name}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                          <Text style={styles.pmeta}>{a.time}</Text>
                        </View>
                        {a.patient_phone ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="call-outline" size={13} color={colors.textSecondary} />
                            <Text style={styles.pmeta}>{a.patient_phone}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <Badge
                      label={a.status.toUpperCase()}
                      tone={isDone ? "success" : "info"}
                    />
                  </View>

                  {!isDone && (
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: "/doctor-prescribe/[appointmentId]",
                          params: { appointmentId: a.id },
                        })
                      }
                      style={styles.rxBtn}
                      testID={`write-rx-${a.id}`}
                    >
                      <Ionicons name="create-outline" size={15} color="#fff" />
                      <Text style={styles.rxBtnTxt}>Write Prescription</Text>
                    </TouchableOpacity>
                  )}
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  dateBadgeTxt: { fontSize: 11, fontWeight: "700", color: "#fff" },
  hi: { color: "#fff", fontSize: 23, fontWeight: "800", letterSpacing: -0.3 },
  subHi: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 3 },

  avatarWrap: { position: "relative" },
  avatarImg: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: "#fff" },
  onlineBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#fff",
  },

  statsRow: {
    flexDirection: "row",
    marginTop: spacing.xl,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
  },
  statCell: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.2)" },
  statVal: { color: "#fff", fontSize: 20, fontWeight: "800" },
  statLbl: { color: "rgba(255,255,255,0.85)", fontSize: 11, marginTop: 2, fontWeight: "600" },

  sectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    letterSpacing: -0.2,
  },

  queueCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  queueLivePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239,68,68,0.22)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  queueDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FDE047" },
  queueLiveTxt: { color: "#FDE047", fontWeight: "800", fontSize: 11, letterSpacing: 0.8 },
  queueCtaLink: { color: "#FDE047", fontSize: 12, fontWeight: "800" },

  queueMetricGrid: { flexDirection: "row", marginTop: spacing.md, alignItems: "flex-end" },
  queueMetricBox: { flex: 1 },
  queueMiniLbl: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  queueBigTok: { color: "#fff", fontSize: 36, fontWeight: "900", lineHeight: 40, marginTop: 2 },
  queueMedTok: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 2 },

  quickGrid: { flexDirection: "row", gap: 10 },
  quickCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  quickIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
  quickSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  revCard: { flex: 1, padding: spacing.md },
  revIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  revLbl: { fontSize: 12, color: colors.textSecondary, fontWeight: "600" },
  revVal: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 6 },

  miniCard: { flex: 1, alignItems: "center", padding: spacing.md },
  miniLbl: { fontSize: 11, color: colors.textSecondary, marginTop: 6, textAlign: "center", fontWeight: "600" },
  miniVal: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 2 },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  link: { color: colors.primary, fontWeight: "700", fontSize: 13, marginTop: spacing.xl, marginBottom: spacing.md },

  emptyCard: { padding: spacing.xl, alignItems: "center", borderRadius: radius.xl },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 10 },
  emptySub: { fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: "center" },

  apptCard: { marginBottom: spacing.md, padding: spacing.md },
  tokBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  tokTxt: { color: colors.primary, fontSize: 15, fontWeight: "800" },
  pname: { fontSize: 15, fontWeight: "700", color: colors.text },
  pmeta: { fontSize: 12, color: colors.textSecondary },

  rxBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    marginTop: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.lg,
    gap: 6,
  },
  rxBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
