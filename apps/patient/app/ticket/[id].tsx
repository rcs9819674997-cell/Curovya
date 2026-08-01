import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Animated, Share, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ScreenHeader from "@/src/components/ScreenHeader";
import Button from "@/src/components/Button";
import PlusUpsell from "@/src/components/PlusUpsell";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";
import { useT } from "@/src/i18n";

interface Appointment {
  id: string;
  booking_id: string;
  token_number: number;
  doctor_id: string;
  doctor_name: string;
  doctor_specialty: string;
  doctor_photo_url?: string;
  clinic_name?: string;
  clinic_address?: string;
  date: string;
  time: string;
  consultation_type: string;
  consultation_fee: number;
  payment_method?: string;
  payment_status?: string;
  status: string;
  queue_status?: string;
  current_serving?: number;
  is_walk_in?: boolean;
  patient_details?: {
    full_name?: string;
    phone?: string;
    relation?: string;
    age?: number;
    gender?: string;
    symptoms?: string;
  };
}

interface QueueView {
  my_token: number;
  my_status: "waiting" | "in_consultation" | "completed" | "no_show" | "skipped";
  currently_serving_token: number | null;
  position_ahead: number;
  estimated_wait_minutes: number;
  counts: Record<string, number>;
}

const TERMINAL_STATUSES = ["completed", "no_show", "skipped"];
const SKELETON = "#ECECEF";

export default function Ticket() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [queue, setQueue] = useState<QueueView | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(false);

  const loadTicket = useCallback(async (): Promise<QueueView["my_status"] | undefined> => {
    try {
      const [r, q] = await Promise.all([
        api.get<Appointment>(`/appointments/${id}`),
        api.get<QueueView>(`/appointments/${id}/queue`).catch(() => null),
      ]);
      setAppt(r);
      if (q) setQueue(q);
      setError(false);
      return q?.my_status;
    } catch {
      setError(true);
      return undefined;
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      const status = await loadTicket();
      if (cancelled) return;
      if (status && TERMINAL_STATUSES.includes(status) && timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    (async () => {
      await tick();
      if (!cancelled) setLoading(false);
    })();

    timer = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [loadTicket]);

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

  const livePulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulseAnim, { toValue: 1.8, duration: 650, useNativeDriver: true }),
        Animated.timing(livePulseAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [livePulseAnim]);

  const onShare = async (a: Appointment) => {
    try {
      await Share.share({
        message: `My appointment with ${a.doctor_name} (${a.doctor_specialty}) at ${a.clinic_name || "Clinic"} on ${a.date} at ${a.time}. Token ${a.token_number} · Booking ID: ${a.booking_id}.`,
      });
    } catch {}
  };

  const handleCancelAppointment = () => {
    if (!appt) return;
    Alert.alert(
      "Cancel Appointment",
      "Are you sure you want to cancel this appointment? This action cannot be undone.",
      [
        { text: "Keep Appointment", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              await api.del(`/appointments/${appt.id}`);
              await loadTicket();
              Alert.alert("Success", "Your appointment has been cancelled.");
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to cancel appointment");
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
        <ScreenHeader title="Ticket" />
        <View style={{ padding: spacing.lg }}>
          <View style={{ alignItems: "center", marginBottom: spacing.lg }}>
            <Animated.View style={[styles.skeletonCircle, { opacity: pulse }]} />
            <Animated.View style={[styles.skeletonLine, { width: "55%", marginTop: 12, opacity: pulse }]} />
          </View>
          <Animated.View style={[styles.skeletonTicket, { opacity: pulse }]} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !appt) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
        <ScreenHeader title="Ticket" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl }}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={26} color={colors.primary} />
          </View>
          <Text style={{ fontWeight: "700", color: colors.text, marginTop: 14, fontSize: 15 }}>Couldn&apos;t load your ticket</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 4, textAlign: "center" }}>
            Check your connection and try again.
          </Text>
          <TouchableOpacity onPress={loadTicket} style={styles.retryBtn} testID="ticket-retry">
            <Text style={{ color: "#fff", fontWeight: "700" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const serving = queue?.currently_serving_token ?? appt.current_serving;
  const ahead = queue ? Math.max(0, queue.position_ahead) : Math.max(0, appt.token_number - (appt.current_serving || 0));
  const waitMin = queue ? queue.estimated_wait_minutes : ahead * 8;
  const myStatus = queue?.my_status || (appt.status === "cancelled" ? "no_show" : "waiting");
  const isLive = (myStatus === "waiting" || myStatus === "in_consultation") && appt.status !== "cancelled";
  const isCancelled = appt.status === "cancelled" || appt.queue_status === "cancelled";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScreenHeader
        title="Digital Ticket"
        right={
          <TouchableOpacity onPress={() => onShare(appt)} testID="ticket-share" hitSlop={8}>
            <Ionicons name="share-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {!isCancelled ? (
          <View style={styles.successBanner}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={26} color="#fff" />
            </View>
            <Text style={styles.successTitle}>Booking Confirmed!</Text>
            <Text style={styles.successSub}>Your appointment is confirmed. Save this ticket.</Text>
          </View>
        ) : (
          <View style={[styles.successBanner, { backgroundColor: "#FEF2F2" }]}>
            <View style={[styles.successIcon, { backgroundColor: colors.error }]}>
              <Ionicons name="close" size={26} color="#fff" />
            </View>
            <Text style={[styles.successTitle, { color: colors.error }]}>Appointment Cancelled</Text>
            <Text style={styles.successSub}>This appointment has been cancelled.</Text>
          </View>
        )}

        <View style={styles.ticket} testID="digital-ticket">
          <LinearGradient
            colors={
              isCancelled
                ? ["#64748B", "#475569"]
                : myStatus === "in_consultation"
                ? ["#10B981", "#059669"]
                : ["#DC143C", "#B31133"]
            }
            style={styles.ticketTop}
          >
            <Text style={styles.brandTxt}>HamroDoctor</Text>
            <Text style={styles.bookingId}>ID: {appt.booking_id}</Text>
            {isCancelled ? (
              <View style={[styles.yourTurnBanner, { backgroundColor: "rgba(255,255,255,0.9)" }]}>
                <Ionicons name="close-circle" size={16} color={colors.error} />
                <Text style={[styles.yourTurnTxt, { color: colors.error }]}>Cancelled</Text>
              </View>
            ) : myStatus === "in_consultation" ? (
              <View style={styles.yourTurnBanner} testID="your-turn-banner">
                <Ionicons name="megaphone" size={16} color="#059669" />
                <Text style={styles.yourTurnTxt}>It&apos;s your turn — please head in!</Text>
              </View>
            ) : myStatus === "completed" ? (
              <View style={styles.yourTurnBanner}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.yourTurnTxt}>Consultation completed</Text>
              </View>
            ) : myStatus === "no_show" ? (
              <View style={[styles.yourTurnBanner, { backgroundColor: "rgba(255,255,255,0.9)" }]}>
                <Ionicons name="alert-circle" size={16} color={colors.warning} />
                <Text style={[styles.yourTurnTxt, { color: colors.warning }]}>Marked as no-show</Text>
              </View>
            ) : myStatus === "skipped" ? (
              <View style={[styles.yourTurnBanner, { backgroundColor: "rgba(255,255,255,0.9)" }]}>
                <Ionicons name="arrow-forward-circle" size={16} color={colors.warning} />
                <Text style={[styles.yourTurnTxt, { color: colors.warning }]}>Moved to end of queue</Text>
              </View>
            ) : null}
            <View style={styles.tokenBox}>
              <Text style={styles.tokenLbl}>YOUR TOKEN</Text>
              <Text style={styles.tokenBig}>{queue?.my_token ?? appt.token_number ?? "—"}</Text>

              <Text style={styles.nowServing}>
                {isCancelled
                  ? "Appointment cancelled"
                  : serving
                  ? `Now Serving: ${serving}`
                  : "Queue not started"}
              </Text>
              {myStatus === "waiting" && !isCancelled ? (
                <View style={styles.waitPill}>
                  <Ionicons name="time-outline" size={12} color="#fff" />
                  <Text style={styles.waitTxt}>
                    {ahead === 0 ? "You're next!" : `Est. wait: ${waitMin} min · ${ahead} ahead`}
                  </Text>
                </View>
              ) : null}
              {isLive && (
                <View style={styles.liveIndicator}>
                  <Animated.View style={[styles.livePulse, { transform: [{ scale: livePulseAnim }] }]} />
                  <Text style={styles.liveIndicatorTxt}>LIVE · refreshing every 5s</Text>
                </View>
              )}
            </View>
          </LinearGradient>
          <View style={styles.dashRow}>
            <View style={styles.notchLeft} />
            <View style={styles.dashLine} />
            <View style={styles.notchRight} />
          </View>
          <View style={styles.ticketBottom}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.md }}>
              <Image
                source={{
                  uri:
                    appt.doctor_photo_url ||
                    "https://images.unsplash.com/photo-1612349316228-5942a9b489c2?w=400&q=80",
                }}
                style={styles.docAvatar}
              />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.docName} numberOfLines={1}>
                  {appt.doctor_name}
                </Text>
                <Text style={styles.docSpec} numberOfLines={1}>
                  {appt.doctor_specialty}
                </Text>
              </View>
            </View>
            <Divider label={t("date") || "Date"} value={appt.date} icon="calendar-outline" />
            <Divider label={t("time") || "Time"} value={appt.time} icon="time-outline" />
            <Divider
              label="Type"
              value={appt.consultation_type === "video" ? t("video_call") : t("clinic_visit")}
              icon="videocam-outline"
            />
            {appt.clinic_name ? (
              <Divider label={t("clinic")} value={appt.clinic_name} icon="business-outline" />
            ) : null}
            {appt.clinic_address ? (
              <Divider label="Address" value={appt.clinic_address} icon="location-outline" />
            ) : null}
            {appt.patient_details?.full_name ? (
              <Divider label="Patient" value={appt.patient_details.full_name} icon="person-outline" />
            ) : null}
            {appt.patient_details?.symptoms ? (
              <Divider label="Symptoms" value={appt.patient_details.symptoms} icon="medical-outline" />
            ) : null}
            <Divider
              label="Paid via"
              value={(appt.payment_method || "Pay at Clinic").toUpperCase()}
              icon="wallet-outline"
              last
            />
          </View>
        </View>

        <View style={{ marginTop: spacing.xl, gap: 12 }}>
          <PlusUpsell context="Get free follow-up within 7 days" />

          {appt.consultation_type === "video" &&
          !TERMINAL_STATUSES.includes(myStatus || "") &&
          !isCancelled ? (
            <Button
              title={t("join_video")}
              icon="videocam"
              onPress={() =>
                router.push({
                  pathname: "/video-call/[appointmentId]",
                  params: { appointmentId: appt.id },
                })
              }
              testID="ticket-join-video"
            />
          ) : null}

          {myStatus === "completed" || appt.status === "completed" ? (
            <>
              <Button
                title="View Prescriptions"
                icon="document-text"
                variant="primary"
                onPress={() => router.push("/(tabs)/records")}
                testID="ticket-view-prescriptions"
              />
              <Button
                title="Rate this Doctor"
                icon="star"
                variant="secondary"
                onPress={() =>
                  router.push({
                    pathname: "/review/[doctorId]",
                    params: { doctorId: appt.doctor_id, appointmentId: appt.id },
                  })
                }
                testID="ticket-rate-doctor"
              />
            </>
          ) : null}

          {!isCancelled && appt.status !== "completed" && myStatus === "waiting" ? (
            <Button
              title="Cancel Appointment"
              icon="trash-outline"
              variant="ghost"
              loading={cancelling}
              onPress={handleCancelAppointment}
              style={{ borderColor: colors.error, borderWidth: 1 }}
              testID="ticket-cancel-appointment"
            />
          ) : null}

          <Button
            title="Back to Home"
            onPress={() => router.replace("/(tabs)")}
            variant="secondary"
            icon="home"
            testID="ticket-home"
          />

          <TouchableOpacity
            onPress={() => router.push("/(tabs)/appointments")}
            style={{ alignItems: "center", padding: 12 }}
          >
            <Text style={{ color: colors.primary, fontWeight: "700" }}>View all appointments</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Divider({
  label,
  value,
  icon,
  last,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.borderLight,
      }}
    >
      <Ionicons name={icon} size={16} color={colors.textSecondary} />
      <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 8, flex: 1 }}>{label}</Text>
      <Text
        style={{ fontSize: 13, color: colors.text, fontWeight: "600", flex: 1, textAlign: "right" }}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  successBanner: { alignItems: "center", padding: spacing.lg, borderRadius: radius.xl, marginBottom: spacing.md },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  successTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  successSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4, textAlign: "center" },

  ticket: {
    borderRadius: radius.xxl,
    overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  ticketTop: { padding: spacing.xl, alignItems: "center" },
  brandTxt: { color: "#fff", fontWeight: "800", fontSize: 14, letterSpacing: 0.5 },
  bookingId: { color: "rgba(255,255,255,0.85)", fontSize: 11, marginTop: 4 },
  tokenBox: { alignItems: "center", marginTop: spacing.md },
  tokenLbl: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "600", letterSpacing: 1 },
  tokenBig: { color: "#fff", fontSize: 72, fontWeight: "900", lineHeight: 80, marginTop: 4 },
  nowServing: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 4 },
  waitPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 8,
    gap: 4,
  },
  waitTxt: { color: "#fff", fontSize: 11, fontWeight: "600" },
  yourTurnBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: spacing.md,
    gap: 6,
  },
  yourTurnTxt: { color: "#059669", fontSize: 12, fontWeight: "800" },
  liveIndicator: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, opacity: 0.85 },
  livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FDE047" },
  liveIndicatorTxt: { color: "rgba(255,255,255,0.85)", fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  dashRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#DC143C" },
  notchLeft: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.bgApp, marginLeft: -10 },
  notchRight: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.bgApp, marginRight: -10 },
  dashLine: { flex: 1, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.4)", borderWidth: 0, borderTopWidth: 2 },
  ticketBottom: { padding: spacing.lg },
  docAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: SKELETON },
  docName: { fontSize: 16, fontWeight: "700", color: colors.text },
  docSpec: { fontSize: 13, color: colors.primary, marginTop: 2 },

  errorIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.lg,
  },

  skeletonCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: SKELETON },
  skeletonLine: { height: 14, borderRadius: 7, backgroundColor: SKELETON },
  skeletonTicket: { width: "100%", height: 420, borderRadius: radius.xxl, backgroundColor: SKELETON },
});