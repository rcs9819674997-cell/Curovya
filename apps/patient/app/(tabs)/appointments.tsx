import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card, Badge, Chip } from "@/src/components/UI";
import { api } from "@/src/api/client";
import { colors, spacing, radius } from "@/src/theme";

interface Appointment {
  id: string;
  token_number: number;
  doctor_name: string;
  doctor_specialty: string;
  doctor_photo_url: string;
  clinic_name: string;
  date: string;
  time: string;
  current_serving: number;
  status: string;
  consultation_type: string;
}

// Supplementary token not (yet) in the shared theme.
const SKELETON = "#ECECEF";

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export default function Appointments() {
  const router = useRouter();
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const load = useCallback(async () => {
    try {
      const r = await api.get<Appointment[]>("/appointments");
      setItems(r);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

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

  const statuses = useMemo(() => Array.from(new Set(items.map((i) => i.status))), [items]);
  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Appointments</Text>
          {!loading && items.length > 0 && (
            <Text style={styles.subtitle}>
              {items.length} appointment{items.length === 1 ? "" : "s"}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => router.push("/find-doctor")} style={styles.newBtn} testID="new-appointment">
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700", marginLeft: 4 }}>Book</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ padding: spacing.lg }}>
          {[1, 2, 3].map((i) => (
            <Card key={i} style={{ marginBottom: spacing.md, padding: spacing.lg }}>
              <View style={{ flexDirection: "row" }}>
                <Animated.View style={[styles.skeletonAvatar, { opacity: pulse }]} />
                <View style={{ flex: 1, marginLeft: 12, justifyContent: "center" }}>
                  <Animated.View style={[styles.skeletonLine, { width: "60%", opacity: pulse }]} />
                  <Animated.View style={[styles.skeletonLine, { width: "40%", marginTop: 8, opacity: pulse }]} />
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="calendar-outline" size={36} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No appointments yet</Text>
          <Text style={styles.emptySub}>Book your first appointment with top doctors nearby</Text>
          <TouchableOpacity onPress={() => router.push("/find-doctor")} style={styles.emptyBtn} testID="appointments-empty-cta">
            <Text style={{ color: "#fff", fontWeight: "700" }}>Find a Doctor</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {statuses.length > 1 && (
            <View style={styles.filterRow}>
              <Chip label="All" active={filter === "all"} onPress={() => setFilter("all")} testID="filter-all" />
              {statuses.map((s) => (
                <Chip key={s} label={cap(s)} active={filter === s} onPress={() => setFilter(s)} testID={`filter-${s}`} />
              ))}
            </View>
          )}

          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="filter-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No {filter} appointments</Text>
              <TouchableOpacity onPress={() => setFilter("all")} style={styles.clearFilterBtn} testID="clear-filter">
                <Text style={{ color: colors.primary, fontWeight: "700" }}>Clear filter</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(x) => x.id}
              contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
              renderItem={({ item }) => {
                const isCancelled = item.status === "cancelled";
                const isActive = item.status === "confirmed";
                const patientsAhead = Math.max(0, item.token_number - item.current_serving - 1);
                const isBeingCalled = item.current_serving >= item.token_number;
                const queueHint = isBeingCalled ? "Being called now" : patientsAhead === 0 ? "You're next" : `${patientsAhead} patients ahead`;

                return (
                  <Card
                    testID={`appointment-${item.id}`}
                    style={{ marginBottom: spacing.md, padding: 0, overflow: "hidden" }}
                    onPress={() => router.push({ pathname: "/ticket/[id]", params: { id: item.id } })}
                  >
                    <View style={{ flexDirection: "row", padding: spacing.lg }}>
                      <Image source={{ uri: item.doctor_photo_url }} style={styles.avatar} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          <Text style={styles.docName} numberOfLines={1}>{item.doctor_name}</Text>
                          <Badge label={item.status} tone={item.status === "confirmed" ? "success" : item.status === "cancelled" ? "error" : "info"} />
                        </View>
                        <Text style={styles.spec} numberOfLines={1}>{item.doctor_specialty}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 12 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                            <Text style={styles.meta}>{item.date}</Text>
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                            <Text style={styles.meta}>{item.time}</Text>
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name={item.consultation_type === "video" ? "videocam-outline" : "location-outline"} size={13} color={colors.textSecondary} />
                            <Text style={styles.meta}>{item.consultation_type === "video" ? "Video" : "Clinic"}</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {isCancelled ? (
                      <View style={styles.cancelledRow}>
                        <Ionicons name="close-circle-outline" size={16} color={colors.textDisabled} />
                        <Text style={styles.cancelledText}>This appointment was cancelled</Text>
                      </View>
                    ) : (
                      <View style={styles.tokenWrap}>
                        <View style={styles.tokenRow}>
                          <View>
                            <Text style={styles.tokenL}>TOKEN</Text>
                            <Text style={styles.tokenN}>{item.token_number}</Text>
                          </View>
                          <View style={{ alignItems: "center" }}>
                            <Text style={styles.tokenL}>NOW SERVING</Text>
                            <Text style={styles.tokenS}>{item.current_serving}</Text>
                          </View>
                          <View style={styles.viewBtn}>
                            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>View Ticket</Text>
                            <Ionicons name="arrow-forward" size={12} color="#fff" style={{ marginLeft: 4 }} />
                          </View>
                        </View>
                        {isActive && <Text style={styles.queueHint}>{queueHint}</Text>}
                      </View>
                    )}
                  </Card>
                );
              }}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.lg, paddingBottom: spacing.md,   shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 6,
  },
  shadowOpacity: 0.06,
  shadowRadius: 12,

  elevation: 8 },
  title: { fontSize: 24, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },

  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },

  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: SKELETON },
  docName: { fontSize: 15, fontWeight: "700", color: colors.text, flex: 1, marginRight: 8 },
  spec: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  meta: { fontSize: 12, color: colors.textSecondary },

  tokenWrap: { backgroundColor: colors.primaryLight, padding: spacing.lg },
  tokenRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tokenL: { fontSize: 10, color: colors.textSecondary, fontWeight: "700", letterSpacing: 0.5 },
  tokenN: { fontSize: 22, fontWeight: "800", color: colors.primary },
  tokenS: { fontSize: 22, fontWeight: "800", color: colors.text },
  viewBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  queueHint: { fontSize: 11, color: colors.textSecondary, marginTop: 8, textAlign: "center" },

  cancelledRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: spacing.lg, backgroundColor: colors.bgMuted },
  cancelledText: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: spacing.md },
  emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 4, textAlign: "center" },
  emptyBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  clearFilterBtn: { marginTop: spacing.lg, paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary },

  skeletonAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: SKELETON },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: SKELETON },
});