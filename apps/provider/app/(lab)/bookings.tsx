import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, RefreshControl, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import Input from "@/src/components/Input";
import Button from "@/src/components/Button";
import { colors, radius, spacing } from "@/src/theme";

interface Booking {
  id: string; patient_id: string; patient_name?: string; patient_phone?: string;
  test_id: string; test_name: string; price: number;
  date: string; home_collection: boolean; address: string;
  status: string; technician_name?: string; report_url?: string;
  created_at: string;
}

const STATUSES = ["booked", "sample_collected", "processing", "ready", "delivered"] as const;

export default function LabBookings() {
  const [items, setItems] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [tech, setTech] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const url = filter ? `/lab/bookings?status=${filter}` : "/lab/bookings";
      const d = await api.get<Booking[]>(url);
      setItems(d);
    } catch {}
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (b: Booking) => {
    setEditing(b);
    setTech(b.technician_name || "");
    setErr(null);
  };

  const saveStatus = async (status: string) => {
    if (!editing) return;
    setErr(null); setBusy(true);
    try {
      await api.patch(`/lab/bookings/${editing.id}`, { status, technician_name: tech || null });
      setEditing(null);
      await load();
    } catch (e: any) {
      setErr(e?.detail || "Failed to update");
    } finally {
      setBusy(false);
    }
  };

  const assignTech = async () => {
    if (!editing || !tech.trim()) return;
    setErr(null); setBusy(true);
    try {
      await api.patch(`/lab/bookings/${editing.id}`, { technician_name: tech.trim() });
      setEditing(null);
      await load();
    } catch (e: any) {
      setErr(e?.detail || "Failed to assign technician");
    } finally {
      setBusy(false);
    }
  };

  const statusColor = (s: string) => ({
    booked: colors.info,
    sample_collected: "#8B5CF6",
    processing: colors.warning,
    ready: colors.success,
    delivered: colors.textDisabled,
  }[s] || colors.textDisabled);

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const renderItem = useCallback(({ item: b }: { item: Booking }) => (
    <TouchableOpacity
      onPress={() => openEdit(b)}
      style={styles.card}
      activeOpacity={0.8}
      testID={`lab-booking-${b.id}`}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tName} numberOfLines={1}>{b.test_name}</Text>
          <Text style={styles.pName}>{b.patient_name || "Patient"} · {b.patient_phone}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor(b.status) }]}>
          <Text style={styles.badgeTxt}>{b.status.replace(/_/g, " ")}</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
        <Text style={styles.meta}>{b.date}</Text>
        {b.home_collection ? (
          <>
            <Ionicons name="home-outline" size={13} color={colors.textSecondary} style={{ marginLeft: 10 }} />
            <Text style={styles.meta}>Home</Text>
          </>
        ) : null}
        {b.technician_name ? (
          <>
            <Ionicons name="person-outline" size={13} color={colors.textSecondary} style={{ marginLeft: 10 }} />
            <Text style={styles.meta} numberOfLines={1}>{b.technician_name}</Text>
          </>
        ) : null}
        <Text style={styles.price}>Rs {b.price}</Text>
      </View>
    </TouchableOpacity>
  ), [statusColor, openEdit]);

  const keyExtractor = useCallback((item: Booking) => item.id, []);

  const renderEmpty = useCallback(() => (
    <View style={styles.empty}>
      <Ionicons name="flask-outline" size={44} color={colors.textDisabled} />
      <Text style={styles.emptyTxt}>No bookings yet.</Text>
    </View>
  ), []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Lab Bookings</Text>
        <Text style={styles.sub}>{items.length} total</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        <TouchableOpacity onPress={() => setFilter(null)} style={[styles.chip, !filter && styles.chipActive]} testID="filter-all">
          <Text style={[styles.chipTxt, !filter && { color: "#fff" }]}>All</Text>
        </TouchableOpacity>
        {STATUSES.map(s => (
          <TouchableOpacity key={s} onPress={() => setFilter(s)} style={[styles.chip, filter === s && styles.chipActive]} testID={`filter-${s}`}>
            <Text style={[styles.chipTxt, filter === s && { color: "#fff" }]}>{s.replace(/_/g, " ")}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        initialNumToRender={15}
        removeClippedSubviews
      />

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.modalBg} onPress={() => setEditing(null)}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{editing?.test_name}</Text>
            <Text style={styles.sheetSub}>{editing?.patient_name} · {editing?.date}</Text>

            <Text style={styles.sheetH}>Assign Technician</Text>
            <Input
              testID="lab-tech-input"
              icon="person-outline"
              placeholder="Technician name"
              value={tech}
              onChangeText={setTech}
            />
            <Button title="Save Technician" onPress={assignTech} loading={busy} testID="lab-save-tech" />

            <Text style={[styles.sheetH, { marginTop: 24 }]}>Update Status</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {STATUSES.map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() => saveStatus(s)}
                  disabled={busy || editing?.status === s}
                  style={[styles.statusBtn, editing?.status === s && { backgroundColor: statusColor(s), borderColor: statusColor(s) }]}
                  testID={`lab-set-${s}`}
                >
                  <Text style={[styles.statusBtnTxt, editing?.status === s && { color: "#fff" }]}>{s.replace(/_/g, " ")}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {err ? <Text style={{ color: colors.error, marginTop: 8 }}>{err}</Text> : null}
          </Pressable>
        </Pressable>
      </Modal>
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
  chipTxt: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, textTransform: "capitalize" },
  card: { backgroundColor: "#fff", padding: 14, borderRadius: radius.lg, marginBottom: 10, borderWidth: 1, borderColor: colors.borderLight },
  tName: { fontSize: 15, fontWeight: "700", color: colors.text },
  pName: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  meta: { fontSize: 12, color: colors.textSecondary, marginLeft: 4 },
  price: { marginLeft: "auto", fontSize: 14, fontWeight: "800", color: colors.text },
  badge: { paddingHorizontal: 10, height: 22, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  badgeTxt: { color: "#fff", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  empty: { alignItems: "center", padding: 40 },
  emptyTxt: { fontSize: 14, color: colors.textSecondary, marginTop: 10, fontWeight: "600" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: colors.borderMedium, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  sheetSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2, marginBottom: 16 },
  sheetH: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", marginBottom: 8, marginTop: 8, letterSpacing: 0.5 },
  statusBtn: { paddingHorizontal: 14, height: 38, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1.5, borderColor: colors.borderMedium, alignItems: "center", justifyContent: "center" },
  statusBtnTxt: { fontSize: 12, fontWeight: "600", color: colors.text, textTransform: "capitalize" },
});
