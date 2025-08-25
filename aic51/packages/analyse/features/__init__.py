from .feature_extractor import FeatureExtractor


class FeatureExtractorFactory:
    __registry = {}

    @staticmethod
    def register(k: str):
        def wrapper(extractor_cls):
            if issubclass(extractor_cls, FeatureExtractor):
                FeatureExtractorFactory.__registry[k] = extractor_cls
            return extractor_cls

        return wrapper

    @staticmethod
    def get(k: str, *args, **kwargs):
        if k in FeatureExtractorFactory.__registry:
            return FeatureExtractorFactory.__registry[k](*args, **kwargs)
        else:
            return None
