import os
import requests

BASE_URL = os.environ["EXPO_BACKEND_URL"].rstrip("/")


def test_dashboard_and_student_endpoints():
    dashboard = requests.get(f"{BASE_URL}/api/dashboard/summary", timeout=20)
    assert dashboard.status_code == 200
    assert dashboard.json()["total_students"] >= 1
    students = requests.get(f"{BASE_URL}/api/students", timeout=20)
    assert students.status_code == 200
    assert any(s["id"] == "student_01" for s in students.json())
    profile = requests.get(f"{BASE_URL}/api/students/student_01", timeout=20)
    assert profile.status_code == 200
    assert profile.json()["name"] == "Rodrigo Silva de Oliveira"


def test_student_profile_data_endpoints():
    for path, key in [
        ("evolution", "assessments_count"),
        ("attendance", "summary"),
    ]:
        response = requests.get(f"{BASE_URL}/api/students/student_01/{path}", timeout=20)
        assert response.status_code == 200
        assert key in response.json()
    for path in ["assessments?student_id=student_01", "workouts?student_id=student_01", "students/student_01/messages"]:
        response = requests.get(f"{BASE_URL}/api/{path}", timeout=20)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


def test_pollock_calculation_returns_consistent_metrics():
    response = requests.post(
        f"{BASE_URL}/api/assessments/calculate",
        json={"protocol": "pollock7", "gender": "Masculino", "age": 30,
              "weight_kg": 86.5, "height_cm": 180,
              "skinfolds": {"peitoral": 10, "axilar_media": 9, "triceps": 9,
                             "subescapular": 13, "abdomen": 14, "suprailiaca": 11, "coxa": 12}},
        timeout=20,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["protocol"] == "pollock7"
    assert data["fat_mass_kg"] + data["lean_mass_kg"] == 86.5
    assert 3 <= data["body_fat_pct"] <= 65