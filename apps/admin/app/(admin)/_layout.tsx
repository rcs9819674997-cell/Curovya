import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/src/theme";

export default function AdminTabsLayout() {
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
        options={{ title: "Overview", tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" color={color} size={size - 2} /> }}
      />
      <Tabs.Screen
        name="users"
        options={{ title: "Users", tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size - 2} /> }}
      />
      <Tabs.Screen
        name="approvals"
        options={{ title: "Approvals", tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-circle" color={color} size={size - 2} /> }}
      />
      <Tabs.Screen
        name="tickets"
        options={{ title: "Tickets", tabBarIcon: ({ color, size }) => <Ionicons name="chatbox-ellipses" color={color} size={size - 2} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size - 2} /> }}
      />
    </Tabs>
  );
}
