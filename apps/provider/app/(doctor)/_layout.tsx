import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/src/theme";

export default function DoctorTabsLayout() {
  const insets = useSafeAreaInsets();
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
        options={{ title: "Dashboard", tabBarIcon: ({ color, size }) => <Ionicons name="grid" color={color} size={size - 2} /> }}
      />
      <Tabs.Screen
        name="schedule"
        options={{ title: "Schedule", tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size - 2} /> }}
      />
      <Tabs.Screen
        name="prescriptions"
        options={{ title: "Rx", tabBarIcon: ({ color, size }) => <Ionicons name="document-text" color={color} size={size - 2} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size - 2} /> }}
      />
    </Tabs>
  );
}
