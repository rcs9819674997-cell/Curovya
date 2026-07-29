import React, { useMemo } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";

export default function ClinicTabsLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isAdmin = user?.role === "clinic_admin";

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
        name="appointments"
        options={{ title: "Appointments", tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size - 2} /> }}
      />
      <Tabs.Screen
        name="doctors"
        options={{ title: "Doctors", tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size - 2} /> }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          title: "Staff",
          href: isAdmin ? "/(clinic)/staff" : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="person-add" color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size - 2} /> }}
      />
    </Tabs>
  );
}
