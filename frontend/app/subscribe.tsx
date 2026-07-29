import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ScreenHeader from "@/src/components/ScreenHeader";
import Button from "@/src/components/Button";
import { api } from "@/src/api/client";
import { payWithEsewa } from "@/src/api/payments";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

interface SubInfo { active: boolean; plan: string; price: number; expires_at?: string; started_at?: string; }
interface Plan { id: string; name: string; price: number; currency: string; period: string; features: string[]; }

const PAYMENTS = [
  { id: "esewa" as const, label: "eSewa", color: "#60BB46" },
  { id: "khalti" as const, label: "Khalti", color: "#5C2D91" },
  { id: "card" as const, label: "Card", color: "#1F2937" },
];

const BENEFIT_ICONS = ["refresh-circle", "flash", "chatbubbles", "flask", "car"] as const;

export default function Subscribe() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [payment, setPayment] = useState<"esewa" | "khalti" | "card">("esewa");

  useEffect(() => {
    (async () => {
      try {
        const [p, s] = await Promise.all([
          api.get<Plan>("/subscription/plan"),
          api.get<SubInfo>("/subscription/me"),
        ]);
        setPlan(p);
        setSub(s);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const subscribe = async () => {
    setBusy(true);
    try {
      if (payment === "esewa") {
        const res = await payWithEsewa({ use_case: "subscription" });
        if (res.status === "success") {
          await refresh();
          const s = await api.get<SubInfo>("/subscription/me");
          setSub(s);
          Alert.alert("You're now Plus! 🎉", "Payment received via eSewa. Enjoy priority booking, free follow-ups, and more.", [
            { text: "Great", onPress: () => router.back() },
          ]);
        } else if (res.status === "dismissed") {
          Alert.alert("Payment cancelled", "You can subscribe anytime.");
        } else {
          Alert.alert("Payment failed", "The eSewa transaction was not completed.");
        }
      } else {
        Alert.alert("Coming soon", `${payment.toUpperCase()} for subscriptions is on its way. Please use eSewa for now.`);
      }
    } catch (e: any) {
      Alert.alert("Failed", e?.detail || "Please try again");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    Alert.alert("Cancel Plus?", "You'll lose all Plus benefits at the end of this month.", [
      { text: "Keep Plus", style: "cancel" },
      {
        text: "Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            const s = await api.post<SubInfo>("/subscription/cancel", {});
            setSub(s);
            await refresh();
          } catch (e: any) {
            Alert.alert("Failed", e?.detail || "Try again");
          }
        },
      },
    ]);
  };

  if (loading || !plan) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
        <ScreenHeader title="HamroDoctor Plus" />
        <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScreenHeader title="HamroDoctor Plus" />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <LinearGradient colors={["#DC143C", "#B31133", "#7C0A20"]} style={styles.hero}>
          <View style={styles.crownWrap}>
            <Ionicons name="ribbon" size={36} color="#FDE047" />
          </View>
          <Text style={styles.brand}>HamroDoctor</Text>
          <Text style={styles.plus}>PLUS</Text>
          <Text style={styles.tagline}>Priority healthcare for you & your family</Text>
          {sub?.active ? (
            <View style={styles.activeBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#fff" />
              <Text style={styles.activeTxt}>ACTIVE • Renews {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : "monthly"}</Text>
            </View>
          ) : null}
        </LinearGradient>

        <View style={{ padding: spacing.lg }}>
          <Text style={styles.section}>What&apos;s included</Text>
          <View style={{ gap: 10 }}>
            {(plan?.features || []).map((f, i) => (

              <View key={f} style={styles.benefit} testID={`benefit-${i}`}>
                <View style={styles.benefitIcon}>
                  <Ionicons name={BENEFIT_ICONS[i % BENEFIT_ICONS.length] as any} size={20} color={colors.primary} />
                </View>
                <Text style={styles.benefitTxt}>{f}</Text>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              </View>
            ))}
          </View>

          {!sub?.active ? (
            <>
              <Text style={styles.section}>Payment Method</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {PAYMENTS.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setPayment(p.id)}
                    testID={`sub-pay-${p.id}`}
                    style={[styles.pay, payment === p.id && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
                  >
                    <View style={[styles.payDot, { backgroundColor: p.color }]} />
                    <Text style={styles.payLbl}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.priceCard}>
                <View>
                  <Text style={styles.priceLbl}>Monthly plan</Text>
                  <Text style={styles.priceVal}>Rs {plan.price}<Text style={styles.pricePer}> / month</Text></Text>
                  <Text style={styles.priceSub}>Cancel anytime · No hidden fees</Text>
                </View>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {sub?.active ? (
          <>
            <Button title="Manage Plan" variant="secondary" onPress={() => Alert.alert("Coming soon")} icon="settings-outline" />
            <View style={{ height: 8 }} />
            <TouchableOpacity onPress={cancel} style={{ alignItems: "center", padding: 10 }} testID="cancel-plus">
              <Text style={{ color: colors.error, fontWeight: "600", fontSize: 13 }}>Cancel subscription</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Button
              title={`Subscribe for Rs ${plan.price}/month`}
              icon="rocket"
              onPress={subscribe}
              loading={busy}
              testID="subscribe-btn"
            />
            <Text style={styles.footerHint}>You&apos;ll be charged Rs {plan.price} today. Cancel anytime.</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", padding: spacing.xl, paddingTop: spacing.xxl },
  crownWrap: { width: 72, height: 72, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  brand: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "700", letterSpacing: 2 },
  plus: { color: "#FDE047", fontSize: 44, fontWeight: "900", letterSpacing: 4, marginTop: 2 },
  tagline: { color: "rgba(255,255,255,0.9)", marginTop: 12, textAlign: "center", fontSize: 14, lineHeight: 20 },
  activeBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginTop: 16, gap: 6 },
  activeTxt: { color: "#fff", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  section: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  benefit: { flexDirection: "row", alignItems: "center", padding: spacing.md, backgroundColor: "#fff", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight, gap: 12 },
  benefitIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  benefitTxt: { flex: 1, fontSize: 14, color: colors.text, fontWeight: "500", lineHeight: 20 },
  pay: { flex: 1, borderWidth: 1.5, borderColor: colors.borderLight, borderRadius: radius.lg, padding: 14, alignItems: "center", backgroundColor: "#fff", gap: 6 },
  payDot: { width: 24, height: 24, borderRadius: 12 },
  payLbl: { fontSize: 12, fontWeight: "600", color: colors.text },
  priceCard: { marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.xl, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.borderLight },
  priceLbl: { fontSize: 12, color: colors.textSecondary, fontWeight: "600" },
  priceVal: { fontSize: 30, fontWeight: "900", color: colors.text, marginTop: 4 },
  pricePer: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  priceSub: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.lg, paddingBottom: 45, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.borderLight },
  footerHint: { fontSize: 11, color: colors.textSecondary, textAlign: "center", marginTop: 8 },
});
