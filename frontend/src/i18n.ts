// Curovya / HamroDoctor — i18n dictionary.
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

// Master dictionary. Each key has en + ne minimum; other languages fall back to en.
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
  welcome_to_app: { en: "Welcome to HamroDoctor", ne: "हाम्रोडाक्टरमा स्वागत छ" },
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

  // Tabs
  home: { en: "Home", ne: "गृह" },
  appointments: { en: "Appointments", ne: "अपोइन्टमेन्ट" },
  records: { en: "Records", ne: "रेकर्ड" },
  emergency: { en: "Emergency", ne: "आपतकाल" },
  profile: { en: "Profile", ne: "प्रोफाइल" },

  // Home
  find_doctor: { en: "Search doctors, clinics, symptoms", ne: "डाक्टर, क्लिनिक, लक्षण खोज्नुहोस्" },
  book_doctor: { en: "Book Doctor", ne: "डाक्टर बुक" },
  lab_tests: { en: "Lab Tests", ne: "प्रयोगशाला परीक्षण" },
  pharmacy: { en: "Pharmacy", ne: "औषधि पसल" },
  symptom_checker: { en: "AI Symptom Checker", ne: "एआई लक्षण जाँच" },
  upcoming_appointment: { en: "Upcoming Appointment", ne: "आउँदो अपोइन्टमेन्ट" },
  recent_prescriptions: { en: "Recent Prescriptions", ne: "हालैका प्रिस्क्रिप्शन" },
  health_summary: { en: "Health Summary", ne: "स्वास्थ्य सारांश" },
  emergency_help: { en: "Emergency Help", ne: "आपतकालीन मद्दत" },

  // Booking
  book_appointment: { en: "Book Appointment", ne: "अपोइन्टमेन्ट बुक" },
  select_slot: { en: "Select Slot", ne: "समय छान्नुहोस्" },
  patient_details: { en: "Patient Details", ne: "बिरामीको विवरण" },
  payment: { en: "Payment", ne: "भुक्तानी" },
  confirmed: { en: "Confirmed", ne: "पुष्टि भयो" },
  token_number: { en: "Token", ne: "टोकन" },
  now_serving: { en: "Now serving", ne: "अहिले सेवा" },
  expected_wait: { en: "Expected wait", ne: "अपेक्षित प्रतीक्षा" },

  // Prescriptions & records
  prescriptions: { en: "Prescriptions", ne: "प्रिस्क्रिप्शन" },
  medicines: { en: "Medicines", ne: "औषधिहरू" },
  diagnosis: { en: "Diagnosis", ne: "निदान" },
  symptoms: { en: "Symptoms", ne: "लक्षणहरू" },
  follow_up: { en: "Follow-up", ne: "फलो-अप" },
  reports: { en: "Reports", ne: "रिपोर्ट" },
  vaccinations: { en: "Vaccinations", ne: "खोप" },

  // Profile
  edit_profile: { en: "Edit Profile", ne: "प्रोफाइल सम्पादन" },
  family_members: { en: "Family Members", ne: "परिवारका सदस्य" },
  medicine_reminders: { en: "Medicine Reminders", ne: "औषधिको सम्झना" },
  saved_doctors: { en: "Saved Doctors", ne: "सुरक्षित डाक्टरहरू" },
  payment_methods: { en: "Payment Methods", ne: "भुक्तानी विधि" },
  transaction_history: { en: "Transaction History", ne: "लेनदेन इतिहास" },
  language: { en: "Language", ne: "भाषा" },
  notifications: { en: "Notifications", ne: "सूचना" },
  privacy_security: { en: "Privacy & Security", ne: "गोपनीयता र सुरक्षा" },
  help_support: { en: "Help & Support", ne: "मद्दत र समर्थन" },
  about_app: { en: "About HamroDoctor", ne: "हाम्रोडाक्टर बारे" },

  // Help / Support
  faqs: { en: "Frequently Asked Questions", ne: "अक्सर सोधिने प्रश्नहरू" },
  contact_us: { en: "Contact Us", ne: "हामीलाई सम्पर्क गर्नुहोस्" },
  submit_ticket: { en: "Submit a Ticket", ne: "टिकट पेस गर्नुहोस्" },
  my_tickets: { en: "My Tickets", ne: "मेरा टिकटहरू" },
  subject: { en: "Subject", ne: "विषय" },
  message: { en: "Message", ne: "सन्देश" },
  category: { en: "Category", ne: "श्रेणी" },

  // Emergency
  call_ambulance: { en: "Call Ambulance Now", ne: "एम्बुलेन्स कल गर्नुहोस्" },
  nearby_hospitals: { en: "Nearby Hospitals", ne: "नजिकका अस्पताल" },
  blood_banks: { en: "Blood Banks", ne: "रक्त बैंक" },

  // Admin / Lab admin
  dashboard: { en: "Dashboard", ne: "ड्यासबोर्ड" },
  overview: { en: "Overview", ne: "अवलोकन" },
  users: { en: "Users", ne: "प्रयोगकर्ता" },
  bookings: { en: "Bookings", ne: "बुकिङ" },
  revenue: { en: "Revenue", ne: "आम्दानी" },
  approvals: { en: "Approvals", ne: "स्वीकृति" },
  tickets: { en: "Support Tickets", ne: "समर्थन टिकट" },
  audit_logs: { en: "Audit Logs", ne: "अडिट लग" },
  approve: { en: "Approve", ne: "स्वीकृत" },
  suspend: { en: "Suspend", ne: "निलम्बन" },

  // Video / consult
  video_consultation: { en: "Video Consultation", ne: "भिडियो परामर्श" },
  join_video: { en: "Join Video Consultation", ne: "भिडियो परामर्शमा सामेल हुनुहोस्" },
  start_call: { en: "Start Video Call", ne: "भिडियो कल सुरु गर्नुहोस्" },
  waiting_for_doctor: { en: "Waiting for doctor to start the call…", ne: "डाक्टरले कल सुरु गर्न पर्खँदै…" },
  waiting_for_patient: { en: "Waiting for patient to join…", ne: "बिरामी सामेल हुन पर्खँदै…" },
  end_call: { en: "End Call", ne: "कल समाप्त" },
  requires_dev_build: {
    en: "Video calls need the native Curovya app.",
    ne: "भिडियो कलका लागि Curovya मोबाइल एप चाहिन्छ।",
  },
  connecting: { en: "Connecting…", ne: "जडान हुँदैछ…" },

  // Booking flow
  select_doctor: { en: "Select Doctor", ne: "डाक्टर छान्नुहोस्" },
  select_date: { en: "Select Date", ne: "मिति छान्नुहोस्" },
  video_call: { en: "Video Call", ne: "भिडियो कल" },
  clinic_visit: { en: "Clinic Visit", ne: "क्लिनिक भ्रमण" },
  pay_with_esewa: { en: "Pay with eSewa", ne: "eSewa बाट भुक्तानी" },
  pay_at_clinic: { en: "Pay at Clinic", ne: "क्लिनिकमा भुक्तानी" },
  consultation_fee: { en: "Consultation Fee", ne: "परामर्श शुल्क" },
  book_now: { en: "Book Now", ne: "अहिले बुक गर्नुहोस्" },
  proceed_to_payment: { en: "Proceed to Payment", ne: "भुक्तानीमा जानुहोस्" },
  age: { en: "Age", ne: "उमेर" },
  gender: { en: "Gender", ne: "लिङ्ग" },
  male: { en: "Male", ne: "पुरुष" },
  female: { en: "Female", ne: "महिला" },
  other: { en: "Other", ne: "अन्य" },
  note_for_doctor: { en: "Note for the doctor", ne: "डाक्टरका लागि टिप्पणी" },

  // Doctors
  doctors: { en: "Doctors", ne: "डाक्टरहरू" },
  find_a_doctor: { en: "Find a Doctor", ne: "डाक्टर खोज्नुहोस्" },
  specialty: { en: "Specialty", ne: "विशेषज्ञता" },
  experience: { en: "Experience", ne: "अनुभव" },
  years: { en: "years", ne: "वर्ष" },
  rating: { en: "Rating", ne: "मूल्याङ्कन" },
  reviews: { en: "Reviews", ne: "समीक्षा" },
  qualifications: { en: "Qualifications", ne: "योग्यता" },
  languages: { en: "Languages", ne: "भाषाहरू" },
  available_slots: { en: "Available Slots", ne: "उपलब्ध समय" },
  clinic: { en: "Clinic", ne: "क्लिनिक" },
  book_slot: { en: "Book Slot", ne: "समय बुक" },
  online_consultation: { en: "Online consultation", ne: "अनलाइन परामर्श" },
  physical_visit: { en: "Physical visit", ne: "व्यक्तिगत भ्रमण" },

  // Labs
  lab_test_booking: { en: "Lab Test Booking", ne: "प्रयोगशाला परीक्षण बुकिङ" },
  home_collection: { en: "Home Sample Collection", ne: "घरैमा नमूना संकलन" },
  select_test: { en: "Select Test", ne: "परीक्षण छान्नुहोस्" },
  test_price: { en: "Price", ne: "मूल्य" },
  book_test: { en: "Book Test", ne: "परीक्षण बुक" },
  status_booked: { en: "Booked", ne: "बुक भयो" },
  status_sample_collected: { en: "Sample Collected", ne: "नमूना लिइयो" },
  status_processing: { en: "Processing", ne: "प्रक्रियामा" },
  status_ready: { en: "Report Ready", ne: "रिपोर्ट तयार" },
  status_delivered: { en: "Delivered", ne: "पठाइयो" },

  // Ticket / queue
  digital_ticket: { en: "Digital Ticket", ne: "डिजिटल टिकट" },
  queue_position: { en: "Queue Position", ne: "लाइनमा स्थान" },
  patients_ahead: { en: "patients ahead of you", ne: "जना बिरामी अगाडि" },
  share_ticket: { en: "Share Ticket", ne: "टिकट साझा" },
  cancel_appointment: { en: "Cancel Appointment", ne: "अपोइन्टमेन्ट रद्द" },
  date: { en: "Date", ne: "मिति" },
  time: { en: "Time", ne: "समय" },
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
