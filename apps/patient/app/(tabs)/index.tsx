import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Card } from "@/src/components/UI";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import { colors, radius, spacing, font } from "@/src/theme";
import { useT } from "@/src/i18n";

interface Appointment {
  id: string;
  token_number: number;
  doctor_name: string;
  doctor_specialty: string;
  doctor_photo_url: string;
  clinic_name: string;
  date: string;
  time: string;
  current_serving: number;
  status: string;
}
interface Rx {
  id: string;
  doctor_name: string;
  diagnosis: string;
  created_at: string;
}

const QUICK_KEYS = [
  {
    id: "book",
    icon: "calendar" as const,
    key: "book_doctor",
    color: "#DC143C",
    route: "/find-doctor",
  },
  {
    id: "lab",
    icon: "flask" as const,
    key: "lab_tests",
    color: "#0EA5E9",
    route: "/labs",
  },
  {
    id: "reminders",
    icon: "alarm" as const,
    key: "medicine_reminders",
    color: "#F59E0B",
    route: "/reminders",
  },
  {
    id: "sym",
    icon: "sparkles" as const,
    key: "symptom_checker",
    color: "#8B5CF6",
    route: "/symptom-checker",
  },
];

// Supplementary tokens not (yet) in the shared theme. Kept local and literal
// so they're easy to promote into `@/src/theme` later without a find/replace.
const SUCCESS = "#0E9F6E";
const HAIRLINE = "rgba(15, 23, 42, 0.06)";
const SKELETON = "#ECECEF";
const INK = "#0F172A";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function timeAgo(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const t = useT();
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [rxs, setRxs] = useState<Rx[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, r] = await Promise.all([
        api.get<Appointment[]>("/appointments"),
        api.get<Rx[]>("/prescriptions"),
      ]);
      setAppts(a);
      setRxs(r);
      setError(false);
    } catch (e) {
      setError(true);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Skeleton shimmer, shared by every loading placeholder.
  const pulse = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Live-queue dot pulse.
  const livePulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, {
          toValue: 1.7,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(livePulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [livePulse]);

  const next = appts.find((a) => a.status === "confirmed") || appts[0];
  const firstName = user?.full_name?.split(" ")[0] || "there";

  const patientsAhead = next
    ? Math.max(0, next.token_number - next.current_serving - 1)
    : 0;
  const isBeingCalled = next
    ? next.current_serving >= next.token_number
    : false;
  const progressPct = next
    ? Math.min(
        100,
        Math.max(
          4,
          (next.current_serving / Math.max(next.token_number, 1)) * 100,
        ),
      )
    : 0;
  const queueStatusText = isBeingCalled
    ? "You're being called"
    : patientsAhead === 0
      ? "You're next!"
      : `${patientsAhead} patient${patientsAhead === 1 ? "" : "s"} ahead of you`;
  const queueStatusColor =
    isBeingCalled || patientsAhead === 0 ? SUCCESS : colors.text;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bgApp }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <LinearGradient colors={["#DC143C", "#B31133"]} style={styles.hero}>
          <View style={styles.heroDecorCircle1} pointerEvents="none" />
          <View style={styles.heroDecorCircle2} pointerEvents="none" />

          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>{getGreeting()}</Text>
              <Text style={styles.hello} numberOfLines={1}>
                {firstName} 👋
              </Text>
            </View>
            <TouchableOpacity
              style={styles.bell}
              testID="home-notifications"
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              onPress={() => router.push("/notifications")}
            >
              <Ionicons name="notifications-outline" size={20} color="#fff" />
              <View style={styles.dot} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.search}
            testID="home-search-doctors"
            accessibilityRole="button"
            accessibilityLabel="Search doctors, clinics, or symptoms"
            onPress={() => router.push("/find-doctor")}
          >
            <View style={styles.searchIconWrap}>
              <Ionicons name="search" size={16} color={colors.textSecondary} />
            </View>
            <Text style={styles.searchText}>{t("find_doctor")}</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={{ padding: spacing.lg }}>
          {error && !loading && (
            <TouchableOpacity
              style={styles.errorBanner}
              onPress={load}
              testID="home-error-retry"
            >
              <Ionicons name="alert-circle" size={18} color={colors.primary} />
              <Text style={styles.errorText}>
                Couldn&apos;t refresh your data. Tap to retry.
              </Text>
              <Ionicons name="refresh" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}

          <Text style={styles.section}>Quick Actions</Text>
          <View style={styles.quickRow}>
            {QUICK_KEYS.map((q) => (
              <TouchableOpacity
                key={q.id}
                testID={`quick-${q.id}`}
                style={styles.quickBtn}
                onPress={() => router.push(q.route as any)}
              >
                <View
                  style={[
                    styles.quickIcon,
                    { backgroundColor: q.color + "16" },
                  ]}
                >
                  <Ionicons name={q.icon} size={22} color={q.color} />
                </View>

                <Text style={styles.quickTxt} numberOfLines={2}>
                  {t(q.key)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.rowBetween}>
            <Text style={styles.section}>Upcoming Appointment</Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/appointments")}
            >
              <Text style={styles.link}>See all</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <Card style={{ padding: spacing.lg }}>
              <View style={{ flexDirection: "row" }}>
                <Animated.View
                  style={[styles.skeletonAvatar, { opacity: pulse }]}
                />
                <View
                  style={{ flex: 1, marginLeft: 14, justifyContent: "center" }}
                >
                  <Animated.View
                    style={[
                      styles.skeletonLine,
                      { width: "60%", opacity: pulse },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.skeletonLine,
                      { width: "40%", marginTop: 8, opacity: pulse },
                    ]}
                  />
                </View>
              </View>
              <Animated.View
                style={[
                  styles.skeletonLine,
                  { width: "100%", height: 48, marginTop: 20, opacity: pulse },
                ]}
              />
            </Card>
          ) : next ? (
            <Card
              testID={`upcoming-appointment-${next.id}`}
              onPress={() =>
                router.push({
                  pathname: "/ticket/[id]",
                  params: { id: next.id },
                })
              }
              style={{ padding: 0, overflow: "hidden" }}
            >
              <View style={styles.statusStrip}>
                <View style={styles.statusPill}>
                  <View style={styles.statusPillDot} />
                  <Text style={styles.statusPillText}>
                    {next.status === "confirmed" ? "Confirmed" : next.status}
                  </Text>
                </View>
                <View style={styles.dateChip}>
                  <Ionicons
                    name="calendar-outline"
                    size={13}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.dateChipText}>
                    {next.date} · {next.time}
                  </Text>
                </View>
              </View>

              <View style={styles.appRow}>
                <Image
                  source={{ uri: next.doctor_photo_url }}
                  style={styles.avatar}
                />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.docName} numberOfLines={1}>
                    {next.doctor_name}
                  </Text>
                  <Text style={styles.docSpec} numberOfLines={1}>
                    {next.doctor_specialty}
                  </Text>
                  <Text style={styles.clinicName} numberOfLines={1}>
                    {next.clinic_name}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.queueBlock}>
                <View style={styles.rowBetween}>
                  <Text style={styles.queueLabel}>Live Queue</Text>
                  <View style={styles.liveBadge}>
                    <Animated.View
                      style={[
                        styles.liveDot,
                        { transform: [{ scale: livePulse }] },
                      ]}
                    />
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                </View>

                <View style={styles.tokenRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tokenLabel}>Your Token</Text>
                    <Text style={styles.tokenNum}>{next.token_number}</Text>
                  </View>
                  <View style={styles.tokenDividerV} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tokenLabel}>Now Serving</Text>
                    <Text style={styles.serving}>{next.current_serving}</Text>
                  </View>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[styles.progressFill, { width: `${progressPct}%` }]}
                  />
                </View>
                <Text style={[styles.queueStatus, { color: queueStatusColor }]}>
                  {queueStatusText}
                </Text>
              </View>

              <View style={styles.viewTicketRow}>
                <Text style={styles.viewTicketText}>View Ticket</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </View>
            </Card>
          ) : (
            <Card style={{ alignItems: "center", paddingVertical: spacing.xl }}>
              <View style={styles.emptyIconWrap}>
                <Ionicons
                  name="calendar-outline"
                  size={24}
                  color={colors.primary}
                />
              </View>
              <Text
                style={{ color: colors.text, fontWeight: "700", marginTop: 12 }}
              >
                No upcoming appointments
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/find-doctor")}
                style={{ marginTop: 8 }}
              >
                <Text style={{ color: colors.primary, fontWeight: "700" }}>
                  Book your first appointment →
                </Text>
              </TouchableOpacity>
            </Card>
          )}

          <Text style={styles.section}>Health Summary</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Card style={[styles.statCard, { backgroundColor: "#FFF7ED" }]}>
              <View
                style={[styles.statIconWrap, { backgroundColor: "#FFFFFF" }]}
              >
                <Ionicons name="fitness" size={18} color="#EA580C" />
              </View>
              <Text style={styles.summaryVal}>
                {loading ? "–" : rxs.length}
              </Text>
              <Text style={styles.summaryLabel}>Prescriptions</Text>
            </Card>
            <Card
              style={[styles.statCard, { backgroundColor: colors.infoLight }]}
            >
              <View
                style={[styles.statIconWrap, { backgroundColor: "#FFFFFF" }]}
              >
                <Ionicons name="heart" size={18} color={colors.info} />
              </View>
              <Text style={styles.summaryVal}>
                {loading ? "–" : appts.length}
              </Text>
              <Text style={styles.summaryLabel}>Appointments</Text>
            </Card>
          </View>

          <View style={styles.rowBetween}>
            <Text style={styles.section}>Recent Prescriptions</Text>
            {!loading && rxs.length > 0 && (
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/prescriptions" as any)}
              >
                <Text style={styles.link}>See all</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <Card style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Animated.View
                  style={[styles.skeletonRxIcon, { opacity: pulse }]}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Animated.View
                    style={[
                      styles.skeletonLine,
                      { width: "70%", opacity: pulse },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.skeletonLine,
                      { width: "45%", marginTop: 6, opacity: pulse },
                    ]}
                  />
                </View>
              </View>
            </Card>
          ) : rxs.length === 0 ? (
            <Card style={{ alignItems: "center", paddingVertical: spacing.lg }}>
              <Ionicons
                name="document-text-outline"
                size={22}
                color={colors.textDisabled}
              />
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
                No prescriptions yet
              </Text>
            </Card>
          ) : (
            rxs.slice(0, 3).map((r) => (
              <Card
                key={r.id}
                testID={`recent-rx-${r.id}`}
                onPress={() =>
                  router.push({
                    pathname: "/prescriptions/[id]",
                    params: { id: r.id },
                  })
                }
                style={{ marginBottom: spacing.md }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={styles.rxIcon}>
                    <Ionicons
                      name="document-text"
                      size={19}
                      color={colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ ...font.h4 }} numberOfLines={1}>
                      {r.diagnosis}
                    </Text>
                    <Text style={font.small}>
                      {r.doctor_name} · {timeAgo(r.created_at)}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textDisabled}
                  />
                </View>
              </Card>
            ))
          )}

          <TouchableOpacity
            onPress={() => router.push("/(tabs)/emergency")}
            style={styles.emCard}
            testID="home-emergency"
            accessibilityRole="button"
            accessibilityLabel="Emergency help"
          >
            <View style={styles.emDecorCircle} pointerEvents="none" />
            <View style={styles.emIconWrap}>
              <Ionicons name="warning" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.emTitle}>Emergency?</Text>
              <Text style={styles.emSub}>
                Call ambulance · Nearby hospitals · Blood banks
              </Text>
            </View>
            <View style={styles.emChevronWrap}>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },
  heroDecorCircle1: {
    position: "absolute",
    top: -50,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroDecorCircle2: {
    position: "absolute",
    bottom: -70,
    left: -50,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  hello: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  bell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FDE047",
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    height: 52,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  searchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F4F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  searchText: { color: colors.textSecondary, marginLeft: 10, fontSize: 14 },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  errorText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: "600" },

  section: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  link: { color: colors.primary, fontWeight: "600", fontSize: 13 },

  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },

  quickBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },

  quickIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  quickTxt: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  statusStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SUCCESS,
  },
  statusPillText: { fontSize: 12, fontWeight: "700", color: SUCCESS },
  dateChip: { flexDirection: "row", alignItems: "center", gap: 5 },
  dateChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },

  appRow: { flexDirection: "row", padding: spacing.lg, paddingTop: spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#fff",
  },
  docName: { fontSize: 16, fontWeight: "700", color: colors.text },
  docSpec: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  clinicName: { fontSize: 12, color: colors.textDisabled, marginTop: 2 },

  divider: {
    height: 1,
    backgroundColor: HAIRLINE,
    marginHorizontal: spacing.lg,
  },

  queueBlock: { padding: spacing.lg, paddingBottom: spacing.md },
  queueLabel: { fontSize: 13, fontWeight: "700", color: colors.text },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: SUCCESS },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: SUCCESS,
    letterSpacing: 0.5,
  },

  tokenRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
  },
  tokenDividerV: {
    width: 1,
    height: 32,
    backgroundColor: HAIRLINE,
    marginHorizontal: spacing.md,
  },
  tokenLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tokenNum: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.primary,
    marginTop: 2,
  },
  serving: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    marginTop: 2,
  },

  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F1F1F3",
    marginTop: spacing.md,
    overflow: "hidden",
  },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  queueStatus: { fontSize: 13, fontWeight: "600", marginTop: 8 },

  viewTicketRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
  },
  viewTicketText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  statCard: { flex: 1, alignItems: "flex-start" },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryVal: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    marginTop: 10,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: "600",
  },

  rxIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  emCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    marginTop: spacing.lg,
    overflow: "hidden",
  },
  emDecorCircle: {
    position: "absolute",
    top: -30,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  emIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  emTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  emSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  emChevronWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  skeletonAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: SKELETON,
  },
  skeletonRxIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: SKELETON,
  },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: SKELETON },
});
