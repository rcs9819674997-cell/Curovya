import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, Image, ActivityIndicator, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "@/src/components/ScreenHeader";
import { Card, Chip, Badge } from "@/src/components/UI";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";
import { useT } from "@/src/i18n";

interface Doctor {
  id: string; name: string; specialty: string; gender: string; qualification: string;
  experience_years: number; clinic_name: string; consultation_fee: number;
  rating: number; review_count: number; online_consult: boolean; photo_url: string;
}

export default function Discovery() {
  const router = useRouter();
  const params = useLocalSearchParams<{ specialty?: string; q?: string }>();
  const t = useT();
  const [q, setQ] = useState(params.q || "");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialty, setSpecialty] = useState<string>(params.specialty || "all");
  const [items, setItems] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSpec = useCallback(async () => {
    try {
      const r = await api.get<{ specialties: string[] }>("/doctors/specialties");
      setSpecialties(["all", ...r.specialties]);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (specialty && specialty !== "all") params.set("specialty", specialty);
      const r = await api.get<Doctor[]>(`/doctors?${params}`);
      setItems(r);
    } finally {
      setLoading(false);
    }
  }, [q, specialty]);

  useEffect(() => { loadSpec(); }, [loadSpec]);
  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScreenHeader title={t("find_a_doctor")} />
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            testID="search-input"
            style={styles.searchInput}
            placeholder={t("find_doctor")}
            placeholderTextColor={colors.textDisabled}
            value={q}
            onChangeText={setQ}
            returnKeyType="search"
          />
          {q ? (
            <TouchableOpacity onPress={() => setQ("")}>
              <Ionicons name="close-circle" size={18} color={colors.textDisabled} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <View style={styles.chipsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 8 }}>
          {specialties.map((s) => (
            <Chip
              key={s}
              label={s === "all" ? "All" : s}
              active={specialty === s}
              onPress={() => setSpecialty(s)}
              testID={`specialty-chip-${s}`}
            />
          ))}
        </ScrollView>
      </View>
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: 8, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: "center" }}>
              <Ionicons name="search-outline" size={48} color={colors.textDisabled} />
              <Text style={{ color: colors.textSecondary, marginTop: 12 }}>No doctors found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card
              testID={`doctor-card-${item.id}`}
              style={{ marginBottom: spacing.md }}
              onPress={() => router.push({ pathname: "/doctors/[id]", params: { id: item.id } })}
            >
              <View style={{ flexDirection: "row" }}>
                <Image source={{ uri: item.photo_url }} style={styles.photo} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.name}>{item.name}</Text>
                      <Text style={styles.spec}>{item.specialty} • {item.experience_years} yrs</Text>
                      <Text style={styles.clinic}>{item.clinic_name}</Text>
                    </View>
                    {item.online_consult ? <Badge label="Video" tone="info" /> : null}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
                      <Text style={styles.reviews}>({item.review_count})</Text>
                    </View>
                    <Text style={styles.fee}>Rs. {item.consultation_fee}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.bookRow}>
                <TouchableOpacity
                  style={styles.bookBtn}
                  onPress={() => router.push({ pathname: "/booking/[doctorId]", params: { doctorId: item.id } })}
                  testID={`book-${item.id}`}
                >
                  <Ionicons name="calendar-outline" size={14} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "700", marginLeft: 6 }}>{t("book_now")}</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchWrap: { padding: spacing.lg, paddingBottom: 8, backgroundColor: "#fff" },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bgMuted, borderRadius: 999, paddingHorizontal: 16, height: 46, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  chipsRow: { height: 56, justifyContent: "center", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  photo: { width: 78, height: 78, borderRadius: radius.lg },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  spec: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  clinic: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rating: { fontSize: 13, fontWeight: "700", color: colors.text },
  reviews: { fontSize: 12, color: colors.textSecondary },
  fee: { fontSize: 13, fontWeight: "700", color: colors.primary },
  bookRow: { marginTop: spacing.md, flexDirection: "row", justifyContent: "flex-end" },
  bookBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
});
