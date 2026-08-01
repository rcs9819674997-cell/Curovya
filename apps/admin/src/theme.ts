// HamroDoctor Design Tokens
// Derived from /app/design_guidelines.json

export const colors = {
  primary: "#DC143C",
  primaryLight: "#FBEAEF",
  primaryDark: "#9B0E2A",
  primaryGradient: ["#DC143C", "#E63946"] as const,

  bgApp: "#F8FAFC",
  bgCard: "#FFFFFF",
  bgMuted: "#F1F5F9",
  overlay: "rgba(0,0,0,0.5)",

  text: "#0F172A",
  textSecondary: "#64748B",
  textDisabled: "#94A3B8",
  textInverse: "#FFFFFF",

  success: "#10B981",
  successLight: "#D1FAE5",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  error: "#EF4444",
  errorLight: "#FEE2E2",
  info: "#3B82F6",
  infoLight: "#DBEAFE",

  borderLight: "#E2E8F0",
  borderMedium: "#CBD5E1",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 6, md: 10, lg: 14, xl: 18, xxl: 24, pill: 999 };

export const font = {
  h1: { fontSize: 28, fontWeight: "800" as const, color: colors.text },
  h2: { fontSize: 22, fontWeight: "700" as const, color: colors.text },
  h3: { fontSize: 18, fontWeight: "700" as const, color: colors.text },
  h4: { fontSize: 16, fontWeight: "600" as const, color: colors.text },
  bodyLg: { fontSize: 15, color: colors.text },
  body: { fontSize: 14, color: colors.text },
  small: { fontSize: 12, color: colors.textSecondary },
  caption: { fontSize: 11, color: colors.textSecondary, fontWeight: "500" as const },
};

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  raised: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
};
