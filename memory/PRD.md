# Curovya / HamroDoctor — Healthcare Super App (Nepal)

## Product
Mobile-first healthcare super app for Nepal (starting Janakpurdham), built on Expo React Native + FastAPI + MongoDB. Red (#DC143C) + white brand.

## Roles
- Patient
- Doctor
- Clinic Admin
- Receptionist
- **Lab Admin** (new in this iteration)
- **Super Admin** (new in this iteration)

## Features Implemented

### Iteration 4 additions (this session)
- **Forgot / Reset Password** — `/auth/forgot-password` and `/auth/reset-password` (dev_otp returned for testing).
- **Change Password** — `/auth/change-password`, patient/lab/admin all link into it from Profile.
- **Persisted Notification Center** — backend collection + auto-push on booking, prescription creation, follow-up scheduling, lab status changes, ticket updates; UI supports mark-all-read + unread badge.
- **Follow-up Automation** — when a doctor creates a prescription with `follow_up_days`, a notification is queued for the patient.
- **Help & Support** — FAQs, contact info, and support-ticket submission with tabbed UI + list of my tickets.
- **Lab Admin Portal** (`/(lab)`) — Dashboard (bookings by status, revenue, home collections), Bookings (filter by status, assign technician, update status → auto-notifies patient), Profile.
- **Super Admin Portal** (`/(admin)`) — Overview (platform metrics + total revenue split by appointments/labs/plus), Users (search + filter by role + suspend/unsuspend), Approvals (pending doctors + clinics), Tickets (reply + status), Profile, Audit Logs.
- **Audit Logs** — every super-admin action is auto-logged (approve, suspend, unsuspend, clinic approve, ticket reply).
- **Privacy & Security screen** — cards explaining encryption, sessions, and privacy policy; deep-links into Change Password.
- **Full i18n system** — `useT()` hook, master English + Nepali dictionary covering tabs, auth, home, profile, help, and admin surfaces. Tabs and Home now use `useT()`.
- **Role-based routing** on login for `lab_admin` → `/(lab)` and `super_admin` → `/(admin)`.

### Carried over from previous iterations
- Onboarding + language picker
- Signup / Login / OTP (JWT 24h, bcrypt hashing, secure token storage)
- Patient Dashboard (home) with quick actions + upcoming appointment
- Doctor Discovery (filters + specialty chips + detailed profile)
- Symptom-first search (`/find-doctor`)
- Appointment Booking (multi-step) with real eSewa payment (UAT)
- Digital Ticket with live queue tracking
- E-Prescriptions (doctor authoring + patient view)
- Health Records timeline
- Lab Test booking (patient) — now flows into Lab Admin dashboard
- Medicine Reminders + dose log
- Family Health Management
- Doctor reviews & ratings
- AI Symptom Checker (live GPT-4o-mini)
- Emergency module (ambulance/hospitals/blood banks)
- Pharmacy (UI)
- HamroDoctor Plus subscription (eSewa gated)
- Doctor Portal (dashboard, schedule, prescription authoring, availability, queue: call-next/complete/no-show/skip/recall)
- Clinic Admin Portal (dashboard, doctors, staff CRUD, walk-in, appointments)

## Architecture

### Backend (`/app/backend/server.py`)
Single-file FastAPI service, MongoDB via Motor. All routes under `/api`.

### Frontend (`/app/frontend`)
- Expo Router file-based routing.
- Role tab groups: `(auth)`, `(tabs)` (patient), `(doctor)`, `(clinic)`, `(lab)`, `(admin)`.
- `/src/i18n.ts` — `useT()` hook + `translate(key, lang)` + `LANGS` list (en/ne/hi/mai).
- `/src/context/AuthContext.tsx` — user, role-aware, language switcher, secure token storage.
- `/src/api/client.ts` — typed `api.get/post/patch/put/del` wrapper around fetch + Bearer.

## API Contract (new endpoints this iteration)
- `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/change-password`
- `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/{id}/read`, `POST /notifications/read-all`
- `GET /support/faqs`, `POST /support/tickets`, `GET /support/tickets`
- `GET /lab/dashboard`, `GET /lab/bookings?status=`, `PATCH /lab/bookings/{id}`
- `GET /admin/overview`, `GET /admin/users?role=&q=`, `POST /admin/users/{id}/approve|suspend|unsuspend`, `GET /admin/clinics`, `POST /admin/clinics/{id}/approve`, `GET /admin/tickets`, `POST /admin/tickets/{id}/reply`, `GET /admin/audit-logs`

## Demo Credentials
See `/app/memory/test_credentials.md`.

## Mocked / Deferred
- Video consultation UI only (no WebRTC).
- PDF export / share for prescriptions — Alerts only.
- Pharmacy order — Alerts only.
- Multi-device sessions — token expiry only; no device management UI.
- Deep linking — payments only.
