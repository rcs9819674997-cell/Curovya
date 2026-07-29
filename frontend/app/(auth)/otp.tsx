import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Button from "@/src/components/Button";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

export default function OtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email: string; otp?: string }>();
  const email = String(params.email || "");
  const initialOtp = String(params.otp || "");
  const { verifyOtp, resendOtp } = useAuth();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputs = useRef<Array<TextInput | null>>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(30);
  const [hint, setHint] = useState<string>(initialOtp);

  useEffect(() => {
    if (initialOtp && initialOtp.length === 6) {
      setDigits(initialOtp.split(""));
    }
  }, [initialOtp]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds(seconds - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const setDigit = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < 5) inputs.current[i + 1]?.focus();
  };

  const verify = async () => {
    setErr(null);
    const code = digits.join("");
    if (code.length < 6) return setErr("Please enter the 6-digit code");
    setBusy(true);
    try {
      await verifyOtp(email, code);
      router.replace("/(tabs)");
    } catch (e: any) {
      setErr(e?.detail || "Invalid OTP");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setSeconds(30);
    setErr(null);
    try {
      const r = await resendOtp(email);
      if (r.dev_otp) setHint(r.dev_otp);
    } catch (e: any) {
      setErr(e?.detail || "Could not resend");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, padding: spacing.xl }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.h1}>Verify your email</Text>
        <Text style={styles.sub}>We sent a 6-digit code to</Text>
        <Text style={styles.email}>{email}</Text>

        <View style={styles.otpRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(r) => { inputs.current[i] = r; }}
              testID={`otp-digit-${i}`}
              style={styles.otpBox}
              value={d}
              onChangeText={(v) => setDigit(i, v)}
              onKeyPress={(e) => {
                if (e.nativeEvent.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
              }}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
            />
          ))}
        </View>

        {hint ? (
          <View style={styles.devHint}>
            <Ionicons name="key-outline" size={14} color={colors.info} />
            <Text style={styles.devHintText}> Dev OTP: {hint}</Text>
          </View>
        ) : null}

        {err ? <Text style={{ color: colors.error, marginTop: 8 }}>{err}</Text> : null}

        <View style={{ height: spacing.xl }} />
        <Button title="Verify" onPress={verify} loading={busy} testID="otp-verify" />

        <View style={{ marginTop: spacing.lg, alignItems: "center" }}>
          {seconds > 0 ? (
            <Text style={{ color: colors.textSecondary }}>Resend in 0:{seconds.toString().padStart(2, "0")}</Text>
          ) : (
            <TouchableOpacity onPress={resend} testID="otp-resend">
              <Text style={{ color: colors.primary, fontWeight: "700" }}>Resend code</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: "800", color: colors.text, marginTop: spacing.md },
  sub: { fontSize: 15, color: colors.textSecondary, marginTop: 6 },
  email: { fontSize: 15, color: colors.text, fontWeight: "600", marginTop: 4 },
  otpRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xl },
  otpBox: { width: 48, height: 56, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.borderLight, fontSize: 22, fontWeight: "700", color: colors.text, backgroundColor: "#fff" },
  devHint: { flexDirection: "row", alignItems: "center", marginTop: spacing.md, alignSelf: "flex-start", backgroundColor: colors.infoLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  devHintText: { color: colors.info, fontSize: 12, fontWeight: "600" },
});
