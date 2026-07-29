import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

/**
 * Contextual upsell for HamroDoctor Plus.
 * Two variants:
 *   - "hero" (default) — full banner, e.g. after booking confirmation
 *   - "row" — compact row for Profile / lists
 * Renders nothing if user is already Plus.
 */
export default function PlusUpsell({ variant = "hero", context }: { variant?: "hero" | "row"; context?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const active = !!user?.subscription?.active;
  if (active) return null;

  if (variant === "row") {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push("/subscribe")}
        testID="plus-upsell-row"
        style={styles.rowWrap}
      >
        <LinearGradient colors={["#DC143C", "#7C0A20"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.rowGrad}>
          <View style={styles.rowIcon}>
            <Ionicons name="ribbon" size={22} color="#FDE047" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Get HamroDoctor Plus</Text>
            <Text style={styles.rowSub}>Priority booking · Free follow-ups · 20% off labs</Text>
          </View>
          <View style={styles.arrow}><Ionicons name="chevron-forward" size={18} color="#fff" /></View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => router.push("/subscribe")} testID="plus-upsell-hero">
      <LinearGradient colors={["#DC143C", "#7C0A20"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroGrad}>
        <View style={styles.heroTop}>
          <View style={styles.heroBadge}>
            <Ionicons name="ribbon" size={14} color="#FDE047" />
            <Text style={styles.heroBadgeTxt}>PLUS</Text>
          </View>
          <Text style={styles.heroPrice}>Rs 199<Text style={{ fontSize: 11 }}>/mo</Text></Text>
        </View>
        <Text style={styles.heroTitle}>{context || "Book again free within 7 days"}</Text>
        <Text style={styles.heroSub}>Upgrade to Plus and skip the queue on every future visit.</Text>
        <View style={styles.perksRow}>
          {[
            { icon: "refresh-circle" as const, label: "Free follow-ups" },
            { icon: "flash" as const, label: "Priority booking" },
            { icon: "flask" as const, label: "20% off labs" },
          ].map((p) => (
            <View key={p.label} style={styles.perk}>
              <Ionicons name={p.icon} size={13} color="#FDE047" />
              <Text style={styles.perkTxt}>{p.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.ctaRow}>
          <Text style={styles.ctaTxt}>Try Plus — Cancel anytime</Text>
          <View style={styles.arrow}><Ionicons name="arrow-forward" size={16} color="#DC143C" /></View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  heroGrad: { borderRadius: radius.xxl, padding: spacing.lg, overflow: "hidden", shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, gap: 4 },
  heroBadgeTxt: { color: "#FDE047", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  heroPrice: { color: "#fff", fontSize: 20, fontWeight: "800" },
  heroTitle: { color: "#fff", fontSize: 20, fontWeight: "800", marginTop: spacing.md, lineHeight: 26 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 6, lineHeight: 18 },
  perksRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: spacing.md },
  perk: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, gap: 4 },
  perkTxt: { color: "#fff", fontSize: 11, fontWeight: "600" },
  ctaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.lg, backgroundColor: "#fff", paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: 999 },
  ctaTxt: { color: colors.primary, fontWeight: "800", fontSize: 14 },
  arrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  rowWrap: { borderRadius: radius.xl, overflow: "hidden" },
  rowGrad: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: 12 },
  rowIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  rowTitle: { color: "#fff", fontWeight: "800", fontSize: 15 },
  rowSub: { color: "rgba(255,255,255,0.85)", fontSize: 11, marginTop: 2 },
});
