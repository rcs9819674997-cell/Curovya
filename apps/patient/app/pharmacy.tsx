import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "@/src/components/ScreenHeader";
import { Card, Badge } from "@/src/components/UI";
import Button from "@/src/components/Button";
import { colors, radius, spacing } from "@/src/theme";

const CATEGORIES = [
  { icon: "medical-outline" as const, label: "Fever & Pain", color: "#EF4444" },
  { icon: "leaf-outline" as const, label: "Vitamins", color: "#10B981" },
  { icon: "heart-outline" as const, label: "Heart Care", color: "#EC4899" },
  { icon: "eye-outline" as const, label: "Eye Care", color: "#3B82F6" },
];

const POPULAR = [
  { name: "Paracetamol 500mg", price: 25, mfr: "Cipla" },
  { name: "Vitamin C 500mg", price: 120, mfr: "Nature's Bounty" },
  { name: "ORS Sachet", price: 15, mfr: "Electral" },
  { name: "Cetirizine 10mg", price: 35, mfr: "Sun Pharma" },
];

export default function Pharmacy() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScreenHeader title="Pharmacy" right={<Ionicons name="cart-outline" size={22} color={colors.text} />} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        <TouchableOpacity onPress={() => Alert.alert("Upload prescription", "Feature coming soon")} testID="upload-rx">
          <View style={styles.uploadBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.uploadTitle}>Upload Prescription</Text>
              <Text style={styles.uploadSub}>Get medicines delivered to your door</Text>
              <View style={styles.uploadBtn}>
                <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                <Text style={{ color: "#fff", marginLeft: 6, fontWeight: "700" }}>Upload</Text>
              </View>
            </View>
            <Ionicons name="document-text" size={64} color="rgba(255,255,255,0.35)" />
          </View>
        </TouchableOpacity>

        <Text style={styles.h}>Categories</Text>
        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity key={c.label} style={styles.cat} testID={`cat-${c.label}`}>
              <View style={[styles.catIcon, { backgroundColor: c.color + "22" }]}>
                <Ionicons name={c.icon} size={22} color={c.color} />
              </View>
              <Text style={styles.catTxt}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.h}>Popular Medicines</Text>
        {POPULAR.map((m) => (
          <Card key={m.name} style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={styles.medIcon}>
                <Ionicons name="medical" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.medName}>{m.name}</Text>
                <Text style={styles.mfr}>{m.mfr}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.medPrice}>Rs {m.price}</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => Alert.alert("Added to cart")}>
                  <Ionicons name="add" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        ))}

        <View style={styles.info}>
          <Ionicons name="information-circle-outline" size={16} color={colors.info} />
          <Text style={styles.infoTxt}>Cash on delivery available across Janakpurdham</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  uploadBanner: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.xxl, padding: spacing.xl, overflow: "hidden" },
  uploadTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  uploadSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 4 },
  uploadBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, alignSelf: "flex-start", marginTop: 12 },
  h: { fontSize: 17, fontWeight: "700", color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  cat: { alignItems: "center", flex: 1, minWidth: "22%" },
  catIcon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  catTxt: { fontSize: 11, textAlign: "center", color: colors.text, fontWeight: "600" },
  medIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  medName: { fontSize: 14, fontWeight: "700", color: colors.text },
  mfr: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  medPrice: { fontSize: 15, fontWeight: "800", color: colors.primary },
  addBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", marginTop: 6 },
  info: { flexDirection: "row", alignItems: "center", backgroundColor: colors.infoLight, padding: 12, borderRadius: radius.md, marginTop: spacing.lg, gap: 8 },
  infoTxt: { color: colors.info, fontSize: 12, flex: 1 },
});
