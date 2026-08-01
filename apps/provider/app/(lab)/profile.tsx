import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

export default function LabProfile() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const initials = (user?.full_name || "L")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const rows = [
    {
      icon: "flask-outline" as const,
      label: "Lab Bookings",
      sub: "Manage test requests & status",
      onPress: () => router.push("/(lab)/bookings"),
    },
    {
      icon: "notifications-outline" as const,
      label: "Notifications",
      sub: "System & booking alerts",
      onPress: () => router.push("/notifications"),
    },
    {
      icon: "lock-closed-outline" as const,
      label: "Change Password",
      sub: "Update account credentials",
      onPress: () => router.push("/change-password"),
    },
    {
      icon: "help-circle-outline" as const,
      label: "Help & Support",
      sub: "Technical & lab support",
      onPress: () => router.push("/help"),
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
            <Ionicons name="flask" size={13} color={colors.primary} />
            <Text style={styles.pillTxt}>Verified Lab Administrator</Text>
          </View>
        </View>

        <View style={styles.group}>
          {rows.map((r, i) => (
            <TouchableOpacity
              key={i}
              onPress={r.onPress}
              style={[styles.row, i < rows.length - 1 && styles.rowBorder]}
              testID={`lab-profile-${r.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <View style={styles.rowIcon}>
                <Ionicons name={r.icon} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{r.label}</Text>
                {r.sub ? <Text style={styles.rowSub}>{r.sub}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={() =>
            Alert.alert("Logout", "Are you sure you want to sign out of the lab portal?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Logout",
                style: "destructive",
                onPress: () => logout().then(() => router.replace("/(auth)/login")),
              },
            ])
          }
          style={[styles.group, styles.logoutRow]}
          testID="lab-logout"
        >
          <View style={[styles.rowIcon, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
          </View>
          <Text style={[styles.rowLabel, { color: colors.error }]}>Logout</Text>
        </TouchableOpacity>
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
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    gap: 5,
  },
  pillTxt: { color: colors.primary, fontSize: 11, fontWeight: "700" },
  group: {
    backgroundColor: "#fff",
    marginHorizontal: spacing.lg,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
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
  logoutRow: { paddingHorizontal: spacing.lg, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12 },
});
