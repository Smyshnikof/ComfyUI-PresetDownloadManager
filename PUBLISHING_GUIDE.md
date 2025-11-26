# Руководство по публикации в ComfyUI Registry

## Шаг 1: Создайте Publisher ID

1. Перейдите на [Comfy Registry](https://registry.comfy.org)
2. Создайте Publisher аккаунт (если еще не создали)
3. Найдите ваш **Publisher ID** - это текст после символа `@` на странице вашего профиля
   - Например: если URL профиля `https://registry.comfy.org/@my-publisher`, то Publisher ID = `my-publisher`

## Шаг 2: Создайте API Key для публикации

1. Перейдите на страницу вашего Publisher
2. Создайте **Registry Publishing API Key**
3. **ВАЖНО**: Сохраните этот ключ в безопасном месте! Он понадобится для публикации

## Шаг 3: Обновите pyproject.toml

Откройте файл `pyproject.toml` и замените:

1. **PublisherId**: Замените `YOUR_PUBLISHER_ID` на ваш реальный Publisher ID
2. **Repository**: Замените `YOUR_USERNAME` на ваш GitHub username
3. **Icon** (опционально): Добавьте URL к иконке вашей ноды (SVG, PNG, JPG или GIF, макс. 800x400px)
   - Или оставьте как есть, если иконки нет

Пример:
```toml
[project.urls]
Repository = "https://github.com/smysh/ComfyUI-PresetDownloadManager"

[tool.comfy]
PublisherId = "smysh"
DisplayName = "HF Preset Download Manager"
Icon = "https://raw.githubusercontent.com/smysh/ComfyUI-PresetDownloadManager/main/icon.png"
```

## Шаг 4: Создайте GitHub репозиторий

1. Создайте новый репозиторий на GitHub:
   - Название: `ComfyUI-PresetDownloadManager` (или другое)
   - Описание: "ComfyUI custom node for managing and downloading HuggingFace models"
   - Публичный репозиторий

2. Инициализируйте git и загрузите код:
   ```bash
   git init
   git add .
   git commit -m "Initial release"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/ComfyUI-PresetDownloadManager.git
   git push -u origin main
   ```

3. **ВАЖНО**: Убедитесь, что `presets.json` НЕ в репозитории:
   ```bash
   git rm --cached presets.json
   git commit -m "Remove presets.json from tracking"
   ```

## Шаг 5: Публикация через Comfy CLI

### Установка Comfy CLI

Если команда `comfy` не работает (не в PATH), используйте полный путь:

**Windows:**
```bash
python -m pip install comfy-cli
# Затем используйте:
python -m comfy node publish
```

**Или добавьте в PATH:**
Добавьте `C:\Users\Smysh\AppData\Roaming\Python\Python310\Scripts` в PATH системы

### Публикация

1. Убедитесь, что вы в корневой директории проекта
2. Запустите:
   ```bash
   comfy node publish
   # или
   python -m comfy node publish
   ```
3. Введите ваш **Registry Publishing API Key** когда попросят
4. После успешной публикации вы увидите ссылку на вашу ноду в Registry

## Шаг 6: Автоматическая публикация через GitHub Actions (опционально)

Для автоматической публикации при обновлении версии:

1. **Создайте GitHub Secret:**
   - Перейдите в Settings → Secrets and Variables → Actions
   - New Repository Secret
   - Имя: `REGISTRY_ACCESS_TOKEN`
   - Значение: ваш Registry Publishing API Key

2. **Создайте файл `.github/workflows/publish_action.yml`:**
   ```yaml
   name: Publish to Comfy registry
   on:
     workflow_dispatch:
     push:
       branches:
         - main
       paths:
         - "pyproject.toml"
   
   jobs:
     publish-node:
       name: Publish Custom Node to registry
       runs-on: ubuntu-latest
       steps:
         - name: Check out code
           uses: actions/checkout@v4
         - name: Publish Custom Node
           uses: Comfy-Org/publish-node-action@main
           with:
             personal_access_token: ${{ secrets.REGISTRY_ACCESS_TOKEN }}
   ```

3. После этого каждое обновление версии в `pyproject.toml` будет автоматически публиковаться

## Обновление версии

При обновлении ноды:

1. Измените версию в `pyproject.toml`:
   ```toml
   version = "1.0.1"  # Увеличьте версию
   ```

2. Закоммитьте и запушьте изменения:
   ```bash
   git add pyproject.toml
   git commit -m "Bump version to 1.0.1"
   git push
   ```

3. Если настроен GitHub Actions - публикация произойдет автоматически
4. Или запустите вручную: `comfy node publish`

## Важные замечания

- **Publisher ID** нельзя изменить после создания
- **name** в `pyproject.toml` тоже нельзя изменить после первой публикации
- Версии должны следовать [Semantic Versioning](https://semver.org/)
- Убедитесь, что `presets.json` в `.gitignore` (уже есть)

## Проверка перед публикацией

- [ ] `pyproject.toml` заполнен правильно
- [ ] `PublisherId` указан
- [ ] `Repository` URL правильный
- [ ] `presets.json` не в git (в `.gitignore`)
- [ ] Все файлы закоммичены
- [ ] Код загружен на GitHub
- [ ] API Key готов

