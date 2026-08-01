import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card, Chip, Badge } from "@/src/components/UI";
import { api } from "@/src/api/client";
import { colors, spacing, radius } from "@/src/theme";

interface Appt {
  id: string;
  token_number: number;
  date: string;
  time: string;
  patient_name: string;
  patient_phone: string;
  status: string;
  consultation_type?: string;
  consultation_fee?: number;
  mode?: string;
}

export default function Schedule() {
  const router = useRouter();
  const [scope, setScope] = useState<"today" | "upcoming" | "all">("today");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (s = scope) => {
    try {
      const r = await api.get<Appt[]>(`/doctor/appointments?scope=${s}`);
      if (Array.isArray(r)) setItems(r);
    } catch (err) {
      console.log("Schedule load error:", err);
    }
  }, [scope]);

  useEffect(() => {
    (async () => {
      await load("today");
      setLoading(false);
    })();
  }, [load]);

  useEffect(() => {
    load(scope);
  }, [scope, load]);

  const filteredItems = items.filter((x) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      x.patient_name.toLowerCase().includes(q) ||
      (x.patient_phone && x.patient_phone.includes(q)) ||
      String(x.token_number).includes(q)
    );
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Schedule</Text>
        <Text style={styles.sub}>Manage and view your consultations</Text>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by patient name or phone..."
            placeholderTextColor={colors.textDisabled}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={colors.textDisabled} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.chipsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 8 }}>
          {[
            { code: "today", label: "Today" },
            { code: "upcoming", label: "Upcoming" },
            { code: "all", label: "All Schedule" },
          ].map((f) => (
            <Chip
              key={f.code}
              label={f.label}
              active={scope === f.code}
              onPress={() => setScope(f.code as any)}
              testID={`scope-${f.code}`}
            />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ marginTop: 10, fontSize: 13, color: colors.textSecondary }}>Loading schedule...</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={56} color={colors.textDisabled} />
          <Text style={styles.emptyTitle}>No Appointments Found</Text>
          <Text style={styles.emptySub}>
            {search ? "No matching appointments for search query." : `No ${scope} appointments currently.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load(scope);
                setRefreshing(false);
              }}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => {
            const isDone = item.status === "completed";
            const isVideo = item.mode === "video" || item.consultation_type === "video";
            return (
              <Card
                testID={`sched-${item.id}`}
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: "/doctor-prescribe/[appointmentId]",
                    params: { appointmentId: item.id },
                  })
                }
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={styles.tokBox}>
                    <Text style={styles.tokTxt}>#{item.token_number}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.pname}>{item.patient_name}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                        <Text style={styles.meta}>{item.date}</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                        <Text style={styles.meta}>{item.time}</Text>
                      </View>
                    </View>
                    {item.patient_phone ? <Text style={styles.phone}>{item.patient_phone}</Text> : null}
                  </View>
                  <Badge
                    label={item.status.toUpperCase()}
                    tone={isDone ? "success" : item.status === "cancelled" ? "error" : "info"}
                  />
                </View>

                {isVideo && !isDone && (
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/video-call/[appointmentId]",
                        params: { appointmentId: item.id },
                      })
                    }
                    style={styles.videoBtn}
                    testID={`video-${item.id}`}
                  >
                    <Ionicons name="videocam" size={15} color="#fff" />
                    <Text style={styles.btnTxt}>Start Video Consultation</Text>
                  </TouchableOpacity>
                )}

                {!isDone && (
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/doctor-prescribe/[appointmentId]",
                        params: { appointmentId: item.id },
                      })
                    }
                    style={styles.rxBtn}
                    testID={`rx-${item.id}`}
                  >
                    <Ionicons name="create-outline" size={15} color="#fff" />
                    <Text style={styles.btnTxt}>Write Prescription</Text>
                  </TouchableOpacity>
                )}
              </Card>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.lg, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
  sub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 8,
    marginTop: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 13, color: colors.text },

  chipsRow: { height: 48, justifyContent: "center", backgroundColor: colors.bgApp },
  card: { marginBottom: spacing.md, padding: spacing.md },
  tokBox: { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  tokTxt: { color: colors.primary, fontSize: 15, fontWeight: "800" },
  pname: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.textSecondary },
  phone: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rxBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    marginTop: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.lg,
    gap: 6,
  },
  videoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0EA5E9",
    marginTop: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.lg,
    gap: 6,
  },
  btnTxt: { color: "#fff", fontWeight: "800", fontSize: 13 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.text, marginTop: spacing.md },
  emptySub: { fontSize: 13, color: colors.textSecondary, marginTop: 4, textAlign: "center" },
});
