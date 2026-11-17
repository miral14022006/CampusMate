from app.pipeline_stages.base import PipelineStage, PipelineContext
from app.modules.preprocessing import preprocessor
from app.modules.language_detect import language_detector

class LanguageStage(PipelineStage):
    @property
    def name(self) -> str:
        return "language_detection"

    def run(self, context: PipelineContext) -> PipelineContext:
        # Preprocessing first
        prep = preprocessor.preprocess(context.raw_query)
        context.normalized_query = prep["normalized"]
        context.tokens = prep["tokens"]

        if context.language_override:
            context.language = context.language_override
            context.script = "Manual"
            context.language_confidence = 1.0
        else:
            lang_info = language_detector.detect(context.raw_query)
            context.language = lang_info["language"]
            context.script = lang_info["script"]
            context.language_confidence = lang_info["confidence"]

        return context

