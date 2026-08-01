import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Input from "@/src/components/Input";
import Button from "@/src/components/Button";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

const ROLES = [
  { id: "doctor", label: "Doctor", icon: "medkit-outline" },
  { id: "clinic_admin", label: "Clinic Admin", icon: "business-outline" },
  { id: "lab_admin", label: "Lab Admin", icon: "flask-outline" },
];

const SPECIALTIES = [
  "Cardiologist",
  "General Physician",
  "Pediatrician",
  "Dermatologist",
  "Neurologist",
  "Orthopedic Surgeon",
  "Gynecologist",
  "ENT Specialist",
  "Psychiatrist",
];

const ALL_LANGUAGES = ["Nepali", "English", "Maithili", "Hindi"];

export default function Signup() {
  const router = useRouter();
  const { signup } = useAuth();
  
  // Basic Account State
  const [role, setRole] = useState("doctor");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+977");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Doctor Credentials
  const [licenseNo, setLicenseNo] = useState("");
  const [specialty, setSpecialty] = useState("General Physician");
  const [qualification, setQualification] = useState("");
  const [experienceYears, setExperienceYears] = useState("5");
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [fee, setFee] = useState("500");
  const [selectedLangs, setSelectedLangs] = useState<string[]>(["Nepali", "English"]);

  // Clinic Admin Details
  const [clinicRegNo, setClinicRegNo] = useState("");

  // Lab Admin Details
  const [labName, setLabName] = useState("");
  const [labRegNo, setLabRegNo] = useState("");
  const [labAddress, setLabAddress] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggleLang = (lang: string) => {
    if (selectedLangs.includes(lang)) {
      setSelectedLangs(selectedLangs.filter((l) => l !== lang));
    } else {
      setSelectedLangs([...selectedLangs, lang]);
    }
  };

  const submit = async () => {
    setErr(null);
    if (name.trim().length < 2) return setErr("Please enter your full name");
    if (!email.includes("@")) return setErr("Please enter a valid email address");
    if (phone.length < 10) return setErr("Please enter a valid phone number");
    if (password.length < 6) return setErr("Password must be at least 6 characters");

    // Validate Role-Specific Onboarding Credentials
    if (role === "doctor") {
      if (!licenseNo.trim()) return setErr("Please enter your NMC Medical Council License Number");
      if (!qualification.trim()) return setErr("Please enter your Medical Qualification (e.g. MBBS, MD)");
      if (!clinicName.trim()) return setErr("Please enter your primary Clinic / Hospital name");
      if (!clinicAddress.trim()) return setErr("Please enter your Clinic Address");
    } else if (role === "clinic_admin") {
      if (!clinicName.trim()) return setErr("Please enter the official Clinic Name");
      if (!clinicRegNo.trim()) return setErr("Please enter the Clinic Registration / License Number");
      if (!clinicAddress.trim()) return setErr("Please enter the Clinic Address");
    } else if (role === "lab_admin") {
      if (!labName.trim()) return setErr("Please enter the Diagnostic Lab Name");
      if (!labRegNo.trim()) return setErr("Please enter the Lab Registration / License Number");
      if (!labAddress.trim()) return setErr("Please enter the Diagnostic Lab Address");
    }

    setBusy(true);
    try {
      const payload = {
        full_name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        role,
        license_number: role === "doctor" ? licenseNo.trim() : role === "clinic_admin" ? clinicRegNo.trim() : labRegNo.trim(),
        specialty: role === "doctor" ? specialty : undefined,
        qualification: role === "doctor" ? qualification.trim() : undefined,
        experience_years: role === "doctor" ? parseInt(experienceYears, 10) || 1 : undefined,
        clinic_name: role === "doctor" || role === "clinic_admin" ? clinicName.trim() : undefined,
        clinic_address: role === "doctor" || role === "clinic_admin" ? clinicAddress.trim() : undefined,
        consultation_fee: role === "doctor" ? parseInt(fee, 10) || 500 : undefined,
        languages: role === "doctor" ? selectedLangs : undefined,
        lab_name: role === "lab_admin" ? labName.trim() : undefined,
        lab_address: role === "lab_admin" ? labAddress.trim() : undefined,
      };

      const res = await signup(payload);
      router.push({ pathname: "/(auth)/otp", params: { email: res.user.email, otp: res.dev_otp || "" } });
    } catch (e: any) {
      setErr(e?.detail || e?.message || "Registration failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => router.back()} testID="signup-back" style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={styles.h1}>Join Curovya Provider</Text>
          <Text style={styles.sub}>Complete your onboarding details for verification</Text>
          <View style={{ height: spacing.lg }} />

          {/* Account Type Selection */}
          <Text style={styles.sectionHeader}>1. Select Provider Role</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => {
              const active = role === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.roleChip, active && styles.roleChipActive]}
                  onPress={() => setRole(r.id)}
                  testID={`role-${r.id}`}
                >
                  <Ionicons name={r.icon as any} size={18} color={active ? "#fff" : colors.textSecondary} />
                  <Text style={[styles.roleText, active && styles.roleTextActive]}>{r.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Basic Account Credentials */}
          <Text style={styles.sectionHeader}>2. Account Information</Text>
          <Input testID="signup-name" label="Full Name" icon="person-outline" value={name} onChangeText={setName} placeholder="e.g. Dr. Ram Sharma" />
          <Input testID="signup-email" label="Email Address" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="you@hospital.np" keyboardType="email-address" autoCapitalize="none" />
          <Input testID="signup-phone" label="Mobile Phone" icon="call-outline" value={phone} onChangeText={setPhone} placeholder="+977 98xxxxxxxx" keyboardType="phone-pad" />
          <Input
            testID="signup-password"
            label="Password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPw}
            placeholder="At least 6 characters"
            rightIcon={
              <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            }
          />

          {/* Role-Specific Onboarding Credentials */}
          <Text style={styles.sectionHeader}>3. Credentials & Verification Details</Text>

          {role === "doctor" && (
            <View>
              <Input
                testID="signup-license"
                label="NMC Medical Council License No."
                icon="card-outline"
                value={licenseNo}
                onChangeText={setLicenseNo}
                placeholder="e.g. NMC-45892"
                autoCapitalize="characters"
              />

              <Text style={styles.fieldLabel}>Medical Specialty</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                {SPECIALTIES.map((s) => {
                  const active = specialty === s;
                  return (
                    <TouchableOpacity key={s} style={[styles.chip, active && styles.chipActive]} onPress={() => setSpecialty(s)}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Input testID="signup-qual" label="Qualifications / Degrees" icon="school-outline" value={qualification} onChangeText={setQualification} placeholder="e.g. MBBS, MD (Cardiology)" />
              <Input testID="signup-exp" label="Years of Experience" icon="time-outline" value={experienceYears} onChangeText={setExperienceYears} keyboardType="numeric" placeholder="e.g. 8" />
              <Input testID="signup-clinic" label="Primary Clinic / Hospital Name" icon="business-outline" value={clinicName} onChangeText={setClinicName} placeholder="e.g. Janakpur Heart Clinic" />
              <Input testID="signup-address" label="Clinic Address" icon="location-outline" value={clinicAddress} onChangeText={setClinicAddress} placeholder="e.g. Station Road, Janakpurdham" />
              <Input testID="signup-fee" label="Consultation Fee (NPR)" icon="cash-outline" value={fee} onChangeText={setFee} keyboardType="numeric" placeholder="800" />

              <Text style={styles.fieldLabel}>Languages Spoken</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md }}>
                {ALL_LANGUAGES.map((l) => {
                  const active = selectedLangs.includes(l);
                  return (
                    <TouchableOpacity key={l} style={[styles.chip, active && styles.chipActive]} onPress={() => toggleLang(l)}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{l}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {role === "clinic_admin" && (
            <View>
              <Input testID="signup-clinic-name" label="Official Clinic Name" icon="business-outline" value={clinicName} onChangeText={setClinicName} placeholder="e.g. Janakpur Specialty Clinic" />
              <Input testID="signup-clinic-reg" label="Clinic Registration / License No." icon="card-outline" value={clinicRegNo} onChangeText={setClinicRegNo} placeholder="e.g. CLINIC-REG-8821" autoCapitalize="characters" />
              <Input testID="signup-clinic-addr" label="Clinic Address" icon="location-outline" value={clinicAddress} onChangeText={setClinicAddress} placeholder="e.g. Station Road, Janakpurdham" />
            </View>
          )}

          {role === "lab_admin" && (
            <View>
              <Input testID="signup-lab-name" label="Diagnostic Lab Name" icon="flask-outline" value={labName} onChangeText={setLabName} placeholder="e.g. Janakpur Diagnostic Center" />
              <Input testID="signup-lab-reg" label="Lab License / Registration No." icon="card-outline" value={labRegNo} onChangeText={setLabRegNo} placeholder="e.g. LAB-REG-4412" autoCapitalize="characters" />
              <Input testID="signup-lab-addr" label="Diagnostic Lab Address" icon="location-outline" value={labAddress} onChangeText={setLabAddress} placeholder="e.g. Hospital Road, Janakpurdham" />
            </View>
          )}

          {err ? (
            <View style={styles.errCard}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
              <Text style={styles.errText}>{err}</Text>
            </View>
          ) : null}

          <View style={{ marginTop: spacing.md }}>
            <Button title="Submit Provider Onboarding" onPress={submit} loading={busy} testID="signup-submit" />
          </View>

          <Text style={styles.disclaimer}>
            By submitting, you certify that all medical license and registration information provided is authentic. Curovya verifies all credentials before granting system access.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  h1: { fontSize: 26, fontWeight: "800", color: colors.text },
  sub: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  sectionHeader: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: spacing.lg, marginBottom: spacing.md },
  roleRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md },
  roleChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: "#F8FAFC",
  },
  roleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  roleTextActive: { color: "#fff" },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 8, marginTop: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F1F5F9", marginRight: 8, borderWidth: 1, borderColor: colors.borderLight },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  chipTextActive: { color: "#fff" },
  errCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEE2E2", padding: spacing.md, borderRadius: radius.md, marginVertical: spacing.md },
  errText: { color: colors.error, fontSize: 13, flex: 1, fontWeight: "500" },
  disclaimer: { fontSize: 12, color: colors.textSecondary, textAlign: "center", marginTop: spacing.lg, lineHeight: 18 },
});
