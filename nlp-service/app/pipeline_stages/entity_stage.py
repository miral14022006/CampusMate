from app.pipeline_stages.base import PipelineStage, PipelineContext
from app.modules.entities import entity_extractor

class EntityStage(PipelineStage):
    @property
    def name(self) -> str:
        return "entity_extraction"

    def run(self, context: PipelineContext) -> PipelineContext:
        extracted = entity_extractor.extract(context.raw_query)
        context.entities = extracted
        return context

