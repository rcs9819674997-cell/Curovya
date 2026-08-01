import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/src/theme";
import { useT } from "@/src/i18n";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const t = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDisabled,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: -2 },
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: colors.borderLight,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("home"),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: t("appointments"),
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: t("records"),
          tabBarIcon: ({ color, size }) => <Ionicons name="folder-open" color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          title: t("emergency"),
          tabBarIcon: ({ color, size }) => <Ionicons name="medical" color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("profile"),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size - 2} />,
        }}
      />
    </Tabs>
  );
}
