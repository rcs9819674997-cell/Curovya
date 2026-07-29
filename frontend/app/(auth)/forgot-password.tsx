import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Input from "@/src/components/Input";
import Button from "@/src/components/Button";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!email.includes("@")) return setErr("Please enter a valid email");
    setBusy(true);
    try {
      const r = await api.post<{ ok: boolean; message: string; dev_otp?: string | null }>(
        "/auth/forgot-password",
        { email: email.trim().toLowerCase() },
        false,
      );
      setDevOtp(r.dev_otp || null);
      // Continue to reset screen with prefilled email + otp for dev
      setTimeout(() => {
        router.push({ pathname: "/(auth)/reset-password", params: { email: email.trim().toLowerCase(), otp: r.dev_otp || "" } });
      }, 800);
    } catch (e: any) {
      setErr(e?.detail || "Failed to send reset code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} testID="forgot-back" style={{ marginBottom: spacing.md }}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.logo}>
            <Ionicons name="key-outline" size={40} color={colors.primary} />
          </View>
          <Text style={styles.h1}>Forgot Password?</Text>
          <Text style={styles.sub}>Enter the email you signed up with. We&apos;ll send a 6-digit reset code.</Text>

          <View style={{ height: spacing.xl }} />

          <Input
            testID="forgot-email-input"
            label="Email"
            icon="mail-outline"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          {err ? <Text style={styles.err}>{err}</Text> : null}
          {devOtp ? (
            <View style={styles.devBox}>
              <Ionicons name="information-circle-outline" size={16} color={colors.info} />
              <Text style={{ color: colors.info, marginLeft: 6, fontSize: 12 }}>Dev OTP: {devOtp}</Text>
            </View>
          ) : null}

          <Button title="Send Reset Code" onPress={submit} loading={busy} testID="forgot-submit-button" />

          <TouchableOpacity onPress={() => router.replace("/(auth)/login")} style={{ marginTop: spacing.lg, alignItems: "center" }} testID="forgot-back-to-login">
            <Text style={{ color: colors.primary, fontWeight: "700" }}>Back to Sign In</Text>
          </TouchableOpacity>
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
  devBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.infoLight, padding: 8, borderRadius: radius.md, marginBottom: spacing.md },
});
