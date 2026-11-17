import unittest
import tempfile
import shutil
from pathlib import Path

from features.f08_ingest_api.parser import parse_document, chunk_text
from features.f08_ingest_api.ingest_manager import DocumentIngestionManager

class TestDocumentVersioning(unittest.TestCase):
    def setUp(self):
        self.test_dir = Path(tempfile.mkdtemp())
        self.manager = DocumentIngestionManager(data_dir=self.test_dir)

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_text_chunking(self):
        text = "word " * 600
        chunks = chunk_text(text, chunk_size=200, overlap=20)
        self.assertGreaterEqual(len(chunks), 3)

    def test_document_ingestion_and_superseding(self):
        """When v2 of a document with the same topic_key is ingested, v1 must be marked superseded."""
        f1 = self.test_dir / "notice_v1.txt"
        f1.write_text("Exam form submission last date is 15th September 2024.", encoding="utf-8")

        # Ingest Version 1
        res1 = self.manager.ingest_file(
            file_path=str(f1),
            title="Exam Form Deadline v1",
            topic_key="exam_form_deadline",
            doc_type="notice",
            version=1,
            effective_date="2024-09-01"
        )
        self.assertEqual(res1["status"], "success")

        chunks_after_v1 = self.manager._load_chunks()
        self.assertEqual(len(chunks_after_v1), 1)
        self.assertEqual(chunks_after_v1[0]["status"], "active")
        self.assertIn("15th September", chunks_after_v1[0]["text"])

        # Ingest Version 2 with extended deadline
        f2 = self.test_dir / "notice_v2.txt"
        f2.write_text("Notice: Exam form submission deadline has been extended to 22nd September 2024.", encoding="utf-8")

        res2 = self.manager.ingest_file(
            file_path=str(f2),
            title="Exam Form Deadline Extended v2",
            topic_key="exam_form_deadline",
            doc_type="notice",
            version=2,
            effective_date="2024-09-10"
        )
        self.assertEqual(res2["status"], "success")

        chunks_after_v2 = self.manager._load_chunks()
        self.assertEqual(len(chunks_after_v2), 2)

        v1_chunk = next(c for c in chunks_after_v2 if c["version"] == 1)
        v2_chunk = next(c for c in chunks_after_v2 if c["version"] == 2)

        # v1 must be superseded, v2 must be active
        self.assertEqual(v1_chunk["status"], "superseded")
        self.assertEqual(v2_chunk["status"], "active")
        self.assertIn("22nd September", v2_chunk["text"])

if __name__ == "__main__":
    unittest.main()

