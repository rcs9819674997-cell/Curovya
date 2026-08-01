import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Button from "@/src/components/Button";
import { LANGS } from "@/src/i18n";
import { storage } from "@/src/utils/storage";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

const SLIDES = [
  {
    icon: "medkit" as const,
    title: "Manage Your Practice",
    body: "View appointments, manage your queue, and prescribe medicines — all in one place.",
    img: "https://images.unsplash.com/photo-1612349316228-5942a9b489c2?w=400&q=60&fm=webp",
  },
  {
    icon: "document-text" as const,
    title: "Digital Prescriptions",
    body: "Create and share digital prescriptions instantly with your patients.",
    img: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&q=60&fm=webp",
  },
  {
    icon: "medical" as const,
    title: "Clinic & Lab Dashboard",
    body: "Manage staff, track bookings, and monitor your clinic or lab performance.",
    img: "https://images.pexels.com/photos/5364345/pexels-photo-5364345.jpeg?auto=compress&w=400&q=60",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const { setLanguage } = useAuth();
  const [step, setStep] = useState(0);
  const [showLang, setShowLang] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en");

  const s = SLIDES[step];
  const finish = async (lang: string) => {
    await setLanguage(lang);
    await storage.setItem("hd_onboarded", true);
    router.replace("/(auth)/signup");
  };

  if (showLang) {
    return (
      <SafeAreaView style={styles.wrap} edges={["top", "bottom"]}>
        <View style={{ padding: spacing.lg, flex: 1 }}>
          <Text style={styles.h1}>Choose your language</Text>
          <Text style={styles.sub}>You can change this anytime in Settings</Text>
          <ScrollView style={{ marginTop: spacing.lg }} showsVerticalScrollIndicator={false}>
            {LANGS.map((l) => {
              const active = selectedLang === l.code;
              return (
                <TouchableOpacity
                  key={l.code}
                  testID={`lang-${l.code}`}
                  activeOpacity={0.8}
                  onPress={() => setSelectedLang(l.code)}
                  style={[styles.langRow, active && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.langLabel}>{l.label}</Text>
                    <Text style={styles.langNative}>{l.native}</Text>
                  </View>
                  <View style={[styles.radio, active && { borderColor: colors.primary }]}>
                    {active ? <View style={styles.radioDot} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Button title="Continue" onPress={() => finish(selectedLang)} testID="lang-continue" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.wrap} edges={["top", "bottom"]}>
      <View style={styles.topRow}>
        <View />
        <TouchableOpacity onPress={() => setShowLang(true)} testID="onboarding-skip">
          <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Skip</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.imageWrap}>
        <Image source={{ uri: s.img }} style={styles.image} resizeMode="cover" />
        <View style={styles.iconFloat}>
          <Ionicons name={s.icon} size={28} color={colors.primary} />
        </View>
      </View>
      <View style={styles.bottomCard}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>
        <Text style={styles.h1}>{s.title}</Text>
        <Text style={styles.sub}>{s.body}</Text>
        <View style={{ height: spacing.xl }} />
        <Button
          title={step === SLIDES.length - 1 ? "Get Started" : "Next"}
          testID="onboarding-next"
          onPress={() => (step === SLIDES.length - 1 ? setShowLang(true) : setStep(step + 1))}
          icon={step === SLIDES.length - 1 ? "arrow-forward" : undefined}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#fff" },
  topRow: { flexDirection: "row", justifyContent: "space-between", padding: spacing.lg },
  imageWrap: { alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg },
  image: { width: "100%", height: 300, borderRadius: radius.xxl },
  iconFloat: { position: "absolute", bottom: -20, right: 30, backgroundColor: "#fff", padding: 14, borderRadius: 999, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  bottomCard: { flex: 1, padding: spacing.xl, justifyContent: "flex-end" },
  dots: { flexDirection: "row", gap: 6, marginBottom: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.borderMedium },
  dotActive: { width: 22, backgroundColor: colors.primary },
  h1: { fontSize: 26, fontWeight: "800", color: colors.text, lineHeight: 34 },
  sub: { fontSize: 15, color: colors.textSecondary, marginTop: 12, lineHeight: 22 },
  langRow: { flexDirection: "row", alignItems: "center", padding: spacing.lg, borderWidth: 1.5, borderColor: colors.borderLight, borderRadius: radius.lg, marginBottom: spacing.md },
  langLabel: { fontSize: 16, fontWeight: "600", color: colors.text },
  langNative: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderMedium, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});
