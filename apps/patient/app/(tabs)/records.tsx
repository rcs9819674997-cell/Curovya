import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card, Chip } from "@/src/components/UI";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

interface Rec {
  id: string;
  type: string;
  title: string;
  description: string;
  doctor_name?: string;
  date: string;
  rx_id?: string;
}

interface Rx {
  id: string;
  diagnosis: string;
  doctor_name?: string;
  created_at: string;
  medicines?: any[];
}

const FILTERS = [
  { code: "all", label: "All" },
  { code: "prescription", label: "Prescriptions" },
  { code: "lab_report", label: "Lab Reports" },
  { code: "x_ray", label: "X-Rays" },
  { code: "ecg", label: "ECG" },
  { code: "vaccination", label: "Vaccinations" },
];

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  prescription: "document-text",
  lab_report: "flask",
  x_ray: "scan",
  ct_scan: "medkit",
  mri: "medkit",
  ecg: "pulse",
  vaccination: "shield-checkmark",
};

export default function Records() {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (t = filter) => {
    try {
      const [recs, rxs] = await Promise.all([
        api.get<Rec[]>(`/records?type=${t}`).catch(() => []),
        (t === "all" || t === "prescription")
          ? api.get<Rx[]>("/prescriptions").catch(() => [])
          : Promise.resolve([]),
      ]);

      const formattedRx: Rec[] = (rxs || []).map((rx) => ({
        id: `rx-${rx.id}`,
        rx_id: rx.id,
        type: "prescription",
        title: `Rx: ${rx.diagnosis || "Medical Prescription"}`,
        description: `${(rx.medicines || []).length} prescribed medicine(s)`,
        doctor_name: rx.doctor_name || "Doctor",
        date: rx.created_at ? new Date(rx.created_at).toLocaleDateString() : "Recent",
      }));

      const merged = [...(recs || []), ...formattedRx];
      setItems(merged);
    } catch (err) {
      console.log("Records load error:", err);
    }
  }, [filter]);

  useEffect(() => {
    (async () => {
      await load("all");
      setLoading(false);
    })();
  }, [load]);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Health Records</Text>
        <Text style={styles.sub}>Your complete medical timeline and prescriptions</Text>
      </View>

      <View style={styles.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 8 }}>
          {FILTERS.map((f) => (
            <Chip
              key={f.code}
              label={f.label}
              active={filter === f.code}
              onPress={() => setFilter(f.code)}
              testID={`records-chip-${f.code}`}
            />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ marginTop: 10, fontSize: 13, color: colors.textSecondary }}>
            Loading medical timeline...
          </Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="folder-open-outline" size={56} color={colors.textDisabled} />
          <Text style={styles.emptyTitle}>No Records Found</Text>
          <Text style={styles.emptySub}>
            Health records and prescriptions will appear here after consultations.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load(filter);
                setRefreshing(false);
              }}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item, index }) => (
            <View style={{ flexDirection: "row" }}>
              <View style={{ alignItems: "center", marginRight: 12 }}>
                <View style={styles.timelineDot}>
                  <Ionicons name={ICONS[item.type] || "document-text"} size={14} color="#fff" />
                </View>
                {index < items.length - 1 ? <View style={styles.timelineLine} /> : null}
              </View>

              <Card
                testID={`record-${item.id}`}
                style={{ flex: 1, marginBottom: spacing.md }}
                onPress={() => {
                  if (item.rx_id) {
                    router.push({ pathname: "/prescriptions/[id]", params: { id: item.rx_id } });
                  }
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={styles.recTitle}>{item.title}</Text>
                  <Text style={styles.date}>{item.date}</Text>
                </View>
                <Text style={styles.recDesc}>{item.description}</Text>
                {item.doctor_name ? (
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 4 }}>
                    <Ionicons name="person-circle-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.doc}>{item.doctor_name}</Text>
                  </View>
                ) : null}
              </Card>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: 24, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
  sub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  chipsWrap: { height: 48, justifyContent: "center", backgroundColor: colors.bgApp },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLine: { flex: 1, width: 2, backgroundColor: colors.borderLight, marginVertical: 4 },
  recTitle: { fontSize: 15, fontWeight: "700", color: colors.text, flex: 1 },
  date: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
  recDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  doc: { fontSize: 12, color: colors.primary, fontWeight: "600" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.text, marginTop: spacing.md },
  emptySub: { fontSize: 13, color: colors.textSecondary, marginTop: 4, textAlign: "center" },
});
