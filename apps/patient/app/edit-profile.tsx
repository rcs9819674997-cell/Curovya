import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Input from "@/src/components/Input";
import Button from "@/src/components/Button";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

export default function EditProfile() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    
    if (!fullName.trim()) {
      return setError("Full name is required");
    }
    
    if (!phone.trim()) {
      return setError("Phone number is required");
    }

    setLoading(true);
    try {
      await api.put("/auth/me", {
        full_name: fullName.trim(),
        phone: phone.trim(),
      });
      await refresh();
      Alert.alert("Success", "Profile updated successfully", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (e: any) {
      setError(e?.detail || "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgApp }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(fullName || user?.full_name || "U").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity style={styles.changeAvatarBtn}>
            <Ionicons name="camera-outline" size={18} color={colors.primary} />
            <Text style={styles.changeAvatarText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Input
            label="Full Name"
            icon="person-outline"
            placeholder="Enter your full name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />

          <Input
            label="Email"
            icon="mail-outline"
            placeholder="your@email.com"
            value={user?.email || ""}
            editable={false}
            style={{ backgroundColor: colors.bgMuted }}
          />

          <Input
            label="Phone Number"
            icon="call-outline"
            placeholder="+977 98XXXXXXXX"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Input
            label="Role"
            icon="briefcase-outline"
            value={user?.role || "patient"}
            editable={false}
            style={{ backgroundColor: colors.bgMuted }}
          />
        </View>

        <Button title="Save Changes" onPress={handleSave} loading={loading} style={{ marginTop: spacing.lg }} />
        
        <TouchableOpacity 
          onPress={() => router.push("/change-password")}
          style={{ alignItems: "center", marginTop: spacing.md }}
        >
          <Text style={styles.changePasswordText}>Change Password</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
  },
  changeAvatarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  changeAvatarText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.errorLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    color: colors.error,
    fontSize: 13,
    fontWeight: "600",
  },
  form: {
    marginBottom: spacing.lg,
  },
  changePasswordText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 14,
  },
});
