import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Input from "@/src/components/Input";
import Button from "@/src/components/Button";
import { useAuth } from "@/src/context/AuthContext";
import { colors, spacing } from "@/src/theme";

export default function Signup() {
  const router = useRouter();
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+977");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (name.trim().length < 2) return setErr("Please enter your full name");
    if (!email.includes("@")) return setErr("Please enter a valid email");
    if (phone.length < 10) return setErr("Please enter a valid phone number");
    if (password.length < 6) return setErr("Password must be at least 6 characters");
    setBusy(true);
    try {
      const res = await signup(name.trim(), email.trim().toLowerCase(), phone.trim(), password);
      router.push({ pathname: "/(auth)/otp", params: { email: res.user.email, otp: res.dev_otp || "" } });
    } catch (e: any) {
      setErr(e?.detail || "Signup failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} testID="signup-back">
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.h1}>Create account</Text>
          <Text style={styles.sub}>Start your health journey with HamroDoctor</Text>
          <View style={{ height: spacing.xl }} />

          <Input testID="signup-name" label="Full name" icon="person-outline" value={name} onChangeText={setName} placeholder="Ram Sharma" />
          <Input testID="signup-email" label="Email" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Input testID="signup-phone" label="Phone" icon="call-outline" value={phone} onChangeText={setPhone} placeholder="+977 98xxxxxxxx" keyboardType="phone-pad" />
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

          {err ? <Text style={{ color: colors.error, marginBottom: spacing.md }}>{err}</Text> : null}

          <Button title="Create Account" onPress={submit} loading={busy} testID="signup-submit" />

          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: spacing.lg }}>
            <Text style={{ color: colors.textSecondary }}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: "800", color: colors.text, marginTop: spacing.md },
  sub: { fontSize: 15, color: colors.textSecondary, marginTop: 6 },
});
