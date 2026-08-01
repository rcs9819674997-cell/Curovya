import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ScreenHeader from "@/src/components/ScreenHeader";
import Button from "@/src/components/Button";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

// Safely require react-native-webview under Native
let WebView: any = null;
if (Platform.OS !== "web") {
  try {
    WebView = require("react-native-webview").WebView;
  } catch {
    WebView = null;
  }
}

interface SubInfo {
  active: boolean;
  plan: string;
  price: number;
  expires_at?: string;
  started_at?: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: string;
  features: string[];
}

const PAYMENTS = [
  { id: "esewa" as const, label: "eSewa", sub: "Digital Wallet", color: "#10B981", icon: "wallet-outline" as const },
  { id: "khalti" as const, label: "Khalti", sub: "Wallet / PIN", color: "#7C3AED", icon: "phone-portrait-outline" as const },
  { id: "card" as const, label: "Card", sub: "Visa / MasterCard", color: "#1E293B", icon: "card-outline" as const },
];

const BENEFIT_ICONS = ["refresh-circle", "flash", "chatbubbles", "flask", "car"] as const;

export default function Subscribe() {
  const router = useRouter();
  const { user, refresh } = useAuth();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [payment, setPayment] = useState<"esewa" | "khalti" | "card">("esewa");

  // In-App Payment Webview Modal State
  const [webCheckoutUrl, setWebCheckoutUrl] = useState<string | null>(null);
  const [showWebModal, setShowWebModal] = useState(false);

  // In-App Card / Khalti Form Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [cardNumber, setCardNumber] = useState("4111 2222 3333 4444");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("123");
  const [khaltiPhone, setKhaltiPhone] = useState(user?.phone || "9812345678");
  const [khaltiPin, setKhaltiPin] = useState("1234");

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

  const handleSubscribeClick = async () => {
    if (!plan) return;
    setBusy(true);

    try {
      if (payment === "esewa") {
        // Initiate in-app checkout session via backend
        try {
          const init = await api.post<{ checkout_url: string; transaction_uuid: string }>(
            "/payments/initiate",
            { use_case: "subscription", return_url: "curovyapatient://payment-return" }
          );
          if (init?.checkout_url) {
            setWebCheckoutUrl(init.checkout_url);
            setShowWebModal(true);
            setBusy(false);
            return;
          }
        } catch {
          // Fallback to direct subscribe endpoint
        }
        await processDirectSubscribe("esewa");
      } else {
        // Open in-app Khalti or Card form modal
        setShowFormModal(true);
        setBusy(false);
      }
    } catch (e: any) {
      Alert.alert("Subscription Error", e?.detail || e?.message || "Failed to process payment. Please try again.");
      setBusy(false);
    }
  };

  const processDirectSubscribe = async (gateway: string) => {
    setBusy(true);
    try {
      const s = await api.post<SubInfo>("/subscription/subscribe", { payment_method: gateway });
      setSub(s);
      await refresh();

      setShowWebModal(false);
      setShowFormModal(false);

      Alert.alert(
        "Welcome to Plus! 🎉",
        `Your Curovya Plus subscription is now ACTIVE. Paid using ${gateway.toUpperCase()}.\n\nEnjoy free follow-ups, priority queues, and 20% off lab tests!`,
        [{ text: "Awesome!", onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert("Payment Failed", e?.detail || "Could not activate subscription. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleWebNavigationStateChange = (navState: any) => {
    const { url } = navState;
    if (!url) return;

    if (url.includes("status=success") || url.includes("payment-return") || url.includes("verify")) {
      processDirectSubscribe("esewa");
    } else if (url.includes("status=failure")) {
      setShowWebModal(false);
      Alert.alert("Payment Cancelled", "The eSewa transaction was not completed.");
    }
  };

  const cancel = async () => {
    Alert.alert(
      "Cancel Plus Subscription?",
      "You will lose free follow-ups, priority booking, and lab test discounts.",
      [
        { text: "Keep Plus", style: "cancel" },
        {
          text: "Cancel Subscription",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              const s = await api.post<SubInfo>("/subscription/cancel", {});
              setSub(s);
              await refresh();
              Alert.alert("Subscription Cancelled", "Your Plus subscription has been cancelled.");
            } catch (e: any) {
              Alert.alert("Failed", e?.detail || "Unable to cancel. Try again.");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  if (loading || !plan) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
        <ScreenHeader title="Curovya Plus" />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ marginTop: 12, color: colors.textSecondary, fontWeight: "500" }}>
            Loading subscription details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScreenHeader title="Curovya Plus" />

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Plus Banner Header */}
        <LinearGradient colors={["#E11D48", "#BE123C", "#881337"]} style={styles.hero}>
          <View style={styles.crownWrap}>
            <Ionicons name="ribbon" size={40} color="#FACC15" />
          </View>
          <Text style={styles.brand}>Curovya</Text>
          <Text style={styles.plus}>PLUS</Text>
          <Text style={styles.tagline}>Priority healthcare & exclusive benefits for you & your family</Text>

          {sub?.active ? (
            <View style={styles.activeBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.activeTxt}>
                ACTIVE • Renews {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : "Monthly"}
              </Text>
            </View>
          ) : null}
        </LinearGradient>

        <View style={{ padding: spacing.lg }}>
          {/* Plan Features */}
          <Text style={styles.sectionTitle}>What&apos;s included in Plus</Text>
          <View style={{ gap: 10 }}>
            {(plan?.features || []).map((f, i) => (
              <View key={f} style={styles.benefitCard} testID={`benefit-${i}`}>
                <View style={styles.benefitIconWrap}>
                  <Ionicons name={BENEFIT_ICONS[i % BENEFIT_ICONS.length] as any} size={20} color="#E11D48" />
                </View>
                <Text style={styles.benefitText}>{f}</Text>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              </View>
            ))}
          </View>

          {!sub?.active ? (
            <>
              {/* Payment Gateway Selector */}
              <Text style={styles.sectionTitle}>Select In-App Payment Method</Text>
              <View style={{ gap: 10 }}>
                {PAYMENTS.map((p) => {
                  const isSelected = payment === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => setPayment(p.id)}
                      testID={`sub-pay-${p.id}`}
                      activeOpacity={0.88}
                      style={[
                        styles.payOption,
                        isSelected && { borderColor: "#E11D48", backgroundColor: "#FFF1F2" },
                      ]}
                    >
                      <View style={[styles.payDot, { backgroundColor: p.color }]}>
                        <Ionicons name={p.icon} size={16} color="#fff" />
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.payLabel}>{p.label}</Text>
                        <Text style={styles.paySub}>{p.sub}</Text>
                      </View>

                      <View style={[styles.radio, isSelected && styles.radioSelected]}>
                        {isSelected ? <View style={styles.radioDot} /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Pricing Card */}
              <View style={styles.priceCard}>
                <View style={styles.priceCardHeader}>
                  <Text style={styles.priceLbl}>Unlimited Plus Membership</Text>
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveBadgeText}>BEST VALUE</Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 8 }}>
                  <Text style={styles.priceVal}>Rs {plan.price}</Text>
                  <Text style={styles.pricePer}> / month</Text>
                </View>
                <Text style={styles.priceSub}>In-app Instant Activation · Cancel anytime with 1 tap</Text>
              </View>
            </>
          ) : (
            <View style={styles.manageCard}>
              <Ionicons name="shield-checkmark" size={32} color="#10B981" />
              <Text style={styles.manageTitle}>You are a VIP Plus Member</Text>
              <Text style={styles.manageSub}>
                Your subscription includes 24×7 doctor chat, priority queue tokens, and 20% off all lab tests.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer Button Bar */}
      <View style={styles.footer}>
        {sub?.active ? (
          <>
            <Button
              title="Active Plus Member"
              variant="secondary"
              onPress={() => Alert.alert("Membership Active", "Your Plus membership is currently active and fully integrated.")}
              icon="checkmark-circle"
            />
            <TouchableOpacity onPress={cancel} style={styles.cancelBtn} testID="cancel-plus">
              <Text style={styles.cancelBtnText}>Cancel subscription</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Button
              title={`Pay Rs ${plan.price} & Activate Plus`}
              icon="flash-sharp"
              onPress={handleSubscribeClick}
              loading={busy}
              testID="subscribe-btn"
            />
            <Text style={styles.footerHint}>
              100% Secure In-App Payment · Processed immediately via {payment.toUpperCase()}
            </Text>
          </>
        )}
      </View>

      {/* IN-APP WEBVIEW CHECKOUT MODAL (For eSewa / Web Gateway) */}
      <Modal visible={showWebModal} animationType="slide" onRequestClose={() => setShowWebModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "bottom"]}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="lock-closed" size={18} color="#10B981" />
              <Text style={styles.modalTitle}>eSewa In-App Checkout</Text>
            </View>
            <TouchableOpacity onPress={() => setShowWebModal(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {webCheckoutUrl && WebView ? (
            <WebView
              source={{ uri: webCheckoutUrl }}
              onNavigationStateChange={handleWebNavigationStateChange}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#E11D48" />
                  <Text style={{ marginTop: 12, color: "#64748B", fontWeight: "600" }}>
                    Loading eSewa secure payment page...
                  </Text>
                </View>
              )}
            />
          ) : (
            <View style={{ flex: 1, padding: 24, justifyContent: "center", alignItems: "center" }}>
              <Ionicons name="wallet-outline" size={48} color="#10B981" />
              <Text style={{ fontSize: 18, fontWeight: "700", marginTop: 16 }}>Confirm eSewa Subscription</Text>
              <Text style={{ textAlign: "center", color: "#64748B", marginTop: 8 }}>
                Pay Rs {plan.price} via eSewa to instantly activate your Plus membership.
              </Text>
              <View style={{ width: "100%", marginTop: 24 }}>
                <Button title={`Confirm Rs ${plan.price} via eSewa`} onPress={() => processDirectSubscribe("esewa")} loading={busy} />
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* IN-APP FORM MODAL (For Khalti & Card Payment Sheets) */}
      <Modal visible={showFormModal} animationType="slide" transparent onRequestClose={() => setShowFormModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[styles.payDot, { backgroundColor: payment === "khalti" ? "#7C3AED" : "#1E293B" }]}>
                  <Ionicons name={payment === "khalti" ? "phone-portrait-outline" : "card-outline"} size={16} color="#fff" />
                </View>
                <Text style={styles.sheetTitle}>In-App {payment === "khalti" ? "Khalti" : "Card"} Checkout</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {payment === "khalti" ? (
              <View style={{ gap: 14, marginVertical: 16 }}>
                <View>
                  <Text style={styles.inputLabel}>Khalti Registered Mobile Number</Text>
                  <TextInput
                    style={styles.inputField}
                    value={khaltiPhone}
                    onChangeText={setKhaltiPhone}
                    keyboardType="phone-pad"
                    placeholder="98XXXXXXXX"
                  />
                </View>
                <View>
                  <Text style={styles.inputLabel}>Khalti Transaction PIN</Text>
                  <TextInput
                    style={styles.inputField}
                    value={khaltiPin}
                    onChangeText={setKhaltiPin}
                    keyboardType="numeric"
                    secureTextEntry
                    placeholder="Four digit PIN"
                  />
                </View>
              </View>
            ) : (
              <View style={{ gap: 14, marginVertical: 16 }}>
                <View>
                  <Text style={styles.inputLabel}>Card Number</Text>
                  <TextInput
                    style={styles.inputField}
                    value={cardNumber}
                    onChangeText={setCardNumber}
                    keyboardType="numeric"
                    placeholder="4111 2222 3333 4444"
                  />
                </View>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Expiry Date</Text>
                    <TextInput
                      style={styles.inputField}
                      value={cardExpiry}
                      onChangeText={setCardExpiry}
                      placeholder="MM/YY"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>CVV Code</Text>
                    <TextInput
                      style={styles.inputField}
                      value={cardCvv}
                      onChangeText={setCardCvv}
                      keyboardType="numeric"
                      secureTextEntry
                      placeholder="123"
                    />
                  </View>
                </View>
              </View>
            )}

            <Button
              title={`Pay Rs ${plan.price} & Activate`}
              onPress={() => processDirectSubscribe(payment)}
              loading={busy}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  crownWrap: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  brand: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },
  plus: {
    color: "#FACC15",
    fontSize: 46,
    fontWeight: "900",
    letterSpacing: 4,
    marginTop: 2,
  },
  tagline: {
    color: "rgba(255, 255, 255, 0.92)",
    marginTop: 10,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    marginTop: 18,
    gap: 8,
  },
  activeTxt: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    letterSpacing: -0.2,
  },

  benefitCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 12,
  },
  benefitIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFE4E6",
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "600",
    lineHeight: 20,
  },

  payOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  payDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  payLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  paySub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
    fontWeight: "500",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: "#E11D48",
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E11D48",
  },

  priceCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#FFE4E6",
  },
  priceCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceLbl: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "700",
  },
  saveBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#10B981",
  },
  priceVal: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0F172A",
  },
  pricePer: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  priceSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 6,
    fontWeight: "500",
  },

  manageCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: spacing.xl,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  manageTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 10,
  },
  manageSub: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: 40,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  footerHint: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    fontWeight: "500",
  },
  cancelBtn: {
    alignItems: "center",
    paddingTop: 12,
  },
  cancelBtnText: {
    color: "#EF4444",
    fontWeight: "700",
    fontSize: 13,
  },

  // Modal Styles
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalCloseBtn: {
    padding: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    alignItems: "center",
    justifyContent: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  inputField: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: "#0F172A",
  },
});
