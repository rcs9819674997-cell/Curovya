import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card, Badge } from "@/src/components/UI";
import { api } from "@/src/api/client";
import { colors, spacing, radius } from "@/src/theme";

interface Rx {
  id: string;
  diagnosis: string;
  created_at: string;
  patient_id: string;
  patient_name?: string;
  medicines: any[];
  follow_up_date?: string | null;
}

export default function DoctorPrescriptions() {
  const router = useRouter();
  const [items, setItems] = useState<Rx[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get<Rx[]>("/doctor/prescriptions");
      if (Array.isArray(r)) setItems(r);
    } catch (err) {
      console.log("Doctor prescriptions load error:", err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  const filteredItems = items.filter((x) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      x.diagnosis.toLowerCase().includes(q) ||
      (x.patient_name && x.patient_name.toLowerCase().includes(q))
    );
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Prescriptions Authored</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countTxt}>{items.length} Total</Text>
          </View>
        </View>
        <Text style={styles.sub}>Clinical e-prescriptions issued to patients</Text>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search diagnosis or patient name..."
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

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ marginTop: 10, fontSize: 13, color: colors.textSecondary }}>
            Loading prescriptions...
          </Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={56} color={colors.textDisabled} />
          <Text style={styles.emptyTitle}>No Prescriptions Found</Text>
          <Text style={styles.emptySub}>
            {search ? "No records match search term." : "Issued prescriptions will appear here."}
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
                await load();
                setRefreshing(false);
              }}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <Card
              key={item.id}
              testID={`doc-rx-${item.id}`}
              style={{ marginBottom: spacing.md }}
              onPress={() => router.push({ pathname: "/prescriptions/[id]", params: { id: item.id } })}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.icon}>
                  <Ionicons name="document-text" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.diag}>{item.diagnosis}</Text>
                  {item.patient_name ? <Text style={styles.pname}>Patient: {item.patient_name}</Text> : null}
                  <Text style={styles.meta}>
                    {(item.medicines || []).length} medicine
                    {(item.medicines || []).length !== 1 ? "s" : ""} •{" "}
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
              </View>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.lg, paddingBottom: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 24, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
  countBadge: { backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  countTxt: { fontSize: 12, fontWeight: "700", color: colors.primary },
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

  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  diag: { fontSize: 15, fontWeight: "700", color: colors.text },
  pname: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginTop: 2 },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.text, marginTop: spacing.md },
  emptySub: { fontSize: 13, color: colors.textSecondary, marginTop: 4, textAlign: "center" },
});
