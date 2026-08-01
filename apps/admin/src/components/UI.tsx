import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, shadow, spacing } from "@/src/theme";

export function Card({
  children,
  style,
  onPress,
  testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  testID?: string;
}) {
  const content = <View style={[styles.card, style]}>{children}</View>;
  if (onPress) {
    return (
      <TouchableOpacity testID={testID} onPress={onPress} activeOpacity={0.85}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

export function Chip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
    >
      <Text
        numberOfLines={1}
        style={[styles.chipText, active ? { color: "#fff" } : { color: colors.textSecondary }]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function Badge({ label, tone = "info" }: { label: string; tone?: "success" | "warning" | "info" | "error" }) {
  const map = {
    success: { bg: colors.successLight, fg: colors.success },
    warning: { bg: colors.warningLight, fg: colors.warning },
    info: { bg: colors.infoLight, fg: colors.info },
    error: { bg: colors.errorLight, fg: colors.error },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: map.bg }]}>
      <Text style={[styles.badgeText, { color: map.fg }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow.card,
  },
  chip: {
    height: 36,
    borderRadius: 999,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.primary, borderWidth: 0 },
  chipInactive: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.borderLight },
  chipText: { fontSize: 13, fontWeight: "600" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
});
