import os
from pathlib import Path

def get_workspace_dir():
    try:
        from aic51.packages.config import GlobalConfig
        work_dir = Path.cwd()
        
        # First check current directory
        config_path = work_dir / "config.yaml"
        if config_path.exists():
            return str(work_dir)
        
        # Then check common workspace subdirectories
        for subdir in ["workspace", ".", "data"]:
            config_path = work_dir / subdir / "config.yaml"
            if config_path.exists():
                return str(work_dir / subdir)
        
        # Look for config.yaml in parent directories
        current = work_dir
        while current != current.parent:
            config_path = current / "config.yaml"
            if config_path.exists():
                return str(current)
            current = current.parent
    except:
        pass
    
    return os.environ.get("AIC51_WORKSPACE_DIR", ".")

WORKSPACE_DIR = get_workspace_dir()
DATA_DIR = f"{WORKSPACE_DIR}/data"

KEYFRAME_DIR = f"{DATA_DIR}/keyframes"
THUMBNAIL_DIR = f"{DATA_DIR}/thumbnails"
VIDEO_DIR = f"{DATA_DIR}/videos"
VIDEO_CLIP_DIR = f"{DATA_DIR}/video_clips"
AUDIO_DIR = f"{DATA_DIR}/audio"
AUDIO_CLIP_DIR = f"{DATA_DIR}/audio_clips"
VIDEO_INFO_DIR = f"{DATA_DIR}/video_info"

FEATURE_DIR = "features"

FRONTEND_DIST_DIR = ".web"

VIDEO_EXTENSION = ".mp4"
VIDEO_MEDIA_TYPE = "video/mp4"
IMAGE_EXTENSION = ".jpg"
