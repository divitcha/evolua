"""Backend tests for ApexTrainer OS: JWT auth, protected routes, object storage upload, push endpoints."""
import io
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/") or "https://body-progress-102.preview.emergentagent.com"

DEMO_EMAIL = "personal@apextrainer.com"
DEMO_PASSWORD = "treino123"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data
    assert "trainer" in data
    return data["access_token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# --- AUTH ---
class TestAuth:
    def test_login_demo(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d.get("access_token")
        assert d.get("trainer", {}).get("email") == DEMO_EMAIL

    def test_login_wrong_password(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": DEMO_EMAIL, "password": "wrong-pass-xyz"}, timeout=30)
        assert r.status_code == 401

    def test_register_new_and_duplicate(self):
        email = f"test_{int(time.time())}@apextrainer.com"
        r = requests.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": "abc12345", "name": "TEST User"}, timeout=30)
        assert r.status_code in (200, 201), f"register failed: {r.status_code} {r.text}"
        d = r.json()
        assert d.get("access_token")
        # duplicate
        r2 = requests.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": "abc12345", "name": "TEST User"}, timeout=30)
        assert r2.status_code == 409


# --- PROTECTED ROUTES ---
class TestProtectedRoutes:
    endpoints = [
        "/api/students",
        "/api/dashboard/summary",
        "/api/students/student_01",
        "/api/students/student_01/evolution",
    ]

    def test_no_auth_returns_401(self):
        for ep in self.endpoints:
            r = requests.get(f"{BASE_URL}{ep}", timeout=30)
            assert r.status_code == 401, f"{ep} expected 401, got {r.status_code}"

    def test_with_auth_returns_200(self, auth_headers):
        # ensure seed for student_01
        requests.post(f"{BASE_URL}/api/seed", timeout=60)
        for ep in self.endpoints:
            r = requests.get(f"{BASE_URL}{ep}", headers=auth_headers, timeout=30)
            assert r.status_code == 200, f"{ep} expected 200, got {r.status_code} {r.text[:200]}"


# --- SEED ---
class TestSeed:
    def test_seed_public(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/seed", timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert d.get("students_count") == 5
        # verify list
        rl = requests.get(f"{BASE_URL}/api/students", headers=auth_headers, timeout=30)
        assert rl.status_code == 200
        assert len(rl.json()) == 5


# --- OBJECT STORAGE ---
class TestObjectStorage:
    _uploaded_path = None

    def test_upload_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/upload", files={"file": ("t.png", b"x", "image/png")}, timeout=30)
        assert r.status_code == 401

    def test_upload_and_get(self, auth_headers):
        # tiny valid PNG (1x1)
        png_bytes = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xcf"
            b"\xc0\x00\x00\x00\x03\x00\x01\xa8\xa5\x1f\x1e\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        files = {"file": ("test.png", io.BytesIO(png_bytes), "image/png")}
        r = requests.post(f"{BASE_URL}/api/upload", headers=auth_headers, files=files, timeout=60)
        assert r.status_code == 200, f"upload failed: {r.status_code} {r.text}"
        d = r.json()
        assert "path" in d and "url" in d
        TestObjectStorage._uploaded_path = d["path"]

        # public GET
        rg = requests.get(f"{BASE_URL}/api/files/{d['path']}", timeout=30)
        assert rg.status_code == 200
        assert "image" in rg.headers.get("content-type", "").lower()
        assert len(rg.content) > 0

    def test_get_unknown_file_404(self):
        r = requests.get(f"{BASE_URL}/api/files/does-not-exist-xyz.png", timeout=30)
        assert r.status_code == 404


# --- PUSH ---
class TestPush:
    def test_register_push_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/register-push", json={"user_id": "u1", "platform": "ios", "device_token": "tok"}, timeout=30)
        assert r.status_code == 401

    def test_register_push_graceful(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/register-push",
            headers=auth_headers,
            json={"user_id": "u1", "platform": "ios", "device_token": "test-token"},
            timeout=30,
        )
        # 200 if provider works, or graceful 500/502 with placeholder key
        assert r.status_code in (200, 500, 502), f"unexpected status {r.status_code}: {r.text[:200]}"

    def test_alerts_notify_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/alerts/notify", json={}, timeout=30)
        assert r.status_code == 401

    def test_alerts_notify_returns_200(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/alerts/notify", headers=auth_headers, json={}, timeout=30)
        assert r.status_code == 200, f"alerts/notify not 200: {r.status_code} {r.text}"
        d = r.json()
        assert "sent" in d
        assert "message" in d


# --- AI REGRESSION ---
class TestAI:
    def test_ai_assistant(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/ai/assistant",
            headers=auth_headers,
            json={"prompt": "Diga olá em uma palavra."},
            timeout=90,
        )
        assert r.status_code == 200, f"AI failed {r.status_code}: {r.text[:200]}"
        d = r.json()
        assert isinstance(d.get("reply"), str)
        assert len(d["reply"]) > 0
