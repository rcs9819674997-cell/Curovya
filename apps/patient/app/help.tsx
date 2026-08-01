import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Input from "@/src/components/Input";
import Button from "@/src/components/Button";
import { api, ApiError } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

interface Faq { q: string; a: string }
interface Ticket {
  id: string; subject: string; message: string;
  category: string; status: string; reply?: string | null; created_at: string;
}

const STATUS_STYLES: Record<string, object> = {
  open: { backgroundColor: colors.warningLight },
  in_progress: { backgroundColor: colors.infoLight },
  resolved: { backgroundColor: colors.successLight },
  closed: { backgroundColor: colors.bgMuted },
};

const CATEGORIES: { key: "appointment" | "payment" | "technical" | "prescription" | "other"; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "appointment", label: "Appointment", icon: "calendar-outline" },
  { key: "payment", label: "Payment", icon: "card-outline" },
  { key: "technical", label: "Technical", icon: "bug-outline" },
  { key: "prescription", label: "Prescription", icon: "medkit-outline" },
  { key: "other", label: "Other", icon: "help-circle-outline" },
];

// ── Extracted row components ─────────────────────────────────────────────
const FaqRow = React.memo(function FaqRow({
  f,
  index,
  isOpen,
  onToggle,
}: {
  f: Faq;
  index: number;
  isOpen: boolean;
  onToggle: (i: number) => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onToggle(index)}
      style={styles.faqRow}
      testID={`faq-item-${index}`}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <Ionicons name="help-circle" size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.faqQ}>{f.q}</Text>
          {isOpen ? <Text style={styles.faqA}>{f.a}</Text> : null}
        </View>
        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.textDisabled} />
      </View>
    </TouchableOpacity>
  );
});

const TicketCard = React.memo(function TicketCard({ t }: { t: Ticket }) {
  return (
    <View style={styles.ticketCard} testID={`ticket-card-${t.id}`}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={styles.tSubject} numberOfLines={1}>{t.subject}</Text>
        <View style={[styles.status, STATUS_STYLES[t.status] || STATUS_STYLES.closed]}>
          <Text style={styles.statusTxt}>{t.status}</Text>
        </View>
      </View>
      <Text style={styles.tCat}>{t.category} · {new Date(t.created_at).toLocaleDateString()}</Text>
      <Text style={styles.tMsg} numberOfLines={3}>{t.message}</Text>
      {t.reply ? (
        <View style={styles.reply}>
          <Ionicons name="chatbubble-ellipses" size={14} color={colors.primary} />
          <Text style={styles.replyTxt}>{t.reply}</Text>
        </View>
      ) : null}
    </View>
  );
});

export default function HelpSupport() {
  const router = useRouter();
  const [tab, setTab] = useState<"faqs" | "contact" | "tickets">("faqs");
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]["key"]>("other");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const f = await api.get<{ faqs: Faq[] }>("/support/faqs", false);
      setFaqs(f.faqs);
    } catch {}
    try {
      const t = await api.get<Ticket[]>("/support/tickets");
      setTickets(t);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = useCallback(async () => {
    setErr(null);
    setOkMsg(null);
    if (subject.trim().length < 3) return setErr("Please enter a subject");
    if (message.trim().length < 10) return setErr("Please describe your issue (at least 10 characters)");
    setBusy(true);
    try {
      await api.post<Ticket>("/support/tickets", { subject, message, category });
      setOkMsg("Ticket submitted! We'll respond within 24 hours.");
      setSubject("");
      setMessage("");
      setCategory("other");
      await load();
      setTimeout(() => setTab("tickets"), 800);
    } catch (e) {
      const err = e as ApiError;
      setErr(err?.detail || "Failed to submit ticket");
    } finally {
      setBusy(false);
    }
  }, [subject, message, category, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const toggleFaq = useCallback((i: number) => {
    setOpenFaq(prev => prev === i ? null : i);
  }, []);

  const renderFaq = useCallback(({ item, index }: { item: Faq; index: number }) => (
    <FaqRow f={item} index={index} isOpen={openFaq === index} onToggle={toggleFaq} />
  ), [openFaq, toggleFaq]);

  const renderTicket = useCallback(({ item }: { item: Ticket }) => (
    <TicketCard t={item} />
  ), []);

  const renderTicketsEmpty = useCallback(() => (
    <View style={styles.empty}>
      <Ionicons name="chatbox-ellipses-outline" size={44} color={colors.textDisabled} />
      <Text style={styles.emptyTxt}>No support tickets yet.</Text>
      <Text style={styles.emptySub}>Have a question? Tap Contact Us above to send us a message.</Text>
    </View>
  ), []);

  const faqFooter = useCallback(() => (
    <View>
      <View style={styles.contactRow}>
        <Ionicons name="call-outline" size={20} color={colors.primary} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.contactTitle}>Call us</Text>
          <Text style={styles.contactSub}>+977-9800000000 · 8 AM – 8 PM</Text>
        </View>
      </View>
      <View style={styles.contactRow}>
        <Ionicons name="mail-outline" size={20} color={colors.primary} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.contactTitle}>Email us</Text>
          <Text style={styles.contactSub}>support@hamrodoctor.np</Text>
        </View>
      </View>
    </View>
  ), []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="help-back">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Help & Support</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {(["faqs", "contact", "tickets"] as const).map(k => (
          <TouchableOpacity
            key={k}
            onPress={() => setTab(k)}
            style={[styles.tab, tab === k && styles.tabActive]}
            testID={`help-tab-${k}`}
          >
            <Text style={[styles.tabTxt, tab === k && styles.tabTxtActive]}>
              {k === "faqs" ? "FAQs" : k === "contact" ? "Contact Us" : `My Tickets (${tickets.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        {tab === "faqs" ? (
          <FlatList
            data={faqs}
            keyExtractor={(_, i) => `faq-${i}`}
            renderItem={renderFaq}
            ListFooterComponent={faqFooter}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        ) : null}

        {tab === "contact" ? (
          <ScrollView
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <Text style={styles.section}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.key}
                  onPress={() => setCategory(c.key)}
                  style={[styles.chip, category === c.key && styles.chipActive]}
                  testID={`help-cat-${c.key}`}
                >
                  <Ionicons name={c.icon} size={14} color={category === c.key ? "#fff" : colors.textSecondary} />
                  <Text style={[styles.chipTxt, category === c.key && { color: "#fff" }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ height: spacing.md }} />
            <Input
              testID="help-subject-input"
              label="Subject"
              icon="chatbubble-outline"
              value={subject}
              onChangeText={setSubject}
              placeholder="Brief summary"
            />
            <Input
              testID="help-message-input"
              label="Describe your issue"
              icon="document-text-outline"
              value={message}
              onChangeText={setMessage}
              placeholder="Please share details so we can help you faster"
              multiline
              style={{ minHeight: 120, textAlignVertical: "top", paddingTop: 12 }}
            />

            {err ? <Text style={{ color: colors.error, marginBottom: spacing.md }}>{err}</Text> : null}
            {okMsg ? (
              <View style={styles.okBox}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={{ color: colors.success, marginLeft: 6, fontWeight: "600", flex: 1 }}>{okMsg}</Text>
              </View>
            ) : null}

            <Button title="Submit Ticket" onPress={submit} loading={busy} testID="help-submit-ticket" />
          </ScrollView>
        ) : null}

        {tab === "tickets" ? (
          <FlatList
            data={tickets}
            keyExtractor={(item) => item.id}
            renderItem={renderTicket}
            ListEmptyComponent={renderTicketsEmpty}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40, flexGrow: 1 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            initialNumToRender={15}
            removeClippedSubviews
          />
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  tabsRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  tab: { paddingHorizontal: 14, height: 36, borderRadius: 999, backgroundColor: colors.bgMuted, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  tabActive: { backgroundColor: colors.primary },
  tabTxt: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  tabTxtActive: { color: "#fff" },
  faqRow: { backgroundColor: "#fff", padding: 14, borderRadius: radius.lg, marginBottom: 10, borderWidth: 1, borderColor: colors.borderLight },
  faqQ: { fontSize: 14, fontWeight: "700", color: colors.text },
  faqA: { fontSize: 13, color: colors.textSecondary, marginTop: 6, lineHeight: 20 },
  contactRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 14, borderRadius: radius.lg, marginTop: 10, borderWidth: 1, borderColor: colors.borderLight },
  contactTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  contactSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  section: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 999, backgroundColor: colors.bgMuted, flexShrink: 0 },
  chipActive: { backgroundColor: colors.primary },
  chipTxt: { fontSize: 12, color: colors.textSecondary, fontWeight: "600" },
  okBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.successLight, padding: 10, borderRadius: radius.md, marginBottom: spacing.md },
  ticketCard: { backgroundColor: "#fff", padding: 14, borderRadius: radius.lg, marginBottom: 10, borderWidth: 1, borderColor: colors.borderLight },
  tSubject: { fontSize: 15, fontWeight: "700", color: colors.text, flex: 1, marginRight: 8 },
  tCat: { fontSize: 12, color: colors.textSecondary, marginTop: 4, textTransform: "capitalize" },
  tMsg: { fontSize: 13, color: colors.text, marginTop: 8, lineHeight: 18 },
  reply: { flexDirection: "row", gap: 6, backgroundColor: colors.primaryLight, padding: 10, borderRadius: radius.md, marginTop: 10 },
  replyTxt: { flex: 1, color: colors.primaryDark, fontSize: 13, lineHeight: 18 },
  status: { paddingHorizontal: 8, height: 22, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  statusTxt: { fontSize: 10, fontWeight: "700", color: colors.text, textTransform: "uppercase", letterSpacing: 0.5 },
  empty: { alignItems: "center", padding: 40 },
  emptyTxt: { fontSize: 14, color: colors.textSecondary, marginTop: 10, fontWeight: "600" },
  emptySub: { fontSize: 12, color: colors.textDisabled, textAlign: "center", marginTop: 6 },
});
