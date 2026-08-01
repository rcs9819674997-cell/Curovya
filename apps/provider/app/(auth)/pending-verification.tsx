import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Button from "@/src/components/Button";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

export default function PendingVerification() {
  const router = useRouter();
  const { user, refresh, logout } = useAuth();
  const [checking, setChecking] = useState(false);

  const checkStatus = async () => {
    setChecking(true);
    try {
      await refresh();
      if (user?.is_approved) {
        Alert.alert("Account Approved!", "Your provider account has been verified. Welcome to Curovya!", [
          {
            text: "Go to Dashboard",
            onPress: () => {
              if (user.role === "doctor") router.replace("/(doctor)");
              else if (user.role === "lab_admin") router.replace("/(lab)");
              else router.replace("/(clinic)");
            },
          },
        ]);
      } else {
        Alert.alert(
          "Still Under Review",
          "Your application is currently being verified by Curovya Admin. You will be notified once approved.",
        );
      }
    } catch {
      Alert.alert("Notice", "Unable to refresh status right now. Please check again shortly.");
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const roleLabel =
    user?.role === "doctor"
      ? "Medical Doctor"
      : user?.role === "clinic_admin"
      ? "Clinic Administrator"
      : user?.role === "lab_admin"
      ? "Lab Administrator"
      : "Healthcare Provider";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} testID="pending-logout">
            <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={44} color="#D97706" />
          </View>
          <View style={styles.badge}>
            <View style={styles.pulseDot} />
            <Text style={styles.badgeText}>UNDER VERIFICATION</Text>
          </View>
          <Text style={styles.title}>Application Submitted</Text>
          <Text style={styles.subtitle}>
            Your credentials have been submitted to the Curovya Compliance Team. Access is restricted until an administrator verifies your profile.
          </Text>
        </View>

        {/* Credentials Details Summary */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Submitted Details</Text>
          
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.detailLabel}>Full Name:</Text>
            <Text style={styles.detailValue}>{user?.full_name || "N/A"}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="briefcase-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.detailLabel}>Role:</Text>
            <Text style={styles.detailValue}>{roleLabel}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="card-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.detailLabel}>License No:</Text>
            <Text style={[styles.detailValue, { fontWeight: "700", color: colors.primary }]}>
              {user?.license_number || "Submitted"}
            </Text>
          </View>

          {user?.specialty ? (
            <View style={styles.detailRow}>
              <Ionicons name="medkit-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.detailLabel}>Specialty:</Text>
              <Text style={styles.detailValue}>{user.specialty}</Text>
            </View>
          ) : null}

          {user?.clinic_name || user?.lab_name ? (
            <View style={styles.detailRow}>
              <Ionicons name="business-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.detailLabel}>Facility:</Text>
              <Text style={styles.detailValue}>{user.clinic_name || user.lab_name}</Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.infoNotice}>
            <Ionicons name="time-outline" size={20} color="#D97706" />
            <Text style={styles.infoNoticeText}>
              Verification usually takes <Text style={{ fontWeight: "700" }}>24–48 hours</Text>. You will receive an update once approved.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title="Check Verification Status"
            onPress={checkStatus}
            loading={checking}
            icon="refresh-outline"
            testID="check-status-btn"
          />
          <TouchableOpacity
            style={styles.helpBtn}
            onPress={() => router.push("/help")}
            testID="contact-support-btn"
          >
            <Ionicons name="headset-outline" size={18} color={colors.primary} />
            <Text style={styles.helpText}>Need Help? Contact Admin Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.xxl },
  topHeader: { flexDirection: "row", justifyContent: "flex-end", marginBottom: spacing.md },
  logoutBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: "#F1F5F9" },
  logoutText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  heroCard: { alignItems: "center", backgroundColor: "#FFF", borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: "#FEF3C7", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2, marginBottom: spacing.lg },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#FFFBEB", alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEF3C7", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99, marginBottom: spacing.md },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#D97706" },
  badgeText: { fontSize: 11, fontWeight: "800", color: "#B45309", letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: "800", color: colors.text, textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 21 },
  detailsCard: { backgroundColor: "#FFF", borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.borderLight, marginBottom: spacing.xl },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: spacing.sm },
  detailLabel: { fontSize: 14, color: colors.textSecondary, width: 95 },
  detailValue: { fontSize: 14, color: colors.text, fontWeight: "600", flex: 1 },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.md },
  infoNotice: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFBEB", padding: spacing.md, borderRadius: radius.md },
  infoNoticeText: { fontSize: 13, color: "#92400E", flex: 1, lineHeight: 18 },
  actions: { gap: spacing.md },
  helpBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
  helpText: { fontSize: 14, fontWeight: "600", color: colors.primary },
});
