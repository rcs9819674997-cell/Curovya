import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Input from "@/src/components/Input";
import Button from "@/src/components/Button";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState(__DEV__ ? "doctor@hamrodoctor.np" : "");
  const [password, setPassword] = useState(__DEV__ ? "Doctor@123" : "");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null);
    if (!email.includes("@")) return setErr("Please enter a valid email");
    if (password.length < 6) return setErr("Password must be at least 6 characters");
    setBusy(true);
    try {
      const u = await login(email.trim().toLowerCase(), password);
      if (u.role === "doctor") router.replace("/(doctor)");
      else if (u.role === "clinic_admin" || u.role === "receptionist") router.replace("/(clinic)");
      else if (u.role === "lab_admin") router.replace("/(lab)");
      else {
        setErr("This account is not a provider account. Please use the Curovya patient or admin app.");
      }
    } catch (e: any) {
      setErr(e?.detail || e?.message || "Login failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}>
            <Ionicons name="medkit" size={40} color={colors.primary} />
          </View>
          <Text style={styles.h1}>Welcome back</Text>
          <Text style={styles.sub}>Sign in to the Curovya Provider app</Text>

          <View style={{ height: spacing.xl }} />

          <Input
            testID="login-email-input"
            label="Email"
            icon="mail-outline"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />

          <Input
            testID="login-password-input"
            label="Password"
            icon="lock-closed-outline"
            placeholder="Enter your password"
            secureTextEntry={!showPw}
            value={password}
            onChangeText={setPassword}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPw(!showPw)} testID="toggle-password">
                <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            }
          />

          {err ? <Text style={styles.err}>{err}</Text> : null}

          <View style={{ alignSelf: "flex-end", marginBottom: spacing.md }}>
            <TouchableOpacity testID="login-forgot" onPress={() => router.push("/(auth)/forgot-password")}><Text style={{ color: colors.primary, fontWeight: "600" }}>Forgot password?</Text></TouchableOpacity>
          </View>

          <Button title="Sign In" onPress={submit} loading={busy} testID="login-submit-button" />

          <View style={styles.dividerRow}>
            <View style={styles.line} />
            <Text style={styles.dividerTxt}>or</Text>
            <View style={styles.line} />
          </View>

          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: spacing.md }}>
            <Text style={{ color: colors.textSecondary }}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/signup")} testID="go-signup">
              <Text style={{ color: colors.primary, fontWeight: "700" }}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {__DEV__ ? (
            <View style={styles.demoBox}>
              <Ionicons name="information-circle-outline" size={16} color={colors.info} />
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Text style={styles.demoTxt}>Doctor: doctor@hamrodoctor.np / Doctor@123</Text>
                <Text style={styles.demoTxt}>Clinic Admin: admin@heartclinic.np / Admin@123</Text>
                <Text style={styles.demoTxt}>Receptionist: reception@heartclinic.np / Recep@123</Text>
                <Text style={styles.demoTxt}>Lab Admin: lab@hamrodoctor.np / Lab@123</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.xl, paddingTop: spacing.xl },
  logo: { width: 72, height: 72, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  h1: { fontSize: 28, fontWeight: "800", color: colors.text },
  sub: { fontSize: 15, color: colors.textSecondary, marginTop: 6 },
  err: { color: colors.error, marginBottom: spacing.md },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: spacing.lg },
  line: { flex: 1, height: 1, backgroundColor: colors.borderLight },
  dividerTxt: { marginHorizontal: 12, color: colors.textDisabled, fontSize: 12 },
  demoBox: { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: colors.infoLight, padding: 10, borderRadius: radius.md, marginTop: spacing.xl },
  demoTxt: { color: colors.info, fontSize: 11, lineHeight: 16 },
});
