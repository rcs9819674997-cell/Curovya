import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "@/src/components/ScreenHeader";
import { Card, Badge } from "@/src/components/UI";
import { api, ApiError } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

interface FamilyMember {
  id: string;
  full_name: string;
  relation: string;
  age?: number | null;
  gender?: string | null;
  blood_group?: string | null;
  phone?: string | null;
  allergies?: string | null;
  medical_conditions?: string | null;
}

const RELATION_ICONS: Record<string, keyof typeof import("@expo/vector-icons/Ionicons").default.glyphMap> = {
  self: "person",
  spouse: "heart",
  father: "man",
  mother: "woman",
  son: "person",
  daughter: "person",
  brother: "person",
  sister: "person",
  other: "people",
};

const RELATION_COLORS: Record<string, string> = {
  self: "#DC143C",
  spouse: "#EC4899",
  father: "#3B82F6",
  mother: "#8B5CF6",
  son: "#F59E0B",
  daughter: "#F59E0B",
  brother: "#10B981",
  sister: "#10B981",
  other: "#64748B",
};

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export default function FamilyList() {
  const router = useRouter();
  const [items, setItems] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get<FamilyMember[]>("/family");
      setItems(r);
    } catch (e) {
      if (e instanceof ApiError) Alert.alert("Error", e.detail);
    }
  }, []);

  useFocusEffect(useCallback(() => { load().then(() => setLoading(false)); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const remove = (m: FamilyMember) => {
    if (m.relation === "self") return;
    Alert.alert(
      "Remove Family Member",
      `Remove ${m.full_name} from your family list?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await api.del(`/family/${m.id}`);
              await load();
            } catch (e) {
              if (e instanceof ApiError) Alert.alert("Error", e.detail);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScreenHeader
        title="Family Members"
        right={
          <TouchableOpacity
            onPress={() => router.push("/family/add")}
            testID="family-add-btn"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="add-circle" size={26} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.infoBanner}>
          <Ionicons name="people" size={20} color={colors.info} />
          <Text style={styles.infoText}>
            Manage health profiles for your loved ones. Book appointments for any family member.
          </Text>
        </View>

        {loading ? (
          <Text style={styles.loading}>Loading...</Text>
        ) : (
          items.map((m) => {
            const c = RELATION_COLORS[m.relation] || "#64748B";
            const icon = RELATION_ICONS[m.relation] || "person";
            const initials = m.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
            return (
              <Card key={m.id} style={{ marginBottom: spacing.md }} testID={`family-card-${m.id}`}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={[styles.avatar, { backgroundColor: c + "22" }]}>
                    <Text style={{ color: c, fontWeight: "800", fontSize: 18 }}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <Text style={styles.name}>{m.full_name}</Text>
                      {m.relation === "self" ? <Badge label="You" tone="info" /> : null}
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 8, flexWrap: "wrap" }}>
                      <View style={styles.meta}>
                        <Ionicons name={icon} size={11} color={c} />
                        <Text style={[styles.metaTxt, { color: c }]}>{cap(m.relation)}</Text>
                      </View>
                      {m.age ? <Text style={styles.sep}>· {m.age} yrs</Text> : null}
                      {m.gender ? <Text style={styles.sep}>· {cap(m.gender)}</Text> : null}
                      {m.blood_group ? (
                        <View style={styles.blood}>
                          <Ionicons name="water" size={10} color="#DC143C" />
                          <Text style={styles.bloodTxt}>{m.blood_group}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: "/family/add", params: { id: m.id } })}
                      style={styles.iconBtn}
                      testID={`edit-family-${m.id}`}
                    >
                      <Ionicons name="pencil" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {m.relation !== "self" ? (
                      <TouchableOpacity
                        onPress={() => remove(m)}
                        style={[styles.iconBtn, { backgroundColor: colors.errorLight }]}
                        testID={`delete-family-${m.id}`}
                      >
                        <Ionicons name="trash" size={16} color={colors.error} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
                {(m.allergies || m.medical_conditions) ? (
                  <View style={styles.med}>
                    {m.allergies ? (
                      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, marginBottom: m.medical_conditions ? 4 : 0 }}>
                        <Ionicons name="warning" size={12} color={colors.warning} style={{ marginTop: 2 }} />
                        <Text style={styles.medTxt}><Text style={{ fontWeight: "700" }}>Allergies: </Text>{m.allergies}</Text>
                      </View>
                    ) : null}
                    {m.medical_conditions ? (
                      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
                        <Ionicons name="medkit" size={12} color={colors.info} style={{ marginTop: 2 }} />
                        <Text style={styles.medTxt}><Text style={{ fontWeight: "700" }}>Conditions: </Text>{m.medical_conditions}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </Card>
            );
          })
        )}

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/family/add")}
          testID="family-add-cta"
        >
          <Ionicons name="add" size={22} color={colors.primary} />
          <Text style={styles.addTxt}>Add Family Member</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  infoBanner: { flexDirection: "row", alignItems: "center", backgroundColor: colors.infoLight, padding: 12, borderRadius: radius.md, marginBottom: spacing.lg, gap: 10 },
  infoText: { color: colors.info, fontSize: 12, flex: 1, lineHeight: 17 },
  loading: { textAlign: "center", color: colors.textSecondary, marginTop: 40 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaTxt: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  sep: { fontSize: 12, color: colors.textSecondary },
  blood: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  bloodTxt: { color: colors.primary, fontSize: 10, fontWeight: "800" },
  iconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgMuted, alignItems: "center", justifyContent: "center" },
  med: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderLight },
  medTxt: { fontSize: 12, color: colors.textSecondary, flex: 1, lineHeight: 17 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 14, borderWidth: 1.5, borderColor: colors.primary, borderStyle: "dashed", borderRadius: radius.lg, marginTop: spacing.md },
  addTxt: { color: colors.primary, fontWeight: "700", fontSize: 15 },
});
