import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import NLP_API_KEY, API_KEY_HEADER_NAME

class TestAPIEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.headers = {API_KEY_HEADER_NAME: NLP_API_KEY}

    def test_health_endpoint(self):
        res = self.client.get("/v1/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["service"], "nlp-service")

    def test_version_endpoint(self):
        res = self.client.get("/v1/version")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("active_features", data)
        self.assertEqual(data["api_prefix"], "/v1")

    def test_metrics_endpoint(self):
        res = self.client.get("/v1/metrics")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total_queries", data)
        self.assertIn("uptime_seconds", data)

    def test_query_auth_failure(self):
        # Missing auth header
        res = self.client.post("/v1/query", json={"query": "Hello"})
        self.assertEqual(res.status_code, 401)

    def test_query_success_with_auth(self):
        res = self.client.post(
            "/v1/query",
            json={"query": "Exam form bharne ki last date kab hai?"},
            headers=self.headers
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["intent"], "exam_form_deadline")
        self.assertEqual(data["language"], "hi-Latn")
        self.assertIn("request_id", data)
        self.assertIn("X-Request-ID", res.headers)

    def test_analyze_endpoint(self):
        res = self.client.post(
            "/v1/analyze",
            json={"query": "What is the fee for BTech Computer Engineering?"},
            headers=self.headers
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["intent"], "fee_structure")
        self.assertIn("stage_latencies_ms", data)
        # Verify answer stage is not run in analyze
        self.assertNotIn("answer", data)

if __name__ == "__main__":
    unittest.main()

