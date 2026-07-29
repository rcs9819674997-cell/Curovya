import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";

export default function Privacy() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="privacy-back"><Ionicons name="chevron-back" size={26} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Privacy & Security</Text>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        <Text style={styles.h}>Your Data, Your Control</Text>
        <Text style={styles.body}>
          HamroDoctor stores your health records securely. Only you and the doctors you consult can access
          your personal health information. We follow healthcare data-protection best practices.
        </Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="lock-closed" size={18} color={colors.primary} />
            <Text style={styles.rowT}>End-to-end encryption</Text>
          </View>
          <Text style={styles.rowSub}>Passwords are stored as bcrypt hashes; auth tokens are kept in secure Keychain/EncryptedSharedPreferences.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="key" size={18} color={colors.primary} />
            <Text style={styles.rowT}>Change Password</Text>
          </View>
          <TouchableOpacity style={styles.linkBtn} onPress={() => router.push("/change-password")} testID="privacy-change-pw">
            <Text style={styles.linkTxt}>Update your password</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="phone-portrait" size={18} color={colors.primary} />
            <Text style={styles.rowT}>Device Sessions</Text>
          </View>
          <Text style={styles.rowSub}>Your session tokens auto-expire after 24 hours. Logging out revokes access from this device.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="document-text" size={18} color={colors.primary} />
            <Text style={styles.rowT}>Privacy Policy</Text>
          </View>
          <Text style={styles.rowSub}>We never sell your data. Contact support@hamrodoctor.np to request an export or deletion.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  h: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 8 },
  body: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 20 },
  card: { backgroundColor: "#fff", padding: 14, borderRadius: radius.lg, marginBottom: 10, borderWidth: 1, borderColor: colors.borderLight },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowT: { fontSize: 15, fontWeight: "700", color: colors.text },
  rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 6, lineHeight: 18 },
  linkBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, backgroundColor: colors.primaryLight, padding: 10, borderRadius: radius.md },
  linkTxt: { fontSize: 13, fontWeight: "700", color: colors.primary },
});
