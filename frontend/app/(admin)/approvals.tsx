import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

interface AdminUser { id: string; full_name: string; email: string; role: string; is_approved?: boolean; is_verified?: boolean; created_at?: string }
interface Clinic { id: string; name: string; address: string; is_approved?: boolean }

export default function Approvals() {
  const [pendingDoctors, setPendingDoctors] = useState<AdminUser[]>([]);
  const [pendingClinics, setPendingClinics] = useState<Clinic[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"doctors" | "clinics">("doctors");

  const load = useCallback(async () => {
    try {
      const users = await api.get<AdminUser[]>("/admin/users?role=doctor");
      setPendingDoctors(users.filter(u => !u.is_approved));
    } catch {}
    try {
      const clinics = await api.get<Clinic[]>("/admin/clinics");
      setPendingClinics(clinics.filter(c => !c.is_approved));
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const approveUser = async (id: string) => {
    try { await api.post(`/admin/users/${id}/approve`); await load(); } catch {}
  };
  const approveClinic = async (id: string) => {
    try { await api.post(`/admin/clinics/${id}/approve`); await load(); } catch {}
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Approvals</Text>
        <Text style={styles.sub}>{pendingDoctors.length + pendingClinics.length} pending</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        <TouchableOpacity onPress={() => setTab("doctors")} style={[styles.chip, tab === "doctors" && styles.chipActive]} testID="approvals-tab-doctors">
          <Text style={[styles.chipTxt, tab === "doctors" && { color: "#fff" }]}>Doctors ({pendingDoctors.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab("clinics")} style={[styles.chip, tab === "clinics" && styles.chipActive]} testID="approvals-tab-clinics">
          <Text style={[styles.chipTxt, tab === "clinics" && { color: "#fff" }]}>Clinics ({pendingClinics.length})</Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        {tab === "doctors" ? (
          pendingDoctors.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="checkmark-done-circle-outline" size={44} color={colors.textDisabled} />
              <Text style={styles.emptyTxt}>No pending doctor approvals</Text>
            </View>
          ) : pendingDoctors.map(d => (
            <View key={d.id} style={styles.card} testID={`approve-doc-${d.id}`}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={styles.icon}><Ionicons name="medkit" size={20} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{d.full_name}</Text>
                  <Text style={styles.email}>{d.email}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => approveUser(d.id)} style={styles.approveBtn} testID={`approve-doc-btn-${d.id}`}>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.approveBtnTxt}>Approve</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          pendingClinics.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="checkmark-done-circle-outline" size={44} color={colors.textDisabled} />
              <Text style={styles.emptyTxt}>No pending clinic approvals</Text>
            </View>
          ) : pendingClinics.map(c => (
            <View key={c.id} style={styles.card} testID={`approve-clinic-${c.id}`}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={styles.icon}><Ionicons name="business" size={20} color={colors.warning} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{c.name}</Text>
                  <Text style={styles.email}>{c.address}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => approveClinic(c.id)} style={styles.approveBtn} testID={`approve-clinic-btn-${c.id}`}>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.approveBtnTxt}>Approve</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.lg, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  sub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  chipsRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  chip: { paddingHorizontal: 14, height: 36, borderRadius: 999, backgroundColor: colors.bgMuted, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: colors.primary },
  chipTxt: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  card: { backgroundColor: "#fff", padding: 14, borderRadius: radius.lg, marginBottom: 10, borderWidth: 1, borderColor: colors.borderLight },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 14, fontWeight: "700", color: colors.text },
  email: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  approveBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.success, paddingHorizontal: 14, height: 36, borderRadius: 999, alignSelf: "flex-end", marginTop: 10 },
  approveBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },
  empty: { alignItems: "center", padding: 40 },
  emptyTxt: { fontSize: 14, color: colors.textSecondary, marginTop: 10, fontWeight: "600" },
});
