from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
import json
from pathlib import Path

router = APIRouter(prefix="/synthetic", tags=["Synthetic Multilingual Data"])

STATS_PATH = Path(__file__).resolve().parent.parent.parent.parent / "eval" / "results" / "14-dataset-stats.json"

class GenerateRequest(BaseModel):
    samples_per_intent: int = Field(default=80, ge=10, le=200)
    use_llm: bool = False

@router.get("/stats")
def get_dataset_statistics():
    """Returns dataset summary metrics, splits, and verified sample error rate."""
    if STATS_PATH.exists():
        with open(STATS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail="Dataset statistics not yet generated.")

@router.post("/trigger")
def trigger_generation(req: GenerateRequest, background_tasks: BackgroundTasks):
    """Triggers asynchronous dataset generation job."""

    # Feature flag check
    features_json = Path(__file__).resolve().parent.parent.parent / "config" / "features.json"
    if features_json.exists():
        with open(features_json, "r", encoding="utf-8") as f:
            flags = json.load(f)
            if not flags.get("synthetic_data_generation", True):
                raise HTTPException(status_code=403, detail="Feature flag 'synthetic_data_generation' is disabled.")

    # Run generation off the request thread. The CLI writes the dataset splits
    # and statistics under data/datasets and eval/results.
    from features.f14_synthetic_data.run_generation import run_generation

    background_tasks.add_task(run_generation, req.use_llm, req.samples_per_intent)

    return {
        "status": "initiated",
        "samples_per_intent": req.samples_per_intent,
        "use_llm": req.use_llm,
        "message": "Dataset generation scheduled in background."
    }

