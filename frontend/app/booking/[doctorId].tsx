import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "@/src/components/ScreenHeader";
import { Card, Chip } from "@/src/components/UI";
import Button from "@/src/components/Button";
import { api } from "@/src/api/client";
import { payWithEsewa } from "@/src/api/payments";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";
import { useT } from "@/src/i18n";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  photo_url: string;
  consultation_fee: number;
  clinic_name: string;
  online_consult: boolean;
}
interface Slot {
  id: string;
  date: string;
  time: string;
  is_booked: boolean;
}

const PAYMENTS = [
  { id: "esewa" as const, label: "eSewa", color: "#60BB46", icon: "wallet" as const, note: "Secure payment via eSewa", available: true },
  { id: "cash" as const, label: "Cash at clinic", color: "#0EA5E9", icon: "cash" as const, note: "Pay in person at the clinic", available: true },
  { id: "khalti" as const, label: "Khalti", color: "#5C2D91", icon: "wallet" as const, note: "Coming soon", available: false },
  { id: "card" as const, label: "Card", color: "#1F2937", icon: "card" as const, note: "Coming soon", available: false },
];
const RELATIONS = ["Self", "Spouse", "Child", "Parent", "Sibling", "Other"];
const GENDERS = ["Male", "Female", "Other"];

// Supplementary token not (yet) in the shared theme.
const INK = "#0F172A";
const SKELETON = "#ECECEF";

export default function Booking() {
  const { doctorId } = useLocalSearchParams<{ doctorId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const t = useT();

  const [doc, setDoc] = useState<Doctor | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [type, setType] = useState<"clinic" | "video">("clinic");
  const [payment, setPayment] = useState<"esewa" | "khalti" | "card" | "cash">("esewa");
  const [busy, setBusy] = useState(false);

  // Patient details
  const [relation, setRelation] = useState<string>("Self");
  const [pName, setPName] = useState<string>("");
  const [pAge, setPAge] = useState<string>("");
  const [pGender, setPGender] = useState<string>("");
  const [pSymptoms, setPSymptoms] = useState<string>("");
  const [pNotes, setPNotes] = useState<string>("");

  const loadDoctor = useCallback(async () => {
    setLoading(true);
    try {
      const [d, s] = await Promise.all([
        api.get<Doctor>(`/doctors/${doctorId}`),
        api.get<Slot[]>(`/doctors/${doctorId}/slots`),
      ]);
      setDoc(d);
      setSlots(s);
      const firstDate = s.find((x) => !x.is_booked)?.date;
      if (firstDate) setSelectedDate(firstDate);
      setError(false);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [doctorId]);

  useEffect(() => {
    loadDoctor();
  }, [loadDoctor]);

  useEffect(() => {
    if (relation === "Self" && user) {
      setPName(user.full_name);
    } else if (relation !== "Self") {
      // Clear prefill so user enters relative's info
      if (pName === user?.full_name) setPName("");
    }
  }, [relation, user]);

  // Skeleton shimmer for the loading state.
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

  const dates = useMemo(() => Array.from(new Set(slots.map((s) => s.date))), [slots]);
  const dateSlots = useMemo(() => slots.filter((s) => s.date === selectedDate), [slots, selectedDate]);

  const patientDetails = () => ({
    relation,
    full_name: pName.trim(),
    age: pAge ? parseInt(pAge, 10) : null,
    gender: pGender,
    symptoms: pSymptoms.trim(),
    notes: pNotes.trim(),
  });

  const validatePatient = (): string | null => {
    if (!pName.trim()) return "Please enter patient name";
    if (!pAge || isNaN(parseInt(pAge, 10)) || parseInt(pAge, 10) < 1 || parseInt(pAge, 10) > 120) return "Please enter a valid age";
    if (!pGender) return "Please select gender";
    return null;
  };

  const confirmBooking = async () => {
    if (!selectedSlot || !doc) return;
    setBusy(true);
    try {
      if (payment === "esewa") {
        const res = await payWithEsewa({
          use_case: "appointment",
          doctor_id: doc.id,
          slot_id: selectedSlot.id,
          consultation_type: type,
          patient_details: patientDetails(),
        });
        if (res.status === "success" && res.appointment_id) {
          router.replace({ pathname: "/ticket/[id]", params: { id: res.appointment_id } });
        } else if (res.status === "dismissed") {
          Alert.alert("Payment cancelled", "You can try again anytime.");
        } else {
          Alert.alert("Payment failed", "The eSewa transaction was not completed.");
        }
      } else if (payment === "cash") {
        const res = await api.post<{ id: string }>("/appointments", {
          doctor_id: doc.id,
          slot_id: selectedSlot.id,
          consultation_type: type,
          payment_method: payment,
          patient_details: patientDetails(),
        });
        router.replace({ pathname: "/ticket/[id]", params: { id: res.id } });
      } else {
        Alert.alert("Coming soon", `${payment.toUpperCase()} payment integration is on its way. Please use eSewa or Cash for now.`);
      }
    } catch (e: any) {
      Alert.alert("Booking failed", e?.detail || "Please try again");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
        <ScreenHeader title={t("book_appointment")} />
        <View style={{ padding: spacing.lg }}>
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Animated.View style={[styles.skeletonAvatar, { opacity: pulse }]} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Animated.View style={[styles.skeletonLine, { width: "55%", opacity: pulse }]} />
                <Animated.View style={[styles.skeletonLine, { width: "35%", marginTop: 8, opacity: pulse }]} />
              </View>
            </View>
          </Card>
          <Animated.View style={[styles.skeletonLine, { width: "40%", height: 16, marginTop: spacing.xl, opacity: pulse }]} />
          <View style={{ flexDirection: "row", gap: 10, marginTop: spacing.md }}>
            <Animated.View style={[styles.skeletonBlock, { opacity: pulse }]} />
            <Animated.View style={[styles.skeletonBlock, { opacity: pulse }]} />
            <Animated.View style={[styles.skeletonBlock, { opacity: pulse }]} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !doc) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
        <ScreenHeader title={t("book_appointment")} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl }}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={26} color={colors.primary} />
          </View>
          <Text style={{ fontWeight: "700", color: colors.text, marginTop: 14, fontSize: 15 }}>Couldn't load this doctor</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 4, textAlign: "center" }}>
            Check your connection and try again.
          </Text>
          <TouchableOpacity onPress={loadDoctor} style={styles.retryBtn} testID="booking-retry">
            <Text style={{ color: "#fff", fontWeight: "700" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScreenHeader title={t("book_appointment")} />
      <View style={styles.steps}>
        {[t("select_slot"), t("patient_details"), t("payment")].map((label, i) => (
          <View key={i} style={styles.stepItem}>
            <View style={[styles.stepDot, step >= i && styles.stepDotActive]}>
              {step > i ? (
                <Ionicons name="checkmark" size={13} color="#fff" />
              ) : (
                <Text style={styles.stepNum}>{i + 1}</Text>
              )}
            </View>
            <Text style={[styles.stepLbl, step === i && styles.stepLblActive]} numberOfLines={1}>
              {label}
            </Text>
            {i < 2 ? <View style={[styles.stepLine, step > i && styles.stepLineActive]} /> : null}
          </View>
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Image source={{ uri: doc.photo_url }} style={styles.docAvatar} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                <Text style={styles.docSpec} numberOfLines={1}>
                  {doc.specialty} · {doc.clinic_name}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 8 }}>
                  <Text style={styles.docFee}>Rs {doc.consultation_fee} consultation</Text>
                  {doc.online_consult && (
                    <View style={styles.videoTag}>
                      <Ionicons name="videocam" size={11} color={colors.info} />
                      <Text style={styles.videoTagText}>Video available</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </Card>

          {step === 0 && (
            <>
              <Text style={styles.h}>Consultation Type</Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity testID="type-clinic" onPress={() => setType("clinic")} style={[styles.typeBtn, type === "clinic" && styles.typeActive]}>
                  <Ionicons name="business-outline" size={20} color={type === "clinic" ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.typeTxt, type === "clinic" && { color: colors.primary }]}>Visit Clinic</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="type-video"
                  onPress={() => doc.online_consult && setType("video")}
                  disabled={!doc.online_consult}
                  style={[styles.typeBtn, type === "video" && styles.typeActive, !doc.online_consult && { opacity: 0.4 }]}
                >
                  <Ionicons name="videocam-outline" size={20} color={type === "video" ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.typeTxt, type === "video" && { color: colors.primary }]}>{t("video_call")}</Text>
                </TouchableOpacity>
              </View>

              {dates.length === 0 ? (
                <Card style={{ alignItems: "center", paddingVertical: spacing.lg, marginTop: spacing.xl }}>
                  <Ionicons name="calendar-outline" size={22} color={colors.textDisabled} />
                  <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No slots available right now</Text>
                </Card>
              ) : (
                <>
                  <Text style={styles.h}>Select Date</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 20 }}>
                    {dates.map((d) => {
                      const dt = new Date(d);
                      const day = dt.toLocaleDateString("en-US", { weekday: "short" });
                      const dayNum = dt.getDate();
                      const isActive = selectedDate === d;
                      return (
                        <TouchableOpacity
                          key={d}
                          testID={`date-${d}`}
                          onPress={() => {
                            setSelectedDate(d);
                            setSelectedSlot(null);
                          }}
                          style={[styles.dateBtn, isActive && styles.dateActive]}
                        >
                          <Text style={[styles.dateDay, isActive && { color: "#fff" }]}>{day}</Text>
                          <Text style={[styles.dateNum, isActive && { color: "#fff" }]}>{dayNum}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <Text style={styles.h}>Available Slots</Text>
                  <View style={styles.slotGrid}>
                    {dateSlots.map((s) => {
                      const disabled = s.is_booked;
                      const active = selectedSlot?.id === s.id;
                      return (
                        <TouchableOpacity
                          key={s.id}
                          testID={`slot-${s.id}`}
                          disabled={disabled}
                          onPress={() => setSelectedSlot(s)}
                          style={[styles.slot, disabled && styles.slotDisabled, active && styles.slotActive]}
                        >
                          <Text style={[styles.slotTxt, disabled && styles.slotTxtDisabled, active && { color: "#fff" }]}>
                            {s.time}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <Text style={styles.h}>Who is this appointment for?</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {RELATIONS.map((r) => (
                  <Chip key={r} label={r} active={relation === r} onPress={() => setRelation(r)} testID={`relation-${r}`} />
                ))}
              </View>

              <Text style={styles.h}>{t("patient_details")}</Text>
              <TextInput
                testID="patient-name"
                style={styles.input}
                value={pName}
                onChangeText={setPName}
                placeholder="Full name"
                placeholderTextColor={colors.textDisabled}
              />
              <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                <TextInput
                  testID="patient-age"
                  style={[styles.input, { width: 84 }]}
                  value={pAge}
                  onChangeText={setPAge}
                  placeholder="Age"
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {GENDERS.map((g) => (
                    <Chip key={g} label={g} active={pGender === g} onPress={() => setPGender(g)} testID={`gender-${g}`} />
                  ))}
                </View>
              </View>

              <Text style={styles.h}>What are the symptoms?</Text>
              <TextInput
                testID="patient-symptoms"
                style={[styles.input, { minHeight: 68, textAlignVertical: "top" }]}
                value={pSymptoms}
                onChangeText={setPSymptoms}
                placeholder="e.g. Fever for 3 days, headache, cough"
                placeholderTextColor={colors.textDisabled}
                multiline
              />

              <Text style={styles.h}>Additional notes (optional)</Text>
              <TextInput
                testID="patient-notes"
                style={[styles.input, { minHeight: 60, textAlignVertical: "top" }]}
                value={pNotes}
                onChangeText={setPNotes}
                placeholder="Allergies, current medications, etc."
                placeholderTextColor={colors.textDisabled}
                multiline
              />

              <View style={styles.infoBox}>
                <View style={styles.infoIconWrap}>
                  <Ionicons name="shield-checkmark" size={13} color={colors.info} />
                </View>
                <Text style={styles.infoTxt}>Details are shared only with your doctor for consultation.</Text>
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.h}>Appointment Summary</Text>
              <Card>
                <Row label="Patient" value={`${pName} (${relation})`} />
                <Row label="Age / Gender" value={`${pAge} / ${pGender}`} />
                <Row label="Type" value={type === "video" ? t("video_call") : t("clinic_visit")} />
                <Row label="Date" value={selectedDate!} />
                <Row label="Time" value={selectedSlot!.time} />
                <Row label="Clinic" value={doc.clinic_name} />
              </Card>

              <Text style={styles.h}>{t("payment")}</Text>
              <View style={{ gap: 10 }}>
                {PAYMENTS.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    testID={`payment-${p.id}`}
                    onPress={() => p.available && setPayment(p.id)}
                    disabled={!p.available}
                    activeOpacity={p.available ? 0.7 : 1}
                    style={[styles.payRow, payment === p.id && styles.payActive, !p.available && styles.payDisabled]}
                  >
                    <View style={[styles.payIcon, { backgroundColor: p.available ? p.color + "18" : colors.bgMuted }]}>
                      <Ionicons name={p.icon} size={20} color={p.available ? p.color : colors.textDisabled} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.payLbl, !p.available && { color: colors.textDisabled }]}>{p.label}</Text>
                      {p.available && <Text style={styles.payNote}>{p.note}</Text>}
                    </View>
                    {p.available ? (
                      <View style={[styles.radio, payment === p.id && { borderColor: colors.primary }]}>
                        {payment === p.id ? <View style={styles.radioDot} /> : null}
                      </View>
                    ) : (
                      <View style={styles.soonBadge}>
                        <Text style={styles.soonBadgeText}>Soon</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <Card style={{ marginTop: spacing.lg, backgroundColor: colors.primaryLight, borderColor: colors.primary + "33" }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: colors.textSecondary }}>Consultation Fee</Text>
                  <Text style={{ color: colors.text, fontWeight: "600" }}>Rs {doc.consultation_fee}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                  <Text style={{ color: colors.textSecondary }}>Platform Fee</Text>
                  <Text style={{ color: colors.text, fontWeight: "600" }}>Rs 30</Text>
                </View>
                <View style={{ height: 1, backgroundColor: colors.primary + "22", marginVertical: 10 }} />
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontWeight: "800", color: colors.text }}>Total</Text>
                  <Text style={{ fontWeight: "800", color: colors.primary, fontSize: 16 }}>Rs {doc.consultation_fee + 30}</Text>
                </View>
              </Card>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        {step === 0 && !selectedSlot && dates.length > 0 && (
          <Text style={styles.helperText}>Select a time slot to continue</Text>
        )}
        <View style={{ flexDirection: "row" }}>
          {step > 0 ? (
            <TouchableOpacity onPress={() => setStep((step - 1) as any)} style={styles.backBtn} testID="booking-back">
              <Text style={{ color: colors.text, fontWeight: "600" }}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          <View style={{ flex: 1, marginLeft: step > 0 ? 12 : 0 }}>
            <Button
              title={step === 2 ? (payment === "esewa" ? "Pay with eSewa" : payment === "cash" ? "Confirm Booking" : "Continue") : "Continue"}
              loading={busy}
              testID="booking-next"
              onPress={() => {
                if (step === 0) {
                  if (!selectedSlot) return Alert.alert("Please select a time slot");
                  setStep(1);
                } else if (step === 1) {
                  const err = validatePatient();
                  if (err) return Alert.alert("Missing", err);
                  setStep(2);
                } else {
                  confirmBooking();
                }
              }}
              icon={step === 2 ? (payment === "esewa" ? "wallet" : "shield-checkmark") : undefined}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
      <Text style={{ color: colors.textSecondary }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: bold ? "800" : "600", flex: 1, textAlign: "right", marginLeft: 12 }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  steps: {
    flexDirection: "row",
    padding: spacing.lg,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: INK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  stepItem: { flexDirection: "row", alignItems: "center", flex: 1 },
  stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.borderMedium, alignItems: "center", justifyContent: "center" },
  stepDotActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  stepNum: { color: "#fff", fontWeight: "700", fontSize: 12 },
  stepLbl: { marginLeft: 6, fontSize: 12, color: colors.textSecondary },
  stepLblActive: { color: colors.primary, fontWeight: "700" },
  stepLine: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.borderLight, marginHorizontal: 8 },
  stepLineActive: { backgroundColor: colors.primary },

  docAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: SKELETON },
  docName: { fontSize: 16, fontWeight: "700", color: colors.text },
  docSpec: { fontSize: 13, color: colors.primary, marginTop: 2 },
  docFee: { fontSize: 12, color: colors.textSecondary },
  videoTag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.infoLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  videoTagText: { fontSize: 10, fontWeight: "700", color: colors.info },

  h: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },

  typeBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    shadowColor: INK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  typeActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  typeTxt: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },

  dateBtn: {
    width: 60,
    borderRadius: radius.lg,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 12,
    alignItems: "center",
    shadowColor: INK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  dateActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateDay: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
  dateNum: { fontSize: 20, color: colors.text, fontWeight: "800", marginTop: 4 },

  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot: {
    width: "23%",
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  slotDisabled: { backgroundColor: colors.bgMuted, borderColor: colors.borderLight },
  slotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotTxt: { fontSize: 12, fontWeight: "600", color: colors.text },
  slotTxtDisabled: { color: colors.textDisabled, textDecorationLine: "line-through" },

  input: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  infoBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.infoLight, padding: 10, borderRadius: radius.md, marginTop: spacing.md, gap: 8 },
  infoIconWrap: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  infoTxt: { color: colors.info, fontSize: 12, flex: 1 },

  payRow: { flexDirection: "row", alignItems: "center", padding: spacing.md, backgroundColor: "#fff", borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.borderLight },
  payActive: { borderColor: colors.primary },
  payDisabled: { opacity: 0.7 },
  payIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  payLbl: { fontSize: 15, fontWeight: "700", color: colors.text },
  payNote: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderMedium, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  soonBadge: { backgroundColor: colors.bgMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  soonBadgeText: { fontSize: 11, fontWeight: "700", color: colors.textSecondary },

  footer: {
    padding: spacing.lg,
    backgroundColor: "#fff",
    shadowColor: INK,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 6,
  },
  helperText: { fontSize: 12, color: colors.textSecondary, textAlign: "center", marginBottom: 8 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight, alignItems: "center", justifyContent: "center" },

  errorIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  retryBtn: { marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.lg },

  skeletonAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: SKELETON },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: SKELETON },
  skeletonBlock: { flex: 1, height: 52, borderRadius: radius.lg, backgroundColor: SKELETON },
});