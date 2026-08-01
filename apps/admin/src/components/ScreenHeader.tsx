import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, spacing } from "@/src/theme";

export default function ScreenHeader({
  title,
  back = true,
  right,
}: {
  title: string;
  back?: boolean;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top - 15 }]}>
      <View style={styles.row}>
        {back ? (
          <TouchableOpacity
            testID="header-back-button"
            onPress={() => router.back()}
            style={styles.iconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={styles.right}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: "#fff",
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.md,

  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 6,
  },
  zIndex: 100,
  shadowOpacity: 0.06,
  shadowRadius: 12,

  elevation: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.bgMuted },
  title: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: colors.text },
  right: { minWidth: 40, alignItems: "flex-end" },
});
