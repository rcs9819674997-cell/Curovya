import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "@/src/components/ScreenHeader";
import Input from "@/src/components/Input";
import Button from "@/src/components/Button";
import { api, ApiError } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  photo_url: string;
  rating: number;
  review_count: number;
}

interface MyReview {
  id?: string;
  rating?: number;
  comment?: string;
}

const PROMPTS = [
  "How was your consultation experience?",
  "Was the doctor attentive to your concerns?",
  "Would you recommend to family & friends?",
];

export default function ReviewSubmit() {
  const router = useRouter();
  const { doctorId, appointmentId } = useLocalSearchParams<{ doctorId: string; appointmentId?: string }>();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [existing, setExisting] = useState<MyReview | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [d, mine] = await Promise.all([
          api.get<Doctor>(`/doctors/${doctorId}`),
          api.get<MyReview>(`/doctors/${doctorId}/my-review`),
        ]);
        setDoctor(d);
        if (mine && mine.rating) {
          setExisting(mine);
          setRating(mine.rating);
          setComment(mine.comment || "");
        }
      } catch (e) {
        if (e instanceof ApiError) Alert.alert("Error", e.detail);
      } finally {
        setLoading(false);
      }
    })();
  }, [doctorId]);

  const submit = async () => {
    setError(null);
    if (rating < 1) { setError("Please tap a star to rate"); return; }
    setSaving(true);
    try {
      await api.post(`/doctors/${doctorId}/reviews`, {
        rating,
        comment: comment.trim(),
        appointment_id: appointmentId || null,
      });
      Alert.alert(
        existing ? "Review Updated" : "Thank You!",
        existing ? "Your review has been updated." : "Your feedback helps other patients make informed choices.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (e) {
      if (e instanceof ApiError) setError(e.detail);
      else setError("Failed to submit review");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
        <ScreenHeader title="Rate Doctor" />
        <Text style={{ textAlign: "center", marginTop: 40, color: colors.textSecondary }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];
  const ratingColors = ["", "#EF4444", "#F59E0B", "#F59E0B", "#10B981", "#10B981"];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScreenHeader title={existing ? "Update Review" : "Rate Doctor"} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          {doctor ? (
            <View style={styles.docCard}>
              <Image source={{ uri: doctor.photo_url }} style={styles.avatar} />
              <Text style={styles.docName}>{doctor.name}</Text>
              <Text style={styles.docSpec}>{doctor.specialty}</Text>
              <View style={styles.currentRating}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.currentRatingTxt}>{doctor.rating.toFixed(1)} · {doctor.review_count} reviews</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.rateBox}>
            <Text style={styles.rateLbl}>Your Rating</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setRating(s)}
                  style={styles.star}
                  testID={`star-${s}`}
                  activeOpacity={0.6}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Ionicons name={s <= rating ? "star" : "star-outline"} size={40} color={s <= rating ? "#F59E0B" : "#CBD5E1"} />
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 ? (
              <Text style={[styles.ratingLabel, { color: ratingColors[rating] }]}>{ratingLabels[rating]}</Text>
            ) : (
              <Text style={styles.ratingHint}>Tap to rate</Text>
            )}
          </View>

          <View style={styles.prompt}>
            <Ionicons name="chatbubble-ellipses" size={16} color={colors.info} />
            <Text style={styles.promptTxt}>{PROMPTS[Math.max(0, rating - 3)] || PROMPTS[0]}</Text>
          </View>

          <Input
            label="Your Review (optional)"
            placeholder="Share your experience to help other patients..."
            value={comment}
            onChangeText={setComment}
            multiline
            style={{ minHeight: 100, textAlignVertical: "top" }}
            testID="review-comment"
          />

          <View style={styles.disclosure}>
            <Ionicons name="shield-checkmark" size={16} color="#10B981" />
            <Text style={styles.disclosureTxt}>
              Reviews are verified from your consultation history and shown with your first name.
            </Text>
          </View>

          {error ? (
            <View style={styles.errBox}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={{ color: colors.error, marginLeft: 6, flex: 1 }}>{error}</Text>
            </View>
          ) : null}

          <View style={{ height: spacing.md }} />
          <Button
            title={existing ? "Update Review" : "Submit Review"}
            onPress={submit}
            loading={saving}
            icon={existing ? "refresh" : "send"}
            testID="submit-review"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  docCard: { alignItems: "center", padding: spacing.lg, backgroundColor: "#fff", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderLight, marginBottom: spacing.md },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.bgMuted, marginBottom: 10 },
  docName: { fontSize: 17, fontWeight: "800", color: colors.text },
  docSpec: { fontSize: 13, color: colors.primary, marginTop: 2 },
  currentRating: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  currentRatingTxt: { fontSize: 12, color: colors.textSecondary, fontWeight: "600" },

  rateBox: { alignItems: "center", padding: spacing.xl, backgroundColor: "#fff", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderLight, marginBottom: spacing.md },
  rateLbl: { fontSize: 12, color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
  stars: { flexDirection: "row", gap: 4 },
  star: { padding: 2 },
  ratingLabel: { fontSize: 18, fontWeight: "800", marginTop: 8 },
  ratingHint: { fontSize: 13, color: colors.textDisabled, marginTop: 8 },

  prompt: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.infoLight, padding: 12, borderRadius: radius.md, marginBottom: spacing.md },
  promptTxt: { color: colors.info, fontSize: 13, flex: 1, fontWeight: "600" },

  disclosure: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.successLight, padding: 12, borderRadius: radius.md, marginTop: spacing.md },
  disclosureTxt: { color: "#065F46", fontSize: 12, flex: 1, lineHeight: 17 },

  errBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.errorLight, padding: 10, borderRadius: radius.md, marginTop: spacing.md },
});
