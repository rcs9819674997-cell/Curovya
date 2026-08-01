import React from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";

interface Props extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string | null;
  rightIcon?: React.ReactNode;
}

export default function Input({ label, icon, error, rightIcon, style, testID, ...rest }: Props) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.box, error && { borderColor: colors.error }]}>
        {icon ? <Ionicons name={icon} size={18} color={colors.textSecondary} style={{ marginRight: 8 }} /> : null}
        <TextInput
          testID={testID}
          placeholderTextColor={colors.textDisabled}
          style={[styles.input, style]}
          {...rest}
        />
        {rightIcon}
      </View>
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 6 },
  box: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: "#fff",
    paddingHorizontal: spacing.md,
  },
  input: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 12 },
  err: { color: colors.error, fontSize: 12, marginTop: 4 },
});
