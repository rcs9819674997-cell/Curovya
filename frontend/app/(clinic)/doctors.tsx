import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/src/components/UI";
import { api, ApiError } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

interface CDoc {
  id: string;
  name: string;
  specialty: string;
  photo_url: string;
  qualification: string;
  experience_years: number;
  consultation_fee: number;
  rating: number;
  review_count: number;
  today_count: number;
  languages: string[];
}

export default function ClinicDoctors() {
  const router = useRouter();
  const { user } = useAuth();
  const [docs, setDocs] = useState<CDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.clinic_id) return;
    try {
      const d = await api.get<CDoc[]>(`/clinic/${user.clinic_id}/doctors`);
      setDocs(d);
    } catch (e) {
      if (e instanceof ApiError) Alert.alert("Error", e.detail);
    }
  }, [user?.clinic_id]);

  useFocusEffect(useCallback(() => { setLoading(true); load().then(() => setLoading(false)); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <View style={styles.head}>
        <Text style={styles.h1}>Our Doctors</Text>
        <View style={styles.count}>
          <Text style={styles.countTxt}>{docs.length}</Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          <Text style={{ textAlign: "center", color: colors.textSecondary, marginTop: 20 }}>Loading...</Text>
        ) : docs.length === 0 ? (
          <Card style={{ alignItems: "center", padding: 32 }}>
            <Ionicons name="medkit-outline" size={40} color={colors.textDisabled} />
            <Text style={{ marginTop: 8, color: colors.textSecondary }}>No doctors attached</Text>
          </Card>
        ) : (
          docs.map((d) => (
            <Card key={d.id} style={{ marginBottom: 12 }} testID={`doc-${d.id}`}>
              <View style={{ flexDirection: "row" }}>
                <Image source={{ uri: d.photo_url }} style={styles.avatar} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.name}>{d.name}</Text>
                  <Text style={styles.spec}>{d.specialty}</Text>
                  <Text style={styles.qual}>{d.qualification} · {d.experience_years}yr exp</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    <View style={styles.meta}>
                      <Ionicons name="star" size={11} color="#F59E0B" />
                      <Text style={styles.metaTxt}>{d.rating.toFixed(1)} ({d.review_count})</Text>
                    </View>
                    <View style={styles.meta}>
                      <Ionicons name="cash" size={11} color={colors.textSecondary} />
                      <Text style={styles.metaTxt}>Rs. {d.consultation_fee}</Text>
                    </View>
                    <View style={styles.today}>
                      <Text style={styles.todayNum}>{d.today_count}</Text>
                      <Text style={styles.todayLbl}>today</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actBtn}
                  onPress={() => router.push({ pathname: "/(clinic)/appointments", params: { doctor_id: d.id } })}
                  testID={`doc-appts-${d.id}`}
                >
                  <Ionicons name="calendar" size={14} color={colors.primary} />
                  <Text style={styles.actTxt}>View Appointments</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actBtn}
                  onPress={() => router.push({ pathname: "/clinic-walkin", params: { doctor_id: d.id } })}
                  testID={`doc-walkin-${d.id}`}
                >
                  <Ionicons name="person-add" size={14} color="#16A34A" />
                  <Text style={[styles.actTxt, { color: "#16A34A" }]}>Walk-in</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  h1: { fontSize: 22, fontWeight: "800", color: colors.text },
  count: { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  countTxt: { color: "#fff", fontSize: 12, fontWeight: "800" },
  avatar: { width: 66, height: 66, borderRadius: 33, backgroundColor: colors.bgMuted },
  name: { fontSize: 16, fontWeight: "800", color: colors.text },
  spec: { fontSize: 13, color: colors.primary, marginTop: 1 },
  qual: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  meta: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaTxt: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
  today: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  todayNum: { color: colors.primary, fontSize: 11, fontWeight: "800" },
  todayLbl: { color: colors.primary, fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  actions: { flexDirection: "row", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderLight, gap: 4 },
  actBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.bgMuted },
  actTxt: { fontSize: 12, fontWeight: "700", color: colors.primary },
});
