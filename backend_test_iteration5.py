"""
Backend API Tests for HamroDoctor Iteration 5
Tests Clinic Admin & Receptionist Panels
"""
import requests
import json
from datetime import datetime, timedelta

import os

# Base URL
BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "http://localhost:8002/api").rstrip("/")


# Test credentials from /app/memory/test_credentials.md
PATIENT_EMAIL = "patient@hamrodoctor.np"
PATIENT_PASSWORD = "Patient@123"

DOCTOR_EMAIL = "doctor@hamrodoctor.np"
DOCTOR_PASSWORD = "Doctor@123"

ADMIN_EMAIL = "admin@heartclinic.np"
ADMIN_PASSWORD = "Admin@123"

RECEPTIONIST_EMAIL = "reception@heartclinic.np"
RECEPTIONIST_PASSWORD = "Recep@123"

# Global token storage
patient_token = None
doctor_token = None
admin_token = None
receptionist_token = None

# Test data storage
new_staff_id = None
new_staff_email = "test-recep@heartclinic.np"
walk_in_appt_id = None
walk_in_appt_id_2 = None
walk_in_appt_id_3 = None

# Test results tracking
total_tests = 0
passed_tests = 0
failed_tests = 0


def print_test(name):
    """Print test name"""
    print(f"\n{'='*80}")
    print(f"TEST: {name}")
    print('='*80)


def print_result(passed, message, response=None):
    """Print test result"""
    global total_tests, passed_tests, failed_tests
    total_tests += 1
    
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {message}")
    
    if passed:
        passed_tests += 1
    else:
        failed_tests += 1
        if response:
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text[:1000]}")


def print_summary():
    """Print test summary"""
    print(f"\n{'='*80}")
    print(f"TEST SUMMARY")
    print('='*80)
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests} ✅")
    print(f"Failed: {failed_tests} ❌")
    print(f"Success Rate: {(passed_tests/total_tests*100) if total_tests > 0 else 0:.1f}%")
    print('='*80)


# ============================================================================
# 1. LOGIN TESTS
# ============================================================================

def test_login_patient():
    """Test login as patient"""
    global patient_token
    print_test("1.1 Login as Patient")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": PATIENT_EMAIL, "password": PATIENT_PASSWORD}
    )
    
    if response.status_code == 200:
        data = response.json()
        patient_token = data.get("access_token")
        user = data.get("user", {})
        
        # Verify role
        if user.get("role") == "patient":
            print_result(True, f"Patient logged in. Role: {user.get('role')}, Token: {patient_token[:20]}...")
            return True
        else:
            print_result(False, f"Wrong role. Expected 'patient', got '{user.get('role')}'")
            return False
    else:
        print_result(False, "Patient login failed", response)
        return False


def test_login_doctor():
    """Test login as doctor"""
    global doctor_token
    print_test("1.2 Login as Doctor")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": DOCTOR_EMAIL, "password": DOCTOR_PASSWORD}
    )
    
    if response.status_code == 200:
        data = response.json()
        doctor_token = data.get("access_token")
        user = data.get("user", {})
        
        # Verify role
        if user.get("role") == "doctor":
            print_result(True, f"Doctor logged in. Role: {user.get('role')}, Token: {doctor_token[:20]}...")
            return True
        else:
            print_result(False, f"Wrong role. Expected 'doctor', got '{user.get('role')}'")
            return False
    else:
        print_result(False, "Doctor login failed", response)
        return False


def test_login_admin():
    """Test login as clinic admin"""
    global admin_token
    print_test("1.3 Login as Clinic Admin")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    
    if response.status_code == 200:
        data = response.json()
        admin_token = data.get("access_token")
        user = data.get("user", {})
        
        # Verify role and clinic_id
        role_ok = user.get("role") == "clinic_admin"
        clinic_ok = user.get("clinic_id") == "clinic-1"
        
        if role_ok and clinic_ok:
            print_result(True, f"Admin logged in. Role: {user.get('role')}, Clinic: {user.get('clinic_id')}, Token: {admin_token[:20]}...")
            return True
        else:
            print_result(False, f"Wrong credentials. Role: {user.get('role')}, Clinic: {user.get('clinic_id')}")
            return False
    else:
        print_result(False, "Admin login failed", response)
        return False


def test_login_receptionist():
    """Test login as receptionist"""
    global receptionist_token
    print_test("1.4 Login as Receptionist")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": RECEPTIONIST_EMAIL, "password": RECEPTIONIST_PASSWORD}
    )
    
    if response.status_code == 200:
        data = response.json()
        receptionist_token = data.get("access_token")
        user = data.get("user", {})
        
        # Verify role and clinic_id
        role_ok = user.get("role") == "receptionist"
        clinic_ok = user.get("clinic_id") == "clinic-1"
        
        if role_ok and clinic_ok:
            print_result(True, f"Receptionist logged in. Role: {user.get('role')}, Clinic: {user.get('clinic_id')}, Token: {receptionist_token[:20]}...")
            return True
        else:
            print_result(False, f"Wrong credentials. Role: {user.get('role')}, Clinic: {user.get('clinic_id')}")
            return False
    else:
        print_result(False, "Receptionist login failed", response)
        return False


# ============================================================================
# 2. GET /api/clinic/mine
# ============================================================================

def test_clinic_mine_admin():
    """Test GET /api/clinic/mine as admin"""
    print_test("2.1 GET /api/clinic/mine as Admin")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.get(f"{BASE_URL}/clinic/mine", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        
        # Verify clinic details
        clinic_ok = data.get("id") == "clinic-1"
        name_ok = data.get("name") == "Janakpur Heart Clinic"
        doctors_ok = set(data.get("doctor_ids", [])) == {"doc-1", "doc-5"}
        
        if clinic_ok and name_ok and doctors_ok:
            print_result(True, f"Clinic mine returned correctly. ID: {data.get('id')}, Name: {data.get('name')}, Doctors: {data.get('doctor_ids')}")
            return True
        else:
            print_result(False, f"Clinic data mismatch. ID: {data.get('id')}, Name: {data.get('name')}, Doctors: {data.get('doctor_ids')}")
            return False
    else:
        print_result(False, "GET /api/clinic/mine failed", response)
        return False


def test_clinic_mine_receptionist():
    """Test GET /api/clinic/mine as receptionist"""
    print_test("2.2 GET /api/clinic/mine as Receptionist")
    
    headers = {"Authorization": f"Bearer {receptionist_token}"}
    response = requests.get(f"{BASE_URL}/clinic/mine", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        
        # Verify same clinic
        clinic_ok = data.get("id") == "clinic-1"
        
        if clinic_ok:
            print_result(True, f"Receptionist can access clinic mine. ID: {data.get('id')}")
            return True
        else:
            print_result(False, f"Wrong clinic. Expected clinic-1, got {data.get('id')}")
            return False
    else:
        print_result(False, "GET /api/clinic/mine failed", response)
        return False


def test_clinic_mine_patient_forbidden():
    """Test GET /api/clinic/mine as patient (should be 403)"""
    print_test("2.3 GET /api/clinic/mine as Patient (should be 403)")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    response = requests.get(f"{BASE_URL}/clinic/mine", headers=headers)
    
    if response.status_code == 403:
        print_result(True, "Patient correctly forbidden from accessing clinic mine")
        return True
    else:
        print_result(False, f"Expected 403, got {response.status_code}", response)
        return False


def test_clinic_mine_no_token():
    """Test GET /api/clinic/mine without token (should be 401)"""
    print_test("2.4 GET /api/clinic/mine without token (should be 401)")
    
    response = requests.get(f"{BASE_URL}/clinic/mine")
    
    if response.status_code == 401:
        print_result(True, "Correctly returns 401 without token")
        return True
    else:
        print_result(False, f"Expected 401, got {response.status_code}", response)
        return False


# ============================================================================
# 3. GET /api/clinic/{clinic_id}/dashboard
# ============================================================================

def test_dashboard_admin():
    """Test GET /api/clinic/clinic-1/dashboard as admin"""
    print_test("3.1 GET /api/clinic/clinic-1/dashboard as Admin")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.get(f"{BASE_URL}/clinic/clinic-1/dashboard", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        
        # Verify required keys
        required_keys = ["clinic", "date", "today", "monthly_revenue", "total_patients", 
                        "upcoming_next_7_days", "doctor_count", "doctors"]
        missing_keys = [k for k in required_keys if k not in data]
        
        if not missing_keys:
            today = data.get("today", {})
            today_keys = ["total", "completed", "in_consultation", "waiting", "cancelled", "revenue"]
            missing_today = [k for k in today_keys if k not in today]
            
            if not missing_today:
                doctor_count_ok = data.get("doctor_count") == 2
                doctors_ok = len(data.get("doctors", [])) == 2
                
                # Check doctor stats structure
                if doctors_ok and doctor_count_ok:
                    doc = data["doctors"][0]
                    doc_keys = ["id", "name", "specialty", "today_count", "today_completed", "today_revenue"]
                    missing_doc = [k for k in doc_keys if k not in doc]
                    
                    if not missing_doc:
                        print_result(True, f"Dashboard returned correctly. Doctor count: {data.get('doctor_count')}, Today total: {today.get('total')}")
                        return True
                    else:
                        print_result(False, f"Doctor stats missing keys: {missing_doc}")
                        return False
                else:
                    print_result(False, f"Doctor count mismatch. Expected 2, got {data.get('doctor_count')}")
                    return False
            else:
                print_result(False, f"Today stats missing keys: {missing_today}")
                return False
        else:
            print_result(False, f"Dashboard missing keys: {missing_keys}")
            return False
    else:
        print_result(False, "GET dashboard failed", response)
        return False


def test_dashboard_wrong_clinic():
    """Test GET /api/clinic/clinic-2/dashboard as admin (should be 403)"""
    print_test("3.2 GET /api/clinic/clinic-2/dashboard as Admin (should be 403)")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.get(f"{BASE_URL}/clinic/clinic-2/dashboard", headers=headers)
    
    if response.status_code == 403:
        print_result(True, "Admin correctly forbidden from accessing other clinic")
        return True
    else:
        print_result(False, f"Expected 403, got {response.status_code}", response)
        return False


def test_dashboard_receptionist():
    """Test GET /api/clinic/clinic-1/dashboard as receptionist"""
    print_test("3.3 GET /api/clinic/clinic-1/dashboard as Receptionist")
    
    headers = {"Authorization": f"Bearer {receptionist_token}"}
    response = requests.get(f"{BASE_URL}/clinic/clinic-1/dashboard", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print_result(True, f"Receptionist can access dashboard. Doctor count: {data.get('doctor_count')}")
        return True
    else:
        print_result(False, "GET dashboard failed", response)
        return False


def test_dashboard_patient_forbidden():
    """Test GET /api/clinic/clinic-1/dashboard as patient (should be 403)"""
    print_test("3.4 GET /api/clinic/clinic-1/dashboard as Patient (should be 403)")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    response = requests.get(f"{BASE_URL}/clinic/clinic-1/dashboard", headers=headers)
    
    if response.status_code == 403:
        print_result(True, "Patient correctly forbidden from accessing dashboard")
        return True
    else:
        print_result(False, f"Expected 403, got {response.status_code}", response)
        return False


# ============================================================================
# 4. GET /api/clinic/{clinic_id}/appointments
# ============================================================================

def test_appointments_list():
    """Test GET /api/clinic/clinic-1/appointments as admin"""
    print_test("4.1 GET /api/clinic/clinic-1/appointments as Admin")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.get(f"{BASE_URL}/clinic/clinic-1/appointments", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        
        # Verify it's a list
        if isinstance(data, list):
            # Check if appointments have patient_name and patient_phone
            if len(data) > 0:
                appt = data[0]
                has_name = "patient_name" in appt
                has_phone = "patient_phone" in appt
                
                if has_name and has_phone:
                    print_result(True, f"Appointments list returned. Count: {len(data)}, First appt has patient_name and patient_phone")
                    return True
                else:
                    print_result(False, f"Appointment missing patient_name or patient_phone")
                    return False
            else:
                print_result(True, f"Appointments list returned (empty)")
                return True
        else:
            print_result(False, f"Expected list, got {type(data)}")
            return False
    else:
        print_result(False, "GET appointments failed", response)
        return False


def test_appointments_filter_date():
    """Test GET /api/clinic/clinic-1/appointments?date=<today>"""
    print_test("4.2 GET /api/clinic/clinic-1/appointments?date=<today>")
    
    today = datetime.now().strftime("%Y-%m-%d")
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.get(f"{BASE_URL}/clinic/clinic-1/appointments?date={today}", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        
        # Verify all appointments are for today
        if isinstance(data, list):
            all_today = all(appt.get("date") == today for appt in data)
            
            if all_today:
                print_result(True, f"Date filter works. Count: {len(data)}, All for {today}")
                return True
            else:
                print_result(False, f"Some appointments not for today")
                return False
        else:
            print_result(False, f"Expected list, got {type(data)}")
            return False
    else:
        print_result(False, "GET appointments with date filter failed", response)
        return False


def test_appointments_filter_doctor():
    """Test GET /api/clinic/clinic-1/appointments?doctor_id=doc-1"""
    print_test("4.3 GET /api/clinic/clinic-1/appointments?doctor_id=doc-1")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.get(f"{BASE_URL}/clinic/clinic-1/appointments?doctor_id=doc-1", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        
        # Verify all appointments are for doc-1
        if isinstance(data, list):
            all_doc1 = all(appt.get("doctor_id") == "doc-1" for appt in data)
            
            if all_doc1:
                print_result(True, f"Doctor filter works. Count: {len(data)}, All for doc-1")
                return True
            else:
                print_result(False, f"Some appointments not for doc-1")
                return False
        else:
            print_result(False, f"Expected list, got {type(data)}")
            return False
    else:
        print_result(False, "GET appointments with doctor filter failed", response)
        return False


def test_appointments_filter_status():
    """Test GET /api/clinic/clinic-1/appointments?status=confirmed"""
    print_test("4.4 GET /api/clinic/clinic-1/appointments?status=confirmed")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.get(f"{BASE_URL}/clinic/clinic-1/appointments?status=confirmed", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        
        # Verify all appointments are confirmed
        if isinstance(data, list):
            all_confirmed = all(appt.get("status") == "confirmed" for appt in data)
            
            if all_confirmed:
                print_result(True, f"Status filter works. Count: {len(data)}, All confirmed")
                return True
            else:
                print_result(False, f"Some appointments not confirmed")
                return False
        else:
            print_result(False, f"Expected list, got {type(data)}")
            return False
    else:
        print_result(False, "GET appointments with status filter failed", response)
        return False


def test_appointments_search():
    """Test GET /api/clinic/clinic-1/appointments?q=<patient_name>"""
    print_test("4.5 GET /api/clinic/clinic-1/appointments?q=<search>")
    
    # First get an appointment to search for
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.get(f"{BASE_URL}/clinic/clinic-1/appointments", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        
        if len(data) > 0:
            # Get first patient name
            patient_name = data[0].get("patient_name", "")
            if patient_name:
                # Search for first few characters
                search_term = patient_name[:4]
                
                response2 = requests.get(f"{BASE_URL}/clinic/clinic-1/appointments?q={search_term}", headers=headers)
                
                if response2.status_code == 200:
                    search_data = response2.json()
                    
                    # Verify search works
                    if isinstance(search_data, list):
                        print_result(True, f"Search works. Query: '{search_term}', Results: {len(search_data)}")
                        return True
                    else:
                        print_result(False, f"Expected list, got {type(search_data)}")
                        return False
                else:
                    print_result(False, "Search request failed", response2)
                    return False
            else:
                print_result(True, "No patient name to search (skipped)")
                return True
        else:
            print_result(True, "No appointments to search (skipped)")
            return True
    else:
        print_result(False, "GET appointments failed", response)
        return False


def test_appointments_patient_forbidden():
    """Test GET /api/clinic/clinic-1/appointments as patient (should be 403)"""
    print_test("4.6 GET /api/clinic/clinic-1/appointments as Patient (should be 403)")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    response = requests.get(f"{BASE_URL}/clinic/clinic-1/appointments", headers=headers)
    
    if response.status_code == 403:
        print_result(True, "Patient correctly forbidden from accessing clinic appointments")
        return True
    else:
        print_result(False, f"Expected 403, got {response.status_code}", response)
        return False


# ============================================================================
# 5. GET /api/clinic/{clinic_id}/doctors
# ============================================================================

def test_clinic_doctors():
    """Test GET /api/clinic/clinic-1/doctors as admin"""
    print_test("5.1 GET /api/clinic/clinic-1/doctors as Admin")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.get(f"{BASE_URL}/clinic/clinic-1/doctors", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        
        # Verify it's a list with 2 doctors
        if isinstance(data, list) and len(data) == 2:
            # Check if doctors have today_count
            doc = data[0]
            has_today_count = "today_count" in doc
            is_integer = isinstance(doc.get("today_count"), int)
            
            if has_today_count and is_integer:
                print_result(True, f"Doctors list returned. Count: {len(data)}, First doctor today_count: {doc.get('today_count')}")
                return True
            else:
                print_result(False, f"Doctor missing today_count or not integer")
                return False
        else:
            print_result(False, f"Expected list with 2 doctors, got {len(data) if isinstance(data, list) else type(data)}")
            return False
    else:
        print_result(False, "GET doctors failed", response)
        return False


def test_clinic_doctors_wrong_clinic():
    """Test GET /api/clinic/clinic-2/doctors as admin (should be 403)"""
    print_test("5.2 GET /api/clinic/clinic-2/doctors as Admin (should be 403)")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.get(f"{BASE_URL}/clinic/clinic-2/doctors", headers=headers)
    
    if response.status_code == 403:
        print_result(True, "Admin correctly forbidden from accessing other clinic's doctors")
        return True
    else:
        print_result(False, f"Expected 403, got {response.status_code}", response)
        return False


# ============================================================================
# 6. GET /api/clinic/{clinic_id}/staff
# ============================================================================

def test_clinic_staff_admin():
    """Test GET /api/clinic/clinic-1/staff as admin"""
    print_test("6.1 GET /api/clinic/clinic-1/staff as Admin")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.get(f"{BASE_URL}/clinic/clinic-1/staff", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        
        # Verify it's a list
        if isinstance(data, list):
            # Check if seeded receptionist is present
            has_recep = any(s.get("email") == RECEPTIONIST_EMAIL for s in data)
            
            # Verify no password_hash field
            has_password = any("password_hash" in s for s in data)
            
            if has_recep and not has_password:
                print_result(True, f"Staff list returned. Count: {len(data)}, Has seeded receptionist, No password_hash")
                return True
            elif not has_recep:
                print_result(False, f"Seeded receptionist not found in staff list")
                return False
            else:
                print_result(False, f"Staff list contains password_hash field")
                return False
        else:
            print_result(False, f"Expected list, got {type(data)}")
            return False
    else:
        print_result(False, "GET staff failed", response)
        return False


def test_clinic_staff_receptionist_forbidden():
    """Test GET /api/clinic/clinic-1/staff as receptionist (should be 403)"""
    print_test("6.2 GET /api/clinic/clinic-1/staff as Receptionist (should be 403)")
    
    headers = {"Authorization": f"Bearer {receptionist_token}"}
    response = requests.get(f"{BASE_URL}/clinic/clinic-1/staff", headers=headers)
    
    if response.status_code == 403:
        print_result(True, "Receptionist correctly forbidden from accessing staff list")
        return True
    else:
        print_result(False, f"Expected 403, got {response.status_code}", response)
        return False


# ============================================================================
# 7. POST /api/clinic/{clinic_id}/staff
# ============================================================================

def test_create_staff_admin():
    """Test POST /api/clinic/clinic-1/staff as admin"""
    global new_staff_id
    print_test("7.1 POST /api/clinic/clinic-1/staff as Admin")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "full_name": "Test Recept",
        "email": new_staff_email,
        "phone": "+9779812340000",
        "password": "Test@123"
    }
    
    response = requests.post(f"{BASE_URL}/clinic/clinic-1/staff", headers=headers, json=payload)
    
    if response.status_code == 200:
        data = response.json()
        
        # Verify staff details
        role_ok = data.get("role") == "receptionist"
        clinic_ok = data.get("clinic_id") == "clinic-1"
        no_password = "password_hash" not in data
        
        if role_ok and clinic_ok and no_password:
            new_staff_id = data.get("id")
            print_result(True, f"Staff created. ID: {new_staff_id}, Role: {data.get('role')}, Clinic: {data.get('clinic_id')}")
            return True
        else:
            print_result(False, f"Staff data incorrect. Role: {data.get('role')}, Clinic: {data.get('clinic_id')}, Has password_hash: {'password_hash' in data}")
            return False
    else:
        print_result(False, "POST staff failed", response)
        return False


def test_create_staff_duplicate_email():
    """Test POST /api/clinic/clinic-1/staff with duplicate email (should be 400)"""
    print_test("7.2 POST /api/clinic/clinic-1/staff with duplicate email (should be 400)")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "full_name": "Test Recept 2",
        "email": new_staff_email,  # Same email
        "phone": "+9779812340001",
        "password": "Test@123"
    }
    
    response = requests.post(f"{BASE_URL}/clinic/clinic-1/staff", headers=headers, json=payload)
    
    if response.status_code == 400:
        print_result(True, "Duplicate email correctly rejected with 400")
        return True
    else:
        print_result(False, f"Expected 400, got {response.status_code}", response)
        return False


def test_create_staff_receptionist_forbidden():
    """Test POST /api/clinic/clinic-1/staff as receptionist (should be 403)"""
    print_test("7.3 POST /api/clinic/clinic-1/staff as Receptionist (should be 403)")
    
    headers = {"Authorization": f"Bearer {receptionist_token}"}
    payload = {
        "full_name": "Test Recept 3",
        "email": "test-recep3@heartclinic.np",
        "phone": "+9779812340002",
        "password": "Test@123"
    }
    
    response = requests.post(f"{BASE_URL}/clinic/clinic-1/staff", headers=headers, json=payload)
    
    if response.status_code == 403:
        print_result(True, "Receptionist correctly forbidden from creating staff")
        return True
    else:
        print_result(False, f"Expected 403, got {response.status_code}", response)
        return False


# ============================================================================
# 8. Login with newly created staff
# ============================================================================

def test_login_new_staff():
    """Test login with newly created staff"""
    print_test("8.1 Login with newly created staff")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": new_staff_email, "password": "Test@123"}
    )
    
    if response.status_code == 200:
        data = response.json()
        user = data.get("user", {})
        
        # Verify role and clinic_id
        role_ok = user.get("role") == "receptionist"
        clinic_ok = user.get("clinic_id") == "clinic-1"
        
        if role_ok and clinic_ok:
            print_result(True, f"New staff logged in. Role: {user.get('role')}, Clinic: {user.get('clinic_id')}")
            return True
        else:
            print_result(False, f"Wrong credentials. Role: {user.get('role')}, Clinic: {user.get('clinic_id')}")
            return False
    else:
        print_result(False, "New staff login failed", response)
        return False


# ============================================================================
# 9. DELETE /api/clinic/{clinic_id}/staff/{staff_id}
# ============================================================================

def test_delete_staff_admin():
    """Test DELETE /api/clinic/clinic-1/staff/{staff_id} as admin"""
    print_test("9.1 DELETE /api/clinic/clinic-1/staff/{staff_id} as Admin")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.delete(f"{BASE_URL}/clinic/clinic-1/staff/{new_staff_id}", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        
        if data.get("ok") == True:
            print_result(True, f"Staff deleted. ID: {new_staff_id}")
            return True
        else:
            print_result(False, f"Delete response incorrect: {data}")
            return False
    else:
        print_result(False, "DELETE staff failed", response)
        return False


def test_delete_staff_again():
    """Test DELETE /api/clinic/clinic-1/staff/{staff_id} again (should be 404)"""
    print_test("9.2 DELETE /api/clinic/clinic-1/staff/{staff_id} again (should be 404)")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.delete(f"{BASE_URL}/clinic/clinic-1/staff/{new_staff_id}", headers=headers)
    
    if response.status_code == 404:
        print_result(True, "Delete again correctly returns 404")
        return True
    else:
        print_result(False, f"Expected 404, got {response.status_code}", response)
        return False


# ============================================================================
# 10. POST /api/clinic/{clinic_id}/walk-in
# ============================================================================

def test_create_walk_in_admin():
    """Test POST /api/clinic/clinic-1/walk-in as admin"""
    global walk_in_appt_id
    print_test("10.1 POST /api/clinic/clinic-1/walk-in as Admin")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "doctor_id": "doc-1",
        "patient_name": "Test WalkIn",
        "patient_phone": "+9779841999888",
        "patient_age": 40,
        "patient_gender": "male",
        "symptoms": "Test symptoms"
    }
    
    response = requests.post(f"{BASE_URL}/clinic/clinic-1/walk-in", headers=headers, json=payload)
    
    if response.status_code == 200:
        data = response.json()
        
        # Verify walk-in details
        is_walk_in = data.get("is_walk_in") == True
        has_token = isinstance(data.get("token_number"), int) and data.get("token_number") >= 1
        doctor_ok = data.get("doctor_id") == "doc-1"
        doctor_name_ok = data.get("doctor_name") is not None
        payment_ok = data.get("payment_status") == "paid" and data.get("payment_method") == "cash"
        status_ok = data.get("status") == "confirmed"
        queue_ok = data.get("queue_status") == "waiting"
        symptoms_ok = data.get("patient_details", {}).get("symptoms") == "Test symptoms"
        
        if is_walk_in and has_token and doctor_ok and doctor_name_ok and payment_ok and status_ok and queue_ok and symptoms_ok:
            walk_in_appt_id = data.get("id")
            print_result(True, f"Walk-in created. ID: {walk_in_appt_id}, Token: {data.get('token_number')}, Doctor: {data.get('doctor_name')}")
            return True
        else:
            print_result(False, f"Walk-in data incorrect. is_walk_in: {data.get('is_walk_in')}, token: {data.get('token_number')}, doctor: {data.get('doctor_id')}, payment: {data.get('payment_status')}, status: {data.get('status')}, queue: {data.get('queue_status')}")
            return False
    else:
        print_result(False, "POST walk-in failed", response)
        return False


def test_create_walk_in_wrong_doctor():
    """Test POST /api/clinic/clinic-1/walk-in with doc-2 (not in clinic-1) (should be 400)"""
    print_test("10.2 POST /api/clinic/clinic-1/walk-in with doc-2 (should be 400)")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "doctor_id": "doc-2",  # Not in clinic-1
        "patient_name": "Test WalkIn 2",
        "patient_phone": "+9779841999889",
        "patient_age": 35,
        "patient_gender": "female",
        "symptoms": "Test symptoms 2"
    }
    
    response = requests.post(f"{BASE_URL}/clinic/clinic-1/walk-in", headers=headers, json=payload)
    
    if response.status_code == 400:
        print_result(True, "Wrong doctor correctly rejected with 400")
        return True
    else:
        print_result(False, f"Expected 400, got {response.status_code}", response)
        return False


def test_create_walk_in_receptionist():
    """Test POST /api/clinic/clinic-1/walk-in as receptionist"""
    global walk_in_appt_id_2
    print_test("10.3 POST /api/clinic/clinic-1/walk-in as Receptionist")
    
    headers = {"Authorization": f"Bearer {receptionist_token}"}
    payload = {
        "doctor_id": "doc-1",
        "patient_name": "Test WalkIn Recep",
        "patient_phone": "+9779841999890",
        "patient_age": 30,
        "patient_gender": "female",
        "symptoms": "Test symptoms recep"
    }
    
    response = requests.post(f"{BASE_URL}/clinic/clinic-1/walk-in", headers=headers, json=payload)
    
    if response.status_code == 200:
        data = response.json()
        walk_in_appt_id_2 = data.get("id")
        print_result(True, f"Receptionist can create walk-in. ID: {walk_in_appt_id_2}")
        return True
    else:
        print_result(False, "POST walk-in as receptionist failed", response)
        return False


# ============================================================================
# 11. PATCH /api/clinic/appointments/{appt_id}/status
# ============================================================================

def test_update_status_call_next():
    """Test PATCH /api/clinic/appointments/{appt_id}/status with action=call_next"""
    print_test("11.1 PATCH status with action=call_next")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {"action": "call_next"}
    
    response = requests.patch(f"{BASE_URL}/clinic/appointments/{walk_in_appt_id}/status", headers=headers, json=payload)
    
    if response.status_code == 200:
        data = response.json()
        
        # Verify status update
        queue_ok = data.get("queue_status") == "in_consultation"
        has_called_at = data.get("called_at") is not None
        
        if queue_ok and has_called_at:
            print_result(True, f"Status updated to in_consultation. called_at: {data.get('called_at')}")
            return True
        else:
            print_result(False, f"Status update incorrect. queue_status: {data.get('queue_status')}, called_at: {data.get('called_at')}")
            return False
    else:
        print_result(False, "PATCH status failed", response)
        return False


def test_update_status_complete():
    """Test PATCH /api/clinic/appointments/{appt_id}/status with action=complete"""
    print_test("11.2 PATCH status with action=complete")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {"action": "complete"}
    
    response = requests.patch(f"{BASE_URL}/clinic/appointments/{walk_in_appt_id}/status", headers=headers, json=payload)
    
    if response.status_code == 200:
        data = response.json()
        
        # Verify status update
        status_ok = data.get("status") == "completed"
        queue_ok = data.get("queue_status") == "completed"
        has_completed_at = data.get("completed_at") is not None
        
        if status_ok and queue_ok and has_completed_at:
            print_result(True, f"Status updated to completed. completed_at: {data.get('completed_at')}")
            return True
        else:
            print_result(False, f"Status update incorrect. status: {data.get('status')}, queue_status: {data.get('queue_status')}, completed_at: {data.get('completed_at')}")
            return False
    else:
        print_result(False, "PATCH status failed", response)
        return False


def test_update_status_no_show():
    """Test PATCH /api/clinic/appointments/{appt_id}/status with action=no_show"""
    global walk_in_appt_id_3
    print_test("11.3 PATCH status with action=no_show")
    
    # First create a new walk-in
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "doctor_id": "doc-1",
        "patient_name": "Test WalkIn NoShow",
        "patient_phone": "+9779841999891",
        "patient_age": 25,
        "patient_gender": "male",
        "symptoms": "Test symptoms no show"
    }
    
    response = requests.post(f"{BASE_URL}/clinic/clinic-1/walk-in", headers=headers, json=payload)
    
    if response.status_code == 200:
        data = response.json()
        walk_in_appt_id_3 = data.get("id")
        
        # Now update status to no_show
        payload2 = {"action": "no_show"}
        response2 = requests.patch(f"{BASE_URL}/clinic/appointments/{walk_in_appt_id_3}/status", headers=headers, json=payload2)
        
        if response2.status_code == 200:
            data2 = response2.json()
            
            # Verify status update
            status_ok = data2.get("status") == "cancelled"
            queue_ok = data2.get("queue_status") == "no_show"
            
            if status_ok and queue_ok:
                print_result(True, f"Status updated to no_show. status: {data2.get('status')}, queue_status: {data2.get('queue_status')}")
                return True
            else:
                print_result(False, f"Status update incorrect. status: {data2.get('status')}, queue_status: {data2.get('queue_status')}")
                return False
        else:
            print_result(False, "PATCH status failed", response2)
            return False
    else:
        print_result(False, "POST walk-in failed", response)
        return False


def test_update_status_check_in():
    """Test PATCH /api/clinic/appointments/{appt_id}/status with action=check_in"""
    print_test("11.4 PATCH status with action=check_in")
    
    # Use the second walk-in appointment
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {"action": "check_in"}
    
    response = requests.patch(f"{BASE_URL}/clinic/appointments/{walk_in_appt_id_2}/status", headers=headers, json=payload)
    
    if response.status_code == 200:
        data = response.json()
        
        # Verify status update
        queue_ok = data.get("queue_status") == "waiting"
        has_checked_in_at = data.get("checked_in_at") is not None
        
        if queue_ok and has_checked_in_at:
            print_result(True, f"Status updated to waiting (checked in). checked_in_at: {data.get('checked_in_at')}")
            return True
        else:
            print_result(False, f"Status update incorrect. queue_status: {data.get('queue_status')}, checked_in_at: {data.get('checked_in_at')}")
            return False
    else:
        print_result(False, "PATCH status failed", response)
        return False


def test_update_status_patient_forbidden():
    """Test PATCH /api/clinic/appointments/{appt_id}/status as patient (should be 403)"""
    print_test("11.5 PATCH status as Patient (should be 403)")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    payload = {"action": "complete"}
    
    response = requests.patch(f"{BASE_URL}/clinic/appointments/{walk_in_appt_id_2}/status", headers=headers, json=payload)
    
    if response.status_code == 403:
        print_result(True, "Patient correctly forbidden from updating appointment status")
        return True
    else:
        print_result(False, f"Expected 403, got {response.status_code}", response)
        return False


# ============================================================================
# 12. Cross-clinic auth verification
# ============================================================================

def test_cross_clinic_auth():
    """Test cross-clinic auth on status update"""
    print_test("12.1 Cross-clinic auth verification")
    
    # The walk-in was created in clinic-1
    # Patient user has no clinic_id, so should get 403
    headers = {"Authorization": f"Bearer {patient_token}"}
    payload = {"action": "complete"}
    
    response = requests.patch(f"{BASE_URL}/clinic/appointments/{walk_in_appt_id_2}/status", headers=headers, json=payload)
    
    if response.status_code == 403:
        print_result(True, "Cross-clinic auth works. Patient (no clinic) correctly forbidden")
        return True
    else:
        print_result(False, f"Expected 403, got {response.status_code}", response)
        return False


# ============================================================================
# 13. Regression tests for Iteration 4
# ============================================================================

def test_regression_family():
    """Test GET /api/family still works"""
    print_test("13.1 Regression: GET /api/family")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    response = requests.get(f"{BASE_URL}/family", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        
        # Verify it's a list with self member
        if isinstance(data, list):
            has_self = any(m.get("relation") == "self" for m in data)
            
            if has_self:
                print_result(True, f"Family endpoint still works. Count: {len(data)}, Has self member")
                return True
            else:
                print_result(False, f"Self member not found")
                return False
        else:
            print_result(False, f"Expected list, got {type(data)}")
            return False
    else:
        print_result(False, "GET /api/family failed", response)
        return False


def test_regression_reminders():
    """Test POST /api/reminders still works"""
    print_test("13.2 Regression: POST /api/reminders")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    payload = {
        "medicine_name": "Test Medicine Regression",
        "times": ["09:00", "21:00"],
        "duration_days": 5
    }
    
    response = requests.post(f"{BASE_URL}/reminders", headers=headers, json=payload)
    
    if response.status_code == 200:
        data = response.json()
        
        # Verify reminder created
        if data.get("medicine_name") == "Test Medicine Regression":
            print_result(True, f"Reminders endpoint still works. ID: {data.get('id')}")
            return True
        else:
            print_result(False, f"Reminder data incorrect")
            return False
    else:
        print_result(False, "POST /api/reminders failed", response)
        return False


def test_regression_reviews():
    """Test POST /api/doctors/{id}/reviews still works"""
    print_test("13.3 Regression: POST /api/doctors/doc-1/reviews")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    payload = {
        "rating": 5,
        "comment": "Test review regression"
    }
    
    response = requests.post(f"{BASE_URL}/doctors/doc-1/reviews", headers=headers, json=payload)
    
    if response.status_code == 200:
        data = response.json()
        
        # Verify review created/updated
        if data.get("rating") == 5:
            print_result(True, f"Reviews endpoint still works. ID: {data.get('id')}")
            return True
        else:
            print_result(False, f"Review data incorrect")
            return False
    else:
        print_result(False, "POST /api/doctors/doc-1/reviews failed", response)
        return False


# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

def run_all_tests():
    """Run all tests in sequence"""
    print("\n" + "="*80)
    print("HAMRODOCTOR ITERATION 5 - BACKEND API TESTS")
    print("Clinic Admin & Receptionist Panels")
    print("="*80)
    
    # 1. Login tests
    if not test_login_patient():
        print("\n⚠️  Patient login failed. Some tests may be skipped.")
    
    if not test_login_doctor():
        print("\n⚠️  Doctor login failed. Some tests may be skipped.")
    
    if not test_login_admin():
        print("\n⚠️  Admin login failed. Aborting remaining tests.")
        print_summary()
        return
    
    if not test_login_receptionist():
        print("\n⚠️  Receptionist login failed. Some tests may be skipped.")
    
    # 2. GET /api/clinic/mine
    test_clinic_mine_admin()
    test_clinic_mine_receptionist()
    test_clinic_mine_patient_forbidden()
    test_clinic_mine_no_token()
    
    # 3. GET /api/clinic/{clinic_id}/dashboard
    test_dashboard_admin()
    test_dashboard_wrong_clinic()
    test_dashboard_receptionist()
    test_dashboard_patient_forbidden()
    
    # 4. GET /api/clinic/{clinic_id}/appointments
    test_appointments_list()
    test_appointments_filter_date()
    test_appointments_filter_doctor()
    test_appointments_filter_status()
    test_appointments_search()
    test_appointments_patient_forbidden()
    
    # 5. GET /api/clinic/{clinic_id}/doctors
    test_clinic_doctors()
    test_clinic_doctors_wrong_clinic()
    
    # 6. GET /api/clinic/{clinic_id}/staff
    test_clinic_staff_admin()
    test_clinic_staff_receptionist_forbidden()
    
    # 7. POST /api/clinic/{clinic_id}/staff
    test_create_staff_admin()
    test_create_staff_duplicate_email()
    test_create_staff_receptionist_forbidden()
    
    # 8. Login with newly created staff
    if new_staff_id:
        test_login_new_staff()
    
    # 9. DELETE /api/clinic/{clinic_id}/staff/{staff_id}
    if new_staff_id:
        test_delete_staff_admin()
        test_delete_staff_again()
    
    # 10. POST /api/clinic/{clinic_id}/walk-in
    test_create_walk_in_admin()
    test_create_walk_in_wrong_doctor()
    test_create_walk_in_receptionist()
    
    # 11. PATCH /api/clinic/appointments/{appt_id}/status
    if walk_in_appt_id:
        test_update_status_call_next()
        test_update_status_complete()
    
    test_update_status_no_show()
    
    if walk_in_appt_id_2:
        test_update_status_check_in()
        test_update_status_patient_forbidden()
    
    # 12. Cross-clinic auth
    if walk_in_appt_id_2:
        test_cross_clinic_auth()
    
    # 13. Regression tests
    if patient_token:
        test_regression_family()
        test_regression_reminders()
        test_regression_reviews()
    
    # Print summary
    print_summary()


if __name__ == "__main__":
    run_all_tests()
