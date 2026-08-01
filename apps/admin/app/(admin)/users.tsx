import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

interface AdminUser {
  id: string; full_name: string; email: string; phone: string;
  role: string; is_verified: boolean; is_suspended?: boolean; is_approved?: boolean;
  created_at?: string;
}

const ROLES = ["patient", "doctor", "clinic_admin", "receptionist", "lab_admin", "super_admin"];

// ── Memoized color map (avoids object re-creation) ──────────────────────
const ROLE_COLORS: Record<string, string> = {
  patient: "#3B82F6",
  doctor: "#DC143C",
  clinic_admin: "#F59E0B",
  receptionist: "#8B5CF6",
  lab_admin: "#10B981",
  super_admin: "#0F172A",
};

function roleColor(r: string): string {
  return ROLE_COLORS[r] || "#94A3B8";
}

// ── Extracted row component — prevents re-render of all rows when one changes ─
const UserRow = React.memo(function UserRow({
  u,
  onSuspend,
}: {
  u: AdminUser;
  onSuspend: (u: AdminUser) => void;
}) {
  const rc = roleColor(u.role);
  const initials = u.full_name?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "U";

  return (
    <View style={styles.card} testID={`admin-user-${u.id}`}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[styles.avatar, { backgroundColor: `${rc}20` }]}>
          <Text style={{ color: rc, fontWeight: "800", fontSize: 14 }}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{u.full_name}</Text>
          <Text style={styles.email} numberOfLines={1}>{u.email}</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: `${rc}20` }]}>
          <Text style={[styles.roleTxt, { color: rc }]}>{u.role.replace(/_/g, " ")}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        {u.is_verified ? (
          <View style={styles.stateOk}>
            <Ionicons name="checkmark-circle" size={12} color={colors.success} />
            <Text style={styles.stateTxt}>Verified</Text>
          </View>
        ) : (
          <View style={styles.stateWarn}>
            <Ionicons name="warning" size={12} color={colors.warning} />
            <Text style={[styles.stateTxt, { color: colors.warning }]}>Unverified</Text>
          </View>
        )}
        {u.is_suspended ? (
          <View style={styles.stateErr}>
            <Ionicons name="ban" size={12} color={colors.error} />
            <Text style={[styles.stateTxt, { color: colors.error }]}>Suspended</Text>
          </View>
        ) : null}
        <TouchableOpacity onPress={() => onSuspend(u)} style={[styles.btn, u.is_suspended ? styles.btnUn : styles.btnSus]} testID={`admin-suspend-${u.id}`}>
          <Text style={styles.btnTxt}>{u.is_suspended ? "Unsuspend" : "Suspend"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input — reduces API calls while typing
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQ(q), 350);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [q]);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (role) params.set("role", role);
      if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
      const url = `/admin/users${params.toString() ? "?" + params.toString() : ""}`;
      const d = await api.get<AdminUser[]>(url);
      setUsers(d);
    } catch {}
  }, [role, debouncedQ]);

  useEffect(() => { load(); }, [load]);

  const suspend = useCallback(async (u: AdminUser) => {
    try {
      if (u.is_suspended) {
        await api.post(`/admin/users/${u.id}/unsuspend`);
      } else {
        await api.post(`/admin/users/${u.id}/suspend`);
      }
      await load();
    } catch {}
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: users.length };
    for (const u of users) c[u.role] = (c[u.role] || 0) + 1;
    return c;
  }, [users]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const renderUser = useCallback(({ item }: { item: AdminUser }) => (
    <UserRow u={item} onSuspend={suspend} />
  ), [suspend]);

  const keyExtractor = useCallback((item: AdminUser) => item.id, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Users</Text>
        <Text style={styles.sub}>{users.length} users · {counts.all || 0} total</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.textDisabled} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name or email"
            placeholderTextColor={colors.textDisabled}
            value={q}
            onChangeText={setQ}
            testID="admin-user-search"
          />
        </View>
      </View>

      <FlatList
        horizontal
        data={[null, ...ROLES]}
        keyExtractor={(item) => item || "all"}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        renderItem={({ item: r }) => (
          <TouchableOpacity onPress={() => setRole(r)} style={[styles.chip, (r === null ? !role : role === r) && styles.chipActive]} testID={r ? `admin-role-${r}` : "admin-role-all"}>
            <Text style={[styles.chipTxt, (r === null ? !role : role === r) && { color: "#fff" }]}>
              {r ? r.replace(/_/g, " ") : "All"}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={users}
        keyExtractor={keyExtractor}
        renderItem={renderUser}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.lg, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  sub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bgMuted, borderRadius: radius.lg, paddingHorizontal: 12, height: 40, marginTop: 12 },
  searchInput: { flex: 1, fontSize: 14, marginLeft: 8, color: colors.text },
  chipsRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  chip: { paddingHorizontal: 14, height: 36, borderRadius: 999, backgroundColor: colors.bgMuted, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: colors.primary },
  chipTxt: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, textTransform: "capitalize" },
  card: { backgroundColor: "#fff", padding: 14, borderRadius: radius.lg, marginBottom: 10, borderWidth: 1, borderColor: colors.borderLight },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 14, fontWeight: "700", color: colors.text },
  email: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  roleBadge: { paddingHorizontal: 8, height: 22, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  roleTxt: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  actions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" },
  stateOk: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.successLight, paddingHorizontal: 8, height: 22, borderRadius: 999 },
  stateWarn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.warningLight, paddingHorizontal: 8, height: 22, borderRadius: 999 },
  stateErr: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.errorLight, paddingHorizontal: 8, height: 22, borderRadius: 999 },
  stateTxt: { fontSize: 10, fontWeight: "700", color: colors.success },
  btn: { marginLeft: "auto", paddingHorizontal: 12, height: 30, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  btnSus: { backgroundColor: colors.errorLight },
  btnUn: { backgroundColor: colors.successLight },
  btnTxt: { fontSize: 12, fontWeight: "700", color: colors.text },
});
