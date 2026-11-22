import unittest
from app.pipeline_stages.base import PipelineContext
from app.pipeline_stages.language_stage import LanguageStage
from app.pipeline_stages.transliteration_stage import TransliterationStage
from app.pipeline_stages.intent_stage import IntentStage
from app.pipeline_stages.entity_stage import EntityStage
from app.pipeline_stages.retrieval_stage import RetrievalStage
from app.pipeline_stages.answer_stage import AnswerStage

class TestPipelineStages(unittest.TestCase):
    def test_language_stage(self):
        stage = LanguageStage()
        ctx = PipelineContext(raw_query="Exam form bharne ki last date kab hai?")
        ctx = stage.execute(ctx)
        self.assertEqual(ctx.language, "hi-Latn")
        self.assertIn("language_detection", ctx.stage_latencies_ms)
        self.assertTrue(len(ctx.tokens) > 0)

    def test_transliteration_stage_stub(self):
        stage = TransliterationStage()
        ctx = PipelineContext(raw_query="Exam kab hai", normalized_query="exam kab hai")
        ctx = stage.execute(ctx)
        self.assertEqual(ctx.normalized_query, "exam kab hai")
        self.assertIn("transliteration", ctx.stage_latencies_ms)

    def test_intent_stage(self):
        stage = IntentStage()
        ctx = PipelineContext(raw_query="Exam form bharne ki last date kab hai?", normalized_query="exam form bharne ki last date kab hai")
        ctx = stage.execute(ctx)
        self.assertEqual(ctx.intent, "exam_form_deadline")
        self.assertGreater(ctx.intent_confidence, 0.5)

    def test_entity_stage(self):
        stage = EntityStage()
        ctx = PipelineContext(raw_query="What is the fee for BTech 5th sem Computer Engineering?")
        ctx = stage.execute(ctx)
        labels = [e["label"] for e in ctx.entities]
        self.assertIn("COURSE", labels)
        self.assertIn("SEMESTER", labels)

    def test_retrieval_stage(self):
        stage = RetrievalStage()
        ctx = PipelineContext(
            raw_query="When will the examination registration portal close?",
            normalized_query="when will the examination registration portal close"
        )
        ctx = stage.execute(ctx)
        self.assertTrue(len(ctx.retrieved_chunks) > 0)
        self.assertTrue(any("exam_notice" in c["doc_name"].lower() for c in ctx.retrieved_chunks))

    def test_answer_stage(self):
        stage = AnswerStage()
        ctx = PipelineContext(
            raw_query="What is the hostel fee?",
            intent="hostel",
            language="en",
            retrieved_chunks=[{"chunk_id": "c1", "doc_name": "04_hostel_rules_hi.txt", "score": 0.5, "text": "Hostel fee is 36000."}]
        )
        ctx = stage.execute(ctx)
        self.assertTrue(len(ctx.answer) > 0)
        self.assertIsNotNone(ctx.source_doc)

if __name__ == "__main__":
    unittest.main()
