from fastapi import APIRouter
from app.models.schemas import SearchRequest, SearchResponse, SearchResultItem
from app.retrieval.hybrid_retriever import hybrid_retriever
from app.nlp.preprocessing import normalize_slang
from app.nlp.language_detection import detect_language
from app.nlp.transliteration import transliterate_to_dual_form

router = APIRouter(prefix="/v1/retrieval", tags=["Retrieval"])

@router.post("/search", response_model=SearchResponse)
def search_endpoint(req: SearchRequest):
    norm_q = normalize_slang(req.query)
    lang_info = detect_language(norm_q)
    _, dual_q = transliterate_to_dual_form(norm_q, lang_info["language"])

    results = hybrid_retriever.search(
        query=norm_q,
        top_k=req.top_k or 4,
        method=req.method or "hybrid",
        dual_form_query=dual_q
    )

    items = []
    for chunk, score in results:
        items.append(SearchResultItem(
            chunk_id=chunk.get("chunk_id", ""),
            document_id=chunk.get("document_id", ""),
            doc_name=chunk.get("filename", ""),
            page=chunk.get("page_number", 1),
            content=chunk.get("content", ""),
            score=round(score, 4)
        ))

    return SearchResponse(
        query=req.query,
        method=req.method or "hybrid",
        count=len(items),
        results=items
    )
