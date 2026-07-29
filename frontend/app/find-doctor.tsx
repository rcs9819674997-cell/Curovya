import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "@/src/components/ScreenHeader";
import { Card } from "@/src/components/UI";
import Button from "@/src/components/Button";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

interface SymptomTile {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  specialty: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  clinic_name?: string;
  rating?: number;
  consultation_fee?: number;
}

const SYMPTOMS: SymptomTile[] = [
  { key: "fever", label: "Fever / Cold / Flu", icon: "thermometer-outline", specialty: "General Physician" },
  { key: "cough", label: "Cough / Sore throat", icon: "medkit-outline", specialty: "General Physician" },
  { key: "chest", label: "Chest pain / Heart", icon: "heart-outline", specialty: "Cardiologist" },
  { key: "bp", label: "High BP / Palpitations", icon: "pulse-outline", specialty: "Cardiologist" },
  { key: "skin", label: "Skin / Rash / Acne", icon: "hand-left-outline", specialty: "Dermatologist" },
  { key: "hair", label: "Hair loss", icon: "cut-outline", specialty: "Dermatologist" },
  { key: "child", label: "Child health", icon: "happy-outline", specialty: "Pediatrician" },
  { key: "vaccine", label: "Baby vaccination", icon: "shield-checkmark-outline", specialty: "Pediatrician" },
  { key: "period", label: "Periods / Pregnancy", icon: "flower-outline", specialty: "Gynaecologist" },
  { key: "women", label: "Women's health", icon: "female-outline", specialty: "Gynaecologist" },
  { key: "bone", label: "Joint / Back pain", icon: "walk-outline", specialty: "Orthopedic" },
  { key: "injury", label: "Sprain / Fracture", icon: "bandage-outline", specialty: "Orthopedic" },
  { key: "stomach", label: "Stomach / Digestion", icon: "restaurant-outline", specialty: "General Physician" },
  { key: "headache", label: "Headache / Migraine", icon: "sad-outline", specialty: "General Physician" },
];

const INK = "#0F172A";

export default function FindDoctor() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manual, setManual] = useState<string>("");
  const [dbSpecialties, setDbSpecialties] = useState<string[]>([]);
  const [doctorsList, setDoctorsList] = useState<Doctor[]>([]);
  const [loadingDb, setLoadingDb] = useState<boolean>(true);

  // Fetch specialties and active doctors from backend-node database
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [specs, docs] = await Promise.all([
          api.get<string[]>("/doctors/specialties", false).catch(() => []),
          api.get<Doctor[]>("/doctors", false).catch(() => []),
        ]);
        if (!cancelled) {
          if (Array.isArray(specs) && specs.length > 0) setDbSpecialties(specs);
          if (Array.isArray(docs) && docs.length > 0) setDoctorsList(docs);
        }
      } catch (err) {
      } finally {
        if (!cancelled) setLoadingDb(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const recommendedSpecialty = useMemo(() => {
    if (selected.size === 0) return null;
    const counts: Record<string, number> = {};
    SYMPTOMS.forEach((s) => {
      if (selected.has(s.key)) counts[s.specialty] = (counts[s.specialty] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : null;
  }, [selected]);

  const recommendedCount = useMemo(() => {
    if (!recommendedSpecialty) return 0;
    return SYMPTOMS.filter((s) => selected.has(s.key) && s.specialty === recommendedSpecialty).length;
  }, [selected, recommendedSpecialty]);

  // Live search preview based on manual text
  const searchResults = useMemo(() => {
    if (!manual.trim() || manual.trim().length < 2) return [];
    const q = manual.toLowerCase().trim();
    return doctorsList.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        (d.clinic_name && d.clinic_name.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [manual, doctorsList]);

  const recoAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (recommendedSpecialty) {
      recoAnim.setValue(0);
      Animated.spring(recoAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60 }).start();
    }
  }, [recommendedSpecialty, recoAnim]);

  const goToDoctors = () => {
    if (recommendedSpecialty) {
      router.push({ pathname: "/doctors", params: { specialty: recommendedSpecialty } });
    } else if (manual.trim()) {
      router.push({ pathname: "/doctors", params: { q: manual.trim() } });
    } else {
      router.push("/doctors");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScreenHeader title="Find a Doctor" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="search-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.h1}>What&apos;s bothering you?</Text>
            <Text style={styles.sub}>Tap symptoms and we&apos;ll suggest the right specialist</Text>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={colors.textSecondary} />
            <TextInput
              testID="find-manual-input"
              style={styles.searchInput}
              placeholder="Or search a doctor / clinic directly"
              placeholderTextColor={colors.textDisabled}
              value={manual}
              onChangeText={setManual}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              onSubmitEditing={goToDoctors}
            />
            {manual.length > 0 && (
              <TouchableOpacity onPress={() => setManual("")} hitSlop={8} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color={colors.textDisabled} />
              </TouchableOpacity>
            )}
          </View>

          {/* Instant Search Suggestions */}
          {searchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              <Text style={styles.searchResultHeader}>Matching Doctors ({searchResults.length})</Text>
              {searchResults.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={styles.searchResultItem}
                  onPress={() => router.push({ pathname: "/doctors/[id]", params: { id: d.id } })}

                >
                  <Ionicons name="medical-outline" size={16} color={colors.primary} />
                  <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text style={styles.searchResultName}>{d.name}</Text>
                    <Text style={styles.searchResultMeta}>
                      {d.specialty} • {d.clinic_name || "Clinic"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Database Specialties Tags */}
          {dbSpecialties.length > 0 && (
            <View style={{ marginTop: spacing.lg }}>
              <Text style={styles.sectionTitle}>Available Specialties</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 6 }}>
                {dbSpecialties.map((spec) => (
                  <TouchableOpacity
                    key={spec}
                    style={styles.specChip}
                    onPress={() => router.push({ pathname: "/doctors", params: { specialty: spec } })}
                  >
                    <Text style={styles.specChipTxt}>{spec}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.rowBetween}>
            <Text style={styles.section}>Common concerns</Text>
            {selected.size > 0 && (
              <TouchableOpacity onPress={() => setSelected(new Set())} testID="clear-symptoms" hitSlop={8}>
                <Text style={styles.link}>
                  {selected.size} selected · Clear
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.grid}>
            {SYMPTOMS.map((s) => {
              const active = selected.has(s.key);
              return (
                <TouchableOpacity
                  key={s.key}
                  testID={`sym-tile-${s.key}`}
                  onPress={() => toggle(s.key)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={s.label}
                  style={[styles.tile, active && styles.tileActive]}
                >
                  <View style={[styles.tileIcon, active && { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                    <Ionicons name={s.icon} size={22} color={active ? "#fff" : colors.primary} />
                  </View>
                  <Text style={[styles.tileLbl, active && { color: "#fff" }]} numberOfLines={2}>
                    {s.label}
                  </Text>
                  {active ? (
                    <View style={styles.check}>
                      <Ionicons name="checkmark" size={12} color={colors.primary} />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {recommendedSpecialty ? (
            <Animated.View
              style={{
                opacity: recoAnim,
                transform: [{ translateY: recoAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
              }}
            >
              <Card style={styles.reco} testID="recommended-specialty">
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={styles.recoIcon}>
                    <Ionicons name="sparkles" size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.recoLbl}>Recommended specialty</Text>
                    <Text style={styles.recoVal}>{recommendedSpecialty}</Text>
                    <Text style={styles.recoCaption}>
                      Based on {recommendedCount} symptom{recommendedCount === 1 ? "" : "s"} you selected
                    </Text>
                  </View>
                </View>
              </Card>
            </Animated.View>
          ) : null}

          <TouchableOpacity
            style={styles.aiHint}
            onPress={() => router.push("/symptom-checker")}
            testID="try-ai-checker"
            accessibilityRole="button"
          >
            <View style={styles.aiIconWrap}>
              <Ionicons name="sparkles" size={18} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.aiHintTxt}>Need a deeper analysis?</Text>
              <Text style={styles.aiHintLink}>Try AI Symptom Checker</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#8B5CF6" />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button
          title={
            recommendedSpecialty
              ? `Find ${recommendedSpecialty}s`
              : selected.size === 0 && !manual.trim()
              ? "Browse all doctors"
              : "Search doctors"
          }
          icon="search"
          onPress={goToDoctors}
          testID="find-doctor-cta"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", padding: spacing.lg },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  h1: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
  sub: { fontSize: 13, color: colors.textSecondary, marginTop: 6, textAlign: "center", lineHeight: 18 },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 8,
    marginTop: spacing.md,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },

  searchResultsContainer: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 8,
  },
  searchResultHeader: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase" },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  searchResultName: { fontSize: 14, fontWeight: "700", color: colors.text },
  searchResultMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },

  sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 4 },
  specChip: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  specChipTxt: { fontSize: 12, fontWeight: "700", color: colors.primary },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  section: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  link: { fontSize: 12, fontWeight: "700", color: colors.primary, marginTop: spacing.xl, marginBottom: spacing.md },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: {
    width: "48%",
    padding: spacing.md,
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 8,
    minHeight: 100,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  tileActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.24,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 4,
  },
  tileIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  tileLbl: { fontSize: 13, fontWeight: "600", color: colors.text },
  check: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: INK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },

  reco: { marginTop: spacing.lg, backgroundColor: "#0F172A", borderColor: "#1E293B" },
  recoIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  recoLbl: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  recoVal: { fontSize: 18, fontWeight: "800", color: "#fff", marginTop: 2 },
  recoCaption: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 3 },

  aiHint: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
    padding: 12,
    backgroundColor: "#F5F3FF",
    borderRadius: radius.md,
  },
  aiIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(139,92,246,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  aiHintTxt: { fontSize: 12, color: colors.textSecondary, fontWeight: "500" },
  aiHintLink: { fontSize: 13, color: "#8B5CF6", fontWeight: "700", marginTop: 1 },

  footer: {
    padding: spacing.lg,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    shadowColor: INK,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 6,
  },
});