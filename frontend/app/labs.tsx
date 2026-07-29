import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, Alert, TextInput, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "@/src/components/ScreenHeader";
import { Card, Badge, Chip } from "@/src/components/UI";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";
import { useT } from "@/src/i18n";

interface Test {
  id: string;
  name: string;
  category: string;
  price: number;
  home_collection: boolean;
  turnaround_hours: number;
  description: string;
}

// Supplementary tokens not (yet) in the shared theme.
const INK = "#0F172A";
const SKELETON = "#ECECEF";

export default function Labs() {
  const t = useT();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [booking, setBooking] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");

  const loadTests = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<Test[]>("/labs/tests");
      setTests(r);
      setError(false);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  // Skeleton shimmer while the first load is in flight.
  const pulse = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const categories = useMemo(() => Array.from(new Set(tests.map((t) => t.category))), [tests]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tests.filter((t) => {
      const matchesCategory = category === "all" || t.category === category;
      const matchesQuery = !q || t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [tests, query, category]);

  const book = async (t: Test) => {
    setBooking(t.id);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await api.post("/labs/bookings", {
        test_id: t.id,
        home_collection: t.home_collection,
        date: tomorrow.toISOString().split("T")[0],
        address: "Janakpurdham",
      });
      Alert.alert("Booked!", `${t.name} scheduled for ${tomorrow.toDateString()}`);
    } catch (e: any) {
      Alert.alert("Booking failed", e?.detail || "Try again");
    } finally {
      setBooking(null);
    }
  };

  // Surfaces what the booking actually does (esp. the collection address)
  // before it fires, rather than silently submitting on a single tap.
  const confirmBook = (t: Test) => {
    const detail = t.home_collection
      ? "A technician will collect your sample from your registered address: Janakpurdham."
      : `Visit the lab to give this sample. Results in ~${t.turnaround_hours}h.`;
    Alert.alert(t.name, `Rs ${t.price}\n\n${detail}`, [
      { text: "Cancel", style: "cancel" },
      { text: "Book Now", onPress: () => book(t) },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScreenHeader title={t("lab_tests")} />

      {loading ? (
        <View style={{ padding: spacing.lg }}>
          {[1, 2, 3].map((i) => (
            <Card key={i} style={{ marginBottom: spacing.md }}>
              <Animated.View style={[styles.skeletonLine, { width: "55%", opacity: pulse }]} />
              <Animated.View style={[styles.skeletonLine, { width: "85%", marginTop: 8, opacity: pulse }]} />
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <Animated.View style={[styles.skeletonChip, { opacity: pulse }]} />
                <Animated.View style={[styles.skeletonChip, { opacity: pulse }]} />
              </View>
            </Card>
          ))}
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl }}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={26} color={colors.primary} />
          </View>
          <Text style={{ fontWeight: "700", color: colors.text, marginTop: 14, fontSize: 15 }}>Couldn't load lab tests</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 4, textAlign: "center" }}>Check your connection and try again.</Text>
          <TouchableOpacity onPress={loadTests} style={styles.retryBtn} testID="labs-retry">
            <Text style={{ color: "#fff", fontWeight: "700" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : tests.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl }}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="flask-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No lab tests available</Text>
          <Text style={styles.emptySub}>Please check back later.</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <Text style={styles.subtitle}>
            {query || category !== "all" ? `${filtered.length} of ${tests.length} tests` : `${tests.length} test${tests.length === 1 ? "" : "s"} available`}
          </Text>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={colors.textSecondary} />
            <TextInput
              testID="labs-search-input"
              style={styles.searchInput}
              placeholder="Search tests or categories"
              placeholderTextColor={colors.textDisabled}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")} hitSlop={8} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color={colors.textDisabled} />
              </TouchableOpacity>
            )}
          </View>

          {categories.length > 1 && (
            <View style={styles.filterRow}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 8 }}>

              <Chip label="All" active={category === "all"} onPress={() => setCategory("all")} testID="lab-filter-all" />
              {categories.map((c) => (
                <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} testID={`lab-filter-${c}`} />
              ))}
              </ScrollView>
            </View>
          )}

          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="search-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No tests match your search</Text>
              <TouchableOpacity
                onPress={() => {
                  setQuery("");
                  setCategory("all");
                }}
                style={styles.clearFilterBtn}
                testID="labs-clear-filters"
              >
                <Text style={{ color: colors.primary, fontWeight: "700" }}>Clear filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(x) => x.id}
              contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Card style={{ marginBottom: spacing.md }} testID={`lab-test-${item.id}`}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{item.name}</Text>
                      <Text style={styles.desc}>{item.description}</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        <Badge label={item.category} tone="info" />
                        {item.home_collection ? <Badge label={t("home_collection")} tone="success" /> : null}
                        <Badge label={`${item.turnaround_hours}h`} tone="warning" />
                      </View>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                    <Text style={styles.price}>Rs {item.price}</Text>
                    <TouchableOpacity
                      style={styles.book}
                      onPress={() => confirmBook(item)}
                      disabled={booking === item.id}
                      testID={`book-lab-${item.id}`}
                    >
                      {booking === item.id ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Ionicons name="add" size={14} color="#fff" />
                          <Text style={{ color: "#fff", fontWeight: "700", marginLeft: 4 }}>{t("book_test")}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </Card>
              )}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 13, color: colors.textSecondary, paddingHorizontal: spacing.lg, marginTop: 6, marginBottom: spacing.sm },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 8,
    marginHorizontal: spacing.lg,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  filterRow: { height: 56, paddingTop: 10, justifyContent: "center", backgroundColor: colors.bgApp, borderBottomWidth: 1, borderColor: colors.borderLight, },

  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  desc: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  price: { fontSize: 18, fontWeight: "800", color: colors.primary },
  book: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    minWidth: 80,
    justifyContent: "center",
  },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text, textAlign: "center" },
  emptySub: { fontSize: 13, color: colors.textSecondary, marginTop: 4, textAlign: "center" },
  clearFilterBtn: { marginTop: spacing.lg, paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary },

  errorIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  retryBtn: { marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.lg },

  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: SKELETON },
  skeletonChip: { width: 70, height: 22, borderRadius: 11, backgroundColor: SKELETON },
});