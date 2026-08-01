import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card, Badge } from "@/src/components/UI";
import Input from "@/src/components/Input";
import Button from "@/src/components/Button";
import { api, ApiError } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

interface Staff {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  created_at: string;
}

export default function ClinicStaff() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.clinic_id) return;
    try {
      const r = await api.get<Staff[]>(`/clinic/${user.clinic_id}/staff`);
      setStaff(r);
    } catch (e) {
      if (e instanceof ApiError) Alert.alert("Error", e.detail);
    }
  }, [user?.clinic_id]);

  useFocusEffect(useCallback(() => { setLoading(true); load().then(() => setLoading(false)); }, [load]));

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const remove = useCallback((s: Staff) => {
    Alert.alert(
      "Remove Staff",
      `Remove ${s.full_name} from your team?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await api.del(`/clinic/${user!.clinic_id}/staff/${s.id}`);
              await load();
            } catch (e) {
              if (e instanceof ApiError) Alert.alert("Error", e.detail);
            }
          },
        },
      ],
    );
  }, [user?.clinic_id, load]);

  const submit = useCallback(async () => {
    setError(null);
    if (!name.trim() || !email.includes("@") || phone.length < 7 || password.length < 6) {
      setError("Fill all fields. Password min 6 chars.");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/clinic/${user!.clinic_id}/staff`, {
        full_name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
      });
      setModalOpen(false);
      setName(""); setEmail(""); setPhone(""); setPassword("");
      await load();
    } catch (e) {
      if (e instanceof ApiError) setError(e.detail);
      else setError("Failed to add staff");
    } finally {
      setSaving(false);
    }
  }, [name, email, phone, password, user?.clinic_id, load]);

  const renderItem = useCallback(({ item: s }: { item: Staff }) => {
    const initials = s.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    return (
      <Card style={{ marginBottom: 12 }} testID={`staff-${s.id}`}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={styles.avatar}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{initials}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Text style={styles.name}>{s.full_name}</Text>
              <Badge label="Receptionist" tone="info" />
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
              <View style={styles.meta}>
                <Ionicons name="mail" size={11} color={colors.textSecondary} />
                <Text style={styles.metaTxt}>{s.email}</Text>
              </View>
              <View style={styles.meta}>
                <Ionicons name="call" size={11} color={colors.textSecondary} />
                <Text style={styles.metaTxt}>{s.phone}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={() => remove(s)} style={styles.trash} testID={`remove-staff-${s.id}`}>
            <Ionicons name="trash-outline" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </Card>
    );
  }, [remove]);

  const keyExtractor = useCallback((item: Staff) => item.id, []);

  const listHeader = useCallback(() => (
    <View style={styles.tipBanner}>
      <Ionicons name="information-circle" size={18} color={colors.info} />
      <Text style={styles.tipTxt}>Receptionists can manage walk-ins, queue, and appointments but cannot access revenue or add other staff.</Text>
    </View>
  ), []);

  const listEmpty = useCallback(() => (
    <Card style={{ alignItems: "center", padding: 32 }}>
      <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="person-add" size={28} color={colors.primary} />
      </View>
      <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 12 }}>No staff yet</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 4, textAlign: "center" }}>Add receptionists to help manage the front desk</Text>
    </Card>
  ), []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <View style={styles.head}>
        <View>
          <Text style={styles.h1}>Reception Staff</Text>
          <Text style={styles.sub}>{staff.length} staff member{staff.length === 1 ? "" : "s"}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalOpen(true)} testID="add-staff">
          <Ionicons name="person-add" size={16} color="#fff" />
          <Text style={styles.addBtnTxt}>Add Staff</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={staff}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={loading ? null : listEmpty}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        initialNumToRender={10}
        removeClippedSubviews
      />

      {/* Add Staff Modal */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: "100%" }}>
            <View style={styles.sheet}>
              <View style={styles.grabber} />
              <Text style={styles.modalTitle}>Add Receptionist</Text>
              <Text style={styles.modalSub}>Create an account for a new front-desk staff member</Text>

              <Input label="Full Name *" placeholder="e.g. Ram Kumar" value={name} onChangeText={setName} icon="person-outline" testID="staff-name" />
              <Input label="Email *" placeholder="staff@clinic.np" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" icon="mail-outline" testID="staff-email" />
              <Input label="Phone *" placeholder="+977 98" value={phone} onChangeText={setPhone} keyboardType="phone-pad" icon="call-outline" testID="staff-phone" />
              <Input label="Password *" placeholder="Min 6 characters" value={password} onChangeText={setPassword} secureTextEntry icon="lock-closed-outline" testID="staff-password" />

              {error ? (
                <View style={styles.errBox}>
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
                  <Text style={{ color: colors.error, marginLeft: 6, flex: 1, fontSize: 12 }}>{error}</Text>
                </View>
              ) : null}

              <View style={{ flexDirection: "row", gap: 8, marginTop: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Button title="Cancel" variant="ghost" onPress={() => setModalOpen(false)} />
                </View>
                <View style={{ flex: 2 }}>
                  <Button title="Add Staff" onPress={submit} loading={saving} icon="checkmark" testID="submit-staff" />
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 4 },
  h1: { fontSize: 22, fontWeight: "800", color: colors.text },
  sub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  addBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 12 },

  tipBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: colors.infoLight, padding: 12, borderRadius: radius.md, marginBottom: 12 },
  tipTxt: { color: colors.info, fontSize: 12, flex: 1, lineHeight: 17 },

  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaTxt: { fontSize: 11, color: colors.textSecondary },
  trash: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.errorLight, alignItems: "center", justifyContent: "center" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", padding: spacing.lg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: spacing.xl },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderLight, marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  modalSub: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md },
  errBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.errorLight, padding: 8, borderRadius: radius.md, marginTop: 4 },
});
