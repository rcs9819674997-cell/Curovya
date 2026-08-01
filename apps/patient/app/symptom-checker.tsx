import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "@/src/components/ScreenHeader";
import { Card, Chip } from "@/src/components/UI";
import Button from "@/src/components/Button";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

const COMMON = ["Fever", "Headache", "Cough", "Chest pain", "Fatigue", "Nausea", "Sore throat", "Body ache", "Dizziness", "Shortness of breath"];

interface SymptomResp {
  possible_conditions: string[];
  recommended_specialists: string[];
  urgency: "self_care" | "see_doctor_soon" | "urgent" | "emergency";
  advice: string;
  disclaimer: string;
}

const URGENCY_META = {
  self_care: { label: "Self-care", tone: colors.success, bg: colors.successLight, icon: "leaf-outline" as const },
  see_doctor_soon: { label: "See a doctor soon", tone: colors.info, bg: colors.infoLight, icon: "medkit-outline" as const },
  urgent: { label: "Urgent care needed", tone: colors.warning, bg: colors.warningLight, icon: "warning-outline" as const },
  emergency: { label: "Emergency – seek help now", tone: colors.error, bg: colors.errorLight, icon: "alert-circle" as const },
};

export default function SymptomChecker() {
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [duration, setDuration] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SymptomResp | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (s: string) => {
    setSelected(selected.includes(s) ? selected.filter(x => x !== s) : [...selected, s]);
  };

  const check = async () => {
    setErr(null);
    const symptoms = [...selected];
    if (custom.trim()) symptoms.push(custom.trim());
    if (symptoms.length === 0) return setErr("Please select or type at least one symptom");
    setBusy(true);
    try {
      const r = await api.post<SymptomResp>("/ai/symptom-check", { symptoms, duration: duration || undefined });
      setResult(r);
    } catch (e: any) {
      setErr(e?.detail || "Could not analyse symptoms right now");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setResult(null); setSelected([]); setCustom(""); setDuration(""); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScreenHeader title="AI Symptom Checker" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          {!result ? (
            <>
              <View style={styles.hero}>
                <View style={styles.aiIcon}><Ionicons name="sparkles" size={20} color="#fff" /></View>
                <Text style={styles.heroTitle}>Describe your symptoms</Text>
                <Text style={styles.heroSub}>Our AI will suggest possible causes and specialists. Not a medical diagnosis.</Text>
              </View>

              <Text style={styles.section}>Common symptoms</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {COMMON.map((s) => (
                  <Chip key={s} label={s} active={selected.includes(s)} onPress={() => toggle(s)} testID={`symptom-${s.toLowerCase().replace(/\s+/g, "-")}`} />
                ))}
              </View>

              <Text style={styles.section}>Add other symptoms</Text>
              <TextInput
                style={styles.input}
                testID="custom-symptom-input"
                value={custom}
                onChangeText={setCustom}
                placeholder="e.g. mild rash on arm"
                placeholderTextColor={colors.textDisabled}
              />

              <Text style={styles.section}>How long have you had these?</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {["<24h", "1-3 days", "4-7 days", ">1 week"].map((d) => (
                  <Chip key={d} label={d} active={duration === d} onPress={() => setDuration(d)} />
                ))}
              </View>

              {err ? <Text style={{ color: colors.error, marginTop: spacing.md }}>{err}</Text> : null}

              <View style={{ height: spacing.xl }} />
              <Button title="Analyse Symptoms" icon="sparkles" onPress={check} loading={busy} testID="analyse-btn" />

              <View style={styles.disclaimer}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.warning} />
                <Text style={styles.disclaimerTxt}>This tool provides guidance only. Always consult a qualified doctor for medical advice.</Text>
              </View>
            </>
          ) : (
            <>
              <View style={[styles.urgencyCard, { backgroundColor: URGENCY_META[result.urgency].bg }]}>
                <Ionicons name={URGENCY_META[result.urgency].icon} size={30} color={URGENCY_META[result.urgency].tone} />
                <Text style={[styles.urgencyLbl, { color: URGENCY_META[result.urgency].tone }]}>{URGENCY_META[result.urgency].label}</Text>
              </View>

              <Text style={styles.section}>Possible conditions</Text>
              <Card>
                {result.possible_conditions.map((c) => (
                  <View key={c} style={styles.condRow}>
                    <Ionicons name="ellipse" size={8} color={colors.primary} />
                    <Text style={styles.condTxt}>{c}</Text>
                  </View>
                ))}
              </Card>

              <Text style={styles.section}>Recommended Specialists</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {result.recommended_specialists.map((s) => (
                  <View key={s} style={styles.specChip}>
                    <Ionicons name="person-outline" size={12} color={colors.primary} />
                    <Text style={styles.specTxt}>{s}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.section}>Advice</Text>
              <Card>
                <Text style={{ color: colors.text, lineHeight: 22 }}>{result.advice}</Text>
              </Card>

              <View style={styles.disclaimerBig}>
                <Ionicons name="alert-circle" size={16} color={colors.warning} />
                <Text style={styles.disclaimerTxt}>{result.disclaimer}</Text>
              </View>

              <View style={{ height: spacing.xl }} />
              <Button title="Check different symptoms" variant="secondary" onPress={reset} icon="refresh" testID="reset-symptom" />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", padding: spacing.lg },
  aiIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: "#8B5CF6", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  heroTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  heroSub: { fontSize: 13, color: colors.textSecondary, marginTop: 6, textAlign: "center", lineHeight: 18 },
  section: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  input: { backgroundColor: "#fff", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: colors.text },
  disclaimer: { flexDirection: "row", alignItems: "flex-start", marginTop: spacing.md, backgroundColor: colors.warningLight, padding: 10, borderRadius: radius.md, gap: 6 },
  disclaimerTxt: { fontSize: 11, color: colors.textSecondary, flex: 1, lineHeight: 16 },
  urgencyCard: { alignItems: "center", padding: spacing.xl, borderRadius: radius.xxl, marginTop: spacing.md },
  urgencyLbl: { fontSize: 18, fontWeight: "800", marginTop: 8 },
  condRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, gap: 8 },
  condTxt: { fontSize: 14, color: colors.text, fontWeight: "500" },
  specChip: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, gap: 4 },
  specTxt: { fontSize: 12, color: colors.primary, fontWeight: "700" },
  disclaimerBig: { flexDirection: "row", alignItems: "flex-start", marginTop: spacing.lg, padding: 12, backgroundColor: colors.warningLight, borderRadius: radius.md, gap: 8 },
});
