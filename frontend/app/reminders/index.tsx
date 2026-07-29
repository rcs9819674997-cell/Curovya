import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "@/src/components/ScreenHeader";
import { Card, Badge } from "@/src/components/UI";
import { api, ApiError } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

interface Dose {
  reminder_id: string;
  medicine_name: string;
  dosage: string;
  instructions: string;
  family_member_name?: string | null;
  time: string;
  date: string;
  status: "pending" | "taken" | "missed" | "skipped";
}

interface DoseSummary {
  date: string;
  doses: Dose[];
  counts: { total: number; taken: number; missed: number; pending: number };
  adherence_pct: number;
}

interface Reminder {
  id: string;
  medicine_name: string;
  dosage: string;
  times: string[];
  duration_days: number;
  start_date: string;
  end_date: string;
  instructions: string;
  active: boolean;
  family_member_name?: string | null;
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
}

export default function RemindersScreen() {
  const router = useRouter();
  const [summary, setSummary] = useState<DoseSummary | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([
        api.get<DoseSummary>("/reminders/today"),
        api.get<Reminder[]>("/reminders"),
      ]);
      setSummary(s);
      setReminders(r);
    } catch (e) {
      if (e instanceof ApiError) Alert.alert("Error", e.detail);
    }
  }, []);

  useFocusEffect(useCallback(() => { load().then(() => setLoading(false)); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const logDose = async (dose: Dose, status: "taken" | "skipped") => {
    try {
      await api.post(`/reminders/${dose.reminder_id}/log`, { time: dose.time, date: dose.date, status });
      await load();
    } catch (e) {
      if (e instanceof ApiError) Alert.alert("Error", e.detail);
    }
  };

  const removeReminder = (r: Reminder) => {
    Alert.alert(
      "Delete Reminder",
      `Stop reminding you about ${r.medicine_name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.del(`/reminders/${r.id}`);
              await load();
            } catch (e) {
              if (e instanceof ApiError) Alert.alert("Error", e.detail);
            }
          },
        },
      ],
    );
  };

  const activeReminders = reminders.filter((r) => r.active);
  const inactiveReminders = reminders.filter((r) => !r.active);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScreenHeader
        title="Medicine Reminders"
        right={
          <TouchableOpacity
            onPress={() => router.push("/reminders/add")}
            testID="reminder-add-btn"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="add-circle" size={26} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Adherence card */}
        {summary && summary.counts.total > 0 ? (
          <View style={styles.hero}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>TODAY'S ADHERENCE</Text>
              <Text style={styles.heroPct}>{summary.adherence_pct}%</Text>
              <View style={styles.heroBar}>
                <View style={[styles.heroBarFill, { width: `${summary.adherence_pct}%` }]} />
              </View>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
                <View style={styles.heroPill}>
                  <View style={[styles.heroDot, { backgroundColor: "#22C55E" }]} />
                  <Text style={styles.heroPillTxt}>{summary.counts.taken} taken</Text>
                </View>
                <View style={styles.heroPill}>
                  <View style={[styles.heroDot, { backgroundColor: "#F59E0B" }]} />
                  <Text style={styles.heroPillTxt}>{summary.counts.pending} pending</Text>
                </View>
              </View>
            </View>
            <View style={styles.heroIcon}>
              <Ionicons name="pulse" size={44} color="rgba(255,255,255,0.7)" />
            </View>
          </View>
        ) : null}

        {/* Today's doses */}
        <Text style={styles.h}>Today's Schedule</Text>
        {loading ? (
          <Text style={styles.loading}>Loading...</Text>
        ) : !summary || summary.doses.length === 0 ? (
          <Card style={{ alignItems: "center", paddingVertical: 28 }}>
            <View style={styles.emptyIcon}>
              <Ionicons name="alarm-outline" size={36} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No reminders yet</Text>
            <Text style={styles.emptySub}>Add medicine reminders to stay on track with your treatment</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/reminders/add")}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", marginLeft: 4 }}>Add Reminder</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          summary.doses.map((d, i) => {
            const isTaken = d.status === "taken";
            const isSkipped = d.status === "skipped";
            const isMissed = d.status === "missed";
            return (
              <Card key={`${d.reminder_id}-${d.time}-${i}`} style={{ marginBottom: spacing.md, padding: 0, overflow: "hidden" }} testID={`dose-${i}`}>
                <View style={{ flexDirection: "row", alignItems: "center", padding: spacing.lg }}>
                  <View style={[styles.timeCol, isTaken && { backgroundColor: "#DCFCE7" }, isSkipped && { backgroundColor: colors.bgMuted }]}>
                    <Text style={[styles.timeTxt, isTaken && { color: "#16A34A" }, isSkipped && { color: colors.textSecondary }]}>{fmtTime(d.time).split(" ")[0]}</Text>
                    <Text style={[styles.timePer, isTaken && { color: "#16A34A" }, isSkipped && { color: colors.textSecondary }]}>{fmtTime(d.time).split(" ")[1]}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.medName, isTaken && { textDecorationLine: "line-through", color: colors.textDisabled }]}>{d.medicine_name}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      {d.dosage ? <Text style={styles.dosage}>{d.dosage}</Text> : null}
                      {d.family_member_name ? (
                        <View style={styles.forWho}>
                          <Ionicons name="person-outline" size={10} color={colors.info} />
                          <Text style={styles.forWhoTxt}>{d.family_member_name}</Text>
                        </View>
                      ) : null}
                    </View>
                    {d.instructions ? <Text style={styles.instr}>{d.instructions}</Text> : null}
                  </View>
                </View>
                <View style={styles.actions}>
                  {isTaken ? (
                    <View style={styles.takenBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                      <Text style={{ color: "#16A34A", fontWeight: "700", fontSize: 12 }}>Taken</Text>
                    </View>
                  ) : isSkipped ? (
                    <View style={styles.skippedBadge}>
                      <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                      <Text style={{ color: colors.textSecondary, fontWeight: "700", fontSize: 12 }}>Skipped</Text>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity onPress={() => logDose(d, "skipped")} style={styles.skipBtn} testID={`skip-dose-${i}`}>
                        <Ionicons name="close" size={14} color={colors.textSecondary} />
                        <Text style={{ color: colors.textSecondary, fontWeight: "700", marginLeft: 4, fontSize: 12 }}>Skip</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => logDose(d, "taken")} style={styles.takeBtn} testID={`take-dose-${i}`}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                        <Text style={{ color: "#fff", fontWeight: "700", marginLeft: 4, fontSize: 12 }}>Mark Taken</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </Card>
            );
          })
        )}

        {/* All reminders */}
        {activeReminders.length > 0 ? (
          <>
            <Text style={styles.h}>All Medications ({activeReminders.length})</Text>
            {activeReminders.map((r) => (
              <Card key={r.id} style={{ marginBottom: spacing.md }} testID={`reminder-${r.id}`}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={styles.pillIcon}>
                    <Ionicons name="medical" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.medName}>{r.medicine_name}</Text>
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                      <View style={styles.tagRow}>
                        <Ionicons name="time-outline" size={11} color={colors.textSecondary} />
                        <Text style={styles.tagTxt}>{r.times.map(fmtTime).join(", ")}</Text>
                      </View>
                      <View style={styles.tagRow}>
                        <Ionicons name="calendar-outline" size={11} color={colors.textSecondary} />
                        <Text style={styles.tagTxt}>Until {r.end_date}</Text>
                      </View>
                    </View>
                    {r.family_member_name ? (
                      <View style={[styles.forWho, { marginTop: 6, alignSelf: "flex-start" }]}>
                        <Ionicons name="person-outline" size={10} color={colors.info} />
                        <Text style={styles.forWhoTxt}>{r.family_member_name}</Text>
                      </View>
                    ) : null}
                  </View>
                  <TouchableOpacity onPress={() => removeReminder(r)} style={styles.trashBtn} testID={`delete-reminder-${r.id}`}>
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", backgroundColor: colors.primary, borderRadius: radius.xxl, padding: spacing.lg, overflow: "hidden", marginBottom: spacing.md },
  heroLabel: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  heroPct: { color: "#fff", fontSize: 40, fontWeight: "900", marginTop: 4, letterSpacing: -1 },
  heroBar: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.2)", overflow: "hidden", marginTop: 8 },
  heroBarFill: { height: 6, borderRadius: 3, backgroundColor: "#fff" },
  heroPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  heroDot: { width: 6, height: 6, borderRadius: 3 },
  heroPillTxt: { color: "#fff", fontSize: 11, fontWeight: "700" },
  heroIcon: { width: 88, alignItems: "center", justifyContent: "center" },

  h: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: spacing.lg, marginBottom: spacing.md },
  loading: { textAlign: "center", color: colors.textSecondary, marginTop: 20 },

  timeCol: { width: 68, height: 68, borderRadius: 14, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  timeTxt: { color: colors.primary, fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  timePer: { color: colors.primary, fontSize: 10, fontWeight: "700", marginTop: -2 },

  medName: { fontSize: 15, fontWeight: "700", color: colors.text },
  dosage: { fontSize: 11, color: colors.textSecondary, fontWeight: "600", backgroundColor: colors.bgMuted, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  instr: { fontSize: 11, color: colors.textSecondary, marginTop: 6, fontStyle: "italic" },

  forWho: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.infoLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  forWhoTxt: { color: colors.info, fontSize: 10, fontWeight: "700" },

  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  takeBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#16A34A", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  skipBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bgMuted, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  takenBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#DCFCE7", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  skippedBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.bgMuted, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },

  pillIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  tagRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  tagTxt: { fontSize: 11, color: colors.textSecondary, fontWeight: "500" },
  trashBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.errorLight, alignItems: "center", justifyContent: "center" },

  emptyIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  emptySub: { fontSize: 13, color: colors.textSecondary, marginTop: 4, textAlign: "center", paddingHorizontal: 20 },
  emptyBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, marginTop: 16 },
});
