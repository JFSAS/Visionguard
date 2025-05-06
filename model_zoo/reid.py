from torchreid.utils import FeatureExtractor


class REID:
    def __init__(self, model_path):
        self.extractor = FeatureExtractor(
            model_name='osnet_x1_0',
            model_path=model_path,
            device='cuda'
        )

    def process_image_list(self, image_list):
        features = self.extractor(image_list)
        return features
