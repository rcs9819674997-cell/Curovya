import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

export default function DoctorProfile() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const initials =
    (user?.full_name || "D")
      .split(" ")
      .filter((w) => !w.match(/^Dr/i))
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "DR";

  const rows = [
    {
      icon: "play-circle-outline" as const,
      label: "Manage Live Queue",
      sub: "Active consultation queue",
      onPress: () => router.push("/doctor-queue"),
    },
    {
      icon: "time-outline" as const,
      label: "Availability & Slots",
      sub: "Configure consultation hours",
      onPress: () => router.push("/doctor-availability"),
    },
    {
      icon: "person-outline" as const,
      label: "Edit Profile",
      sub: "Specialty, bio & details",
      onPress: () => router.push("/edit-profile"),
    },
    {
      icon: "key-outline" as const,
      label: "Security & Password",
      sub: "Update account password",
      onPress: () => router.push("/change-password"),
    },
    {
      icon: "help-circle-outline" as const,
      label: "Help & Support",
      sub: "FAQs and clinical support",
      onPress: () => router.push("/help"),
    },
    {
      icon: "log-out-outline" as const,
      label: "Logout",
      sub: "Sign out of account",
      danger: true,
      onPress: () =>
        Alert.alert("Logout", "Are you sure you want to sign out?", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Logout",
            style: "destructive",
            onPress: () => logout().then(() => router.replace("/(auth)/login")),
          },
        ]),
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <View style={styles.avatar}>
            <Text style={{ color: "#fff", fontSize: 26, fontWeight: "800" }}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.full_name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.pill}>
            <Ionicons name="shield-checkmark" size={13} color={colors.success} />
            <Text style={styles.pillTxt}>Verified Specialist Practitioner</Text>
          </View>
        </View>

        <View style={styles.group}>
          {rows.map((r, i) => (
            <TouchableOpacity
              key={i}
              onPress={r.onPress}
              activeOpacity={0.7}
              style={[styles.row, i < rows.length - 1 && styles.rowBorder]}
              testID={`doc-profile-${r.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <View style={[styles.rowIcon, r.danger && { backgroundColor: colors.errorLight }]}>
                <Ionicons name={r.icon} size={18} color={r.danger ? colors.error : colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, r.danger && { color: colors.error }]}>{r.label}</Text>
                {r.sub ? <Text style={styles.rowSub}>{r.sub}</Text> : null}
              </View>
              {!r.danger ? <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} /> : null}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: "center", padding: spacing.xl },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  name: { fontSize: 20, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
  email: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: colors.successLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    gap: 5,
  },
  pillTxt: { color: colors.success, fontSize: 11, fontWeight: "700" },
  group: {
    backgroundColor: "#fff",
    marginHorizontal: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { fontSize: 15, fontWeight: "700", color: colors.text },
  rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
