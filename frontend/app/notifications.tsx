import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "@/src/components/ScreenHeader";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

interface Notif {
  id: string; type: string; title: string; body: string;
  read: boolean; action?: string | null; created_at: string;
}

const TYPE_META: Record<string, { icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap; color: string }> = {
  appointment: { icon: "calendar", color: "#DC143C" },
  medicine: { icon: "medical", color: "#F59E0B" },
  lab: { icon: "flask", color: "#3B82F6" },
  payment: { icon: "checkmark-done", color: "#10B981" },
  prescription: { icon: "document-text", color: "#8B5CF6" },
  followup: { icon: "calendar-outline", color: "#DC143C" },
  system: { icon: "information-circle", color: "#64748B" },
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Notifications() {
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const d = await api.get<Notif[]>("/notifications");
      setItems(d);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const onTap = async (n: Notif) => {
    try {
      if (!n.read) {
        await api.post(`/notifications/${n.id}/read`);
        setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      }
    } catch {}
    if (n.action) {
      router.push(n.action as any);
    }
  };

  const markAll = async () => {
    try {
      await api.post("/notifications/read-all");
      setItems(prev => prev.map(x => ({ ...x, read: true })));
    } catch {}
  };

  const unread = items.filter(x => !x.read).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScreenHeader title="Notifications" right={
        unread > 0 ? (
          <TouchableOpacity onPress={markAll} testID="mark-all-read">
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>Mark all read</Text>
          </TouchableOpacity>
        ) : null
      } />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={44} color={colors.textDisabled} />
            <Text style={styles.emptyTxt}>No notifications yet.</Text>
            <Text style={styles.emptySub}>Booking confirmations, prescriptions, lab reports and reminders will appear here.</Text>
          </View>
        ) : items.map(n => {
          const meta = TYPE_META[n.type] || TYPE_META.system;
          return (
            <TouchableOpacity
              key={n.id}
              onPress={() => onTap(n)}
              activeOpacity={0.8}
              style={[styles.card, !n.read && styles.cardUnread]}
              testID={`notif-${n.id}`}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                <View style={[styles.icon, { backgroundColor: `${meta.color}20` }]}>
                  <Ionicons name={meta.icon} size={18} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={styles.title}>{n.title}</Text>
                    <Text style={styles.time}>{timeAgo(n.created_at)}</Text>
                  </View>
                  <Text style={styles.body}>{n.body}</Text>
                </View>
                {!n.read ? <View style={styles.dot} /> : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", padding: 14, borderRadius: radius.lg, marginBottom: 10, borderWidth: 1, borderColor: colors.borderLight },
  cardUnread: { backgroundColor: "#FFF5F7", borderColor: colors.primaryLight },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontWeight: "700", color: colors.text, flex: 1, marginRight: 8 },
  time: { fontSize: 11, color: colors.textSecondary },
  body: { fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  empty: { alignItems: "center", padding: 40 },
  emptyTxt: { fontSize: 14, color: colors.textSecondary, marginTop: 10, fontWeight: "600" },
  emptySub: { fontSize: 12, color: colors.textDisabled, textAlign: "center", marginTop: 6, paddingHorizontal: 20 },
});
