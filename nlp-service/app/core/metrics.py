import time
from typing import Dict, Any

class MetricsCollector:
    def __init__(self):
        self.start_time = time.time()
        self.counters = {
            "total_queries": 0,
            "total_analyzes": 0,
            "total_errors": 0,
            "intents_served": {},
            "languages_served": {}
        }
        self.total_pipeline_time_ms = 0.0

    def record_query(self, intent: str, language: str, latency_ms: float):
        self.counters["total_queries"] += 1
        self.counters["intents_served"][intent] = self.counters["intents_served"].get(intent, 0) + 1
        self.counters["languages_served"][language] = self.counters["languages_served"].get(language, 0) + 1
        self.total_pipeline_time_ms += latency_ms

    def record_analyze(self):
        self.counters["total_analyzes"] += 1

    def record_error(self):
        self.counters["total_errors"] += 1

    def get_metrics(self) -> Dict[str, Any]:
        uptime_seconds = round(time.time() - self.start_time, 2)
        total_q = self.counters["total_queries"]
        avg_latency = round(self.total_pipeline_time_ms / total_q, 3) if total_q > 0 else 0.0

        return {
            "uptime_seconds": uptime_seconds,
            "total_queries": total_q,
            "total_analyzes": self.counters["total_analyzes"],
            "total_errors": self.counters["total_errors"],
            "average_latency_ms": avg_latency,
            "languages_breakdown": self.counters["languages_served"],
            "intents_breakdown": self.counters["intents_served"]
        }

metrics = MetricsCollector()

