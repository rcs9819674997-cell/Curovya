import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "@/src/components/ScreenHeader";
import Input from "@/src/components/Input";
import Button from "@/src/components/Button";
import { api, ApiError } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

const RELATIONS = [
  { key: "spouse", label: "Spouse", icon: "heart" as const, color: "#EC4899" },
  { key: "father", label: "Father", icon: "man" as const, color: "#3B82F6" },
  { key: "mother", label: "Mother", icon: "woman" as const, color: "#8B5CF6" },
  { key: "son", label: "Son", icon: "person" as const, color: "#F59E0B" },
  { key: "daughter", label: "Daughter", icon: "person" as const, color: "#F59E0B" },
  { key: "brother", label: "Brother", icon: "person" as const, color: "#10B981" },
  { key: "sister", label: "Sister", icon: "person" as const, color: "#10B981" },
  { key: "other", label: "Other", icon: "people" as const, color: "#64748B" },
];

const GENDERS = [
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
  { key: "other", label: "Other" },
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

export default function FamilyAddEdit() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editing = !!params.id;

  const [fullName, setFullName] = useState("");
  const [relation, setRelation] = useState("spouse");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [blood, setBlood] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [allergies, setAllergies] = useState("");
  const [conditions, setConditions] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    (async () => {
      try {
        const all = await api.get<any[]>("/family");
        const m = all.find((x) => x.id === params.id);
        if (m) {
          setFullName(m.full_name);
          setRelation(m.relation);
          setAge(m.age ? String(m.age) : "");
          setGender(m.gender || null);
          setBlood(m.blood_group || null);
          setPhone(m.phone || "");
          setAllergies(m.allergies || "");
          setConditions(m.medical_conditions || "");
        }
      } catch {}
    })();
  }, [editing, params.id]);

  const save = async () => {
    setError(null);
    if (!fullName.trim()) { setError("Please enter full name"); return; }
    setSaving(true);
    const body: any = {
      full_name: fullName.trim(),
      relation,
      age: age ? Number(age) : null,
      gender: gender,
      blood_group: blood,
      phone: phone.trim() || null,
      allergies: allergies.trim() || null,
      medical_conditions: conditions.trim() || null,
    };
    try {
      if (editing) {
        await api.patch(`/family/${params.id}`, body);
      } else {
        await api.post("/family", body);
      }
      router.back();
    } catch (e) {
      if (e instanceof ApiError) setError(e.detail);
      else setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScreenHeader title={editing ? "Edit Family Member" : "Add Family Member"} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          <Input
            label="Full Name *"
            placeholder="e.g. Sita Sharma"
            value={fullName}
            onChangeText={setFullName}
            icon="person-outline"
            testID="family-name"
          />

          <Text style={styles.label}>Relationship *</Text>
          <View style={styles.relGrid}>
            {RELATIONS.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={[styles.relChip, relation === r.key && { backgroundColor: r.color + "22", borderColor: r.color }]}
                onPress={() => setRelation(r.key)}
                testID={`relation-${r.key}`}
              >
                <Ionicons name={r.icon} size={16} color={relation === r.key ? r.color : colors.textSecondary} />
                <Text style={[styles.relTxt, relation === r.key && { color: r.color, fontWeight: "700" }]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Age"
                placeholder="e.g. 28"
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                icon="calendar-outline"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.rowChips}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g.key}
                    style={[styles.miniChip, gender === g.key && styles.miniChipActive]}
                    onPress={() => setGender(g.key)}
                  >
                    <Text style={[styles.miniTxt, gender === g.key && { color: "#fff" }]}>{g.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Text style={styles.label}>Blood Group</Text>
          <View style={styles.bloodGrid}>
            {BLOOD_GROUPS.map((b) => (
              <TouchableOpacity
                key={b}
                style={[styles.bloodChip, blood === b && styles.bloodChipActive]}
                onPress={() => setBlood(blood === b ? null : b)}
                testID={`blood-${b}`}
              >
                <Text style={[styles.bloodChipTxt, blood === b && { color: "#fff" }]}>{b}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Phone"
            placeholder="e.g. +977 9812345678"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            icon="call-outline"
          />

          <Input
            label="Allergies"
            placeholder="e.g. Peanuts, Penicillin"
            value={allergies}
            onChangeText={setAllergies}
            icon="warning-outline"
            multiline
          />

          <Input
            label="Medical Conditions"
            placeholder="e.g. Asthma, Diabetes"
            value={conditions}
            onChangeText={setConditions}
            icon="medical-outline"
            multiline
          />

          {error ? (
            <View style={styles.errBox}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={{ color: colors.error, marginLeft: 6, flex: 1 }}>{error}</Text>
            </View>
          ) : null}

          <View style={{ height: spacing.md }} />
          <Button
            title={editing ? "Save Changes" : "Add Member"}
            onPress={save}
            loading={saving}
            icon="checkmark"
            testID="family-save"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 8, marginTop: 4 },
  relGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  relChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.borderLight },
  relTxt: { fontSize: 13, color: colors.textSecondary },
  rowChips: { flexDirection: "row", gap: 6, backgroundColor: "#fff", padding: 4, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight, height: 52 },
  miniChip: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: radius.md, paddingVertical: 8 },
  miniChipActive: { backgroundColor: colors.primary },
  miniTxt: { fontSize: 12, color: colors.text, fontWeight: "600" },
  bloodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  bloodChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.borderLight, minWidth: 56, alignItems: "center" },
  bloodChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  bloodChipTxt: { color: colors.text, fontWeight: "700", fontSize: 13 },
  errBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.errorLight, padding: 10, borderRadius: radius.md, marginTop: spacing.md },
});
