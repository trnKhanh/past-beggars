import torch

from aic51.packages.logger import logger


def get_device(do_gpu: bool):
    device = torch.device("cpu")
    if do_gpu:
        if torch.cuda.is_available():
            device = torch.device("cuda")
        elif torch.backends.mps.is_available():
            device = torch.device("mps")
        else:
            logger.warning("GPU is not available, fallbacked to CPU")

    return device
