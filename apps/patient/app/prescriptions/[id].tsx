import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "@/src/components/ScreenHeader";
import { Card, Badge } from "@/src/components/UI";
import Button from "@/src/components/Button";
import { api, ApiError } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

interface Medicine { name: string; dosage: string; duration: string; instructions: string; }
interface Rx {
  id: string; doctor_name: string; doctor_specialty: string; diagnosis: string;
  symptoms: string[]; medicines: Medicine[]; follow_up_date?: string | null; notes: string; created_at: string;
}

export default function PrescriptionView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [rx, setRx] = useState<Rx | null>(null);
  const [loading, setLoading] = useState(true);
  const [remindersLoading, setRemindersLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<Rx>(`/prescriptions/${id}`);
        setRx(r);
      } catch {}
      setLoading(false);
    })();
  }, [id]);

  const setAllReminders = async () => {
    if (!rx) return;
    setRemindersLoading(true);
    try {
      const res = await api.post<{ ok: boolean; count: number }>(`/reminders/from-prescription/${id}`, {});
      Alert.alert(
        "Reminders Set!",
        `${res.count} reminder${res.count === 1 ? "" : "s"} added for medicines in this prescription.`,
        [
          { text: "View Reminders", onPress: () => router.push("/reminders") },
          { text: "OK", style: "default" },
        ],
      );
    } catch (e) {
      if (e instanceof ApiError) Alert.alert("Error", e.detail);
    } finally {
      setRemindersLoading(false);
    }
  };

  if (loading || !rx) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
        <ScreenHeader title="Prescription" />
        <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScreenHeader title="E-Prescription" right={<Ionicons name="share-outline" size={22} color={colors.text} />} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={styles.doc}>{rx.doctor_name}</Text>
              <Text style={styles.spec}>{rx.doctor_specialty}</Text>
              <Text style={styles.date}>{new Date(rx.created_at).toDateString()}</Text>
            </View>
            <Badge label="Verified" tone="success" />
          </View>
        </Card>

        <Text style={styles.h}>Diagnosis</Text>
        <Card>
          <Text style={styles.diagnosis}>{rx.diagnosis}</Text>
          {rx.symptoms.length > 0 ? (
            <>
              <Text style={styles.subLbl}>Symptoms</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {rx.symptoms.map((s) => (
                  <View key={s} style={styles.symptom}><Text style={styles.symptomTxt}>{s}</Text></View>
                ))}
              </View>
            </>
          ) : null}
        </Card>

        <Text style={styles.h}>Medicines</Text>
        {rx.medicines.map((m, i) => (
          <Card key={i} style={{ marginBottom: spacing.md }} testID={`medicine-${i}`}>
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={styles.pill}>
                <Ionicons name="medical" size={18} color={colors.primary} />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.medName}>{m.name}</Text>
                <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                  <MetaChip label={m.dosage} icon="repeat" />
                  <MetaChip label={m.duration} icon="calendar-outline" />
                </View>
                {m.instructions ? <Text style={styles.instr}>ℹ  {m.instructions}</Text> : null}
              </View>
            </View>
          </Card>
        ))}

        {rx.follow_up_date ? (
          <Card style={{ backgroundColor: colors.warningLight, borderColor: colors.warning + "44" }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="alarm-outline" size={20} color={colors.warning} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ fontWeight: "700", color: colors.text }}>Follow-up on {rx.follow_up_date}</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>Reminder will be sent 1 day before</Text>
              </View>
            </View>
          </Card>
        ) : null}

        {rx.notes ? (
          <>
            <Text style={styles.h}>Doctor&apos;s Notes</Text>
            <Card>
              <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{rx.notes}</Text>
            </Card>
          </>
        ) : null}

        <View style={{ height: spacing.xl }} />
        <Button
          title="Set Medicine Reminders"
          icon="alarm-outline"
          onPress={setAllReminders}
          loading={remindersLoading}
          testID="set-reminders"
        />
        <View style={{ height: spacing.md }} />
        <Button
          title="Order Medicines from Pharmacy"
          icon="cart-outline"
          variant="secondary"
          onPress={() => Alert.alert("Coming soon", "Pharmacy delivery to Janakpurdham is being rolled out.")}
          testID="order-medicines"
        />
        <View style={{ height: spacing.md }} />
        <Button
          title="Download PDF"
          variant="ghost"
          icon="download-outline"
          onPress={() => Alert.alert("PDF Download", "Prescription PDF will be downloaded")}
          testID="download-pdf"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function MetaChip({ label, icon }: { label: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.bgMuted, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
      <Ionicons name={icon} size={12} color={colors.textSecondary} />
      <Text style={{ fontSize: 11, color: colors.text, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  doc: { fontSize: 16, fontWeight: "800", color: colors.text },
  spec: { fontSize: 13, color: colors.primary, marginTop: 2 },
  date: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  h: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  diagnosis: { fontSize: 16, fontWeight: "700", color: colors.primary },
  subLbl: { fontSize: 11, color: colors.textSecondary, marginTop: 10, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  symptom: { backgroundColor: colors.bgMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  symptomTxt: { fontSize: 12, color: colors.text, fontWeight: "500" },
  pill: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  medName: { fontSize: 15, fontWeight: "700", color: colors.text },
  instr: { fontSize: 12, color: colors.textSecondary, marginTop: 8, lineHeight: 18 },
});
