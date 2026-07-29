import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "@/src/components/ScreenHeader";
import { Card, Chip } from "@/src/components/UI";
import Button from "@/src/components/Button";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

interface Appt { id: string; date: string; time: string; patient_id: string; patient_name: string; patient_phone: string; token_number: number; status: string; }
interface Medicine { name: string; dosage: string; duration: string; instructions: string; }

const COMMON_SYMPTOMS = ["Fever", "Headache", "Cough", "Body ache", "Nausea", "Fatigue", "Sore throat", "Chest pain"];
const FOLLOWUP = [0, 7, 15, 30];

export default function Prescribe() {
  const router = useRouter();
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const [appt, setAppt] = useState<Appt | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [diagnosis, setDiagnosis] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([{ name: "", dosage: "1-0-1", duration: "5 days", instructions: "" }]);
  const [followUp, setFollowUp] = useState<number>(7);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const rows = await api.get<Appt[]>("/doctor/appointments?scope=all").catch(() => []);
        let found = rows.find((r) => r.id === appointmentId) || null;
        if (!found && appointmentId) {
          found = await api.get<Appt>(`/appointments/${appointmentId}`).catch(() => null);
        }
        setAppt(found);
      } catch (err) {
        console.log("Error loading appointment for prescription:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [appointmentId]);


  const toggleSymptom = (s: string) => setSymptoms(symptoms.includes(s) ? symptoms.filter(x => x !== s) : [...symptoms, s]);

  const addCustomSymptom = () => {
    const s = customSymptom.trim();
    if (s && !symptoms.includes(s)) setSymptoms([...symptoms, s]);
    setCustomSymptom("");
  };

  const updateMed = (i: number, patch: Partial<Medicine>) => {
    setMedicines(medicines.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  };

  const removeMed = (i: number) => setMedicines(medicines.filter((_, idx) => idx !== i));
  const addMed = () => setMedicines([...medicines, { name: "", dosage: "1-0-1", duration: "5 days", instructions: "" }]);

  const submit = async () => {
    if (!appt) return;
    if (!diagnosis.trim()) return Alert.alert("Missing", "Please enter a diagnosis");
    const validMeds = medicines.filter(m => m.name.trim());
    if (validMeds.length === 0) return Alert.alert("Missing", "Please add at least one medicine");
    setBusy(true);
    try {
      await api.post("/doctor/prescriptions", {
        patient_id: appt.patient_id,
        appointment_id: appt.id,
        diagnosis: diagnosis.trim(),
        symptoms,
        medicines: validMeds,
        follow_up_days: followUp || null,
        notes: notes.trim(),
      });
      Alert.alert("Prescription saved", `${validMeds.length} medicine${validMeds.length !== 1 ? "s" : ""} added to patient records.`, [
        { text: "OK", onPress: () => router.replace("/(doctor)/schedule") },
      ]);
    } catch (e: any) {
      Alert.alert("Failed", e?.detail || "Try again");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
        <ScreenHeader title="Write Prescription" />
        <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!appt) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
        <ScreenHeader title="Write Prescription" />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: colors.textSecondary }}>Appointment not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScreenHeader title="Write Prescription" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={styles.pIcon}><Ionicons name="person" size={20} color={colors.primary} /></View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.pname}>{appt.patient_name}</Text>
                <Text style={styles.pmeta}>{appt.date} • {appt.time} • Token #{appt.token_number}</Text>
                <Text style={styles.pmeta}>{appt.patient_phone}</Text>
              </View>
            </View>
          </Card>

          <Text style={styles.h}>Diagnosis *</Text>
          <TextInput
            style={styles.input}
            testID="rx-diagnosis"
            value={diagnosis}
            onChangeText={setDiagnosis}
            placeholder="e.g. Viral Fever"
            placeholderTextColor={colors.textDisabled}
          />

          <Text style={styles.h}>Symptoms</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {COMMON_SYMPTOMS.map((s) => (
              <Chip key={s} label={s} active={symptoms.includes(s)} onPress={() => toggleSymptom(s)} testID={`sym-${s}`} />
            ))}
          </View>
          {symptoms.filter(s => !COMMON_SYMPTOMS.includes(s)).length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {symptoms.filter(s => !COMMON_SYMPTOMS.includes(s)).map((s) => (
                <TouchableOpacity key={s} onPress={() => toggleSymptom(s)} style={styles.customChip}>
                  <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 12 }}>{s}</Text>
                  <Ionicons name="close" size={12} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          <View style={styles.customRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={customSymptom}
              onChangeText={setCustomSymptom}
              placeholder="Add custom symptom"
              placeholderTextColor={colors.textDisabled}
              onSubmitEditing={addCustomSymptom}
              testID="rx-custom-symptom"
            />
            <TouchableOpacity onPress={addCustomSymptom} style={styles.addSym}>
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.h}>Medicines *</Text>
          {medicines.map((m, i) => (
            <Card key={i} style={{ marginBottom: spacing.md }} testID={`med-row-${i}`}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontWeight: "700", color: colors.text }}>Medicine {i + 1}</Text>
                {medicines.length > 1 ? (
                  <TouchableOpacity onPress={() => removeMed(i)} testID={`remove-med-${i}`}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={m.name}
                onChangeText={(v) => updateMed(i, { name: v })}
                placeholder="Medicine name (e.g. Paracetamol 500mg)"
                placeholderTextColor={colors.textDisabled}
                testID={`med-name-${i}`}
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={m.dosage}
                  onChangeText={(v) => updateMed(i, { dosage: v })}
                  placeholder="Dosage (1-0-1)"
                  placeholderTextColor={colors.textDisabled}
                  testID={`med-dosage-${i}`}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={m.duration}
                  onChangeText={(v) => updateMed(i, { duration: v })}
                  placeholder="Duration (5 days)"
                  placeholderTextColor={colors.textDisabled}
                  testID={`med-duration-${i}`}
                />
              </View>
              <TextInput
                style={styles.input}
                value={m.instructions}
                onChangeText={(v) => updateMed(i, { instructions: v })}
                placeholder="Instructions (optional)"
                placeholderTextColor={colors.textDisabled}
                testID={`med-instructions-${i}`}
              />
            </Card>
          ))}
          <TouchableOpacity onPress={addMed} style={styles.addMed} testID="add-med">
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: "700", marginLeft: 6 }}>Add another medicine</Text>
          </TouchableOpacity>

          <Text style={styles.h}>Follow-up</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {FOLLOWUP.map((d) => (
              <Chip key={d} label={d === 0 ? "None" : `${d} days`} active={followUp === d} onPress={() => setFollowUp(d)} testID={`followup-${d}`} />
            ))}
          </View>

          <Text style={styles.h}>Doctor&apos;s Notes</Text>
          <TextInput
            style={[styles.input, { minHeight: 90, textAlignVertical: "top" }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Rest, fluids, avoid oily food..."
            placeholderTextColor={colors.textDisabled}
            multiline
            testID="rx-notes"
          />

          <View style={{ height: spacing.xl }} />
          <Button
            title="Save & Send to Patient"
            icon="checkmark-circle"
            onPress={submit}
            loading={busy}
            testID="rx-submit"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  pname: { fontSize: 16, fontWeight: "700", color: colors.text },
  pmeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  h: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  input: { backgroundColor: "#fff", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.text, marginBottom: spacing.sm },
  customRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8 },
  addSym: { width: 46, height: 46, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  customChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  addMed: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, borderWidth: 1.5, borderColor: colors.primary, borderStyle: "dashed", borderRadius: radius.lg },
});
