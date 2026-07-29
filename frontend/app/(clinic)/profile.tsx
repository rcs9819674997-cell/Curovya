import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

export default function ClinicProfile() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "clinic_admin";
  const initials = (user?.full_name || "C")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const rows = [
    {
      icon: "walk-outline" as const,
      label: "Register Walk-in Patient",
      sub: "Generate instant queue token",
      onPress: () => router.push("/clinic-walkin"),
    },
    {
      icon: "calendar-outline" as const,
      label: "Manage Appointments",
      sub: "View and filter queue",
      onPress: () => router.push("/(clinic)/appointments"),
    },
    ...(isAdmin
      ? [
          {
            icon: "people-outline" as const,
            label: "Reception Staff",
            sub: "Manage clinic team",
            onPress: () => router.push("/(clinic)/staff"),
          },
        ]
      : []),
    {
      icon: "notifications-outline" as const,
      label: "Notifications",
      sub: "Activity alerts",
      onPress: () => router.push("/notifications"),
    },
    {
      icon: "key-outline" as const,
      label: "Change Password",
      sub: "Update security credentials",
      onPress: () => router.push("/change-password"),
    },
    {
      icon: "help-circle-outline" as const,
      label: "Help & Support",
      sub: "Clinic support & FAQs",
      onPress: () => router.push("/help"),
    },
    {
      icon: "log-out-outline" as const,
      label: "Logout",
      sub: "Sign out of clinic portal",
      danger: true,
      onPress: () =>
        Alert.alert("Logout", "Are you sure you want to sign out of the clinic portal?", [
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
            <Ionicons name={isAdmin ? "shield-checkmark" : "person"} size={13} color={colors.info} />
            <Text style={styles.pillTxt}>{isAdmin ? "Clinic Administrator" : "Clinic Receptionist"}</Text>
          </View>
        </View>

        <View style={styles.group}>
          {rows.map((r, i) => (
            <TouchableOpacity
              key={i}
              onPress={r.onPress}
              activeOpacity={0.7}
              style={[styles.row, i < rows.length - 1 && styles.rowBorder]}
              testID={`clinic-profile-${r.label.toLowerCase().replace(/\s+/g, "-")}`}
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
    backgroundColor: colors.infoLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    gap: 5,
  },
  pillTxt: { color: colors.info, fontSize: 11, fontWeight: "700" },
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
