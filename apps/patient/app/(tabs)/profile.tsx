import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/src/components/UI";
import PlusUpsell from "@/src/components/PlusUpsell";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";
import { LANGS, useT } from "@/src/i18n";

interface Row { icon: keyof typeof Ionicons.glyphMap; label: string; sub?: string; onPress?: () => void; danger?: boolean }

export default function Profile() {
  const router = useRouter();
  const { user, logout, language, setLanguage } = useAuth();
  const t = useT();

  const rows: Row[][] = [
    [
      { icon: "person-outline", label: t("edit_profile"), sub: "Personal info & photo", onPress: () => router.push("/edit-profile") },
      { icon: "people-outline", label: t("family_members"), sub: "Manage self, spouse & children", onPress: () => router.push("/family") },
      { icon: "alarm-outline", label: t("medicine_reminders"), sub: "Adherence & daily schedule", onPress: () => router.push("/reminders") },
      { icon: "heart-outline", label: t("saved_doctors"), sub: "Your favorite doctors", onPress: () => Alert.alert("Coming soon") },
    ],
    [
      { icon: "card-outline", label: t("payment_methods"), sub: "eSewa, Khalti, Cards", onPress: () => Alert.alert("Coming soon") },
      { icon: "receipt-outline", label: t("transaction_history"), onPress: () => Alert.alert("Coming soon") },
    ],
    [
      { icon: "language-outline", label: t("language"), sub: LANGS.find(l => l.code === language)?.native || "English", onPress: () => cycleLang() },
      { icon: "notifications-outline", label: t("notifications"), onPress: () => router.push("/notifications") },
      { icon: "lock-closed-outline", label: t("change_password"), onPress: () => router.push("/change-password") },
      { icon: "shield-checkmark-outline", label: t("privacy_security"), onPress: () => router.push("/privacy") },
    ],
    [
      { icon: "help-circle-outline", label: t("help_support"), sub: "FAQs, contact us", onPress: () => router.push("/help") },
      { icon: "information-circle-outline", label: t("about_app"), onPress: () => Alert.alert("HamroDoctor v1.0", "Nepal's healthcare super app.") },
    ],
    [
      { icon: "log-out-outline", label: t("logout"), danger: true, onPress: () => logout().then(() => router.replace("/(auth)/login")) },
    ],
  ];

  const cycleLang = () => {
    const i = LANGS.findIndex(l => l.code === language);
    const next = LANGS[(i + 1) % LANGS.length];
    setLanguage(next.code);
  };

  const initials = (user?.full_name || "U").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.top}>
          <View style={styles.avatar}>
            <Text style={{ color: "#fff", fontSize: 26, fontWeight: "800" }}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.full_name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.pill}>
            <Ionicons name="checkmark-circle" size={12} color={colors.success} />
            <Text style={styles.pillTxt}>Verified {user?.role}</Text>
          </View>
          {user?.subscription?.active ? (
            <View style={styles.plusPill} testID="profile-plus-active">
              <Ionicons name="ribbon" size={12} color="#FDE047" />
              <Text style={styles.plusPillTxt}>HAMRODOCTOR PLUS</Text>
            </View>
          ) : null}
        </View>

        {!user?.subscription?.active ? (
          <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
            <PlusUpsell variant="row" />
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => router.push("/subscribe")}
            style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}
            testID="profile-manage-plus"
          >
            <View style={styles.plusActiveCard}>
              <View style={styles.plusActiveIcon}>
                <Ionicons name="ribbon" size={22} color="#FDE047" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.plusActiveTitle}>You&apos;re on Plus</Text>
                <Text style={styles.plusActiveSub}>Renews {user.subscription?.expires_at ? new Date(user.subscription.expires_at).toLocaleDateString() : "monthly"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
            </View>
          </TouchableOpacity>
        )}

        {rows.map((group, gi) => (
          <View key={gi} style={styles.group}>
            {group.map((r, i) => (
              <TouchableOpacity
                key={`${gi}-${i}`}
                onPress={r.onPress}
                activeOpacity={0.7}
                style={[styles.row, i < group.length - 1 && styles.rowBorder]}
                testID={`profile-row-${r.label.toLowerCase().replace(/\s+/g, "-")}`}
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
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: "center", padding: spacing.xl },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  name: { fontSize: 20, fontWeight: "800", color: colors.text },
  email: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  pill: { flexDirection: "row", alignItems: "center", marginTop: 8, backgroundColor: colors.successLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, gap: 4 },
  pillTxt: { color: colors.success, fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  plusPill: { flexDirection: "row", alignItems: "center", marginTop: 6, backgroundColor: "#0F172A", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, gap: 4 },
  plusPillTxt: { color: "#FDE047", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  plusActiveCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F172A", padding: 14, borderRadius: radius.xl, gap: 12 },
  plusActiveIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(253,224,71,0.15)", alignItems: "center", justifyContent: "center" },
  plusActiveTitle: { color: "#fff", fontWeight: "800", fontSize: 15 },
  plusActiveSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 },
  group: { backgroundColor: "#fff", marginHorizontal: spacing.lg, borderRadius: radius.xl, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.borderLight, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
  rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
