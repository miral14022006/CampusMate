import unittest
from features.f01_hybrid_retrieval.rrf import reciprocal_rank_fusion
from features.f01_hybrid_retrieval.hybrid_retriever import get_retriever

class TestHybridRetrieval(unittest.TestCase):
    def test_hand_computed_rrf_example(self):
        """
        Hand-computed RRF verification with k=60:
        List 1 (BM25):
          Rank 1: chunk_A -> 1 / (60 + 1) = 1/61 = 0.01639344
          Rank 2: chunk_B -> 1 / (60 + 2) = 1/62 = 0.01612903
        List 2 (Dense):
          Rank 1: chunk_B -> 1 / (60 + 1) = 1/61 = 0.01639344
          Rank 2: chunk_C -> 1 / (60 + 2) = 1/62 = 0.01612903

        Fused RRF Total Scores:
          chunk_B: 1/62 + 1/61 = 0.01612903 + 0.01639344 = 0.032522
          chunk_A: 1/61 = 0.016393
          chunk_C: 1/62 = 0.016129

        Expected Ranking: [chunk_B, chunk_A, chunk_C]
        """
        list1 = [
            {"chunk_id": "chunk_A", "text": "Doc A", "score": 0.9},
            {"chunk_id": "chunk_B", "text": "Doc B", "score": 0.8}
        ]
        list2 = [
            {"chunk_id": "chunk_B", "text": "Doc B", "score": 0.95},
            {"chunk_id": "chunk_C", "text": "Doc C", "score": 0.7}
        ]

        fused = reciprocal_rank_fusion([list1, list2], k=60)

        self.assertEqual(len(fused), 3)
        self.assertEqual(fused[0]["chunk_id"], "chunk_B")
        self.assertEqual(fused[1]["chunk_id"], "chunk_A")
        self.assertEqual(fused[2]["chunk_id"], "chunk_C")

        # Verify precision against hand-computed values
        self.assertAlmostEqual(fused[0]["score"], 0.032522, places=5)
        self.assertAlmostEqual(fused[1]["score"], 0.016393, places=5)
        self.assertAlmostEqual(fused[2]["score"], 0.016129, places=5)

    def test_retriever_interface_swappability(self):
        retrievers = ["tfidf", "bm25", "hybrid"]
        for r_name in retrievers:
            r = get_retriever(r_name)
            self.assertTrue(hasattr(r, "retrieve"))
            self.assertTrue(hasattr(r, "name"))

if __name__ == "__main__":
    unittest.main()

