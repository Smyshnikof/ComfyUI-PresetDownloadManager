from .nodes import PresetDownloadManager

NODE_CLASS_MAPPINGS = {
    "PresetDownloadManager": PresetDownloadManager
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PresetDownloadManager": "HF Preset Download Manager"
}

WEB_DIRECTORY = "./web"

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']

