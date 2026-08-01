// Curovya / HamroDoctor — i18n dictionary (Admin app).
// English + Nepali (नेपाली) full coverage; Hindi & Maithili fallback to English for now.
//
// Usage:
//   import { useT } from "@/src/i18n";
//   const t = useT();
//   <Text>{t("welcome_back")}</Text>
//
// Direct usage without hook:
//   import { translate } from "@/src/i18n";
//   translate("welcome_back", "ne")

import { useAuth } from "@/src/context/AuthContext";

export const LANGS = [
  { code: "en", label: "English", native: "English" },
  { code: "ne", label: "Nepali", native: "नेपाली" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "mai", label: "Maithili", native: "मैथिली" },
];

type Dict = Record<string, Record<string, string>>;

// Admin-scoped dictionary. Patient/doctor/lab/booking/emergency keys removed.
export const T: Dict = {
  // Common
  welcome_back: { en: "Welcome back", ne: "फेरि स्वागत छ" },
  hello: { en: "Hello", ne: "नमस्ते" },
  sign_in: { en: "Sign In", ne: "साइन इन" },
  sign_up: { en: "Sign Up", ne: "साइन अप" },
  sign_out: { en: "Sign Out", ne: "साइन आउट" },
  logout: { en: "Logout", ne: "लगआउट" },
  email: { en: "Email", ne: "इमेल" },
  password: { en: "Password", ne: "पासवर्ड" },
  phone: { en: "Phone", ne: "फोन" },
  full_name: { en: "Full Name", ne: "पूरा नाम" },
  submit: { en: "Submit", ne: "पेस गर्नुहोस्" },
  cancel: { en: "Cancel", ne: "रद्द गर्नुहोस्" },
  confirm: { en: "Confirm", ne: "पुष्टि गर्नुहोस्" },
  continue: { en: "Continue", ne: "जारी राख्नुहोस्" },
  next: { en: "Next", ne: "अर्को" },
  back: { en: "Back", ne: "पछाडि" },
  save: { en: "Save", ne: "सेभ गर्नुहोस्" },
  loading: { en: "Loading...", ne: "लोड हुँदैछ..." },
  error: { en: "Something went wrong", ne: "केही गलत भयो" },
  success: { en: "Success", ne: "सफल" },
  search: { en: "Search", ne: "खोज्नुहोस्" },
  see_all: { en: "See all", ne: "सबै हेर्नुहोस्" },
  view_all: { en: "View all", ne: "सबै हेर्नुहोस्" },
  yes: { en: "Yes", ne: "हो" },
  no: { en: "No", ne: "होइन" },
  ok: { en: "OK", ne: "ठीक छ" },

  // Auth
  welcome_to_app: { en: "Welcome to Curovya", ne: "कुरोभ्यामा स्वागत छ" },
  create_account: { en: "Create Account", ne: "खाता बनाउनुहोस्" },
  forgot_password: { en: "Forgot password?", ne: "पासवर्ड बिर्सनुभयो?" },
  reset_password: { en: "Reset Password", ne: "पासवर्ड रिसेट" },
  change_password: { en: "Change Password", ne: "पासवर्ड परिवर्तन" },
  current_password: { en: "Current Password", ne: "हालको पासवर्ड" },
  new_password: { en: "New Password", ne: "नयाँ पासवर्ड" },
  send_reset_code: { en: "Send Reset Code", ne: "रिसेट कोड पठाउनुहोस्" },
  verify_otp: { en: "Verify OTP", ne: "ओटीपी प्रमाणित" },
  enter_otp: { en: "Enter OTP", ne: "ओटीपी प्रविष्ट गर्नुहोस्" },
  no_account: { en: "Don't have an account?", ne: "खाता छैन?" },
  already_have_account: { en: "Already have an account?", ne: "पहिले नै खाता छ?" },

  // Profile
  profile: { en: "Profile", ne: "प्रोफाइल" },
  language: { en: "Language", ne: "भाषा" },
  notifications: { en: "Notifications", ne: "सूचना" },
  privacy_security: { en: "Privacy & Security", ne: "गोपनीयता र सुरक्षा" },

  // Help / Support
  help_support: { en: "Help & Support", ne: "मद्दत र समर्थन" },
  faqs: { en: "Frequently Asked Questions", ne: "अक्सर सोधिने प्रश्नहरू" },
  contact_us: { en: "Contact Us", ne: "हामीलाई सम्पर्क गर्नुहोस्" },
  submit_ticket: { en: "Submit a Ticket", ne: "टिकट पेस गर्नुहोस्" },
  my_tickets: { en: "My Tickets", ne: "मेरा टिकटहरू" },
  subject: { en: "Subject", ne: "विषय" },
  message: { en: "Message", ne: "सन्देश" },
  category: { en: "Category", ne: "श्रेणी" },

  // Admin-specific
  dashboard: { en: "Dashboard", ne: "ड्यासबोर्ड" },
  overview: { en: "Overview", ne: "अवलोकन" },
  users: { en: "Users", ne: "प्रयोगकर्ता" },
  revenue: { en: "Revenue", ne: "आम्दानी" },
  approvals: { en: "Approvals", ne: "स्वीकृति" },
  tickets: { en: "Support Tickets", ne: "समर्थन टिकट" },
  audit_logs: { en: "Audit Logs", ne: "अडिट लग" },
  approve: { en: "Approve", ne: "स्वीकृत" },
  suspend: { en: "Suspend", ne: "निलम्बन" },
};

export function translate(key: string, lang: string = "en"): string {
  return T[key]?.[lang] ?? T[key]?.en ?? key;
}

// Legacy helper used in older screens.
export function t(key: string, lang: string = "en"): string {
  return translate(key, lang);
}

// Convenience hook — uses the current language from AuthContext.
export function useT(): (key: string) => string {
  const { language } = useAuth();
  return (key: string) => translate(key, language);
}
