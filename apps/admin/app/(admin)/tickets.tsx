import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, KeyboardAvoidingView, Platform, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import Input from "@/src/components/Input";
import Button from "@/src/components/Button";
import { colors, radius, spacing } from "@/src/theme";

interface Ticket {
  id: string; user_id: string; subject: string; message: string;
  category: string; status: string; reply?: string | null; created_at: string;
}

const STATUS_STYLES: Record<string, object> = {
  open: { backgroundColor: colors.warningLight },
  in_progress: { backgroundColor: colors.infoLight },
  resolved: { backgroundColor: colors.successLight },
  closed: { backgroundColor: colors.bgMuted },
};

// ── Extracted row for React.memo ─────────────────────────────────────────
const TicketRow = React.memo(function TicketRow({
  t,
  onPress,
}: {
  t: Ticket;
  onPress: (t: Ticket) => void;
}) {
  return (
    <TouchableOpacity onPress={() => onPress(t)} style={styles.card} testID={`ticket-${t.id}`}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={styles.subject} numberOfLines={1}>{t.subject}</Text>
        <View style={[styles.badge, STATUS_STYLES[t.status] || STATUS_STYLES.closed]}>
          <Text style={styles.badgeTxt}>{t.status}</Text>
        </View>
      </View>
      <Text style={styles.meta}>{t.category} · {new Date(t.created_at).toLocaleDateString()}</Text>
      <Text style={styles.msg} numberOfLines={2}>{t.message}</Text>
      {t.reply ? <Text style={styles.reply} numberOfLines={2}>Reply: {t.reply}</Text> : null}
    </TouchableOpacity>
  );
});

export default function AdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState<"open" | "in_progress" | "resolved" | "closed">("in_progress");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.get<Ticket[]>("/admin/tickets");
      setTickets(d);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const send = useCallback(async () => {
    if (!editing || reply.trim().length < 5) return;
    setBusy(true);
    try {
      await api.post(`/admin/tickets/${editing.id}/reply`, { reply, status });
      setEditing(null);
      setReply("");
      await load();
    } catch {}
    finally { setBusy(false); }
  }, [editing, reply, status, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openTicket = useCallback((t: Ticket) => {
    setEditing(t);
    setReply(t.reply || "");
    setStatus((t.status as any) || "in_progress");
  }, []);

  const renderTicket = useCallback(({ item }: { item: Ticket }) => (
    <TicketRow t={item} onPress={openTicket} />
  ), [openTicket]);

  const keyExtractor = useCallback((item: Ticket) => item.id, []);

  const renderEmpty = useCallback(() => (
    <View style={styles.empty}>
      <Ionicons name="chatbox-ellipses-outline" size={44} color={colors.textDisabled} />
      <Text style={styles.emptyTxt}>No tickets yet.</Text>
    </View>
  ), []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Support Tickets</Text>
        <Text style={styles.sub}>{tickets.length} total</Text>
      </View>
      <FlatList
        data={tickets}
        keyExtractor={keyExtractor}
        renderItem={renderTicket}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
      />

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.modalBg} onPress={() => setEditing(null)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: "100%" }}>
            <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>{editing?.subject}</Text>
              <Text style={styles.sheetMeta}>{editing?.category} · {editing?.created_at ? new Date(editing.created_at).toLocaleString() : ""}</Text>
              <View style={styles.msgBox}><Text style={styles.msgTxt}>{editing?.message}</Text></View>

              <Text style={styles.sheetH}>Status</Text>
              <FlatList
                horizontal
                data={["open", "in_progress", "resolved", "closed"] as const}
                keyExtractor={(s) => s}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
                renderItem={({ item: s }) => (
                  <TouchableOpacity onPress={() => setStatus(s)} style={[styles.chip, status === s && styles.chipActive]} testID={`ticket-status-${s}`}>
                    <Text style={[styles.chipTxt, status === s && { color: "#fff" }]}>{s.replace(/_/g, " ")}</Text>
                  </TouchableOpacity>
                )}
              />

              <View style={{ height: 12 }} />
              <Input
                testID="ticket-reply-input"
                label="Reply"
                icon="chatbubble-outline"
                placeholder="Type your reply to the user"
                value={reply}
                onChangeText={setReply}
                multiline
                style={{ minHeight: 100, textAlignVertical: "top", paddingTop: 12 }}
              />

              <Button title="Send Reply" onPress={send} loading={busy} testID="ticket-send-reply" />
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.lg, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  sub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  card: { backgroundColor: "#fff", padding: 14, borderRadius: radius.lg, marginBottom: 10, borderWidth: 1, borderColor: colors.borderLight },
  subject: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.text, marginRight: 8 },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 4, textTransform: "capitalize" },
  msg: { fontSize: 13, color: colors.text, marginTop: 8, lineHeight: 18 },
  reply: { fontSize: 12, color: colors.primary, marginTop: 8, fontStyle: "italic" },
  badge: { paddingHorizontal: 8, height: 22, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  badgeTxt: { fontSize: 10, fontWeight: "700", color: colors.text, textTransform: "uppercase" },
  empty: { alignItems: "center", padding: 40 },
  emptyTxt: { fontSize: 14, color: colors.textSecondary, marginTop: 10, fontWeight: "600" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: colors.borderMedium, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  sheetMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 4, textTransform: "capitalize" },
  msgBox: { backgroundColor: colors.bgMuted, padding: 12, borderRadius: radius.md, marginTop: 12, marginBottom: 12 },
  msgTxt: { fontSize: 13, color: colors.text, lineHeight: 18 },
  sheetH: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  chip: { paddingHorizontal: 14, height: 36, borderRadius: 999, backgroundColor: colors.bgMuted, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: colors.primary },
  chipTxt: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, textTransform: "capitalize" },
});
