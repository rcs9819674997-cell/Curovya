import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/src/components/UI";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

interface Emergency {
  id: string; name: string; type: string; phone: string; address: string; distance_km: number;
}

export default function EmergencyScreen() {
  const [data, setData] = useState<Emergency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<Emergency[]>("/emergency/contacts");
        setData(r);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const call = async (phone: string) => {
    const url = `tel:${phone}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) Linking.openURL(url);
    else Alert.alert("Cannot make call", `Please dial ${phone}`);
  };

  const hospitals = data.filter((d) => d.type === "hospital");
  const ambulances = data.filter((d) => d.type === "ambulance");
  const bloodBanks = data.filter((d) => d.type === "blood_bank");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        <Text style={styles.title}>Emergency</Text>
        <Text style={styles.sub}>One-tap access to critical help in Janakpurdham</Text>

        <TouchableOpacity
          testID="emergency-call-ambulance"
          activeOpacity={0.9}
          onPress={() => ambulances[0] && call(ambulances[0].phone)}
          style={{ marginTop: spacing.lg }}
        >
          <LinearGradient colors={["#DC143C", "#B31133"]} style={styles.callBig}>
            <Ionicons name="call" size={30} color="#fff" />
            <Text style={styles.callBigTxt}>Call Ambulance Now</Text>
            <Text style={styles.callBigSub}>Nepal Emergency: 102</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.quickRow}>
          <TouchableOpacity
            testID="emergency-blood-bank"
            style={styles.quickBtn}
            onPress={() => bloodBanks[0] && call(bloodBanks[0].phone)}
          >
            <View style={[styles.quickIcon, { backgroundColor: "#FEE2E2" }]}>
              <Ionicons name="water" size={22} color={colors.error} />
            </View>
            <Text style={styles.quickTxt}>Blood Bank</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="emergency-police" style={styles.quickBtn} onPress={() => call("100")}>
            <View style={[styles.quickIcon, { backgroundColor: "#DBEAFE" }]}>
              <Ionicons name="shield" size={22} color={colors.info} />
            </View>
            <Text style={styles.quickTxt}>Police (100)</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="emergency-fire" style={styles.quickBtn} onPress={() => call("101")}>
            <View style={[styles.quickIcon, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="flame" size={22} color={colors.warning} />
            </View>
            <Text style={styles.quickTxt}>Fire (101)</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>Nearby Hospitals</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          hospitals.map((h) => (
            <Card key={h.id} style={{ marginBottom: spacing.md }} testID={`hospital-${h.id}`}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.hosIcon}>
                  <Ionicons name="medkit" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.hName}>{h.name}</Text>
                  <Text style={styles.hAddr}>{h.address}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 4 }}>
                    <Ionicons name="location" size={12} color={colors.textSecondary} />
                    <Text style={styles.hMeta}>{h.distance_km} km away</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => call(h.phone)} style={styles.callBtn} testID={`call-${h.id}`}>
                  <Ionicons name="call" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}

        <Text style={styles.section}>Blood Banks</Text>
        {bloodBanks.map((h) => (
          <Card key={h.id} style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={[styles.hosIcon, { backgroundColor: colors.errorLight }]}>
                <Ionicons name="water" size={22} color={colors.error} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.hName}>{h.name}</Text>
                <Text style={styles.hAddr}>{h.address}</Text>
              </View>
              <TouchableOpacity onPress={() => call(h.phone)} style={styles.callBtn}>
                <Ionicons name="call" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "800", color: colors.text },
  sub: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  callBig: { padding: spacing.xl, borderRadius: radius.xxl, alignItems: "center", justifyContent: "center", shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  callBigTxt: { color: "#fff", fontSize: 20, fontWeight: "800", marginTop: 8 },
  callBigSub: { color: "rgba(255,255,255,0.85)", marginTop: 2 },
  quickRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xl, gap: 12 },
  quickBtn: { flex: 1, backgroundColor: "#fff", borderRadius: radius.xl, padding: spacing.md, alignItems: "center", borderWidth: 1, borderColor: colors.borderLight },
  quickIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  quickTxt: { fontSize: 12, fontWeight: "600", color: colors.text, textAlign: "center" },
  section: { fontSize: 17, fontWeight: "700", color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  hosIcon: { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  hName: { fontSize: 15, fontWeight: "700", color: colors.text },
  hAddr: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  hMeta: { fontSize: 11, color: colors.textSecondary },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
});
