#!/usr/bin/env python3
"""
CLI script to build/rebuild all retrieval indices (TF-IDF, BM25, FAISS Dense)
from raw documents in data/raw/.
Usage: python -m features.f01_hybrid_retrieval.build_index
"""
import sys
import logging
from pathlib import Path

nlp_service_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(nlp_service_dir))

from app.modules.ingest import ingester
from app.modules.retrieval_tfidf import retriever as tfidf_retriever
from features.f01_hybrid_retrieval.bm25_retriever import bm25_retriever
from features.f01_hybrid_retrieval.dense_retriever import dense_retriever

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("build_index")

def build_all_indices():
    logger.info("Step 1: Ingesting raw documents from data/raw/...")
    chunks = ingester.process_all_raw_docs()
    logger.info(f"Ingested {len(chunks)} chunks.")

    logger.info("Step 2: Building TF-IDF Baseline Index...")
    tfidf_retriever.build_index()

    logger.info("Step 3: Building BM25 Index...")
    bm25_retriever.build_index()

    logger.info("Step 4: Building FAISS Dense Multilingual Index...")
    dense_retriever.build_index()

    logger.info("[SUCCESS] All retrieval indices built and saved to data/index/.")

if __name__ == "__main__":
    build_all_indices()

