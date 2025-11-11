import os
import json
import shutil
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
        try:
            # Создаем папку, если её нет
            os.makedirs(os.path.dirname(self.presets_file), exist_ok=True)
            with open(self.presets_file, 'w', encoding='utf-8') as f:
                json.dump(self.presets, f, ensure_ascii=False, indent=2)
        except Exception as e:
            # Логируем ошибку, но не прерываем выполнение
            import traceback
            print(f"[PresetDownloadManager] Ошибка сохранения пресетов: {e}")
            traceback.print_exc()
            raise
    
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
        try:
            manager.save_presets()
            # Проверяем, что файл действительно сохранен
            if os.path.exists(manager.presets_file):
                return web.json_response({
                    "status": "success",
                    "message": "Presets saved successfully",
                    "file_path": manager.presets_file
                })
            else:
                return web.json_response({
                    "status": "warning",
                    "message": "Presets saved but file not found. Please check file permissions."
                }, status=200)
        except Exception as e:
            return web.json_response({
                "status": "error",
                "message": f"Failed to save presets: {str(e)}"
            }, status=500)
    
    @PromptServer.instance.routes.post("/preset_download_manager/download")
    async def download_model(request):
        """Загружает модель из HuggingFace или по прямой ссылке"""
        data = await request.json()
        direct_url = data.get("direct_url")
        model_id = data.get("model_id")
        model_path = data.get("model_path", "")
        save_path = data.get("save_path", "checkpoints")
        hf_token = data.get("hf_token", "")  # Опциональный API ключ
        
        try:
            # Типы папок, которые поддерживаются через folder_paths.get_folder_paths()
            # Для остальных стандартных папок (например, diffusion_models) используем models_dir
            supported_folder_types = {
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
                "text_encoders": "text_encoders",
                "audio_encoders": "audio_encoders",
                "configs": "configs",
                "model_patches": "model_patches",
                "photomaker": "photomaker",
                "sams": "sams",
                "vibevoice": "vibevoice"
            }
            
            # Типы папок, для которых get_folder_paths возвращает неправильный путь
            # Всегда используем models_dir для этих типов
            force_models_dir_types = {"diffusion_models"}
            
            # Определяем путь сохранения
            save_path_lower = save_path.lower().strip()
            base_path = None
            
            # Для проблемных типов сразу используем models_dir
            if save_path_lower in force_models_dir_types:
                pass  # base_path останется None, будет использован fallback
            # Пробуем получить путь через folder_paths только для поддерживаемых типов
            elif save_path_lower in supported_folder_types:
                folder_type = supported_folder_types[save_path_lower]
                try:
                    paths = folder_paths.get_folder_paths(folder_type)
                    if paths and len(paths) > 0 and paths[0] and paths[0].strip():
                        # Проверяем, что путь действительно содержит название нужной папки
                        # Это защита от случаев, когда get_folder_paths возвращает неправильный путь
                        returned_path = paths[0].strip()
                        if save_path_lower in returned_path.lower():
                            base_path = returned_path
                except Exception:
                    pass
            
            # Fallback: используем models_dir с подпапкой
            # Это работает для всех типов: стандартных, которые не поддерживаются get_folder_paths
            # (например, diffusion_models), и нестандартных (кастомные папки)
            if not base_path or not base_path.strip():
                models_dir = folder_paths.models_dir
                # Создаём подпапку с именем типа, если её нет
                target_dir = os.path.join(models_dir, save_path)
                os.makedirs(target_dir, exist_ok=True)
                base_path = target_dir
            
            # Если указан model_path (конкретный файл), сохраняем напрямую в выбранную папку
            # Если model_path не указан (вся модель), создаём подпапку с именем модели
            if not model_path and not direct_url:
                # Создаём подпапку для модели только если скачиваем всю модель
                model_name = model_id.split("/")[-1]
                target_dir = os.path.join(base_path, model_name)
                os.makedirs(target_dir, exist_ok=True)
                base_path = target_dir
            
            downloaded_path = None
            last_error = None
            
            # Если используется прямая ссылка
            if direct_url:
                import time
                from urllib.parse import urlparse
                
                # Параметры для повторных попыток
                max_retries = 5
                retry_delay = 10
                
                # Определяем имя файла из URL
                parsed_url = urlparse(direct_url)
                filename = os.path.basename(parsed_url.path)
                if not filename or filename == "/":
                    filename = "downloaded_file"
                
                target_file_path = os.path.join(base_path, filename)
                
                # Проверяем, существует ли файл уже
                if os.path.exists(target_file_path) and os.path.isfile(target_file_path):
                    file_size = os.path.getsize(target_file_path)
                    downloaded_path = target_file_path
                    return web.json_response({
                        "status": "success",
                        "path": str(downloaded_path),
                        "message": f"File already exists ({file_size} bytes), skipped download"
                    })
                
                # Пробуем загрузить с повторными попытками
                for attempt in range(max_retries):
                    try:
                        headers = {}
                        if hf_token:
                            headers["Authorization"] = f"Bearer {hf_token}"
                        
                        async with aiohttp.ClientSession() as session:
                            async with session.get(direct_url, headers=headers, allow_redirects=True) as response:
                                if response.status != 200:
                                    # Проверяем Content-Type перед чтением ответа
                                    content_type = response.headers.get('Content-Type', '').lower()
                                    if 'application/json' in content_type:
                                        try:
                                            error_data = await response.json()
                                            error_msg = error_data.get('error', error_data.get('message', str(error_data)))
                                        except:
                                            error_text = await response.text()
                                            if len(error_text) > 500:
                                                error_text = error_text[:500] + "..."
                                            error_msg = f"HTTP {response.status}: {error_text}"
                                    else:
                                        # Если это HTML или другой тип, читаем только первые 500 символов
                                        error_text = await response.text()
                                        if len(error_text) > 500:
                                            error_text = error_text[:500] + "..."
                                        error_msg = f"HTTP {response.status}: {error_text}"
                                    raise Exception(error_msg)
                                
                                # Проверяем, что это действительно файл, а не HTML страница
                                content_type = response.headers.get('Content-Type', '').lower()
                                
                                # Если Content-Type указывает на HTML, это ошибка
                                if 'text/html' in content_type:
                                    error_text = await response.text()
                                    if len(error_text) > 500:
                                        error_text = error_text[:500] + "..."
                                    raise Exception(f"Server returned HTML page instead of file. This usually means:\n1. The URL requires authentication (check if you need HuggingFace API Token)\n2. The file doesn't exist or was moved\n3. The URL is incorrect\n\nResponse preview: {error_text[:300]}")
                                
                                # Читаем первые байты для проверки (независимо от Content-Type)
                                # Это нужно, так как некоторые серверы могут не указывать правильный Content-Type
                                first_bytes = await response.content.read(1024)
                                
                                # Проверяем, не является ли ответ HTML страницей
                                if first_bytes.startswith(b'<!DOCTYPE') or first_bytes.startswith(b'<html') or first_bytes.startswith(b'<!doctype') or first_bytes.startswith(b'<HTML'):
                                    error_text = first_bytes.decode('utf-8', errors='ignore')
                                    if len(error_text) > 500:
                                        error_text = error_text[:500] + "..."
                                    raise Exception(f"Server returned HTML page instead of file. This usually means:\n1. The URL requires authentication (check if you need HuggingFace API Token)\n2. The file doesn't exist or was moved\n3. The URL is incorrect\n\nResponse preview: {error_text[:300]}")
                                
                                # Если все хорошо, скачиваем файл
                                # Начинаем с уже прочитанных байтов
                                total_size = int(response.headers.get('Content-Length', 0))
                                downloaded = len(first_bytes)
                                
                                with open(target_file_path, 'wb') as f:
                                    # Записываем первые байты, которые мы уже прочитали
                                    f.write(first_bytes)
                                    
                                    # Продолжаем скачивание остальной части файла
                                    async for chunk in response.content.iter_chunked(8192):
                                        f.write(chunk)
                                        downloaded += len(chunk)
                        
                        downloaded_path = target_file_path
                        break
                        
                    except Exception as e:
                        last_error = e
                        error_msg = str(e)
                        
                        # Проверяем, это таймаут или ошибка соединения
                        is_timeout = any(keyword in error_msg.lower() for keyword in [
                            'timeout', 'timed out', 'connection', 'read timeout', 
                            'connectionpool', 'cas-bridge'
                        ])
                        
                        if is_timeout and attempt < max_retries - 1:
                            time.sleep(retry_delay)
                            retry_delay = min(retry_delay * 1.5, 60)
                            continue
                        else:
                            raise
            else:
                # Используем huggingface_hub для загрузки
                from huggingface_hub import hf_hub_download, snapshot_download
                import time
                
                # Настройка прокси из переменных окружения (если есть)
                # Можно установить через: export HF_ENDPOINT=https://hf-mirror.com (для зеркал)
                # или export HTTP_PROXY=http://proxy:port / HTTPS_PROXY=http://proxy:port
                
                # Параметры для повторных попыток
                max_retries = 5  # Увеличиваем количество попыток
                retry_delay = 10  # Увеличиваем начальную задержку
                
                # Настройка таймаутов через переменные окружения (если нужно)
                # Можно установить: export HF_HUB_DOWNLOAD_TIMEOUT=300
                
                # Проверяем существование файла перед началом скачивания (для model_path)
                if model_path:
                    # Определяем имя файла из model_path
                    filename = os.path.basename(model_path)
                    if not filename:
                        # Если не удалось определить имя из пути, используем имя репозитория
                        filename = model_id.split("/")[-1] + ".safetensors"
                    
                    target_file_path = os.path.join(base_path, filename)
                    
                    # Проверяем, существует ли файл уже
                    if os.path.exists(target_file_path) and os.path.isfile(target_file_path):
                        file_size = os.path.getsize(target_file_path)
                        downloaded_path = target_file_path
                        return web.json_response({
                            "status": "success",
                            "path": str(downloaded_path),
                            "message": f"File already exists ({file_size} bytes), skipped download"
                        })
                
                # Проверяем существование модели перед началом скачивания (для всей модели)
                if not model_path:
                    model_name = model_id.split("/")[-1]
                    model_dir = os.path.join(base_path, model_name)
                    
                    if os.path.exists(model_dir) and os.path.isdir(model_dir):
                        # Проверяем, есть ли файлы в папке (игнорируем скрытые файлы и папки)
                        files = [f for f in os.listdir(model_dir) 
                                if os.path.isfile(os.path.join(model_dir, f)) and not f.startswith('.')]
                        if files:
                            # Модель уже скачана
                            downloaded_path = model_dir
                            return web.json_response({
                                "status": "success",
                                "path": str(downloaded_path),
                                "message": f"Model already exists ({len(files)} files), skipped download"
                            })
                
                # Пробуем загрузить с повторными попытками
                for attempt in range(max_retries):
                    try:
                        # Используем токен, если он указан
                        token = hf_token if hf_token else None
                        
                        if model_path:
                            # Определяем имя файла из model_path (уже определено выше, но для ясности)
                            filename = os.path.basename(model_path)
                            if not filename:
                                filename = model_id.split("/")[-1] + ".safetensors"
                            
                            target_file_path = os.path.join(base_path, filename)
                            
                            # Загружаем конкретный файл
                            # Используем временную папку, чтобы избежать создания подпапок huggingface
                            import tempfile
                            with tempfile.TemporaryDirectory() as temp_dir:
                                # Скачиваем файл во временную папку
                                temp_file = hf_hub_download(
                                    repo_id=model_id,
                                    filename=model_path,
                                    local_dir=temp_dir,
                                    local_dir_use_symlinks=False,
                                    resume_download=True,
                                    force_download=False,
                                    token=token
                                )
                                
                                # Если имя файла не было определено ранее, берем из скачанного файла
                                if not filename or filename == model_id.split("/")[-1] + ".safetensors":
                                    filename = os.path.basename(temp_file)
                                    target_file_path = os.path.join(base_path, filename)
                                
                                # Перемещаем файл напрямую в целевую папку
                                # Если файл уже существует, удаляем его
                                if os.path.exists(target_file_path):
                                    os.remove(target_file_path)
                                shutil.move(temp_file, target_file_path)
                                downloaded_path = target_file_path
                        else:
                            # Загружаем всю модель (проверка уже выполнена выше)
                            downloaded_path = snapshot_download(
                                repo_id=model_id,
                                local_dir=base_path,
                                local_dir_use_symlinks=False,
                                resume_download=True,  # Возобновление загрузки
                                ignore_patterns=["*.part"],  # Игнорируем частично загруженные файлы
                                token=token  # API ключ (если указан)
                            )
                        
                        # Если успешно загрузили, выходим из цикла
                        break
                        
                    except Exception as e:
                        last_error = e
                        error_msg = str(e)
                        
                        # Проверяем, это таймаут или ошибка соединения
                        is_timeout = any(keyword in error_msg.lower() for keyword in [
                            'timeout', 'timed out', 'connection', 'read timeout', 
                            'connectionpool', 'cas-bridge'
                        ])
                        
                        if is_timeout and attempt < max_retries - 1:
                            # Если это таймаут и есть еще попытки, ждем и пробуем снова
                            time.sleep(retry_delay)
                            retry_delay = min(retry_delay * 1.5, 60)  # Увеличиваем задержку, но не более 60 сек
                            continue
                        else:
                            # Если это не таймаут или попытки закончились, выбрасываем ошибку
                            raise
                
                if downloaded_path is None:
                    raise last_error if last_error else Exception("Failed to download model")
            
            # Проверяем, что файл действительно существует перед возвратом успешного ответа
            if downloaded_path and not os.path.exists(downloaded_path):
                raise Exception(f"File was downloaded but not found at path: {downloaded_path}")
            
            # Проверяем, что это файл (не директория)
            if downloaded_path and os.path.isdir(downloaded_path):
                # Для директорий (snapshot_download) это нормально
                pass
            elif downloaded_path and not os.path.isfile(downloaded_path):
                raise Exception(f"Downloaded path exists but is not a file: {downloaded_path}")
            
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
    except Exception:
        # Попробуем зарегистрировать позже
        import time
        time.sleep(0.1)
        try:
            setup_routes()
        except Exception:
            pass

# Пытаемся зарегистрировать routes сразу
init_routes()

