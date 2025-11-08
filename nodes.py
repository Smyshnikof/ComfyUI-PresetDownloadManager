import os
import json
import folder_paths
from aiohttp import web
import aiohttp
from pathlib import Path

class PresetDownloadManager:
    """
    Кастомная нода для управления и загрузки моделей из HuggingFace
    """
    
    def __init__(self):
        self.presets_file = os.path.join(os.path.dirname(__file__), "presets.json")
        self.load_presets()
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "optional": {}
        }
    
    RETURN_TYPES = ()
    FUNCTION = "show_manager"
    CATEGORY = "utils"
    OUTPUT_NODE = True
    
    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")
    
    def load_presets(self):
        """Загружает пресеты из JSON файла"""
        if os.path.exists(self.presets_file):
            try:
                with open(self.presets_file, 'r', encoding='utf-8') as f:
                    self.presets = json.load(f)
            except Exception:
                self.presets = {"categories": [], "presets": []}
        else:
            self.presets = {"categories": [], "presets": []}
            self.save_presets()
    
    def save_presets(self):
        """Сохраняет пресеты в JSON файл"""
        with open(self.presets_file, 'w', encoding='utf-8') as f:
            json.dump(self.presets, f, ensure_ascii=False, indent=2)
    
    def show_manager(self, open_manager=None):
        """Открывает UI менеджер"""
        # Модальное окно открывается через JavaScript при нажатии на кнопку
        return {}
    
    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")

# Регистрация HTTP endpoints для работы с API
def setup_routes():
    """Регистрация всех HTTP endpoints"""
    from server import PromptServer
    
    @PromptServer.instance.routes.get("/preset_download_manager/presets")
    async def get_presets(request):
        manager = PresetDownloadManager()
        manager.load_presets()
        return web.json_response(manager.presets)
    
    @PromptServer.instance.routes.post("/preset_download_manager/presets")
    async def save_presets(request):
        data = await request.json()
        manager = PresetDownloadManager()
        manager.presets = data
        manager.save_presets()
        return web.json_response({"status": "success"})
    
    @PromptServer.instance.routes.post("/preset_download_manager/download")
    async def download_model(request):
        """Загружает модель из HuggingFace"""
        data = await request.json()
        model_id = data.get("model_id")
        model_path = data.get("model_path", "")
        save_path = data.get("save_path", "checkpoints")
        hf_token = data.get("hf_token", "")  # Опциональный API ключ
        
        try:
            # Маппинг типов папок на методы folder_paths
            folder_mapping = {
                "checkpoints": "checkpoints",
                "loras": "loras",
                "vae": "vae",
                "clip": "clip",
                "controlnet": "controlnet",
                "upscale_models": "upscale_models",
                "embeddings": "embeddings",
                "hypernetworks": "hypernetworks",
                "diffusers": "diffusers",
                "onnx": "onnx",
                "unet": "unet",
                "clip_vision": "clip_vision",
                "style_models": "style_models",
                "vae_approx": "vae_approx",
                "ipadapter": "ipadapter",
                "gligen": "gligen",
                "diffusion_models": "diffusion_models",
                "text_encoders": "text_encoders",
                "audio_encoders": "audio_encoders",
                "configs": "configs",
                "model_patches": "model_patches",
                "photomaker": "photomaker",
                "sams": "sams",
                "vibevoice": "vibevoice"
            }
            
            # Определяем путь сохранения
            save_path_lower = save_path.lower()
            base_path = None
            
            # Пробуем найти соответствующий тип папки
            for key, folder_type in folder_mapping.items():
                if key in save_path_lower:
                    try:
                        paths = folder_paths.get_folder_paths(folder_type)
                        if paths and len(paths) > 0:
                            base_path = paths[0]
                            break
                    except Exception:
                        continue
            
            # Если не нашли, используем models_dir
            if base_path is None:
                base_path = folder_paths.models_dir
                # Создаём подпапку с именем типа, если её нет
                target_dir = os.path.join(base_path, save_path)
                os.makedirs(target_dir, exist_ok=True)
                base_path = target_dir
            else:
                # Создаём подпапку для модели
                model_name = model_id.split("/")[-1]
                target_dir = os.path.join(base_path, model_name)
                os.makedirs(target_dir, exist_ok=True)
                base_path = target_dir
            
            # Используем huggingface_hub для загрузки
            from huggingface_hub import hf_hub_download, snapshot_download
            import time
            
            # Настройка прокси из переменных окружения (если есть)
            # Можно установить через: export HF_ENDPOINT=https://hf-mirror.com (для зеркал)
            # или export HTTP_PROXY=http://proxy:port / HTTPS_PROXY=http://proxy:port
            
            # Параметры для повторных попыток
            max_retries = 5  # Увеличиваем количество попыток
            retry_delay = 10  # Увеличиваем начальную задержку
            
            downloaded_path = None
            last_error = None
            
            # Настройка таймаутов через переменные окружения (если нужно)
            # Можно установить: export HF_HUB_DOWNLOAD_TIMEOUT=300
            
            print(f"[PresetDownloadManager] Начинаем загрузку модели: {model_id}")
            if model_path:
                print(f"[PresetDownloadManager] Файл: {model_path}")
            print(f"[PresetDownloadManager] Сохранение в: {base_path}")
            
            # Проверяем наличие прокси в переменных окружения
            proxy_info = ""
            if os.environ.get('HTTP_PROXY') or os.environ.get('HTTPS_PROXY'):
                proxy_info = " (используется прокси)"
            if os.environ.get('HF_ENDPOINT'):
                proxy_info += f" (используется зеркало: {os.environ.get('HF_ENDPOINT')})"
            if proxy_info:
                print(f"[PresetDownloadManager]{proxy_info}")
            
            # Пробуем загрузить с повторными попытками
            for attempt in range(max_retries):
                try:
                    print(f"[PresetDownloadManager] Попытка {attempt + 1}/{max_retries}...")
                    
                    # Используем токен, если он указан
                    token = hf_token if hf_token else None
                    
                    if model_path:
                        # Загружаем конкретный файл
                        downloaded_path = hf_hub_download(
                            repo_id=model_id,
                            filename=model_path,
                            local_dir=base_path,
                            local_dir_use_symlinks=False,
                            resume_download=True,  # Возобновление загрузки
                            force_download=False,   # Не перезагружать если уже есть
                            token=token  # API ключ (если указан)
                        )
                    else:
                        # Загружаем всю модель
                        downloaded_path = snapshot_download(
                            repo_id=model_id,
                            local_dir=base_path,
                            local_dir_use_symlinks=False,
                            resume_download=True,  # Возобновление загрузки
                            ignore_patterns=["*.part"],  # Игнорируем частично загруженные файлы
                            token=token  # API ключ (если указан)
                        )
                    
                    print(f"[PresetDownloadManager] ✅ Модель успешно загружена: {downloaded_path}")
                    # Если успешно загрузили, выходим из цикла
                    break
                    
                except Exception as e:
                    last_error = e
                    error_msg = str(e)
                    
                    print(f"[PresetDownloadManager] ❌ Ошибка на попытке {attempt + 1}: {error_msg}")
                    
                    # Проверяем, это таймаут или ошибка соединения
                    is_timeout = any(keyword in error_msg.lower() for keyword in [
                        'timeout', 'timed out', 'connection', 'read timeout', 
                        'connectionpool', 'cas-bridge'
                    ])
                    
                    if is_timeout and attempt < max_retries - 1:
                        # Если это таймаут и есть еще попытки, ждем и пробуем снова
                        print(f"[PresetDownloadManager] Повторная попытка через {retry_delay} секунд...")
                        print(f"[PresetDownloadManager] 💡 Совет: Если проблема повторяется, попробуйте:")
                        print(f"[PresetDownloadManager]    1. Использовать прокси: export HTTPS_PROXY=http://your-proxy:port")
                        print(f"[PresetDownloadManager]    2. Использовать зеркало: export HF_ENDPOINT=https://hf-mirror.com")
                        print(f"[PresetDownloadManager]    3. Проверить интернет-соединение")
                        time.sleep(retry_delay)
                        retry_delay = min(retry_delay * 1.5, 60)  # Увеличиваем задержку, но не более 60 сек
                        continue
                    else:
                        # Если это не таймаут или попытки закончились, выбрасываем ошибку
                        raise
            
            if downloaded_path is None:
                raise last_error if last_error else Exception("Failed to download model")
            
            return web.json_response({
                "status": "success",
                "path": str(downloaded_path)
            })
        except Exception as e:
            import traceback
            error_msg = str(e)
            traceback.print_exc()
            
            # Более понятное сообщение об ошибке с рекомендациями
            if "timeout" in error_msg.lower() or "timed out" in error_msg.lower() or "cas-bridge" in error_msg.lower():
                user_message = (
                    f"⏱️ Таймаут при загрузке: соединение с HuggingFace прервалось.\n\n"
                    f"💡 Возможные решения:\n"
                    f"1. Используйте прокси (если доступ к HuggingFace ограничен):\n"
                    f"   export HTTPS_PROXY=http://your-proxy:port\n\n"
                    f"2. Используйте зеркало HuggingFace:\n"
                    f"   export HF_ENDPOINT=https://hf-mirror.com\n\n"
                    f"3. Попробуйте загрузить снова - загрузка автоматически возобновится с места остановки.\n\n"
                    f"Оригинальная ошибка: {error_msg}"
                )
            elif "connection" in error_msg.lower() or "connectionpool" in error_msg.lower():
                user_message = (
                    f"🔌 Ошибка соединения: не удалось подключиться к HuggingFace.\n\n"
                    f"💡 Проверьте:\n"
                    f"1. Интернет-соединение\n"
                    f"2. Настройки прокси (если требуется)\n"
                    f"3. Ограничения доступа к HuggingFace в вашем регионе\n\n"
                    f"Оригинальная ошибка: {error_msg}"
                )
            else:
                user_message = error_msg
            
            return web.json_response({
                "status": "error",
                "message": user_message
            }, status=500)
    
    @PromptServer.instance.routes.get("/preset_download_manager/huggingface/search")
    async def search_huggingface(request):
        """Поиск моделей на HuggingFace"""
        query = request.query.get("q", "")
        limit = int(request.query.get("limit", 10))
        
        try:
            async with aiohttp.ClientSession() as session:
                url = "https://huggingface.co/api/models"
                params = {
                    "search": query,
                    "limit": limit,
                    "sort": "downloads",
                    "direction": -1
                }
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return web.json_response(data)
                    else:
                        return web.json_response({
                            "error": "Failed to search HuggingFace"
                        }, status=response.status)
        except Exception as e:
            return web.json_response({
                "error": str(e)
            }, status=500)

# Инициализация routes
def init_routes():
    """Инициализация routes после загрузки модуля"""
    try:
        setup_routes()
    except Exception as e:
        print(f"[PresetDownloadManager] Ошибка при регистрации routes: {e}")
        # Попробуем зарегистрировать позже
        import time
        time.sleep(0.1)
        try:
            setup_routes()
        except Exception:
            pass

# Пытаемся зарегистрировать routes сразу
init_routes()

