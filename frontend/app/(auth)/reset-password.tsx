import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Input from "@/src/components/Input";
import Button from "@/src/components/Button";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; otp?: string }>();
  const [email, setEmail] = useState((params.email as string) || "");
  const [otp, setOtp] = useState((params.otp as string) || "");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setErr(null);
    if (!email.includes("@")) return setErr("Enter a valid email");
    if (otp.length !== 6) return setErr("Enter the 6-digit code");
    if (pw.length < 6) return setErr("Password must be at least 6 characters");
    if (pw !== pw2) return setErr("Passwords do not match");
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { email: email.trim().toLowerCase(), otp, new_password: pw }, false);
      setDone(true);
      setTimeout(() => router.replace("/(auth)/login"), 1400);
    } catch (e: any) {
      setErr(e?.detail || "Reset failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} testID="reset-back" style={{ marginBottom: spacing.md }}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.logo}>
            <Ionicons name="shield-checkmark-outline" size={40} color={colors.primary} />
          </View>
          <Text style={styles.h1}>Reset Password</Text>
          <Text style={styles.sub}>Enter the 6-digit code and choose a new password.</Text>

          <View style={{ height: spacing.xl }} />

          <Input
            testID="reset-email-input"
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Input
            testID="reset-otp-input"
            label="6-digit code"
            icon="keypad-outline"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
          />

          <Input
            testID="reset-password-input"
            label="New password"
            icon="lock-closed-outline"
            value={pw}
            onChangeText={setPw}
            secureTextEntry={!showPw}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            }
          />

          <Input
            testID="reset-password-confirm-input"
            label="Confirm new password"
            icon="lock-closed-outline"
            value={pw2}
            onChangeText={setPw2}
            secureTextEntry={!showPw}
          />

          {err ? <Text style={styles.err}>{err}</Text> : null}
          {done ? (
            <View style={styles.okBox}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={{ color: colors.success, marginLeft: 6, fontWeight: "600" }}>Password reset! Redirecting…</Text>
            </View>
          ) : null}

          <Button title="Reset Password" onPress={submit} loading={busy} testID="reset-submit-button" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.xl },
  logo: { width: 72, height: 72, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  h1: { fontSize: 28, fontWeight: "800", color: colors.text },
  sub: { fontSize: 15, color: colors.textSecondary, marginTop: 6 },
  err: { color: colors.error, marginBottom: spacing.md },
  okBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.successLight, padding: 10, borderRadius: radius.md, marginBottom: spacing.md },
});
