import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "@/src/components/ScreenHeader";
import Input from "@/src/components/Input";
import Button from "@/src/components/Button";
import { api, ApiError } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

interface FamilyMember { id: string; full_name: string; relation: string; }

const PRESETS = [
  { label: "Once a day", times: ["08:00"] },
  { label: "Twice a day", times: ["08:00", "20:00"] },
  { label: "Thrice a day", times: ["08:00", "14:00", "20:00"] },
  { label: "Four times a day", times: ["08:00", "12:00", "16:00", "20:00"] },
];

const DURATIONS = [3, 5, 7, 14, 30];

export default function ReminderAdd() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prescription_id?: string; medicine_name?: string; dosage?: string }>();

  const [name, setName] = useState((params.medicine_name as string) || "");
  const [dosage, setDosage] = useState((params.dosage as string) || "");
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const [duration, setDuration] = useState(7);
  const [instructions, setInstructions] = useState("");
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<FamilyMember[]>("/family");
        setFamily(r);
      } catch {}
    })();
  }, []);

  const addTime = () => {
    // Insert a plausible next time based on distribution
    const next = times.length < 4 ? ["08:00", "14:00", "20:00", "22:00"][times.length] : "08:00";
    if (!times.includes(next)) setTimes([...times, next]);
  };

  const removeTime = (t: string) => {
    if (times.length === 1) return;
    setTimes(times.filter((x) => x !== t));
  };

  const cycleTime = (idx: number) => {
    // Cycle through common time slots on tap for quick selection
    const options = ["06:00", "07:00", "08:00", "09:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "21:00", "22:00"];
    const cur = times[idx];
    const i = options.indexOf(cur);
    const nxt = options[(i + 1) % options.length];
    const newTimes = [...times];
    newTimes[idx] = nxt;
    setTimes(newTimes);
  };

  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hh = h % 12 || 12;
    return `${hh}:${String(m).padStart(2, "0")} ${period}`;
  };

  const save = async () => {
    setError(null);
    if (!name.trim()) { setError("Please enter medicine name"); return; }
    if (times.length === 0) { setError("Add at least one time"); return; }
    setSaving(true);
    try {
      await api.post("/reminders", {
        medicine_name: name.trim(),
        dosage: dosage.trim(),
        times: [...new Set(times)].sort(),
        duration_days: duration,
        instructions: instructions.trim(),
        family_member_id: familyId,
        prescription_id: (params.prescription_id as string) || null,
      });
      router.back();
    } catch (e) {
      if (e instanceof ApiError) setError(e.detail);
      else setError("Failed to save reminder");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScreenHeader title="Add Medicine Reminder" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          <Input
            label="Medicine Name *"
            placeholder="e.g. Paracetamol 500mg"
            value={name}
            onChangeText={setName}
            icon="medical-outline"
            testID="reminder-name"
          />

          <Input
            label="Dosage / Pattern"
            placeholder="e.g. 1 tab or 1-0-1"
            value={dosage}
            onChangeText={setDosage}
            icon="repeat-outline"
          />

          <Text style={styles.label}>Quick Presets</Text>
          <View style={styles.presets}>
            {PRESETS.map((p) => {
              const isActive = JSON.stringify(times.sort()) === JSON.stringify(p.times.sort());
              return (
                <TouchableOpacity
                  key={p.label}
                  style={[styles.preset, isActive && styles.presetActive]}
                  onPress={() => setTimes(p.times)}
                  testID={`preset-${p.times.length}`}
                >
                  <Text style={[styles.presetTxt, isActive && { color: "#fff", fontWeight: "800" }]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Reminder Times *</Text>
          <View style={styles.timesGrid}>
            {times.map((t, idx) => (
              <View key={`${t}-${idx}`} style={styles.timeChip}>
                <TouchableOpacity onPress={() => cycleTime(idx)} testID={`time-${idx}`}>
                  <Text style={styles.timeTxt}>{fmt(t)}</Text>
                </TouchableOpacity>
                {times.length > 1 ? (
                  <TouchableOpacity onPress={() => removeTime(t)} style={styles.timeRemove}>
                    <Ionicons name="close" size={12} color={colors.error} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
            {times.length < 6 ? (
              <TouchableOpacity onPress={addTime} style={styles.timeAdd} testID="add-time">
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: "700", marginLeft: 4 }}>Add Time</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.hint}>Tap a time chip to cycle to another time</Text>

          <Text style={styles.label}>Duration</Text>
          <View style={styles.durationRow}>
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.durChip, duration === d && styles.durActive]}
                onPress={() => setDuration(d)}
                testID={`duration-${d}`}
              >
                <Text style={[styles.durTxt, duration === d && { color: "#fff" }]}>{d}</Text>
                <Text style={[styles.durLbl, duration === d && { color: "#fff" }]}>days</Text>
              </TouchableOpacity>
            ))}
          </View>

          {family.length > 1 ? (
            <>
              <Text style={styles.label}>For (Family Member)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
                <TouchableOpacity
                  style={[styles.famChip, !familyId && styles.famActive]}
                  onPress={() => setFamilyId(null)}
                >
                  <Ionicons name="person" size={14} color={!familyId ? "#fff" : colors.primary} />
                  <Text style={[styles.famTxt, !familyId && { color: "#fff" }]}>Self</Text>
                </TouchableOpacity>
                {family.filter((f) => f.relation !== "self").map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.famChip, familyId === f.id && styles.famActive]}
                    onPress={() => setFamilyId(f.id)}
                  >
                    <Ionicons name="person" size={14} color={familyId === f.id ? "#fff" : colors.primary} />
                    <Text style={[styles.famTxt, familyId === f.id && { color: "#fff" }]}>{f.full_name.split(" ")[0]}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : null}

          <Input
            label="Instructions"
            placeholder="e.g. After food, with water"
            value={instructions}
            onChangeText={setInstructions}
            icon="information-circle-outline"
            multiline
          />

          {error ? (
            <View style={styles.errBox}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={{ color: colors.error, marginLeft: 6, flex: 1 }}>{error}</Text>
            </View>
          ) : null}

          <View style={{ height: spacing.md }} />
          <Button title="Save Reminder" onPress={save} loading={saving} icon="alarm" testID="reminder-save" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 8, marginTop: 4 },
  hint: { fontSize: 11, color: colors.textDisabled, marginTop: -6, marginBottom: 12 },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  preset: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.borderLight },
  presetActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  presetTxt: { color: colors.text, fontSize: 12, fontWeight: "600" },

  timesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  timeChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primaryLight, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  timeTxt: { color: colors.primary, fontWeight: "800", fontSize: 14 },
  timeRemove: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  timeAdd: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1.5, borderColor: colors.primary, borderStyle: "dashed" },

  durationRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md },
  durChip: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: radius.lg, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.borderLight },
  durActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  durTxt: { color: colors.text, fontSize: 20, fontWeight: "800" },
  durLbl: { color: colors.textSecondary, fontSize: 10, fontWeight: "600", textTransform: "uppercase", marginTop: -2 },

  famChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.primaryLight, marginBottom: spacing.md },
  famActive: { backgroundColor: colors.primary },
  famTxt: { color: colors.primary, fontSize: 13, fontWeight: "700" },

  errBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.errorLight, padding: 10, borderRadius: radius.md, marginTop: spacing.md },
});
