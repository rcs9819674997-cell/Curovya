import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "@/src/components/ScreenHeader";
import { Card } from "@/src/components/UI";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

interface Slot { id: string; date: string; time: string; is_booked: boolean; }

const SUGGESTED = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
];

export default function DoctorAvailability() {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [customTime, setCustomTime] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const r = await api.get<Slot[]>(`/doctor/slots?date=${selectedDate}`);
      setSlots(r);
    } catch (e: any) {
      Alert.alert("Failed", e?.detail || "Could not load slots");
    }
  }, [selectedDate]);

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, [load]);

  const daySlots = useMemo(() => slots.slice().sort((a, b) => a.time.localeCompare(b.time)), [slots]);
  const availableTimes = new Set(daySlots.map(s => s.time));

  const dates = useMemo(() => {
    const arr: { code: string; label: string; dow: string; num: string }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      arr.push({
        code: d.toISOString().split("T")[0],
        label: d.toLocaleDateString("en-US", { month: "short" }),
        dow: d.toLocaleDateString("en-US", { weekday: "short" }),
        num: String(d.getDate()),
      });
    }
    return arr;
  }, []);

  const toggleTime = async (time: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const existing = daySlots.find(s => s.time === time);
      if (existing) {
        if (existing.is_booked) {
          Alert.alert("Booked", "This slot has a patient booked and cannot be removed.");
          return;
        }
        await api.del(`/doctor/slots/${existing.id}`);
      } else {
        await api.post<Slot>("/doctor/slots", { date: selectedDate, time });
      }
      await load();
    } catch (e: any) {
      Alert.alert("Failed", e?.detail || "Try again");
    } finally {
      setBusy(false);
    }
  };

  const addBulk = async () => {
    setBusy(true);
    try {
      await api.post<Slot[]>("/doctor/slots/bulk", { date: selectedDate, times: SUGGESTED });
      await load();
    } catch (e: any) {
      Alert.alert("Failed", e?.detail || "Try again");
    } finally {
      setBusy(false);
    }
  };

  const addCustom = async () => {
    const t = customTime.trim();
    if (!/^\d{2}:\d{2}$/.test(t)) return Alert.alert("Invalid", "Use HH:MM format (e.g. 18:30)");
    setBusy(true);
    try {
      await api.post<Slot>("/doctor/slots", { date: selectedDate, time: t });
      setCustomTime("");
      await load();
    } catch (e: any) {
      Alert.alert("Failed", e?.detail || "Try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScreenHeader title="Manage Availability" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.sub}>Toggle time slots to open or close bookings.</Text>

          <Text style={styles.h}>Select Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
            {dates.map((d) => {
              const active = selectedDate === d.code;
              return (
                <TouchableOpacity
                  key={d.code}
                  onPress={() => setSelectedDate(d.code)}
                  testID={`avail-date-${d.code}`}
                  style={[styles.dateBtn, active && styles.dateActive]}
                >
                  <Text style={[styles.dateDow, active && { color: "#fff" }]}>{d.dow}</Text>
                  <Text style={[styles.dateNum, active && { color: "#fff" }]}>{d.num}</Text>
                  <Text style={[styles.dateMon, active && { color: "rgba(255,255,255,0.85)" }]}>{d.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.summary}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLbl}>Open</Text>
              <Text style={styles.summaryVal}>{daySlots.filter(s => !s.is_booked).length}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLbl}>Booked</Text>
              <Text style={[styles.summaryVal, { color: colors.primary }]}>{daySlots.filter(s => s.is_booked).length}</Text>
            </View>
            <TouchableOpacity onPress={addBulk} style={styles.bulkBtn} testID="add-bulk-slots" disabled={busy}>
              <Ionicons name="calendar-outline" size={14} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: "700", marginLeft: 4, fontSize: 12 }}>Fill day</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.h}>Standard Slots</Text>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={styles.grid}>
              {SUGGESTED.map((t) => {
                const active = availableTimes.has(t);
                const s = daySlots.find(x => x.time === t);
                const booked = !!s?.is_booked;
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => toggleTime(t)}
                    disabled={busy}
                    testID={`toggle-${t}`}
                    style={[styles.slot, active && styles.slotActive, booked && styles.slotBooked]}
                  >
                    <Text style={[styles.slotTxt, active && !booked && { color: "#fff" }, booked && { color: colors.warning }]}>{t}</Text>
                    {booked ? <Text style={styles.bookedLbl}>Booked</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Text style={styles.h}>Add Custom Time</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              testID="custom-time-input"
              style={styles.input}
              value={customTime}
              onChangeText={setCustomTime}
              placeholder="HH:MM (e.g. 18:30)"
              placeholderTextColor={colors.textDisabled}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
            <TouchableOpacity onPress={addCustom} style={styles.addCustom} disabled={busy || !customTime} testID="add-custom-btn">
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.h}>All slots for {selectedDate}</Text>
          {daySlots.length === 0 ? (
            <Card><Text style={{ color: colors.textSecondary }}>No slots configured. Tap any time above to open a slot.</Text></Card>
          ) : (
            daySlots.map((s) => (
              <Card key={s.id} style={{ marginBottom: 8, padding: 12 }} testID={`slot-row-${s.id}`}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name={s.is_booked ? "lock-closed" : "time-outline"} size={16} color={s.is_booked ? colors.warning : colors.success} />
                  <Text style={styles.slotRowTime}>{s.time}</Text>
                  <View style={{ flex: 1 }} />
                  {s.is_booked ? (
                    <View style={styles.bookedChip}><Text style={styles.bookedChipTxt}>BOOKED</Text></View>
                  ) : (
                    <TouchableOpacity onPress={() => toggleTime(s.time)} testID={`del-${s.id}`} disabled={busy}>
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sub: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  h: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  dateBtn: { width: 64, borderRadius: radius.lg, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.borderLight, paddingVertical: 10, alignItems: "center" },
  dateActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateDow: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
  dateNum: { fontSize: 20, color: colors.text, fontWeight: "800", marginTop: 2 },
  dateMon: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  summary: { flexDirection: "row", alignItems: "center", padding: spacing.md, backgroundColor: colors.primaryLight, borderRadius: radius.lg, marginTop: spacing.lg, gap: 8 },
  summaryLbl: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
  summaryVal: { fontSize: 20, fontWeight: "800", color: colors.text, marginTop: 2 },
  bulkBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.primary },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot: { width: "22%", paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, alignItems: "center", backgroundColor: "#fff" },
  slotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotBooked: { backgroundColor: colors.warningLight, borderColor: colors.warning },
  slotTxt: { fontSize: 12, fontWeight: "700", color: colors.text },
  bookedLbl: { fontSize: 9, color: colors.warning, fontWeight: "800", marginTop: 2 },
  input: { flex: 1, backgroundColor: "#fff", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.text },
  addCustom: { width: 52, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", borderRadius: radius.lg },
  slotRowTime: { fontSize: 15, fontWeight: "700", color: colors.text, marginLeft: 10 },
  bookedChip: { backgroundColor: colors.warningLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  bookedChipTxt: { fontSize: 10, color: colors.warning, fontWeight: "800" },
});
