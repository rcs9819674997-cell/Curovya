import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "@/src/components/ScreenHeader";
import Input from "@/src/components/Input";
import Button from "@/src/components/Button";
import { api, ApiError } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

interface CDoc { id: string; name: string; specialty: string; }

export default function ClinicWalkIn() {
  const router = useRouter();
  const params = useLocalSearchParams<{ doctor_id?: string }>();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState("");
  const [doctorId, setDoctorId] = useState<string>((params.doctor_id as string) || "");
  const [doctors, setDoctors] = useState<CDoc[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.clinic_id) return;
    (async () => {
      try {
        const d = await api.get<CDoc[]>(`/clinic/${user.clinic_id}/doctors`);
        setDoctors(d);
        if (!doctorId && d.length > 0) setDoctorId(d[0].id);
      } catch {}
    })();
  }, [user?.clinic_id]);

  const submit = async () => {
    setError(null);
    if (!name.trim() || phone.length < 7 || !doctorId) {
      setError("Fill name, phone (min 7 digits) and select doctor");
      return;
    }
    setSaving(true);
    try {
      const appt = await api.post<{ id: string; booking_id: string; token_number: number; doctor_name: string }>(
        `/clinic/${user!.clinic_id}/walk-in`,
        {
          doctor_id: doctorId,
          patient_name: name.trim(),
          patient_phone: phone.trim(),
          patient_age: age ? Number(age) : undefined,
          patient_gender: gender,
          symptoms: symptoms.trim(),
        },
      );
      Alert.alert(
        "Walk-in Registered",
        `Token #${appt.token_number} generated for ${name.trim()} with ${appt.doctor_name}.\nBooking ID: ${appt.booking_id}`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (e) {
      if (e instanceof ApiError) setError(e.detail);
      else setError("Failed to register walk-in");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScreenHeader title="New Walk-in" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          <View style={styles.banner}>
            <View style={styles.bannerIcon}>
              <Ionicons name="walk" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Register Walk-in Patient</Text>
              <Text style={styles.bannerSub}>Payment is marked as paid (cash). A token will be auto-generated.</Text>
            </View>
          </View>

          <Input label="Patient Name *" placeholder="e.g. Ram Bahadur Shrestha" value={name} onChangeText={setName} icon="person-outline" testID="walkin-name" />
          <Input label="Phone *" placeholder="+977 98" value={phone} onChangeText={setPhone} keyboardType="phone-pad" icon="call-outline" testID="walkin-phone" />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input label="Age" placeholder="e.g. 45" value={age} onChangeText={setAge} keyboardType="numeric" icon="calendar-outline" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.rowChips}>
                {["male", "female", "other"].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.miniChip, gender === g && styles.miniChipActive]}
                    onPress={() => setGender(g)}
                    testID={`walkin-gender-${g}`}
                  >
                    <Text style={[styles.miniTxt, gender === g && { color: "#fff" }]}>{g[0].toUpperCase() + g.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Text style={styles.label}>Select Doctor *</Text>
          <View style={{ gap: 8, marginBottom: spacing.md }}>
            {doctors.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.docChip, doctorId === d.id && styles.docChipActive]}
                onPress={() => setDoctorId(d.id)}
                testID={`walkin-doc-${d.id}`}
              >
                <View style={styles.docCircle}>
                  <Ionicons name="medkit" size={16} color={doctorId === d.id ? "#fff" : colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.docName, doctorId === d.id && { color: "#fff" }]}>{d.name}</Text>
                  <Text style={[styles.docSpec, doctorId === d.id && { color: "rgba(255,255,255,0.85)" }]}>{d.specialty}</Text>
                </View>
                {doctorId === d.id ? <Ionicons name="checkmark-circle" size={20} color="#fff" /> : null}
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Symptoms / Chief Complaint"
            placeholder="e.g. Chest pain since morning"
            value={symptoms}
            onChangeText={setSymptoms}
            multiline
            icon="medical-outline"
            testID="walkin-symptoms"
          />

          {error ? (
            <View style={styles.errBox}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={{ color: colors.error, marginLeft: 6, flex: 1 }}>{error}</Text>
            </View>
          ) : null}

          <View style={{ height: spacing.md }} />
          <Button title="Register Walk-in & Generate Token" onPress={submit} loading={saving} icon="add-circle" testID="walkin-submit" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.primaryLight, padding: 12, borderRadius: radius.md, marginBottom: spacing.md },
  bannerIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  bannerTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  bannerSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 8, marginTop: 4 },
  rowChips: { flexDirection: "row", gap: 6, backgroundColor: "#fff", padding: 4, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight, height: 52 },
  miniChip: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: radius.md, paddingVertical: 8 },
  miniChipActive: { backgroundColor: colors.primary },
  miniTxt: { fontSize: 11, color: colors.text, fontWeight: "600" },

  docChip: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.borderLight },
  docChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  docCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  docName: { fontSize: 14, fontWeight: "700", color: colors.text },
  docSpec: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  errBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.errorLight, padding: 10, borderRadius: radius.md, marginTop: spacing.md },
});
