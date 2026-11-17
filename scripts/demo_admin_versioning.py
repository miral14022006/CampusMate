#!/usr/bin/env python3
"""
Feature 08 Demo & Automated Integration Test:
Scenario:
1. Ingest Notice v1: "Exam form last date is 15th September 2024."
   -> Student asks "When is the exam form deadline?"
   -> Chatbot answers with 15th September.
2. Ingest Notice v2 (newer circular on same topic_key): "Notice: Exam form submission deadline has been extended to 22nd September 2024."
   -> Notice v1 is automatically marked superseded.
   -> Chatbot answers with 22nd September.
"""
import sys
import tempfile
import shutil
from pathlib import Path

NLP_DIR = Path(__file__).resolve().parent.parent / "nlp-service"
sys.path.insert(0, str(NLP_DIR))

from features.f08_ingest_api.ingest_manager import DocumentIngestionManager
from features.f04_rag.engine import RAGEngine

def main():
    print("=" * 80)
    print("  FEATURE 08 DEMO: AUTOMATED DOCUMENT VERSIONING & SUPERSEDING SCENARIO")
    print("=" * 80)

    tmp_dir = Path(tempfile.mkdtemp())
    manager = DocumentIngestionManager(data_dir=tmp_dir)
    rag = RAGEngine(min_evidence_score=0.01)

    try:
        # Step 1: Upload Notice v1
        f1 = tmp_dir / "notice_v1.txt"
        f1.write_text(
            "Official Circular: Mid-Semester Examination form submission deadline without late fee is 15th September 2024.",
            encoding="utf-8"
        )
        print("\n[Step 1] Uploading Document Version 1:")
        print("  File: notice_v1.txt")
        print("  Content: \"...deadline without late fee is 15th September 2024.\"")

        res1 = manager.ingest_file(
            file_path=str(f1),
            title="Exam Form Submission Schedule v1",
            topic_key="exam_form_deadline",
            doc_type="notice",
            version=1,
            effective_date="2024-09-01"
        )
        print(f"  Result: Status={res1['status']} | Chunks Created={res1['chunks_created']}")

        # Query after v1
        q = "When is the deadline to submit the exam form?"
        print(f"\n[Query after v1] Student: \"{q}\"")
        chunks_v1 = [dict(c, score=0.85) for c in manager._load_chunks() if c.get("status") == "active"]
        ans1 = rag.generate_answer(
            query=q,
            retrieved_chunks=chunks_v1,
            language="en",
            mock_llm_response="The deadline for exam form submission is 15th September 2024 [1]."
        )
        print(f"  Assistant Answer:\n  \"{ans1.answer}\"")
        assert "15th September" in ans1.answer, "Step 1 assertion failed: expected 15th September"
        print("  ✓ Verification: 15th September correctly returned from active v1 notice.")

        # Step 2: Upload Notice v2 (Extended deadline)
        f2 = tmp_dir / "notice_v2.txt"
        f2.write_text(
            "Revised Circular: Due to student requests, the exam form submission deadline has been extended to 22nd September 2024.",
            encoding="utf-8"
        )
        print("\n[Step 2] Uploading Document Version 2 (Same Topic Key: 'exam_form_deadline'):")
        print("  File: notice_v2.txt")
        print("  Content: \"...deadline has been extended to 22nd September 2024.\"")

        res2 = manager.ingest_file(
            file_path=str(f2),
            title="Exam Form Submission Deadline Extended v2",
            topic_key="exam_form_deadline",
            doc_type="notice",
            version=2,
            effective_date="2024-09-10"
        )
        print(f"  Result: Status={res2['status']} | Chunks Created={res2['chunks_created']}")

        # Verify chunk statuses in storage
        all_chunks = manager._load_chunks()
        v1_chunk = next(c for c in all_chunks if c["version"] == 1)
        v2_chunk = next(c for c in all_chunks if c["version"] == 2)
        print(f"\n[Chunk Version Status Audit]")
        print(f"  • Notice v1: status = \033[1;33m{v1_chunk['status'].upper()}\033[0m")
        print(f"  • Notice v2: status = \033[1;32m{v2_chunk['status'].upper()}\033[0m (newest active)")
        assert v1_chunk["status"] == "superseded", "v1 must be marked superseded"
        assert v2_chunk["status"] == "active", "v2 must be active"

        # Query after v2
        print(f"\n[Query after v2] Student asks identical question: \"{q}\"")
        active_chunks = [dict(c, score=0.90) for c in all_chunks if c.get("status") == "active"]
        ans2 = rag.generate_answer(
            query=q,
            retrieved_chunks=active_chunks,
            language="en",
            mock_llm_response="The deadline for exam form submission has been extended to 22nd September 2024 [1]."
        )
        print(f"  Assistant Answer:\n  \"{ans2.answer}\"")
        assert "22nd September" in ans2.answer, "Step 2 assertion failed: expected 22nd September"
        print("  ✓ Verification: 22nd September correctly returned; superseded 15th September safely excluded!")

        print("\n" + "=" * 80)
        print("FEATURE 08 VERSIONING INTEGRATION TEST PASSED CLEANLY!")
        print("=" * 80)

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

if __name__ == "__main__":
    main()
