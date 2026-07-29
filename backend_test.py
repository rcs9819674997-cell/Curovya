"""
Backend API Tests for HamroDoctor Iteration 4
Tests Family Members, Medicine Reminders, and Doctor Reviews
"""
import os
import requests
import json
from datetime import datetime, timedelta


# Base URL from environment
BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "http://localhost:8000/api").rstrip("/")

# Test credentials
PATIENT_EMAIL = "patient@hamrodoctor.np"
PATIENT_PASSWORD = "Patient@123"
PATIENT_ID = "patient-demo"

DOCTOR_EMAIL = "doctor@hamrodoctor.np"
DOCTOR_PASSWORD = "Doctor@123"
DOCTOR_ID = "doc-1"

# Global token storage
patient_token = None
doctor_token = None

# Test data storage
test_family_member_id = None
test_reminder_id = None
test_prescription_id = None


def print_test(name):
    """Print test name"""
    print(f"\n{'='*80}")
    print(f"TEST: {name}")
    print('='*80)


def print_result(passed, message, response=None):
    """Print test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {message}")
    if response and not passed:
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")


def login_patient():
    """Login as patient and get token"""
    global patient_token
    print_test("Login as Patient")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": PATIENT_EMAIL, "password": PATIENT_PASSWORD}
    )
    
    if response.status_code == 200:
        data = response.json()
        patient_token = data.get("access_token")
        print_result(True, f"Patient logged in successfully. Token: {patient_token[:20]}...")
        return True
    else:
        print_result(False, "Patient login failed", response)
        return False


def login_doctor():
    """Login as doctor and get token"""
    global doctor_token
    print_test("Login as Doctor")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": DOCTOR_EMAIL, "password": DOCTOR_PASSWORD}
    )
    
    if response.status_code == 200:
        data = response.json()
        doctor_token = data.get("access_token")
        print_result(True, f"Doctor logged in successfully. Token: {doctor_token[:20]}...")
        return True
    else:
        print_result(False, "Doctor login failed", response)
        return False


# ============================================================================
# FAMILY MEMBERS TESTS
# ============================================================================

def test_family_get_auto_creates_self():
    """Test GET /api/family auto-creates self member on first call"""
    print_test("GET /api/family - Auto-creates self member")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    response = requests.get(f"{BASE_URL}/family", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        has_self = any(m.get("relation") == "self" for m in data)
        print_result(has_self, f"Self member exists in family list. Total members: {len(data)}", response)
        return has_self
    else:
        print_result(False, "Failed to get family members", response)
        return False


def test_family_get_without_auth():
    """Test GET /api/family without auth returns 401"""
    print_test("GET /api/family - Without auth (should 401)")
    
    response = requests.get(f"{BASE_URL}/family")
    passed = response.status_code == 401
    print_result(passed, f"Returns 401 without auth: {response.status_code}", response)
    return passed


def test_family_create_member():
    """Test POST /api/family creates a family member"""
    global test_family_member_id
    print_test("POST /api/family - Create family member")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    payload = {
        "full_name": "Test Spouse",
        "relation": "spouse",
        "age": 30,
        "gender": "female",
        "blood_group": "A+",
        "phone": "9841234567",
        "allergies": "Peanuts",
        "medical_conditions": "None"
    }
    
    response = requests.post(f"{BASE_URL}/family", json=payload, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        test_family_member_id = data.get("id")
        passed = (
            data.get("full_name") == "Test Spouse" and
            data.get("relation") == "spouse" and
            data.get("id") is not None
        )
        print_result(passed, f"Family member created. ID: {test_family_member_id}", response)
        return passed
    else:
        print_result(False, "Failed to create family member", response)
        return False


def test_family_create_duplicate_self():
    """Test POST /api/family with relation=self when self exists returns 400"""
    print_test("POST /api/family - Duplicate self (should 400)")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    payload = {
        "full_name": "Another Self",
        "relation": "self"
    }
    
    response = requests.post(f"{BASE_URL}/family", json=payload, headers=headers)
    passed = response.status_code == 400 and "already exists" in response.text.lower()
    print_result(passed, f"Returns 400 for duplicate self: {response.status_code}", response)
    return passed


def test_family_update_member():
    """Test PATCH /api/family/{id} updates a family member"""
    print_test("PATCH /api/family/{id} - Update family member")
    
    if not test_family_member_id:
        print_result(False, "No family member ID to update")
        return False
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    payload = {
        "age": 31,
        "allergies": "Peanuts, Shellfish"
    }
    
    response = requests.patch(
        f"{BASE_URL}/family/{test_family_member_id}",
        json=payload,
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        passed = data.get("age") == 31 and "Shellfish" in data.get("allergies", "")
        print_result(passed, f"Family member updated. Age: {data.get('age')}", response)
        return passed
    else:
        print_result(False, "Failed to update family member", response)
        return False


def test_family_update_nonexistent():
    """Test PATCH /api/family/{id} with nonexistent ID returns 404"""
    print_test("PATCH /api/family/{id} - Nonexistent ID (should 404)")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    payload = {"age": 25}
    
    response = requests.patch(
        f"{BASE_URL}/family/nonexistent-id-12345",
        json=payload,
        headers=headers
    )
    
    passed = response.status_code == 404
    print_result(passed, f"Returns 404 for nonexistent ID: {response.status_code}", response)
    return passed


def test_family_delete_self():
    """Test DELETE /api/family/{id} with self relation returns 400"""
    print_test("DELETE /api/family/{id} - Delete self (should 400)")
    
    # First get the self member ID
    headers = {"Authorization": f"Bearer {patient_token}"}
    response = requests.get(f"{BASE_URL}/family", headers=headers)
    
    if response.status_code != 200:
        print_result(False, "Failed to get family members", response)
        return False
    
    data = response.json()
    self_member = next((m for m in data if m.get("relation") == "self"), None)
    
    if not self_member:
        print_result(False, "No self member found")
        return False
    
    # Try to delete self
    response = requests.delete(
        f"{BASE_URL}/family/{self_member['id']}",
        headers=headers
    )
    
    passed = response.status_code == 400 and "cannot delete" in response.text.lower()
    print_result(passed, f"Returns 400 when deleting self: {response.status_code}", response)
    return passed


def test_family_delete_member():
    """Test DELETE /api/family/{id} deletes a family member"""
    print_test("DELETE /api/family/{id} - Delete family member")
    
    if not test_family_member_id:
        print_result(False, "No family member ID to delete")
        return False
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    response = requests.delete(
        f"{BASE_URL}/family/{test_family_member_id}",
        headers=headers
    )
    
    passed = response.status_code == 200
    print_result(passed, f"Family member deleted: {response.status_code}", response)
    return passed


def test_family_delete_nonexistent():
    """Test DELETE /api/family/{id} with nonexistent ID returns 404"""
    print_test("DELETE /api/family/{id} - Nonexistent ID (should 404)")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    response = requests.delete(
        f"{BASE_URL}/family/nonexistent-id-12345",
        headers=headers
    )
    
    passed = response.status_code == 404
    print_result(passed, f"Returns 404 for nonexistent ID: {response.status_code}", response)
    return passed


# ============================================================================
# MEDICINE REMINDERS TESTS
# ============================================================================

def test_reminders_create():
    """Test POST /api/reminders creates a reminder"""
    global test_reminder_id
    print_test("POST /api/reminders - Create reminder")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    payload = {
        "medicine_name": "Paracetamol",
        "dosage": "500mg",
        "times": ["08:00", "20:00"],
        "duration_days": 5,
        "instructions": "Take after meals"
    }
    
    response = requests.post(f"{BASE_URL}/reminders", json=payload, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        test_reminder_id = data.get("id")
        
        # Verify computed dates
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        
        passed = (
            data.get("medicine_name") == "Paracetamol" and
            data.get("times") == ["08:00", "20:00"] and
            data.get("duration_days") == 5 and
            start_date is not None and
            end_date is not None
        )
        print_result(passed, f"Reminder created. ID: {test_reminder_id}, Start: {start_date}, End: {end_date}", response)
        return passed
    else:
        print_result(False, "Failed to create reminder", response)
        return False


def test_reminders_create_empty_times():
    """Test POST /api/reminders with empty times returns 400"""
    print_test("POST /api/reminders - Empty times (should 400)")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    payload = {
        "medicine_name": "Test Med",
        "dosage": "100mg",
        "times": [],
        "duration_days": 5
    }
    
    response = requests.post(f"{BASE_URL}/reminders", json=payload, headers=headers)
    passed = response.status_code == 400 and "at least one" in response.text.lower()
    print_result(passed, f"Returns 400 for empty times: {response.status_code}", response)
    return passed


def test_reminders_create_zero_duration():
    """Test POST /api/reminders with duration_days=0 returns 400"""
    print_test("POST /api/reminders - Zero duration (should 400)")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    payload = {
        "medicine_name": "Test Med",
        "dosage": "100mg",
        "times": ["08:00"],
        "duration_days": 0
    }
    
    response = requests.post(f"{BASE_URL}/reminders", json=payload, headers=headers)
    passed = response.status_code == 400 and "must be > 0" in response.text.lower()
    print_result(passed, f"Returns 400 for zero duration: {response.status_code}", response)
    return passed


def test_reminders_list():
    """Test GET /api/reminders lists reminders"""
    print_test("GET /api/reminders - List reminders")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    response = requests.get(f"{BASE_URL}/reminders", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        passed = isinstance(data, list) and len(data) > 0
        print_result(passed, f"Reminders listed. Count: {len(data)}", response)
        return passed
    else:
        print_result(False, "Failed to list reminders", response)
        return False


def test_reminders_list_active_filter():
    """Test GET /api/reminders?active=true filters active reminders"""
    print_test("GET /api/reminders?active=true - Filter active")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    response = requests.get(f"{BASE_URL}/reminders?active=true", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        all_active = all(r.get("active") == True for r in data)
        passed = isinstance(data, list) and all_active
        print_result(passed, f"Active reminders filtered. Count: {len(data)}", response)
        return passed
    else:
        print_result(False, "Failed to filter active reminders", response)
        return False


def test_reminders_update():
    """Test PATCH /api/reminders/{id} updates reminder"""
    print_test("PATCH /api/reminders/{id} - Update reminder")
    
    if not test_reminder_id:
        print_result(False, "No reminder ID to update")
        return False
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    payload = {"duration_days": 10}
    
    response = requests.patch(
        f"{BASE_URL}/reminders/{test_reminder_id}",
        json=payload,
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        passed = data.get("duration_days") == 10
        print_result(passed, f"Reminder updated. Duration: {data.get('duration_days')}, End: {data.get('end_date')}", response)
        return passed
    else:
        print_result(False, "Failed to update reminder", response)
        return False


def test_reminders_update_deactivate():
    """Test PATCH /api/reminders/{id} with active=false deactivates"""
    print_test("PATCH /api/reminders/{id} - Deactivate reminder")
    
    if not test_reminder_id:
        print_result(False, "No reminder ID to deactivate")
        return False
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    payload = {"active": False}
    
    response = requests.patch(
        f"{BASE_URL}/reminders/{test_reminder_id}",
        json=payload,
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        passed = data.get("active") == False
        print_result(passed, f"Reminder deactivated. Active: {data.get('active')}", response)
        
        # Reactivate for further tests
        requests.patch(
            f"{BASE_URL}/reminders/{test_reminder_id}",
            json={"active": True},
            headers=headers
        )
        return passed
    else:
        print_result(False, "Failed to deactivate reminder", response)
        return False


def test_reminders_log_dose():
    """Test POST /api/reminders/{id}/log creates dose log"""
    print_test("POST /api/reminders/{id}/log - Log dose")
    
    if not test_reminder_id:
        print_result(False, "No reminder ID to log dose")
        return False
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    payload = {
        "time": "08:00",
        "status": "taken"
    }
    
    response = requests.post(
        f"{BASE_URL}/reminders/{test_reminder_id}/log",
        json=payload,
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        passed = (
            data.get("time") == "08:00" and
            data.get("status") == "taken" and
            data.get("id") is not None
        )
        print_result(passed, f"Dose logged. ID: {data.get('id')}, Status: {data.get('status')}", response)
        return passed
    else:
        print_result(False, "Failed to log dose", response)
        return False


def test_reminders_log_dose_upsert():
    """Test POST /api/reminders/{id}/log upserts (updates existing log)"""
    print_test("POST /api/reminders/{id}/log - Upsert dose log")
    
    if not test_reminder_id:
        print_result(False, "No reminder ID to log dose")
        return False
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    
    # First log
    payload1 = {"time": "20:00", "status": "taken"}
    response1 = requests.post(
        f"{BASE_URL}/reminders/{test_reminder_id}/log",
        json=payload1,
        headers=headers
    )
    
    if response1.status_code != 200:
        print_result(False, "Failed to create first log", response1)
        return False
    
    log_id_1 = response1.json().get("id")
    
    # Second log with same time but different status
    payload2 = {"time": "20:00", "status": "skipped"}
    response2 = requests.post(
        f"{BASE_URL}/reminders/{test_reminder_id}/log",
        json=payload2,
        headers=headers
    )
    
    if response2.status_code == 200:
        data = response2.json()
        log_id_2 = data.get("id")
        passed = (
            log_id_1 == log_id_2 and
            data.get("status") == "skipped"
        )
        print_result(passed, f"Dose log upserted. Same ID: {log_id_1 == log_id_2}, Status: {data.get('status')}", response2)
        return passed
    else:
        print_result(False, "Failed to upsert dose log", response2)
        return False


def test_reminders_today():
    """Test GET /api/reminders/today returns today's doses"""
    print_test("GET /api/reminders/today - Today's doses")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    response = requests.get(f"{BASE_URL}/reminders/today", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        passed = (
            "date" in data and
            "doses" in data and
            "counts" in data and
            "adherence_pct" in data and
            isinstance(data["doses"], list) and
            isinstance(data["counts"], dict)
        )
        print_result(
            passed,
            f"Today's doses retrieved. Date: {data.get('date')}, Total: {data.get('counts', {}).get('total')}, Adherence: {data.get('adherence_pct')}%",
            response
        )
        return passed
    else:
        print_result(False, "Failed to get today's doses", response)
        return False


def test_reminders_get_logs():
    """Test GET /api/reminders/{id}/logs lists dose logs"""
    print_test("GET /api/reminders/{id}/logs - List dose logs")
    
    if not test_reminder_id:
        print_result(False, "No reminder ID to get logs")
        return False
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    response = requests.get(
        f"{BASE_URL}/reminders/{test_reminder_id}/logs",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        passed = isinstance(data, list) and len(data) > 0
        print_result(passed, f"Dose logs retrieved. Count: {len(data)}", response)
        return passed
    else:
        print_result(False, "Failed to get dose logs", response)
        return False


def test_reminders_from_prescription():
    """Test POST /api/reminders/from-prescription/{rx_id} creates reminders"""
    global test_prescription_id
    print_test("POST /api/reminders/from-prescription/{rx_id} - Auto-create from prescription")
    
    # First, get a prescription ID
    headers = {"Authorization": f"Bearer {patient_token}"}
    response = requests.get(f"{BASE_URL}/prescriptions", headers=headers)
    
    if response.status_code != 200:
        print_result(False, "Failed to get prescriptions", response)
        return False
    
    prescriptions = response.json()
    if not prescriptions:
        print_result(False, "No prescriptions found for patient")
        return False
    
    test_prescription_id = prescriptions[0].get("id")
    
    # Create reminders from prescription
    response = requests.post(
        f"{BASE_URL}/reminders/from-prescription/{test_prescription_id}",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        passed = (
            data.get("ok") == True and
            data.get("count") > 0 and
            isinstance(data.get("reminders"), list)
        )
        print_result(passed, f"Reminders created from prescription. Count: {data.get('count')}", response)
        return passed
    else:
        print_result(False, "Failed to create reminders from prescription", response)
        return False


def test_reminders_from_prescription_nonexistent():
    """Test POST /api/reminders/from-prescription/{rx_id} with nonexistent ID returns 404"""
    print_test("POST /api/reminders/from-prescription/{rx_id} - Nonexistent ID (should 404)")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    response = requests.post(
        f"{BASE_URL}/reminders/from-prescription/nonexistent-rx-12345",
        headers=headers
    )
    
    passed = response.status_code == 404
    print_result(passed, f"Returns 404 for nonexistent prescription: {response.status_code}", response)
    return passed


def test_reminders_delete_cascades():
    """Test DELETE /api/reminders/{id} deletes reminder and cascades to dose_logs"""
    print_test("DELETE /api/reminders/{id} - Delete reminder (cascades to logs)")
    
    if not test_reminder_id:
        print_result(False, "No reminder ID to delete")
        return False
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    
    # First verify logs exist
    logs_response = requests.get(
        f"{BASE_URL}/reminders/{test_reminder_id}/logs",
        headers=headers
    )
    
    if logs_response.status_code != 200:
        print_result(False, "Failed to get logs before delete", logs_response)
        return False
    
    logs_before = logs_response.json()
    
    # Delete reminder
    response = requests.delete(
        f"{BASE_URL}/reminders/{test_reminder_id}",
        headers=headers
    )
    
    if response.status_code == 200:
        # Verify reminder is deleted
        get_response = requests.get(
            f"{BASE_URL}/reminders/{test_reminder_id}/logs",
            headers=headers
        )
        passed = get_response.status_code == 404
        print_result(passed, f"Reminder deleted. Logs before: {len(logs_before)}, Cascade verified: {passed}", response)
        return passed
    else:
        print_result(False, "Failed to delete reminder", response)
        return False


def test_reminders_without_auth():
    """Test reminder endpoints without auth return 401"""
    print_test("Reminder endpoints - Without auth (should 401)")
    
    tests = [
        ("GET /api/reminders", requests.get(f"{BASE_URL}/reminders")),
        ("POST /api/reminders", requests.post(f"{BASE_URL}/reminders", json={})),
        ("GET /api/reminders/today", requests.get(f"{BASE_URL}/reminders/today")),
    ]
    
    all_passed = True
    for name, response in tests:
        passed = response.status_code == 401
        print_result(passed, f"{name} returns 401: {response.status_code}", response)
        all_passed = all_passed and passed
    
    return all_passed


# ============================================================================
# DOCTOR REVIEWS TESTS
# ============================================================================

def test_reviews_submit_with_appointment():
    """Test POST /api/doctors/{id}/reviews with valid appointment"""
    print_test("POST /api/doctors/{id}/reviews - Submit review (with appointment)")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    payload = {
        "rating": 5,
        "comment": "Excellent doctor! Very professional and caring."
    }
    
    response = requests.post(
        f"{BASE_URL}/doctors/{DOCTOR_ID}/reviews",
        json=payload,
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        passed = (
            data.get("rating") == 5 and
            data.get("comment") == payload["comment"] and
            data.get("doctor_id") == DOCTOR_ID and
            data.get("id") is not None
        )
        print_result(passed, f"Review submitted. ID: {data.get('id')}, Rating: {data.get('rating')}", response)
        return passed
    else:
        print_result(False, "Failed to submit review", response)
        return False


def test_reviews_submit_without_appointment():
    """Test POST /api/doctors/{id}/reviews without appointment returns 400"""
    print_test("POST /api/doctors/{id}/reviews - Without appointment (should 400)")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    payload = {
        "rating": 4,
        "comment": "Good doctor"
    }
    
    # doc-6 is a doctor the patient has no appointment with
    response = requests.post(
        f"{BASE_URL}/doctors/doc-6/reviews",
        json=payload,
        headers=headers
    )
    
    passed = response.status_code == 400 and "appointment" in response.text.lower()
    print_result(passed, f"Returns 400 without appointment: {response.status_code}", response)
    return passed


def test_reviews_update_existing():
    """Test POST /api/doctors/{id}/reviews updates existing review"""
    print_test("POST /api/doctors/{id}/reviews - Update existing review")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    
    # First submission
    payload1 = {
        "rating": 4,
        "comment": "Good doctor, but wait time was long"
    }
    response1 = requests.post(
        f"{BASE_URL}/doctors/{DOCTOR_ID}/reviews",
        json=payload1,
        headers=headers
    )
    
    if response1.status_code != 200:
        print_result(False, "Failed to submit first review", response1)
        return False
    
    review_id_1 = response1.json().get("id")
    
    # Second submission (should update)
    payload2 = {
        "rating": 5,
        "comment": "Updated: Actually excellent! Wait was worth it."
    }
    response2 = requests.post(
        f"{BASE_URL}/doctors/{DOCTOR_ID}/reviews",
        json=payload2,
        headers=headers
    )
    
    if response2.status_code == 200:
        data = response2.json()
        review_id_2 = data.get("id")
        passed = (
            review_id_1 == review_id_2 and
            data.get("rating") == 5 and
            "Updated" in data.get("comment", "")
        )
        print_result(passed, f"Review updated. Same ID: {review_id_1 == review_id_2}, New rating: {data.get('rating')}", response2)
        return passed
    else:
        print_result(False, "Failed to update review", response2)
        return False


def test_reviews_invalid_rating():
    """Test POST /api/doctors/{id}/reviews with invalid rating returns 422"""
    print_test("POST /api/doctors/{id}/reviews - Invalid rating (should 422)")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    
    tests = [
        ("rating=0", {"rating": 0, "comment": "Test"}),
        ("rating=6", {"rating": 6, "comment": "Test"}),
    ]
    
    all_passed = True
    for name, payload in tests:
        response = requests.post(
            f"{BASE_URL}/doctors/{DOCTOR_ID}/reviews",
            json=payload,
            headers=headers
        )
        passed = response.status_code == 422
        print_result(passed, f"{name} returns 422: {response.status_code}", response)
        all_passed = all_passed and passed
    
    return all_passed


def test_reviews_nonexistent_doctor():
    """Test POST /api/doctors/{id}/reviews with nonexistent doctor returns 404"""
    print_test("POST /api/doctors/{id}/reviews - Nonexistent doctor (should 404)")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    payload = {
        "rating": 5,
        "comment": "Test"
    }
    
    response = requests.post(
        f"{BASE_URL}/doctors/nonexistent-doc-12345/reviews",
        json=payload,
        headers=headers
    )
    
    passed = response.status_code == 404
    print_result(passed, f"Returns 404 for nonexistent doctor: {response.status_code}", response)
    return passed


def test_reviews_get_my_review():
    """Test GET /api/doctors/{id}/my-review returns user's review"""
    print_test("GET /api/doctors/{id}/my-review - Get my review")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    response = requests.get(
        f"{BASE_URL}/doctors/{DOCTOR_ID}/my-review",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        passed = (
            isinstance(data, dict) and
            (data.get("doctor_id") == DOCTOR_ID or len(data) == 0)
        )
        print_result(passed, f"My review retrieved. Has review: {len(data) > 0}", response)
        return passed
    else:
        print_result(False, "Failed to get my review", response)
        return False


def test_reviews_get_my_review_none():
    """Test GET /api/doctors/{id}/my-review returns {} when no review exists"""
    print_test("GET /api/doctors/{id}/my-review - No review (should return {})")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    # doc-2 is a doctor the patient hasn't reviewed
    response = requests.get(
        f"{BASE_URL}/doctors/doc-2/my-review",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        passed = isinstance(data, dict) and len(data) == 0
        print_result(passed, f"Returns empty object: {data}", response)
        return passed
    else:
        print_result(False, "Failed to get my review", response)
        return False


def test_reviews_doctor_aggregate_updated():
    """Test doctor's aggregate rating and review_count are updated"""
    print_test("Doctor aggregate - Rating and review_count updated")
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    
    # Get doctor details
    response = requests.get(f"{BASE_URL}/doctors/{DOCTOR_ID}", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        passed = (
            "rating" in data and
            "review_count" in data and
            data.get("review_count") > 0
        )
        print_result(passed, f"Doctor aggregate updated. Rating: {data.get('rating')}, Reviews: {data.get('review_count')}", response)
        return passed
    else:
        print_result(False, "Failed to get doctor details", response)
        return False


def test_reviews_without_auth():
    """Test review endpoints without auth return 401"""
    print_test("Review endpoints - Without auth (should 401)")
    
    tests = [
        ("POST /api/doctors/{id}/reviews", requests.post(f"{BASE_URL}/doctors/{DOCTOR_ID}/reviews", json={})),
        ("GET /api/doctors/{id}/my-review", requests.get(f"{BASE_URL}/doctors/{DOCTOR_ID}/my-review")),
    ]
    
    all_passed = True
    for name, response in tests:
        passed = response.status_code == 401
        print_result(passed, f"{name} returns 401: {response.status_code}", response)
        all_passed = all_passed and passed
    
    return all_passed


# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

def run_all_tests():
    """Run all backend tests"""
    print("\n" + "="*80)
    print("HAMRODOCTOR ITERATION 4 - BACKEND API TESTS")
    print("="*80)
    
    results = {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "tests": []
    }
    
    # Login
    if not login_patient():
        print("\n❌ CRITICAL: Patient login failed. Cannot proceed with tests.")
        return results
    
    if not login_doctor():
        print("\n⚠️  WARNING: Doctor login failed. Some tests may be skipped.")
    
    # Family Members Tests
    print("\n" + "="*80)
    print("FAMILY MEMBERS TESTS")
    print("="*80)
    
    family_tests = [
        ("GET /api/family - Auto-creates self", test_family_get_auto_creates_self),
        ("GET /api/family - Without auth", test_family_get_without_auth),
        ("POST /api/family - Create member", test_family_create_member),
        ("POST /api/family - Duplicate self", test_family_create_duplicate_self),
        ("PATCH /api/family/{id} - Update member", test_family_update_member),
        ("PATCH /api/family/{id} - Nonexistent ID", test_family_update_nonexistent),
        ("DELETE /api/family/{id} - Delete self", test_family_delete_self),
        ("DELETE /api/family/{id} - Delete member", test_family_delete_member),
        ("DELETE /api/family/{id} - Nonexistent ID", test_family_delete_nonexistent),
    ]
    
    for name, test_func in family_tests:
        results["total"] += 1
        try:
            passed = test_func()
            if passed:
                results["passed"] += 1
            else:
                results["failed"] += 1
            results["tests"].append({"name": name, "passed": passed})
        except Exception as e:
            print_result(False, f"Exception: {str(e)}")
            results["failed"] += 1
            results["tests"].append({"name": name, "passed": False, "error": str(e)})
    
    # Medicine Reminders Tests
    print("\n" + "="*80)
    print("MEDICINE REMINDERS TESTS")
    print("="*80)
    
    reminder_tests = [
        ("POST /api/reminders - Create", test_reminders_create),
        ("POST /api/reminders - Empty times", test_reminders_create_empty_times),
        ("POST /api/reminders - Zero duration", test_reminders_create_zero_duration),
        ("GET /api/reminders - List", test_reminders_list),
        ("GET /api/reminders?active=true - Filter", test_reminders_list_active_filter),
        ("PATCH /api/reminders/{id} - Update", test_reminders_update),
        ("PATCH /api/reminders/{id} - Deactivate", test_reminders_update_deactivate),
        ("POST /api/reminders/{id}/log - Log dose", test_reminders_log_dose),
        ("POST /api/reminders/{id}/log - Upsert", test_reminders_log_dose_upsert),
        ("GET /api/reminders/today - Today's doses", test_reminders_today),
        ("GET /api/reminders/{id}/logs - List logs", test_reminders_get_logs),
        ("POST /api/reminders/from-prescription/{rx_id} - Auto-create", test_reminders_from_prescription),
        ("POST /api/reminders/from-prescription/{rx_id} - Nonexistent", test_reminders_from_prescription_nonexistent),
        ("DELETE /api/reminders/{id} - Cascade delete", test_reminders_delete_cascades),
        ("Reminder endpoints - Without auth", test_reminders_without_auth),
    ]
    
    for name, test_func in reminder_tests:
        results["total"] += 1
        try:
            passed = test_func()
            if passed:
                results["passed"] += 1
            else:
                results["failed"] += 1
            results["tests"].append({"name": name, "passed": passed})
        except Exception as e:
            print_result(False, f"Exception: {str(e)}")
            results["failed"] += 1
            results["tests"].append({"name": name, "passed": False, "error": str(e)})
    
    # Doctor Reviews Tests
    print("\n" + "="*80)
    print("DOCTOR REVIEWS TESTS")
    print("="*80)
    
    review_tests = [
        ("POST /api/doctors/{id}/reviews - With appointment", test_reviews_submit_with_appointment),
        ("POST /api/doctors/{id}/reviews - Without appointment", test_reviews_submit_without_appointment),
        ("POST /api/doctors/{id}/reviews - Update existing", test_reviews_update_existing),
        ("POST /api/doctors/{id}/reviews - Invalid rating", test_reviews_invalid_rating),
        ("POST /api/doctors/{id}/reviews - Nonexistent doctor", test_reviews_nonexistent_doctor),
        ("GET /api/doctors/{id}/my-review - Get my review", test_reviews_get_my_review),
        ("GET /api/doctors/{id}/my-review - No review", test_reviews_get_my_review_none),
        ("Doctor aggregate - Rating updated", test_reviews_doctor_aggregate_updated),
        ("Review endpoints - Without auth", test_reviews_without_auth),
    ]
    
    for name, test_func in review_tests:
        results["total"] += 1
        try:
            passed = test_func()
            if passed:
                results["passed"] += 1
            else:
                results["failed"] += 1
            results["tests"].append({"name": name, "passed": passed})
        except Exception as e:
            print_result(False, f"Exception: {str(e)}")
            results["failed"] += 1
            results["tests"].append({"name": name, "passed": False, "error": str(e)})
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"Total Tests: {results['total']}")
    print(f"✅ Passed: {results['passed']}")
    print(f"❌ Failed: {results['failed']}")
    print(f"Success Rate: {(results['passed'] / results['total'] * 100):.1f}%")
    
    if results['failed'] > 0:
        print("\n" + "="*80)
        print("FAILED TESTS:")
        print("="*80)
        for test in results['tests']:
            if not test['passed']:
                print(f"❌ {test['name']}")
                if 'error' in test:
                    print(f"   Error: {test['error']}")
    
    return results


if __name__ == "__main__":
    run_all_tests()
