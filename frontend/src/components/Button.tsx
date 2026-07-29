import { ActivityIndicator, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";

interface Props {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "emergency";
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  testID?: string;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  testID,
  fullWidth = true,
  style,
}: Props) {

  const isEmergency = variant === "emergency";
  const isSecondary = variant === "secondary";
  const isGhost = variant === "ghost";

  const inner = (
    <>
      {loading ? (
        <ActivityIndicator color={isSecondary || isGhost ? colors.primary : "#fff"} />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={isSecondary || isGhost ? colors.primary : "#fff"}
              style={{ marginRight: 8 }}
            />
          ) : null}
          <Text
            style={[
              styles.text,
              isSecondary || isGhost ? { color: colors.primary } : { color: "#fff" },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </>
  );

  if (isEmergency) {
    return (
      <TouchableOpacity
        testID={testID}
        activeOpacity={0.9}
        onPress={onPress}
        disabled={disabled || loading}
        style={[styles.base, fullWidth && { alignSelf: "stretch" }, disabled && { opacity: 0.6 }, style]}
      >
        <LinearGradient
          colors={["#DC143C", "#E63946"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, styles.emergency, fullWidth && { alignSelf: "stretch" }]}
        >
          {inner}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        isSecondary ? styles.secondary : isGhost ? styles.ghost : styles.primary,
        fullWidth && { alignSelf: "stretch" },
        disabled && { opacity: 0.6 },
        style,
      ]}
    >
      {inner}
    </TouchableOpacity>
  );

}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: colors.primary },
  ghost: { backgroundColor: "transparent" },
  emergency: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 6 },
  text: { fontSize: 16, fontWeight: "700" },
});
