# ComfyUI Preset Download Manager

A custom ComfyUI node that allows you to manage and download models from HuggingFace with a convenient preset system.

## Features

- 🎯 **Preset Management**: Create and manage presets containing multiple models
- ⬇️ **Direct Download**: Download models directly from HuggingFace
- 🎨 **Modern UI**: Beautiful dark-themed interface with modal windows
- 💾 **JSON Storage**: Presets are saved in JSON format for easy backup and sharing
- 🔑 **Private Models**: Support for HuggingFace API tokens for private/gated models
- 📁 **Custom Folders**: Save models to custom folders or standard ComfyUI directories
- 🌐 **Multi-language**: Help available in English and Russian

## Installation

1. Copy this folder to your ComfyUI `custom_nodes` directory:
   ```
   ComfyUI/custom_nodes/ComfyUI-PresetDownloadManager/
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Restart ComfyUI

## Usage

### Opening the Manager

1. Add the **"HF Preset Download Manager"** node to your workflow (category: `utils`)
2. Click the **"⚙ Open Manager"** button on the node to open the preset manager interface

### Creating a Preset

1. Click **"➕ Add Preset"** in the manager
2. Enter a **Preset Name** (required)
3. Optionally add a **Category** for organization
4. Add one or more models to the preset:
   - **HuggingFace Model ID** (required): Format `username/model-name`
     - Example: `runwayml/stable-diffusion-v1-5`
   - **Model Path** (optional): Specific file path within the repository
     - Example: `model.safetensors` or `vae/vae.safetensors`
     - Leave empty to download the entire repository
   - **Save to Folder** (required): Choose where to save the model
     - Standard folders: `checkpoints`, `loras`, `vae`, `upscale_models`, etc.
     - Or select "Custom folder..." to specify a custom path
   - **HuggingFace API Token** (optional): Required for private/gated models
     - Get your token from [HuggingFace Settings → Access Tokens](https://huggingface.co/settings/tokens)
5. Click **"Save Preset"**

### Downloading Models

- **Single Preset**: Click **"⬇️ Download"** on any preset card
- **Multiple Presets**: 
  1. Select presets using checkboxes
  2. Click **"⬇️ Download Selected"** in the footer

### Editing Presets

- Click the **✏️ Edit** button on any preset card
- Modify the preset details and models
- Click **"Update Preset"** to save changes

### Other Features

- **📋 Edit JSON**: Direct JSON editing of all presets
- **📥 Import/Export**: Import or export presets as JSON files
- **🗑️ Delete**: Remove individual presets or multiple selected presets
- **❓ Help**: Click the **"?"** button in the header for detailed instructions

## Field Descriptions

### HuggingFace Model ID
The model identifier on HuggingFace in the format `username/model-name`. You can find this on the model's page at [huggingface.co](https://huggingface.co) - it's the path in the URL after the domain.

**Examples:**
- `runwayml/stable-diffusion-v1-5`
- `stabilityai/stable-diffusion-xl-base-1.0`
- `lightx2v/Qwen-Image-Lightning`

### Model Path (Optional)
Path to a specific file within the model repository. Leave empty if you want to download the entire model.

**Examples:**
- `model.safetensors` - to download a single file
- `vae/vae.safetensors` - for a file in a subfolder
- **Empty** - download the entire model (all files from the repository)

### Save to Folder
The folder in ComfyUI where the model will be saved. Select the model type from the list or choose "Custom folder..." to specify a custom path.

**Available standard folders:**
- `checkpoints` - for main models (Stable Diffusion, etc.)
- `loras` - for LoRA models
- `vae` - for VAE models
- `upscale_models` - for upscale models
- And other model types...

### HuggingFace API Token (Optional)
Some models on HuggingFace require authorization (private/gated models). For such models, you need to specify an API key.

**How to get an API key:**
1. Register on [huggingface.co](https://huggingface.co)
2. Go to [Settings → Access Tokens](https://huggingface.co/settings/tokens)
3. Create a new token (read access is sufficient)
4. Copy the token (starts with `hf_`)

For public models, an API key is not required - leave the field empty.

### Presets
A preset is a group of models that can be downloaded together with one click. You can add multiple models to one preset, use categories to organize presets, and edit presets using the ✏️ button.

## Tips & Tricks

- You can add multiple models to one preset
- Use categories to organize presets
- Edit presets using the ✏️ button
- Select multiple presets and download them all at once
- On timeout, the download will automatically resume on the next attempt
- Use proxy or mirrors if access to HuggingFace is restricted
- For private models, specify the HuggingFace API Token

## Troubleshooting

### Download Timeouts

If you experience timeouts during download, the system will automatically retry up to 5 times. If problems persist:

1. **Use a proxy** (if HuggingFace access is restricted):
   ```bash
   export HTTPS_PROXY=http://your-proxy:port
   ```

2. **Use a HuggingFace mirror**:
   ```bash
   export HF_ENDPOINT=https://hf-mirror.com
   ```

3. **Try downloading again** - downloads automatically resume from where they stopped

### Button Not Appearing

If the "Open Manager" button doesn't appear after adding the node:
- Refresh the page (F5)
- Check the browser console (F12) for any errors

---

# ComfyUI Preset Download Manager (Русский)

Кастомная нода для ComfyUI, позволяющая управлять и загружать модели из HuggingFace с удобной системой пресетов.

## Возможности

- 🎯 **Управление пресетами**: Создавайте и управляйте пресетами, содержащими несколько моделей
- ⬇️ **Прямая загрузка**: Загружайте модели напрямую из HuggingFace
- 🎨 **Современный UI**: Красивый интерфейс с темной темой и модальными окнами
- 💾 **Хранение в JSON**: Пресеты сохраняются в формате JSON для удобного резервного копирования и обмена
- 🔑 **Приватные модели**: Поддержка API токенов HuggingFace для приватных/ограниченных моделей
- 📁 **Кастомные папки**: Сохранение моделей в кастомные папки или стандартные директории ComfyUI
- 🌐 **Многоязычность**: Справка доступна на английском и русском языках

## Установка

1. Скопируйте эту папку в директорию `custom_nodes` вашей установки ComfyUI:
   ```
   ComfyUI/custom_nodes/ComfyUI-PresetDownloadManager/
   ```

2. Установите зависимости:
   ```bash
   pip install -r requirements.txt
   ```

3. Перезапустите ComfyUI

## Использование

### Открытие менеджера

1. Добавьте ноду **"HF Preset Download Manager"** в ваш workflow (категория: `utils`)
2. Нажмите кнопку **"⚙ Open Manager"** на ноде, чтобы открыть интерфейс менеджера пресетов

### Создание пресета

1. Нажмите **"➕ Add Preset"** в менеджере
2. Введите **Preset Name** (обязательно)
3. Опционально добавьте **Category** для организации
4. Добавьте одну или несколько моделей в пресет:
   - **HuggingFace Model ID** (обязательно): Формат `username/model-name`
     - Пример: `runwayml/stable-diffusion-v1-5`
   - **Model Path** (опционально): Путь к конкретному файлу в репозитории
     - Пример: `model.safetensors` или `vae/vae.safetensors`
     - Оставьте пустым, чтобы загрузить весь репозиторий
   - **Save to Folder** (обязательно): Выберите, куда сохранить модель
     - Стандартные папки: `checkpoints`, `loras`, `vae`, `upscale_models` и т.д.
     - Или выберите "Custom folder..." для указания кастомного пути
   - **HuggingFace API Token** (опционально): Требуется для приватных/ограниченных моделей
     - Получите токен в [HuggingFace Settings → Access Tokens](https://huggingface.co/settings/tokens)
5. Нажмите **"Save Preset"**

### Загрузка моделей

- **Один пресет**: Нажмите **"⬇️ Download"** на карточке пресета
- **Несколько пресетов**: 
  1. Выберите пресеты с помощью чекбоксов
  2. Нажмите **"⬇️ Download Selected"** в футере

### Редактирование пресетов

- Нажмите кнопку **✏️ Edit** на карточке пресета
- Измените детали пресета и модели
- Нажмите **"Update Preset"** для сохранения изменений

### Другие возможности

- **📋 Edit JSON**: Прямое редактирование JSON всех пресетов
- **📥 Import/Export**: Импорт или экспорт пресетов как JSON файлы
- **🗑️ Delete**: Удаление отдельных пресетов или нескольких выбранных пресетов
- **❓ Help**: Нажмите кнопку **"?"** в заголовке для подробных инструкций

## Описание полей

### HuggingFace Model ID
Идентификатор модели на HuggingFace в формате `username/model-name`. Вы можете найти его на странице модели на [huggingface.co](https://huggingface.co) - это путь в URL после домена.

**Примеры:**
- `runwayml/stable-diffusion-v1-5`
- `stabilityai/stable-diffusion-xl-base-1.0`
- `lightx2v/Qwen-Image-Lightning`

### Model Path (Опционально)
Путь к конкретному файлу внутри репозитория модели. Оставьте пустым, если хотите загрузить всю модель.

**Примеры:**
- `model.safetensors` - для загрузки одного файла
- `vae/vae.safetensors` - для файла в подпапке
- **Пусто** - загрузить всю модель (все файлы из репозитория)

### Save to Folder
Папка в ComfyUI, куда будет сохранена модель. Выберите тип модели из списка или выберите "Custom folder..." для указания кастомного пути.

**Доступные стандартные папки:**
- `checkpoints` - для основных моделей (Stable Diffusion и т.д.)
- `loras` - для LoRA моделей
- `vae` - для VAE моделей
- `upscale_models` - для моделей апскейла
- И другие типы моделей...

### HuggingFace API Token (Опционально)
Некоторые модели на HuggingFace требуют авторизации (private/gated models). Для таких моделей необходимо указать API ключ.

**Как получить API ключ:**
1. Зарегистрируйтесь на [huggingface.co](https://huggingface.co)
2. Перейдите в [Settings → Access Tokens](https://huggingface.co/settings/tokens)
3. Создайте новый токен (read access достаточно)
4. Скопируйте токен (начинается с `hf_`)

Для публичных моделей API ключ не требуется - оставьте поле пустым.

### Presets
Пресет - это группа моделей, которые можно загрузить вместе одним кликом. Вы можете добавить несколько моделей в один пресет, использовать категории для организации пресетов и редактировать пресеты с помощью кнопки ✏️.

## Советы и хитрости

- Вы можете добавить несколько моделей в один пресет
- Используйте категории для организации пресетов
- Редактируйте пресеты с помощью кнопки ✏️
- Выберите несколько пресетов и загрузите их все сразу
- При таймауте загрузка автоматически возобновится при следующей попытке
- Используйте прокси или зеркала, если доступ к HuggingFace ограничен
- Для приватных моделей укажите HuggingFace API Token

## Решение проблем

### Таймауты при загрузке

Если вы испытываете таймауты во время загрузки, система автоматически повторит попытку до 5 раз. Если проблемы сохраняются:

1. **Используйте прокси** (если доступ к HuggingFace ограничен):
   ```bash
   export HTTPS_PROXY=http://your-proxy:port
   ```

2. **Используйте зеркало HuggingFace**:
   ```bash
   export HF_ENDPOINT=https://hf-mirror.com
   ```

3. **Попробуйте загрузить снова** - загрузка автоматически возобновится с места остановки

### Кнопка не появляется

Если кнопка "Open Manager" не появляется после добавления ноды:
- Обновите страницу (F5)
- Проверьте консоль браузера (F12) на наличие ошибок

## License

MIT
