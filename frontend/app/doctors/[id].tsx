import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "@/src/components/ScreenHeader";
import { Card, Badge } from "@/src/components/UI";
import Button from "@/src/components/Button";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

interface Doctor {
  id: string; name: string; specialty: string; qualification: string; experience_years: number;
  languages: string[]; clinic_name: string; clinic_address: string; consultation_fee: number;
  rating: number; review_count: number; online_consult: boolean; photo_url: string; about: string;
}
interface Review { id: string; patient_name: string; rating: number; comment: string; created_at: string; }

export default function DoctorProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<Doctor | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [tab, setTab] = useState<"about" | "reviews">("about");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [d, r] = await Promise.all([
          api.get<Doctor>(`/doctors/${id}`),
          api.get<Review[]>(`/doctors/${id}/reviews`),
        ]);
        setDoc(d);
        setReviews(r);
      } catch {}
      setLoading(false);
    })();
  }, [id]);

  if (loading || !doc) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
        <ScreenHeader title="Doctor" />
        <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScreenHeader title="Doctor Profile" right={<Ionicons name="heart-outline" size={22} color={colors.text} />} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <Card style={{ alignItems: "center" }}>
          <Image source={{ uri: doc.photo_url }} style={styles.photo} />
          <Text style={styles.name}>{doc.name}</Text>
          <Text style={styles.spec}>{doc.specialty}</Text>
          <Text style={styles.qual}>{doc.qualification}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{doc.experience_years}+</Text>
              <Text style={styles.statLbl}>Years Exp</Text>
            </View>
            <View style={styles.stat}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.statVal}>{doc.rating.toFixed(1)}</Text>
              </View>
              <Text style={styles.statLbl}>{doc.review_count} reviews</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statVal}>Rs {doc.consultation_fee}</Text>
              <Text style={styles.statLbl}>Consult Fee</Text>
            </View>
          </View>
        </Card>

        <View style={styles.tabs}>
          <TouchableOpacity onPress={() => setTab("about")} style={[styles.tab, tab === "about" && styles.tabActive]} testID="tab-about">
            <Text style={[styles.tabTxt, tab === "about" && styles.tabTxtActive]}>About</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab("reviews")} style={[styles.tab, tab === "reviews" && styles.tabActive]} testID="tab-reviews">
            <Text style={[styles.tabTxt, tab === "reviews" && styles.tabTxtActive]}>Reviews ({reviews.length})</Text>
          </TouchableOpacity>
        </View>

        {tab === "about" ? (
          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.section}>About</Text>
            <Text style={styles.about}>{doc.about}</Text>
            <View style={{ height: 12 }} />
            <View style={styles.metaRow}>
              <Ionicons name="business-outline" size={16} color={colors.textSecondary} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={styles.metaLbl}>{doc.clinic_name}</Text>
                <Text style={styles.metaVal}>{doc.clinic_address}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="chatbubbles-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.metaVal, { marginLeft: 8 }]}>Languages: {doc.languages.join(", ")}</Text>
            </View>
            {doc.online_consult ? (
              <View style={{ marginTop: 8, alignSelf: "flex-start" }}>
                <Badge label="Video Consult Available" tone="info" />
              </View>
            ) : null}
          </Card>
        ) : reviews.length === 0 ? (
          <View>
            <Card style={{ marginTop: spacing.md, alignItems: "center", paddingVertical: 20 }}>
              <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.textDisabled} />
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No reviews yet</Text>
              <Text style={{ color: colors.textDisabled, fontSize: 12, marginTop: 4 }}>Be the first to share your experience</Text>
            </Card>
            <TouchableOpacity
              style={styles.writeReviewBtn}
              onPress={() => router.push({ pathname: "/review/[doctorId]", params: { doctorId: doc.id } })}
              testID="write-review-empty"
            >
              <Ionicons name="star" size={16} color={colors.primary} />
              <Text style={styles.writeReviewTxt}>Write a Review</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.writeReviewBtn}
              onPress={() => router.push({ pathname: "/review/[doctorId]", params: { doctorId: doc.id } })}
              testID="write-review"
            >
              <Ionicons name="star" size={16} color={colors.primary} />
              <Text style={styles.writeReviewTxt}>Write a Review</Text>
            </TouchableOpacity>
            {reviews.map((r) => (
              <Card key={r.id} style={{ marginTop: spacing.md }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={styles.rname}>{r.patient_name}</Text>
                  <View style={{ flexDirection: "row" }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Ionicons key={i} name={i < r.rating ? "star" : "star-outline"} size={13} color="#F59E0B" />
                    ))}
                  </View>
                </View>
                <Text style={styles.rcom}>{r.comment}</Text>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <Button
          title={`Book Appointment • Rs ${doc.consultation_fee}`}
          onPress={() => router.push({ pathname: "/booking/[doctorId]", params: { doctorId: doc.id } })}
          icon="calendar"
          testID="book-appointment-cta"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  photo: { width: 96, height: 96, borderRadius: 48, marginBottom: 12 },
  name: { fontSize: 20, fontWeight: "800", color: colors.text },
  spec: { fontSize: 14, color: colors.primary, fontWeight: "600", marginTop: 4 },
  qual: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: "row", marginTop: spacing.md, width: "100%", justifyContent: "space-around", paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderLight },
  stat: { alignItems: "center" },
  statVal: { fontSize: 15, fontWeight: "800", color: colors.text },
  statLbl: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  tabs: { flexDirection: "row", marginTop: spacing.lg, backgroundColor: "#fff", borderRadius: radius.pill, padding: 4, borderWidth: 1, borderColor: colors.borderLight },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 999 },
  tabActive: { backgroundColor: colors.primary },
  tabTxt: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  tabTxtActive: { color: "#fff" },
  section: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 6 },
  about: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  metaRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 10 },
  metaLbl: { fontSize: 13, fontWeight: "600", color: colors.text },
  metaVal: { fontSize: 12, color: colors.textSecondary, marginTop: 2, flex: 1 },
  rname: { fontSize: 14, fontWeight: "700", color: colors.text },
  rcom: { fontSize: 13, color: colors.textSecondary, marginTop: 6, lineHeight: 20 },
  writeReviewBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: spacing.md, padding: 12, borderWidth: 1.5, borderColor: colors.primary, borderStyle: "dashed", borderRadius: radius.lg },
  writeReviewTxt: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.lg, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.borderLight },
});
