import { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { storage } from "@/src/utils/storage";
import { colors } from "@/src/theme";

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    (async () => {
      const seen = await storage.getItem("hd_onboarded", false);
      // brief splash pause for polish
      setTimeout(() => {
        if (!seen) router.replace("/onboarding");
        else if (user?.role === "doctor") router.replace("/(doctor)");
        else if (user?.role === "clinic_admin" || user?.role === "receptionist") router.replace("/(clinic)");
        else if (user) router.replace("/(tabs)");
        else router.replace("/(auth)/login");
      }, 700);
    })();
  }, [loading, user, router]);

  return (
    <LinearGradient colors={["#DC143C", "#9B0E2A"]} style={styles.wrap}>
      <View style={styles.logo} testID="splash-logo">
        <Ionicons name="medkit" size={64} color="#fff" />
      </View>
      <Text style={styles.brand}>HamroDoctor</Text>
      <Text style={styles.tag}>Your health, one tap away</Text>
      <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  logo: { width: 108, height: 108, borderRadius: 30, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  brand: { color: "#fff", fontSize: 32, fontWeight: "800", letterSpacing: 0.5 },
  tag: { color: "rgba(255,255,255,0.85)", marginTop: 8, fontSize: 14 },
});
