import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ScreenHeader from "@/src/components/ScreenHeader";
import { Card, Badge } from "@/src/components/UI";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

type QStatus = "waiting" | "in_consultation" | "completed" | "no_show" | "skipped";
interface Appt {
  id: string; token_number: number; date: string; time: string;
  patient_name: string; patient_phone?: string; queue_status: QStatus;
  patient_details?: any; called_at?: string | null; completed_at?: string | null;
}
interface Snapshot {
  doctor_id: string; date: string;
  currently_serving_token: number | null;
  currently_serving_appointment_id: string | null;
  next_token: number | null;
  counts: Record<QStatus, number>;
  total: number;
  last_updated: string;
  appointments: Appt[];
}

const TABS: { key: "active" | "done"; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "done", label: "Completed" },
];

const POLL_MS = 5000;

export default function DoctorQueue() {
  const router = useRouter();
  const params = useLocalSearchParams<{ doctorId?: string; doctor_id?: string }>();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"active" | "done">("active");
  const doctorId = useRef<string | null>(null);
  const today = new Date().toISOString().split("T")[0];

  const load = useCallback(async () => {
    try {
      let did = params.doctorId || params.doctor_id;
      if (!did) {
        const me = await api.get<any>("/auth/me").catch(() => null);
        const userObj = me?.user || me;
        did = userObj?.doctor_id;
        if (!did && userObj?.role === "doctor") {
          did = userObj?.id;
        }
      }
      // Fallback default doctor ID if not found
      if (!did) {
        did = "doc-1";
      }

      doctorId.current = did;
      const s = await api.get<Snapshot>(`/queue/doctor/${did}/${today}`);
      setSnap(s);
    } catch (err) {
      console.log("Doctor queue load error:", err);
    }
  }, [today, params.doctorId, params.doctor_id]);

  useEffect(() => {
    let active = true;
    (async () => {
      await load();
      if (active) setLoading(false);
    })();
    const iv = setInterval(load, POLL_MS);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, [load]);

  const act = async (path: string, confirm?: string) => {
    if (busy) return;
    const run = async () => {
      setBusy(true);
      try {
        await api.post(path);
        await load();
      } catch (e: any) {
        Alert.alert("Failed", e?.detail || e?.message || "Try again");
      } finally {
        setBusy(false);
      }
    };
    if (confirm) {
      Alert.alert("Confirm", confirm, [
        { text: "Cancel", style: "cancel" },
        { text: "Yes", onPress: run, style: "destructive" },
      ]);
    } else run();
  };

  const inCons = snap?.appointments.find(a => a.queue_status === "in_consultation");
  const waiting = (snap?.appointments || []).filter(a => a.queue_status === "waiting" || a.queue_status === "skipped").sort((a, b) => a.token_number - b.token_number);
  const done = (snap?.appointments || []).filter(a => a.queue_status === "completed" || a.queue_status === "no_show");

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
        <ScreenHeader title="Live Queue" />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ marginTop: 12, color: colors.textSecondary, fontSize: 13 }}>Loading live queue...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!snap) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
        <ScreenHeader title="Live Queue" />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl }}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 12 }}>Unable to Load Queue</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: "center", marginTop: 6 }}>
            Could not fetch live queue data. Please check your connection and try again.
          </Text>
          <TouchableOpacity
            onPress={async () => { setLoading(true); await load(); setLoading(false); }}
            style={{ marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.md }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScreenHeader title="Live Queue" right={<View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveTxt}>LIVE</Text></View>} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <LinearGradient colors={["#DC143C", "#7C0A20"]} style={styles.hero}>
          <Text style={styles.heroLbl}>Currently Serving</Text>
          {inCons ? (
            <>
              <Text style={styles.tokenBig}>#{inCons.token_number}</Text>
              <Text style={styles.patientName}>{inCons.patient_name}</Text>
              {inCons.patient_details?.age ? (
                <Text style={styles.patientMeta}>
                  {inCons.patient_details.age} yrs · {inCons.patient_details.gender || "—"} · {inCons.patient_details.relation || "Self"}
                </Text>
              ) : null}
              {inCons.patient_details?.symptoms ? (
                <View style={styles.symptomBox}>
                  <Text style={styles.symptomLbl}>Symptoms</Text>
                  <Text style={styles.symptomTxt} numberOfLines={2}>{inCons.patient_details.symptoms}</Text>
                </View>
              ) : null}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: "/doctor-prescribe/[appointmentId]", params: { appointmentId: inCons.id } })}
                  style={[styles.actBtn, { backgroundColor: "#fff" }]}
                  testID="write-rx-current"
                >
                  <Ionicons name="create-outline" size={16} color={colors.primary} />
                  <Text style={[styles.actTxt, { color: colors.primary }]}>Prescribe</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => act(`/doctor/queue/${inCons.id}/complete`)}
                  style={[styles.actBtn, styles.actGhost]}
                  testID="complete-current"
                  disabled={busy}
                >
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.actTxt}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.actionsRow, { marginTop: 8 }]}>
                <TouchableOpacity
                  onPress={() => act(`/doctor/queue/${inCons.id}/skip`, `Move token #${inCons.token_number} to the end of the queue?`)}
                  style={[styles.actBtn, styles.actGhost, { flex: 1 }]}
                  testID="skip-current"
                  disabled={busy}
                >
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
                  <Text style={styles.actTxt}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => act(`/doctor/queue/${inCons.id}/no-show`, `Mark token #${inCons.token_number} as no-show?`)}
                  style={[styles.actBtn, styles.actGhost, { flex: 1 }]}
                  testID="no-show-current"
                  disabled={busy}
                >
                  <Ionicons name="close-circle-outline" size={14} color="#fff" />
                  <Text style={styles.actTxt}>No-show</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.tokenBig}>—</Text>
              <Text style={styles.patientName}>No patient in consultation</Text>
              {waiting.length > 0 ? (
                <TouchableOpacity onPress={() => act("/doctor/queue/call-next")} style={styles.callNextBig} testID="call-next-big" disabled={busy}>
                  <Ionicons name="megaphone-outline" size={18} color={colors.primary} />
                  <Text style={styles.callNextTxt}>Call Next Patient (#{snap.next_token})</Text>
                </TouchableOpacity>
              ) : (
                <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: 20 }}>Queue is empty for today.</Text>
              )}
            </>
          )}
        </LinearGradient>

        <View style={styles.statsRow}>
          <StatCard color={colors.info} label="Waiting" value={(snap.counts?.waiting || 0) + (snap.counts?.skipped || 0)} />
          <StatCard color={colors.success} label="Completed" value={snap.counts?.completed || 0} />
          <StatCard color={colors.warning} label="No-show" value={snap.counts?.no_show || 0} />
        </View>

        {inCons ? (
          <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
            <TouchableOpacity onPress={() => act("/doctor/queue/call-next", "Complete current consultation and call the next patient?")} style={styles.callNextInline} testID="call-next-inline" disabled={busy}>
              <Ionicons name="play-forward" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "800", marginLeft: 6 }}>Complete & Call Next {snap.next_token ? `(#${snap.next_token})` : ""}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.tabsRow}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]} testID={`q-tab-${t.key}`}>
              <Text style={[styles.tabTxt, tab === t.key && styles.tabTxtActive]}>{t.label} ({t.key === "active" ? waiting.length : done.length})</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ padding: spacing.lg, paddingTop: 0 }}>
          {tab === "active" ? (
            waiting.length === 0 ? (
              <Card><Text style={{ color: colors.textSecondary }}>No patients waiting.</Text></Card>
            ) : waiting.map((a) => (
              <Card key={a.id} style={{ marginBottom: 10, padding: 12 }} testID={`waiting-${a.id}`}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={styles.tokChip}><Text style={styles.tokChipTxt}>#{a.token_number}</Text></View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.wName}>{a.patient_name}</Text>
                    <Text style={styles.wMeta}>
                      {a.time} · {a.patient_details?.age ? `${a.patient_details.age}y ` : ""}{a.patient_details?.gender || ""}
                    </Text>
                    {a.patient_details?.symptoms ? (
                      <Text style={styles.wSym} numberOfLines={1}>{a.patient_details.symptoms}</Text>
                    ) : null}
                  </View>
                  {a.queue_status === "skipped" ? <Badge label="Skipped" tone="warning" /> : null}
                </View>
              </Card>
            ))
          ) : done.length === 0 ? (
            <Card><Text style={{ color: colors.textSecondary }}>No completed appointments yet today.</Text></Card>
          ) : done.map((a) => (
            <Card key={a.id} style={{ marginBottom: 10, padding: 12 }} testID={`done-${a.id}`}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={[styles.tokChip, a.queue_status === "no_show" ? { backgroundColor: colors.warningLight } : { backgroundColor: colors.successLight }]}>
                  <Text style={[styles.tokChipTxt, a.queue_status === "no_show" ? { color: colors.warning } : { color: colors.success }]}>#{a.token_number}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.wName}>{a.patient_name}</Text>
                  <Text style={styles.wMeta}>{a.time}</Text>
                </View>
                <Badge label={a.queue_status === "no_show" ? "No-show" : "Done"} tone={a.queue_status === "no_show" ? "warning" : "success"} />
                {a.queue_status === "no_show" && (
                  <TouchableOpacity
                    onPress={() => act(`/doctor/queue/${a.id}/recall`, `Recall patient #${a.token_number} back to active queue?`)}
                    style={{ marginLeft: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.primaryLight, borderRadius: radius.md }}
                    testID={`recall-${a.id}`}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary }}>Recall</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={[styles.stat, { borderColor: color + "44" }]}>
      <Text style={[styles.statVal, { color }]}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  livePill: { flexDirection: "row", alignItems: "center", backgroundColor: colors.errorLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.error },
  liveTxt: { color: colors.error, fontSize: 10, fontWeight: "800" },
  hero: { padding: spacing.xl, alignItems: "center" },
  heroLbl: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  tokenBig: { color: "#fff", fontSize: 72, fontWeight: "900", lineHeight: 80, marginTop: 4 },
  patientName: { color: "#fff", fontSize: 18, fontWeight: "800", marginTop: 4 },
  patientMeta: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 4 },
  symptomBox: { backgroundColor: "rgba(255,255,255,0.15)", padding: 10, borderRadius: radius.md, marginTop: 12, alignSelf: "stretch" },
  symptomLbl: { color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  symptomTxt: { color: "#fff", fontSize: 13, marginTop: 4 },
  actionsRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.lg, gap: 8, alignSelf: "stretch" },
  actBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: radius.lg, gap: 6 },
  actGhost: { backgroundColor: "rgba(255,255,255,0.15)" },
  actTxt: { color: "#fff", fontWeight: "800", fontSize: 13 },
  callNextBig: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 20, paddingVertical: 14, borderRadius: 999, marginTop: 20, gap: 8 },
  callNextTxt: { color: colors.primary, fontWeight: "800", fontSize: 15 },
  statsRow: { flexDirection: "row", padding: spacing.lg, gap: 10 },
  stat: { flex: 1, backgroundColor: "#fff", borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, alignItems: "center" },
  statVal: { fontSize: 22, fontWeight: "800" },
  statLbl: { fontSize: 11, color: colors.textSecondary, fontWeight: "600", marginTop: 2 },
  callNextInline: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.lg },
  tabsRow: { flexDirection: "row", padding: spacing.lg, paddingBottom: 8, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.borderLight },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabTxt: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  tabTxtActive: { color: "#fff" },
  tokChip: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  tokChipTxt: { color: colors.primary, fontWeight: "800", fontSize: 13 },
  wName: { fontSize: 14, fontWeight: "700", color: colors.text },
  wMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  wSym: { fontSize: 11, color: colors.textSecondary, marginTop: 2, fontStyle: "italic" },
});
