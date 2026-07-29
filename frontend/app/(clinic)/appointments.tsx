import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card, Badge } from "@/src/components/UI";
import { api, ApiError } from "@/src/api/client";
import { patch } from "@/src/api/patch";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

interface Appt {
  id: string;
  booking_id: string;
  token_number: number;
  doctor_id: string;
  doctor_name: string;
  doctor_specialty: string;
  patient_name: string;
  patient_phone: string;
  date: string;
  time: string;
  status: "confirmed" | "completed" | "cancelled";
  queue_status?: "waiting" | "in_consultation" | "completed" | "no_show";
  consultation_fee: number;
  is_walk_in?: boolean;
  patient_details?: { symptoms?: string };
}

interface DocOption { id: string; name: string; specialty: string; }

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "confirmed", label: "Upcoming" },
  { key: "completed", label: "Done" },
  { key: "cancelled", label: "Cancelled" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(d: string, days: number) {
  const dt = new Date(d + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00Z");
  const today = todayISO();
  if (d === today) return "Today";
  if (d === shiftDate(today, 1)) return "Tomorrow";
  if (d === shiftDate(today, -1)) return "Yesterday";
  return dt.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export default function ClinicAppointments() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ doctor_id?: string }>();
  const [appts, setAppts] = useState<Appt[]>([]);
  const [doctors, setDoctors] = useState<DocOption[]>([]);
  const [date, setDate] = useState(todayISO());
  const [statusF, setStatusF] = useState("all");
  const [doctorF, setDoctorF] = useState<string>((params.doctor_id as string) || "all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.clinic_id) return;
    const qs = new URLSearchParams({ date });
    if (statusF !== "all") qs.set("status", statusF);
    if (doctorF !== "all") qs.set("doctor_id", doctorF);
    if (q.trim()) qs.set("q", q.trim());
    try {
      const [a, ds] = await Promise.all([
        api.get<Appt[]>(`/clinic/${user.clinic_id}/appointments?${qs.toString()}`),
        api.get<DocOption[]>(`/clinic/${user.clinic_id}/doctors`),
      ]);
      setAppts(a);
      setDoctors(ds);
    } catch (e) {
      if (e instanceof ApiError) Alert.alert("Error", e.detail);
    }
  }, [user?.clinic_id, date, statusF, doctorF, q]);

  useFocusEffect(useCallback(() => { setLoading(true); load().then(() => setLoading(false)); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const act = async (appt: Appt, action: "check_in" | "call_next" | "complete" | "no_show") => {
    setBusy(appt.id);
    try {
      await patch(`/clinic/appointments/${appt.id}/status`, { action });
      await load();
    } catch (e) {
      if (e instanceof ApiError) Alert.alert("Error", e.detail);
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <View style={styles.head}>
        <Text style={styles.h1}>Appointments</Text>
        <TouchableOpacity onPress={() => router.push("/clinic-walkin")} style={styles.walkinBtn} testID="appts-walkin">
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.walkinTxt}>Walk-in</Text>
        </TouchableOpacity>
      </View>

      {/* Date navigator */}
      <View style={styles.dateBar}>
        <TouchableOpacity onPress={() => setDate(shiftDate(date, -1))} style={styles.dateArrow} testID="date-prev">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDate(todayISO())} style={styles.dateCenter}>
          <Ionicons name="calendar" size={14} color={colors.primary} />
          <Text style={styles.dateTxt}>{fmtDate(date)}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDate(shiftDate(date, 1))} style={styles.dateArrow} testID="date-next">
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={colors.textSecondary} />
        <TextInput
          placeholder="Search by name, phone or booking ID"
          placeholderTextColor={colors.textDisabled}
          value={q}
          onChangeText={setQ}
          style={styles.searchInput}
          returnKeyType="search"
          testID="appts-search"
        />
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, statusF === f.key && styles.chipActive]}
            onPress={() => setStatusF(f.key)}
            testID={`filter-${f.key}`}
          >
            <Text style={[styles.chipTxt, statusF === f.key && { color: "#fff" }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
        <View style={{ width: 8 }} />
        <TouchableOpacity
          style={[styles.chip, doctorF === "all" && styles.chipActive]}
          onPress={() => setDoctorF("all")}
        >
          <Text style={[styles.chipTxt, doctorF === "all" && { color: "#fff" }]}>All Doctors</Text>
        </TouchableOpacity>
        {doctors.map((d) => (
          <TouchableOpacity
            key={d.id}
            style={[styles.chip, doctorF === d.id && styles.chipActive]}
            onPress={() => setDoctorF(d.id)}
          >
            <Text style={[styles.chipTxt, doctorF === d.id && { color: "#fff" }]}>{d.name.replace("Dr. ", "")}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
        ) : appts.length === 0 ? (
          <Card style={{ alignItems: "center", padding: 32 }}>
            <Ionicons name="calendar-outline" size={40} color={colors.textDisabled} />
            <Text style={{ marginTop: 8, color: colors.textSecondary, fontWeight: "600" }}>No appointments</Text>
            <Text style={{ color: colors.textDisabled, fontSize: 12, marginTop: 4 }}>Try adjusting filters or add a walk-in</Text>
          </Card>
        ) : (
          appts.map((a) => {
            const q_status = a.queue_status || "waiting";
            const isDone = a.status === "completed";
            const isCancelled = a.status === "cancelled";
            return (
              <Card key={a.id} style={{ marginBottom: 12 }} testID={`appt-${a.id}`}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <Text style={styles.tokenTxt}>#{a.token_number}</Text>
                      <Text style={styles.patientName}>{a.patient_name}</Text>
                      {a.is_walk_in ? <Badge label="Walk-in" tone="info" /> : null}
                    </View>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                      <View style={styles.meta}>
                        <Ionicons name="call" size={10} color={colors.textSecondary} />
                        <Text style={styles.metaTxt}>{a.patient_phone || "—"}</Text>
                      </View>
                      <View style={styles.meta}>
                        <Ionicons name="time" size={10} color={colors.textSecondary} />
                        <Text style={styles.metaTxt}>{a.time}</Text>
                      </View>
                    </View>
                    <Text style={styles.doctorTxt}>with {a.doctor_name} · {a.doctor_specialty}</Text>
                    {a.patient_details?.symptoms ? (
                      <Text style={styles.symptoms} numberOfLines={1}>Symptoms: {a.patient_details.symptoms}</Text>
                    ) : null}
                  </View>
                  <View style={styles.statusCol}>
                    {isCancelled ? (
                      <Badge label={q_status === "no_show" ? "No Show" : "Cancelled"} tone="error" />
                    ) : isDone ? (
                      <Badge label="Completed" tone="success" />
                    ) : q_status === "in_consultation" ? (
                      <Badge label="In Consult" tone="info" />
                    ) : (
                      <Badge label="Waiting" tone="warning" />
                    )}
                    <Text style={styles.feeTxt}>Rs. {a.consultation_fee}</Text>
                  </View>
                </View>

                {/* Actions */}
                {!isDone && !isCancelled ? (
                  <View style={styles.actions}>
                    {q_status === "waiting" ? (
                      <>
                        <TouchableOpacity
                          style={[styles.actBtn, styles.actGhost]}
                          onPress={() => act(a, "no_show")}
                          disabled={busy === a.id}
                          testID={`no-show-${a.id}`}
                        >
                          <Ionicons name="close" size={14} color={colors.error} />
                          <Text style={[styles.actTxt, { color: colors.error }]}>No Show</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actBtn, styles.actPrimary]}
                          onPress={() => act(a, "call_next")}
                          disabled={busy === a.id}
                          testID={`call-next-${a.id}`}
                        >
                          {busy === a.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Ionicons name="megaphone" size={14} color="#fff" />
                              <Text style={[styles.actTxt, { color: "#fff" }]}>Call Next</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={[styles.actBtn, styles.actSuccess]}
                        onPress={() => act(a, "complete")}
                        disabled={busy === a.id}
                        testID={`complete-${a.id}`}
                      >
                        {busy === a.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={14} color="#fff" />
                            <Text style={[styles.actTxt, { color: "#fff" }]}>Complete</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null}
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 4 },
  h1: { fontSize: 22, fontWeight: "800", color: colors.text },
  walkinBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  walkinTxt: { color: "#fff", fontWeight: "700", fontSize: 12 },

  dateBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: 8 },
  dateArrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.borderLight, alignItems: "center", justifyContent: "center" },
  dateCenter: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primaryLight, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  dateTxt: { color: colors.primary, fontWeight: "800", fontSize: 14 },

  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: spacing.lg, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, marginBottom: 8 },
  searchInput: { flex: 1, paddingVertical: 10, marginLeft: 8, color: colors.text, fontSize: 13, outlineWidth: 0 } as any,

  filterRow: { paddingHorizontal: spacing.lg, gap: 6, paddingBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.borderLight },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTxt: { color: colors.text, fontSize: 12, fontWeight: "600" },

  tokenTxt: { fontSize: 14, fontWeight: "800", color: colors.primary, backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  patientName: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaTxt: { fontSize: 11, color: colors.textSecondary },
  doctorTxt: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  symptoms: { fontSize: 11, color: colors.info, marginTop: 4, fontStyle: "italic" },
  statusCol: { alignItems: "flex-end", gap: 4 },
  feeTxt: { fontSize: 11, color: colors.text, fontWeight: "700" },

  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderLight },
  actBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  actGhost: { backgroundColor: colors.errorLight },
  actPrimary: { backgroundColor: colors.primary },
  actSuccess: { backgroundColor: "#16A34A" },
  actTxt: { fontSize: 12, fontWeight: "800" },
});
