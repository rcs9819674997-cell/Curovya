import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Input from "@/src/components/Input";
import Button from "@/src/components/Button";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

export default function ChangePassword() {
  const router = useRouter();
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setErr(null);
    if (cur.length < 6) return setErr("Enter your current password");
    if (pw.length < 6) return setErr("New password must be at least 6 characters");
    if (pw !== pw2) return setErr("Passwords do not match");
    setBusy(true);
    try {
      await api.post("/auth/change-password", { current_password: cur, new_password: pw });
      setDone(true);
      setTimeout(() => router.back(), 1200);
    } catch (e: any) {
      setErr(e?.detail || "Password change failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <View style={styles.top}>
            <TouchableOpacity onPress={() => router.back()} testID="change-pw-back">
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Change Password</Text>
            <View style={{ width: 26 }} />
          </View>

          <View style={styles.logo}>
            <Ionicons name="lock-closed-outline" size={40} color={colors.primary} />
          </View>

          <Input
            testID="change-pw-current"
            label="Current password"
            icon="lock-closed-outline"
            secureTextEntry={!showPw}
            value={cur}
            onChangeText={setCur}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            }
          />
          <Input
            testID="change-pw-new"
            label="New password"
            icon="lock-open-outline"
            secureTextEntry={!showPw}
            value={pw}
            onChangeText={setPw}
          />
          <Input
            testID="change-pw-confirm"
            label="Confirm new password"
            icon="lock-open-outline"
            secureTextEntry={!showPw}
            value={pw2}
            onChangeText={setPw2}
          />

          {err ? <Text style={styles.err}>{err}</Text> : null}
          {done ? (
            <View style={styles.okBox}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={{ color: colors.success, marginLeft: 6, fontWeight: "600" }}>Password changed successfully.</Text>
            </View>
          ) : null}

          <Button title="Save Changes" onPress={submit} loading={busy} testID="change-pw-submit" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.xl },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xl },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  logo: { width: 72, height: 72, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: spacing.xl, alignSelf: "center" },
  err: { color: colors.error, marginBottom: spacing.md },
  okBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.successLight, padding: 10, borderRadius: radius.md, marginBottom: spacing.md },
});
