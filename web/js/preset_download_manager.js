import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

console.log("[PresetDownloadManager] Скрипт загружен!");

// Класс для управления нодой (как в ResolutionMaster) - должен быть определен до использования
class PresetDownloadManagerNode {
    constructor(node) {
        this.node = node;
        this.controls = {};
        this.hoverElement = null;
        
        console.log("[PresetDownloadManager] Инициализация PresetDownloadManagerNode для ноды:", node.id);
        console.log("[PresetDownloadManager] Размер ноды:", node.size);
        
        // Устанавливаем минимальный размер ноды
        if (node.size[0] < 200) {
            node.size[0] = 200;
        }
        if (node.size[1] < 100) {
            node.size[1] = 100;
        }
        
        // Принудительно обновляем canvas сразу после создания
        const forceInitialRedraw = () => {
            if (app.graph && app.graph.setDirtyCanvas) {
                app.graph.setDirtyCanvas(true, true);
            }
            if (node.setDirtyCanvas) {
                node.setDirtyCanvas(true);
            }
        };
        
        // Используем requestAnimationFrame для гарантированной перерисовки
        requestAnimationFrame(() => {
            forceInitialRedraw();
        });
        
        setTimeout(() => {
            requestAnimationFrame(forceInitialRedraw);
        }, 50);
        
        // Сохраняем оригинальные обработчики
        const originalOnDrawForeground = node.onDrawForeground;
        const originalOnMouseDown = node.onMouseDown;
        const originalOnMouseMove = node.onMouseMove;
        
        // Переопределяем onDrawForeground для рисования кнопки
        const self = this;
        node.onDrawForeground = function(ctx) {
            // Вызываем оригинальный обработчик, если есть
            if (originalOnDrawForeground) {
                originalOnDrawForeground.call(this, ctx);
            }
            
            // Не рисуем кнопку, если нода свернута
            if (this.flags && this.flags.collapsed) return;
            
            // Убеждаемся, что менеджер инициализирован
            if (!self || !self.controls) return;
            
            console.log("[PresetDownloadManager] onDrawForeground вызван для ноды:", this.id);
            self.drawInterface(ctx);
        };
        
        // Переопределяем обработчики мыши
        node.onMouseDown = function(e, pos, canvas) {
            // Проверяем клик по нашей кнопке
            if (self.handleMouseDown(e, pos, canvas)) {
                return true;
            }
            
            // Вызываем оригинальный обработчик
            if (originalOnMouseDown) {
                return originalOnMouseDown.call(this, e, pos, canvas);
            }
            
            return false;
        };
        
        node.onMouseMove = function(e, pos, canvas) {
            // Обрабатываем hover для нашей кнопки
            self.handleMouseHover(e, pos, canvas);
            
            // Вызываем оригинальный обработчик
            if (originalOnMouseMove) {
                return originalOnMouseMove.call(this, e, pos, canvas);
            }
            
            return false;
        };
    }
    
    drawInterface(ctx) {
        const node = this.node;
        console.log("[PresetDownloadManager] drawInterface вызван, размер ноды:", node.size);
        
        const padding = 10;
        const buttonHeight = 28;
        const buttonWidth = Math.max(150, node.size[0] - padding * 2);
        // Поднимаем кнопку выше (отступ сверху вместо снизу)
        const buttonY = padding + 5;
        const buttonX = padding;
        
        console.log("[PresetDownloadManager] Координаты кнопки:", { x: buttonX, y: buttonY, w: buttonWidth, h: buttonHeight });
        
        // Сохраняем координаты кнопки
        this.controls.openManagerBtn = {
            x: buttonX,
            y: buttonY,
            w: buttonWidth,
            h: buttonHeight
        };
        
        // Рисуем кнопку
        this.drawButton(
            ctx,
            buttonX,
            buttonY,
            buttonWidth,
            buttonHeight,
            "⚙ Open Manager",
            this.hoverElement === 'openManagerBtn'
        );
        
        console.log("[PresetDownloadManager] Кнопка нарисована");
    }
    
    drawButton(ctx, x, y, w, h, text, hover = false) {
        // Градиент для кнопки (голубой цвет #6495ED)
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        if (hover) {
            grad.addColorStop(0, "#7ba3f0");
            grad.addColorStop(1, "#6495ED");
        } else {
            grad.addColorStop(0, "#6495ED");
            grad.addColorStop(1, "#4a7ae8");
        }
        ctx.fillStyle = grad;
        ctx.strokeStyle = hover ? "#8bb3f5" : "#5a85e0";
        ctx.lineWidth = 1;
        
        // Рисуем скругленный прямоугольник
        ctx.beginPath();
        const radius = 5;
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Рисуем текст
        ctx.fillStyle = "#fff";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, x + w / 2, y + h / 2 + 1);
    }
    
    isPointInControl(x, y, control) {
        return x >= control.x && x <= control.x + control.w &&
               y >= control.y && y <= control.y + control.h;
    }
    
    handleMouseHover(e, pos, canvas) {
        const relX = pos[0];
        const relY = pos[1];
        let newHover = null;
        
        for (const key in this.controls) {
            if (this.isPointInControl(relX, relY, this.controls[key])) {
                newHover = key;
                break;
            }
        }
        
        if (newHover !== this.hoverElement) {
            this.hoverElement = newHover;
            this.node.setDirtyCanvas(true);
        }
    }
    
    handleMouseDown(e, pos, canvas) {
        const relX = pos[0];
        const relY = pos[1];
        
        for (const key in this.controls) {
            if (this.isPointInControl(relX, relY, this.controls[key])) {
                if (key === 'openManagerBtn') {
                    console.log("[PresetDownloadManager] Кнопка нажата!");
                    // Вызываем createModal через глобальную переменную или через событие
                    if (window.presetDownloadManagerCreateModal) {
                        window.presetDownloadManagerCreateModal();
                    } else {
                        console.error("[PresetDownloadManager] createModal не найдена!");
                    }
                    return true;
                }
            }
        }
        
        return false;
    }
}

// Регистрация расширения для UI
app.registerExtension({
    name: "ComfyUI.PresetDownloadManager",
    async beforeRegisterNodeDef(nodeType, nodeData, _app) {
        // Используем beforeRegisterNodeDef как в ResolutionMaster для более надежного перехвата
        if (nodeData.name === "PresetDownloadManager" || nodeData.name === "HF Preset Download Manager") {
            const originalOnNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                if (originalOnNodeCreated) {
                    originalOnNodeCreated.apply(this, arguments);
                }
                
                console.log("[PresetDownloadManager] Нода создана через beforeRegisterNodeDef:", this.id, this.type);
                
                // Создаём экземпляр менеджера для этой ноды
                this.presetManager = new PresetDownloadManagerNode(this);
                
                // Принудительно обновляем canvas
                const forceRedraw = () => {
                    if (app.graph && app.graph.setDirtyCanvas) {
                        app.graph.setDirtyCanvas(true, true);
                    }
                    if (this.setDirtyCanvas) {
                        this.setDirtyCanvas(true);
                    }
                };
                
                // Немедленная перерисовка
                requestAnimationFrame(() => {
                    forceRedraw();
                });
                
                // Дополнительные перерисовки для надежности
                setTimeout(() => {
                    requestAnimationFrame(forceRedraw);
                }, 50);
                setTimeout(() => {
                    requestAnimationFrame(forceRedraw);
                }, 200);
                setTimeout(() => {
                    requestAnimationFrame(forceRedraw);
                }, 500);
            };
        }
    },
    async setup() {
        console.log("[PresetDownloadManager] Расширение setup() вызван!");
        
        // Состояние модального окна
        let currentView = 'list'; // 'list' или 'add'
        let editingPresetId = null; // ID редактируемого пресета (null = новый пресет)
        let selectedPresetsForDeletion = new Set();
        
        // Список папок для сохранения
        const savePaths = [
            "diffusion_models", "loras", "vae", "text_encoders", "upscale_models",
            "clip_vision", "audio_encoders", "checkpoints", "clip", "configs",
            "controlnet", "diffusers", "embeddings", "gligen", "hypernetworks",
            "ipadapter", "model_patches", "onnx", "photomaker", "sams",
            "style_models", "unet", "vae_approx", "vibevoice"
        ];
        
        // Функция для создания модального окна (в стиле ResolutionMaster)
        function createModal() {
            console.log("[PresetDownloadManager] Создание модального окна...");
            
            // Сброс состояния
            currentView = 'list';
            selectedPresetsForDeletion.clear();
            
            // Создаём overlay (тёмный фон)
            const overlay = document.createElement("div");
            overlay.className = "preset-manager-overlay";
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 10000;
            `;
            
            // Создаём контейнер модального окна
            const container = document.createElement("div");
            container.className = "preset-manager-dialog";
            container.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                border: 2px solid #444;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                z-index: 10001;
                width: 90%;
                max-width: 800px;
                max-height: 85vh;
                display: flex;
                flex-direction: column;
                font-family: Arial, sans-serif;
            `;
            
            overlay.addEventListener('mousedown', (e) => {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                    if (container.parentNode) {
                        document.body.removeChild(container);
                    }
                }
            });

            // Заголовок
            const header = document.createElement("div");
            header.className = "preset-manager-header";
            header.style.cssText = `
                padding: 16px 20px;
                border-bottom: 2px solid #333;
                display: flex;
                align-items: center;
                justify-content: space-between;
            `;

            const title = document.createElement("div");
            title.className = "preset-manager-title";
            title.textContent = "⚙ Custom Presets Manager";
            title.style.cssText = `
                color: white;
                font-size: 24px;
                font-weight: bold;
            `;

            const closeBtn = document.createElement("button");
            closeBtn.className = "preset-manager-close-btn";
            closeBtn.textContent = "✕";
            closeBtn.style.cssText = `
                background: transparent;
                border: none;
                color: #ccc;
                cursor: pointer;
                padding: 0;
                font-size: 32px;
                width: 32px;
                height: 32px;
                line-height: 32px;
                text-align: center;
                border-radius: 8px;
                transition: all 0.2s;
            `;
            closeBtn.onmouseover = () => {
                closeBtn.style.background = "rgba(255, 255, 255, 0.1)";
                closeBtn.style.color = "white";
            };
            closeBtn.onmouseout = () => {
                closeBtn.style.background = "transparent";
                closeBtn.style.color = "#ccc";
            };
            closeBtn.onclick = () => {
                if (overlay.parentNode) document.body.removeChild(overlay);
                if (container.parentNode) document.body.removeChild(container);
            };

            // Кнопка Help
            const helpBtn = document.createElement("button");
            helpBtn.className = "preset-manager-help-btn";
            helpBtn.textContent = "?";
            helpBtn.title = "Show Help / Instructions";
            helpBtn.style.cssText = `
                background: transparent;
                border: 2px solid #3b82f6;
                color: #3b82f6;
                cursor: pointer;
                padding: 0;
                font-size: 20px;
                font-weight: bold;
                width: 32px;
                height: 32px;
                line-height: 28px;
                text-align: center;
                border-radius: 50%;
                transition: all 0.2s;
                margin-right: 8px;
            `;
            helpBtn.onmouseover = () => {
                helpBtn.style.background = "#3b82f6";
                helpBtn.style.color = "white";
            };
            helpBtn.onmouseout = () => {
                helpBtn.style.background = "transparent";
                helpBtn.style.color = "#3b82f6";
            };
            helpBtn.onclick = () => {
                showHelpModal();
            };
            
            const headerButtons = document.createElement("div");
            headerButtons.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            headerButtons.appendChild(helpBtn);
            headerButtons.appendChild(closeBtn);

            header.appendChild(title);
            header.appendChild(headerButtons);
            container.appendChild(header);

            // Content area
            const content = document.createElement("div");
            content.className = "preset-manager-content";
            content.id = "preset-manager-content";
            content.style.cssText = `
                flex: 1;
                overflow-y: auto;
                padding: 20px;
            `;
            container.appendChild(content);
            
            // Функция для рендеринга контента в зависимости от текущего вида
            const renderContent = async () => {
                content.innerHTML = '';
                
                if (currentView === 'list') {
                    await renderListView(content);
                } else if (currentView === 'add') {
                    renderAddView(content);
                }
                
                // Обновляем footer
                renderFooter(footer);
            };
            
            // Footer с кнопками
            const footer = document.createElement("div");
            footer.className = "preset-manager-footer";
            footer.id = "preset-manager-footer";
            footer.style.cssText = `
                padding: 16px 20px;
                border-top: 2px solid #333;
                display: flex;
                gap: 12px;
            `;
            container.appendChild(footer);
            
            // Инициализация
            renderContent();
            
            // Добавляем overlay и container в DOM
            document.body.appendChild(overlay);
            document.body.appendChild(container);
            
            // Возвращаем объект для управления модальным окном
            return {
                overlay: overlay,
                container: container,
                renderContent: renderContent,
                close: () => {
                    if (overlay.parentNode) document.body.removeChild(overlay);
                    if (container.parentNode) document.body.removeChild(container);
                }
            };
        }
        
        // Экспортируем функцию в глобальную область видимости для доступа из класса
        window.presetDownloadManagerCreateModal = createModal;
        
        // Функция для рендеринга списка пресетов
        async function renderListView(content) {
            // Очищаем контент перед рендерингом
            content.innerHTML = '';
            
            // Загружаем пресеты
            let presetsData = { categories: [], presets: [] };
            try {
                const response = await api.fetchApi("/preset_download_manager/presets");
                presetsData = await response.json();
            } catch (error) {
                console.error("[PresetDownloadManager] Ошибка загрузки пресетов:", error);
            }
            
            // Подсчитываем статистику
            const categories = new Set();
            presetsData.presets.forEach(preset => {
                if (preset.category) {
                    categories.add(preset.category);
                }
            });
            const categoriesCount = categories.size;
            const presetsCount = presetsData.presets.length;
            
            // Stats header
            const statsDiv = document.createElement("div");
            statsDiv.className = "preset-list-stats";
            statsDiv.style.cssText = `
                background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
                padding: 12px 16px;
                border-radius: 8px;
                margin-bottom: 20px;
                color: white;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            
            const statsIcon = document.createElement("div");
            statsIcon.innerHTML = "📊";
            statsIcon.style.cssText = `font-size: 18px;`;
            statsDiv.appendChild(statsIcon);
            
            const statsText = document.createElement("span");
            statsText.innerHTML = `<strong>${categoriesCount}</strong> categories, <strong>${presetsCount}</strong> custom presets total`;
            statsDiv.appendChild(statsText);
            content.appendChild(statsDiv);
            
            // Если нет пресетов, показываем empty state
            if (presetsCount === 0) {
                const emptyState = document.createElement("div");
                emptyState.className = "preset-list-empty";
                emptyState.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 20px;
                    text-align: center;
                `;
                
                const emptyIcon = document.createElement("div");
                emptyIcon.innerHTML = "🎯";
                emptyIcon.style.cssText = `
                    font-size: 80px;
                        margin-bottom: 20px;
                    opacity: 0.6;
                `;
                
                const emptyTitle = document.createElement("div");
                emptyTitle.textContent = "No custom presets yet";
                emptyTitle.style.cssText = `
                        color: white;
                    font-size: 18px;
                font-weight: bold;
                    margin-bottom: 8px;
                `;
                
                const emptySubtitle = document.createElement("div");
                emptySubtitle.textContent = 'Click "Add Preset" to create your first custom preset';
                emptySubtitle.style.cssText = `
                    color: #aaa;
                        font-size: 14px;
                    `;

                emptyState.appendChild(emptyIcon);
                emptyState.appendChild(emptyTitle);
                emptyState.appendChild(emptySubtitle);
                content.appendChild(emptyState);
                return;
            }
            
            // Группируем пресеты по категориям
            const presetsByCategory = {};
            presetsData.presets.forEach(preset => {
                const category = preset.category || "Uncategorized";
                if (!presetsByCategory[category]) {
                    presetsByCategory[category] = [];
                }
                presetsByCategory[category].push(preset);
            });
            
            // Рендерим пресеты по категориям
            Object.entries(presetsByCategory).forEach(([category, presets]) => {
                const categorySection = document.createElement("div");
                categorySection.style.cssText = `
                    margin-bottom: 20px;
                `;
                
                const categoryHeader = document.createElement("div");
                categoryHeader.textContent = category;
                categoryHeader.style.cssText = `
                color: white;
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    padding: 8px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 4px;
                `;
                categorySection.appendChild(categoryHeader);

                presets.forEach(preset => {
                    const presetItem = createPresetItem(preset);
                    categorySection.appendChild(presetItem);
                });
                
                content.appendChild(categorySection);
            });
        }
        
        // Функция для создания элемента пресета
        function createPresetItem(preset) {
            const item = document.createElement("div");
            item.style.cssText = `
                        background: #1a1a1a;
                        border: 2px solid #444;
                        border-radius: 8px;
                padding: 12px;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 12px;
            `;
            
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.dataset.presetId = preset.id;
            checkbox.style.cssText = `cursor: pointer;`;
            checkbox.onchange = (e) => {
                if (e.target.checked) {
                    selectedPresetsForDeletion.add(preset.id);
                        } else {
                    selectedPresetsForDeletion.delete(preset.id);
                }
                updateDeleteButton();
            };
            item.appendChild(checkbox);
            
            const info = document.createElement("div");
            info.style.cssText = `flex: 1;`;
            
            const name = document.createElement("div");
            name.textContent = preset.name || preset.id;
            name.style.cssText = `
                color: white;
                font-size: 14px;
                        font-weight: bold;
                margin-bottom: 4px;
            `;
            info.appendChild(name);
            
            const details = document.createElement("div");
            // Поддержка старого формата (одна модель) и нового (массив моделей)
            const models = preset.models || (preset.model_id ? [{
                model_id: preset.model_id,
                model_path: preset.model_path || "",
                save_path: preset.save_path || "N/A"
            }] : []);
            
            const modelsCount = models.length;
            let modelsText = "";
            if (modelsCount === 1) {
                const model = models[0];
                const modelDisplay = model.direct_url ? `Direct URL: ${model.direct_url.split('/').pop() || 'N/A'}` : (model.model_id || 'N/A');
                modelsText = `<span style="color: #aaa; font-size: 12px;">Model: ${modelDisplay}</span><br>
                              <span style="color: #aaa; font-size: 12px;">Save to: ${model.save_path || 'N/A'}</span>`;
            } else {
                modelsText = `<span style="color: #aaa; font-size: 12px;"><strong>${modelsCount} models:</strong></span><br>`;
                models.forEach((model, idx) => {
                    const modelDisplay = model.direct_url ? `Direct URL: ${model.direct_url.split('/').pop() || 'N/A'}` : (model.model_id || 'N/A');
                    modelsText += `<span style="color: #aaa; font-size: 11px;">${idx + 1}. ${modelDisplay} → ${model.save_path || 'N/A'}</span><br>`;
                });
            }
            details.innerHTML = modelsText;
            info.appendChild(details);
            item.appendChild(info);
            
            // Контейнер для кнопок
            const buttonsContainer = document.createElement("div");
            buttonsContainer.style.cssText = `
                display: flex;
                gap: 8px;
                align-items: center;
            `;

            // Кнопка загрузки
            const downloadBtn = document.createElement("button");
            downloadBtn.innerHTML = "⬇️ Download";
            downloadBtn.dataset.presetId = preset.id;
            downloadBtn.style.cssText = `
                background: #3b82f6;
                border: none;
                color: white;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                        font-size: 12px;
                font-weight: bold;
                white-space: nowrap;
            `;
            downloadBtn.onmouseover = () => {
                if (!downloadBtn.disabled) {
                    downloadBtn.style.background = "#2563eb";
                }
            };
            downloadBtn.onmouseout = () => {
                if (!downloadBtn.disabled) {
                    downloadBtn.style.background = "#3b82f6";
                }
            };
            downloadBtn.onclick = async () => {
                await downloadPreset(preset, downloadBtn);
            };
            buttonsContainer.appendChild(downloadBtn);
            
            // Кнопка редактирования
            const editBtn = document.createElement("button");
            editBtn.innerHTML = "✏️";
            editBtn.style.cssText = `
                background: #3b82f6;
                border: none;
                color: white;
                padding: 6px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;
            editBtn.onmouseover = () => {
                editBtn.style.background = "#2563eb";
            };
            editBtn.onmouseout = () => {
                editBtn.style.background = "#3b82f6";
            };
            editBtn.onclick = () => {
                editPreset(preset);
            };
            buttonsContainer.appendChild(editBtn);
            
            // Кнопка удаления
            const deleteBtn = document.createElement("button");
            deleteBtn.innerHTML = "🗑️";
            deleteBtn.style.cssText = `
                background: #f55;
                border: none;
                color: white;
                padding: 6px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;
            deleteBtn.onclick = async () => {
                const confirmed = await showConfirmDialog(
                    `Delete preset "${preset.name || preset.id}"?`,
                    async () => {
                        await deletePreset(preset.id);
                        const modal = document.querySelector('.preset-manager-dialog');
                        if (modal) {
                            const content = modal.querySelector('#preset-manager-content');
                            if (content) {
                                await renderListView(content);
                            }
                        }
                    }
                );
            };
            buttonsContainer.appendChild(deleteBtn);
            
            item.appendChild(buttonsContainer);
            
            return item;
        }
        
        // Функция для загрузки всех моделей из пресета
        async function downloadPreset(preset, button) {
            // Получаем модели из пресета
            const models = preset.models || (preset.model_id ? [{
                model_id: preset.model_id,
                model_path: preset.model_path || "",
                save_path: preset.save_path || "checkpoints",
                hf_token: preset.hf_token || ""
            }] : []);

                if (models.length === 0) {
                    showToast("No models to download in this preset", "warning");
                    return;
                }

            // Блокируем кнопку
            button.disabled = true;
            button.innerHTML = "⏳ Downloading...";
            button.style.background = "#666";
            button.style.cursor = "not-allowed";
            
            const totalModels = models.length;
            let successCount = 0;
            let errorCount = 0;
            const errors = [];
            
            // Создаём модальное окно прогресса
            const progressModal = createProgressModal(preset.name || preset.id, totalModels);
            
            try {
                // Загружаем каждую модель последовательно
                for (let i = 0; i < models.length; i++) {
                    const model = models[i];
                    
                    // Обновляем прогресс перед началом загрузки
                    const modelDisplayName = model.direct_url ? (model.direct_url.split('/').pop() || "Direct URL") : model.model_id;
                    updateProgressModal(progressModal, i + 1, totalModels, modelDisplayName);
                    
                    try {
                        const downloadData = {
                            save_path: model.save_path,
                            hf_token: model.hf_token || ""  // Опциональный API ключ
                        };
                        
                        if (model.direct_url) {
                            downloadData.direct_url = model.direct_url;
                        } else {
                            downloadData.model_id = model.model_id;
                            downloadData.model_path = model.model_path || "";
                        }
                        
                        const modelDisplayName = model.direct_url ? (model.direct_url.split('/').pop() || "Direct URL") : model.model_id;
                        
                        const response = await api.fetchApi("/preset_download_manager/download", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(downloadData)
                        });
                        
                        // Проверяем статус ответа
                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
                        }
                        
                        // Проверяем Content-Type перед парсингом JSON
                        const contentType = response.headers.get("content-type") || "";
                        let result;
                        
                        if (contentType.includes("application/json")) {
                            try {
                                result = await response.json();
                            } catch (jsonError) {
                                // Если не удалось распарсить JSON, но статус OK, возможно файл скачался
                                // Проверяем, может быть это был успешный ответ, но с неправильным Content-Type
                                const text = await response.text();
                                console.warn("[PresetDownloadManager] Failed to parse JSON, but status was OK. Response:", text.substring(0, 200));
                                // Пытаемся извлечь информацию из текста или считаем успешным
                                throw new Error(`Server returned non-JSON response (${contentType}). File may have been downloaded successfully. Check the file location.`);
                            }
                        } else {
                            // Если сервер вернул не JSON, но статус OK, возможно файл скачался
                            // Читаем текст для диагностики
                            const text = await response.text();
                            console.warn("[PresetDownloadManager] Server returned non-JSON response:", contentType, text.substring(0, 200));
                            
                            // Если статус был OK, возможно файл все-таки скачался
                            // Но мы не можем это проверить с frontend, поэтому выдаем ошибку
                            throw new Error(`Server returned ${contentType} instead of JSON. File may have been downloaded successfully. Check the file location. Response preview: ${text.substring(0, 200)}`);
                        }
                        
                        if (result.status === "success") {
                            // Обновляем прогресс с путем сохранения
                            if (result.path) {
                                let progressText = result.path;
                                if (result.message) {
                                    progressText += ` (${result.message})`;
                                }
                                updateProgressModal(progressModal, i + 1, totalModels, modelDisplayName, progressText);
                            }
                            successCount++;
                } else {
                            errorCount++;
                            // Улучшаем сообщение об ошибке для пользователя
                            let errorMsg = result.message || "Unknown error";
                            if (errorMsg.includes("Timeout") || errorMsg.includes("timed out")) {
                                errorMsg = "Timeout: загрузка заняла слишком много времени. Попробуйте снова - загрузка автоматически возобновится.";
                            } else if (errorMsg.includes("Connection")) {
                                errorMsg = "Ошибка соединения: проверьте интернет-соединение.";
                            }
                            errors.push({
                                model: modelDisplayName,
                                error: errorMsg
                            });
                        }
                    } catch (error) {
                        errorCount++;
                        const modelDisplayName = model.direct_url ? (model.direct_url.split('/').pop() || "Direct URL") : model.model_id;
                        errors.push({
                            model: modelDisplayName,
                            error: error.message || "Network error"
                        });
                    }
                }
                
                // Закрываем модальное окно прогресса
                closeProgressModal(progressModal);
                
                // Показываем результат
                if (errorCount === 0) {
                    showToast(`Successfully downloaded ${successCount} model(s) from preset "${preset.name || preset.id}"`, "success", 5000);
                } else {
                    let errorMsg = `Downloaded ${successCount} of ${totalModels} model(s). Errors: `;
                    const errorList = errors.map(err => `${err.model}: ${err.error}`).join("; ");
                    errorMsg += errorList;
                    showToast(errorMsg, "error", 8000);
                }
            } catch (error) {
                closeProgressModal(progressModal);
                showToast(`Error downloading preset: ${error.message}`, "error");
            } finally {
                // Разблокируем кнопку
                button.disabled = false;
                button.innerHTML = "⬇️ Download";
                button.style.background = "#3b82f6";
                button.style.cursor = "pointer";
            }
        }
        
        // Функция для создания модального окна прогресса
        function createProgressModal(presetName, totalModels) {
            const overlay = document.createElement("div");
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                        width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 20000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            const modal = document.createElement("div");
            modal.style.cssText = `
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                border: 2px solid #444;
                border-radius: 16px;
                padding: 24px;
                min-width: 400px;
                max-width: 600px;
            `;
            
            const title = document.createElement("div");
            title.textContent = `Downloading: ${presetName}`;
                    title.style.cssText = `
                        color: white;
                font-size: 18px;
                        font-weight: bold;
                margin-bottom: 16px;
            `;
            modal.appendChild(title);
            
            const progressText = document.createElement("div");
            progressText.id = "download-progress-text";
            progressText.textContent = `Preparing...`;
            progressText.style.cssText = `
                        color: #aaa;
                        font-size: 14px;
                margin-bottom: 8px;
            `;
            modal.appendChild(progressText);
            
            // Добавляем отображение пути сохранения
            const pathText = document.createElement("div");
            pathText.id = "download-path-text";
            pathText.textContent = ``;
            pathText.style.cssText = `
                        color: #888;
                        font-size: 12px;
                        font-family: monospace;
                        margin-bottom: 12px;
                        word-break: break-all;
                        max-height: 60px;
                        overflow-y: auto;
            `;
            modal.appendChild(pathText);
            
            const progressBarContainer = document.createElement("div");
            progressBarContainer.style.cssText = `
                background: #1a1a1a;
                border-radius: 8px;
                height: 24px;
                overflow: hidden;
                margin-bottom: 8px;
            `;
            
            const progressBar = document.createElement("div");
            progressBar.id = "download-progress-bar";
            progressBar.style.cssText = `
                background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
                height: 100%;
                width: 0%;
                transition: width 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                            font-size: 12px;
                font-weight: bold;
            `;
            progressBarContainer.appendChild(progressBar);
            modal.appendChild(progressBarContainer);
            
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            
            return {
                overlay: overlay,
                modal: modal,
                progressText: progressText,
                progressBar: progressBar,
                pathText: pathText
            };
        }
        
        // Функция для обновления прогресса
        function updateProgressModal(progressModal, current, total, modelName, savePath = null) {
            const percentage = (current / total) * 100;
            progressModal.progressBar.style.width = `${percentage}%`;
            progressModal.progressBar.textContent = `${current}/${total}`;
            progressModal.progressText.textContent = `Downloading: ${modelName} (${current} of ${total})`;
            
            // Обновляем путь сохранения, если он указан
            if (savePath) {
                progressModal.pathText.textContent = `Saving to: ${savePath}`;
                progressModal.pathText.style.color = "#4ade80";
            } else {
                progressModal.pathText.textContent = ``;
            }
        }
        
        // Функция для закрытия модального окна прогресса
        function closeProgressModal(progressModal) {
            if (progressModal.overlay.parentNode) {
                document.body.removeChild(progressModal.overlay);
            }
        }
        
        // Функция для загрузки выбранных пресетов
        async function downloadSelectedPresets(selectedPresetIds) {
            if (selectedPresetIds.size === 0) {
                showToast("No presets selected", "warning");
                return;
            }

            // Загружаем все пресеты
            let presetsData = { categories: [], presets: [] };
            try {
                const response = await api.fetchApi("/preset_download_manager/presets");
                presetsData = await response.json();
                                } catch (error) {
                showToast("Error loading presets: " + error.message, "error");
                return;
            }
            
            // Фильтруем выбранные пресеты
            const selectedPresets = presetsData.presets.filter(p => selectedPresetIds.has(p.id));
            
            if (selectedPresets.length === 0) {
                showToast("No presets found", "warning");
                return;
            }
            
            // Подсчитываем общее количество моделей
            let totalModels = 0;
            selectedPresets.forEach(preset => {
                const models = preset.models || (preset.model_id ? [{
                    model_id: preset.model_id,
                    model_path: preset.model_path || "",
                    save_path: preset.save_path || "checkpoints",
                    hf_token: preset.hf_token || ""
                }] : []);
                totalModels += models.length;
            });
            
            if (totalModels === 0) {
                showToast("No models to download in selected presets", "warning");
                return;
            }
            
            // Создаём модальное окно прогресса
            const progressModal = createProgressModal(`${selectedPresets.length} preset(s)`, totalModels);
            
            let currentModel = 0;
            let successCount = 0;
            let errorCount = 0;
            const errors = [];
            
            try {
                // Загружаем модели из каждого пресета
                for (const preset of selectedPresets) {
                    const models = preset.models || (preset.model_id ? [{
                        model_id: preset.model_id,
                        model_path: preset.model_path || "",
                        save_path: preset.save_path || "checkpoints",
                        hf_token: preset.hf_token || ""
                    }] : []);
                    
                    for (const model of models) {
                        currentModel++;
                        const modelDisplayName = model.direct_url ? (model.direct_url.split('/').pop() || "Direct URL") : model.model_id;
                        updateProgressModal(progressModal, currentModel, totalModels, `${modelDisplayName} (${preset.name})`);
                        
                        try {
                            const downloadData = {
                                save_path: model.save_path,
                                hf_token: model.hf_token || ""  // Опциональный API ключ
                            };
                            
                            if (model.direct_url) {
                                downloadData.direct_url = model.direct_url;
                            } else {
                                downloadData.model_id = model.model_id;
                                downloadData.model_path = model.model_path || "";
                            }
                            
                            const response = await api.fetchApi("/preset_download_manager/download", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(downloadData)
                            });
                            
                            // Проверяем статус ответа
                            if (!response.ok) {
                                const errorText = await response.text();
                                throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
                            }
                            
                            // Проверяем Content-Type перед парсингом JSON
                            const contentType = response.headers.get("content-type") || "";
                            let result;
                            
                            if (contentType.includes("application/json")) {
                                try {
                                    result = await response.json();
                                } catch (jsonError) {
                                    // Если не удалось распарсить JSON, но статус OK, возможно файл скачался
                                    const text = await response.text();
                                    console.warn("[PresetDownloadManager] Failed to parse JSON, but status was OK. Response:", text.substring(0, 200));
                                    throw new Error(`Server returned non-JSON response (${contentType}). File may have been downloaded successfully. Check the file location.`);
                                }
                            } else {
                                // Если сервер вернул не JSON, но статус OK, возможно файл скачался
                                const text = await response.text();
                                console.warn("[PresetDownloadManager] Server returned non-JSON response:", contentType, text.substring(0, 200));
                                throw new Error(`Server returned ${contentType} instead of JSON. File may have been downloaded successfully. Check the file location. Response preview: ${text.substring(0, 200)}`);
                            }
                            
                            if (result.status === "success") {
                                // Обновляем прогресс с путем сохранения
                                if (result.path) {
                                    let progressText = result.path;
                                    if (result.message) {
                                        progressText += ` (${result.message})`;
                                    }
                                    updateProgressModal(progressModal, currentModel, totalModels, `${modelDisplayName} (${preset.name})`, progressText);
                                }
                                successCount++;
                            } else {
                                errorCount++;
                                // Улучшаем сообщение об ошибке для пользователя
                                let errorMsg = result.message || "Unknown error";
                                if (errorMsg.includes("Timeout") || errorMsg.includes("timed out")) {
                                    errorMsg = "Timeout: загрузка заняла слишком много времени. Попробуйте снова - загрузка автоматически возобновится.";
                                } else if (errorMsg.includes("Connection")) {
                                    errorMsg = "Ошибка соединения: проверьте интернет-соединение.";
                                }
                                errors.push({
                                    preset: preset.name || preset.id,
                                    model: modelDisplayName,
                                    error: errorMsg
                                });
                            }
                        } catch (error) {
                            errorCount++;
                            errors.push({
                                preset: preset.name || preset.id,
                                model: model.model_id,
                                error: error.message || "Network error"
                            });
                        }
                    }
                }
                
                // Закрываем модальное окно прогресса
                closeProgressModal(progressModal);
                
                // Показываем результат
                if (errorCount === 0) {
                    showToast(`Successfully downloaded ${successCount} model(s) from ${selectedPresets.length} preset(s)`, "success", 5000);
                } else {
                    let errorMsg = `Downloaded ${successCount} of ${totalModels} model(s). Errors: `;
                    const errorList = errors.map(err => `${err.preset}/${err.model}: ${err.error}`).join("; ");
                    errorMsg += errorList;
                    showToast(errorMsg, "error", 8000);
                }
            } catch (error) {
                closeProgressModal(progressModal);
                showToast(`Error downloading presets: ${error.message}`, "error");
            }
        }
        
        // Массив для хранения моделей в форме
        let modelsInForm = [];
        
        // Функция для редактирования пресета
        function editPreset(preset) {
            editingPresetId = preset.id;
            currentView = 'add';
            
            const content = document.getElementById("preset-manager-content");
            const footer = document.getElementById("preset-manager-footer");
            
            if (content) {
                renderAddView(content, preset);
            }
            if (footer) {
                renderFooter(footer);
            }
        }
        
        // Функция для создания элемента модели в форме
        function createModelItem(modelIndex, modelData = null) {
            const modelItem = document.createElement("div");
            modelItem.className = "model-item";
            modelItem.dataset.index = modelIndex;
            modelItem.style.cssText = `
                        background: #1a1a1a;
                        border: 2px solid #444;
                        border-radius: 8px;
                padding: 16px;
                margin-bottom: 12px;
            `;
            
            // Заголовок модели
            const modelHeader = document.createElement("div");
            modelHeader.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            `;
            
            const modelTitle = document.createElement("div");
            modelTitle.textContent = `Model #${modelIndex + 1}`;
            modelTitle.style.cssText = `
                color: white;
                        font-size: 16px;
                        font-weight: bold;
                    `;

            const removeBtn = document.createElement("button");
            removeBtn.innerHTML = "🗑️ Remove";
            removeBtn.style.cssText = `
                padding: 6px 12px;
                background: #f55;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
            `;
            removeBtn.onclick = () => {
                const modelsContainer = document.getElementById("models-container");
                // Не позволяем удалить последнюю модель
                if (modelsContainer.children.length <= 1) {
                    showToast("At least one model is required", "warning");
                    return;
                }
                modelItem.remove();
                updateModelIndices();
            };
            
            modelHeader.appendChild(modelTitle);
            modelHeader.appendChild(removeBtn);
            modelItem.appendChild(modelHeader);
            
            // Прямая ссылка (по умолчанию показывается)
            const directUrlGroup = document.createElement("div");
            directUrlGroup.style.cssText = `display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px;`;
            const directUrlLabel = document.createElement("label");
            directUrlLabel.textContent = "Direct URL *";
            directUrlLabel.style.cssText = `color: white; font-size: 14px; font-weight: bold;`;
            const directUrlInput = document.createElement("input");
            directUrlInput.type = "text";
            directUrlInput.className = "model-direct-url-input";
            directUrlInput.dataset.index = modelIndex;
            directUrlInput.placeholder = "https://huggingface.co/.../resolve/main/file.safetensors";
            directUrlInput.value = modelData ? (modelData.direct_url || "") : "";
            directUrlInput.style.cssText = `
                padding: 10px;
                background: #1a1a1a;
                border: 1px solid #444;
                border-radius: 5px;
                color: white;
                font-size: 14px;
            `;
            directUrlGroup.appendChild(directUrlLabel);
            directUrlGroup.appendChild(directUrlInput);
            modelItem.appendChild(directUrlGroup);
            
            // Чекбокс для использования HuggingFace Repository
            const useHfRepoGroup = document.createElement("div");
            useHfRepoGroup.style.cssText = `display: flex; align-items: center; gap: 8px; margin-bottom: 12px;`;
            const useHfRepoCheckbox = document.createElement("input");
            useHfRepoCheckbox.type = "checkbox";
            useHfRepoCheckbox.className = "model-use-hf-repo-checkbox";
            useHfRepoCheckbox.dataset.index = modelIndex;
            useHfRepoCheckbox.style.cssText = `width: 18px; height: 18px; cursor: pointer;`;
            // Определяем, нужно ли включить чекбокс (если есть model_id, значит используется HF repo)
            const useHfRepo = modelData && modelData.model_id && !modelData.direct_url;
            useHfRepoCheckbox.checked = useHfRepo;
            
            const useHfRepoLabel = document.createElement("label");
            useHfRepoLabel.textContent = "Use HuggingFace Repository";
            useHfRepoLabel.style.cssText = `color: white; font-size: 14px; cursor: pointer;`;
            useHfRepoLabel.onclick = () => useHfRepoCheckbox.click();
            
            useHfRepoGroup.appendChild(useHfRepoCheckbox);
            useHfRepoGroup.appendChild(useHfRepoLabel);
            modelItem.appendChild(useHfRepoGroup);
            
            // HuggingFace Model ID (показывается когда чекбокс включен)
            const modelIdGroup = document.createElement("div");
            modelIdGroup.style.cssText = `display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; display: none;`;
            const modelIdLabel = document.createElement("label");
            modelIdLabel.textContent = "HuggingFace Model ID *";
            modelIdLabel.style.cssText = `color: white; font-size: 14px; font-weight: bold;`;
            const modelIdInput = document.createElement("input");
            modelIdInput.type = "text";
            modelIdInput.className = "model-id-input";
            modelIdInput.dataset.index = modelIndex;
            modelIdInput.placeholder = "user/model-name";
            modelIdInput.value = modelData ? (modelData.model_id || "") : "";
            modelIdInput.style.cssText = `
                padding: 10px;
                background: #1a1a1a;
                border: 1px solid #444;
                border-radius: 5px;
                color: white;
                font-size: 14px;
            `;
            modelIdGroup.appendChild(modelIdLabel);
            modelIdGroup.appendChild(modelIdInput);
            modelItem.appendChild(modelIdGroup);
            
            // Model Path (опционально, показывается только для HuggingFace)
            const modelPathGroup = document.createElement("div");
            modelPathGroup.style.cssText = `display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; display: none;`;
            const modelPathLabel = document.createElement("label");
            modelPathLabel.textContent = "Model Path (optional)";
            modelPathLabel.style.cssText = `color: white; font-size: 14px; font-weight: bold;`;
            const modelPathInput = document.createElement("input");
            modelPathInput.type = "text";
            modelPathInput.className = "model-path-input";
            modelPathInput.dataset.index = modelIndex;
            modelPathInput.placeholder = "path/to/file.safetensors (leave empty to download all)";
            modelPathInput.value = modelData ? modelData.model_path || "" : "";
            modelPathInput.style.cssText = `
                padding: 10px;
                background: #1a1a1a;
                border: 1px solid #444;
                border-radius: 5px;
                color: white;
                font-size: 14px;
            `;
            modelPathGroup.appendChild(modelPathLabel);
            modelPathGroup.appendChild(modelPathInput);
            modelItem.appendChild(modelPathGroup);
            
            // Функция для переключения видимости полей
            const updateSourceTypeVisibility = () => {
                const useHf = useHfRepoCheckbox.checked;
                // Если чекбокс включен - показываем поля HF, скрываем прямую ссылку
                directUrlGroup.style.display = useHf ? "none" : "flex";
                modelIdGroup.style.display = useHf ? "flex" : "none";
                modelPathGroup.style.display = useHf ? "flex" : "none";
                // Обновляем обязательность полей
                if (useHf) {
                    directUrlInput.required = false;
                    modelIdInput.required = true;
                    modelPathInput.required = false;
                } else {
                    directUrlInput.required = true;
                    modelIdInput.required = false;
                    modelPathInput.required = false;
                }
            };
            
            useHfRepoCheckbox.onchange = updateSourceTypeVisibility;
            updateSourceTypeVisibility(); // Инициализация
            
            // Save Path (выбор папки)
            const savePathGroup = document.createElement("div");
            savePathGroup.style.cssText = `display: flex; flex-direction: column; gap: 6px;`;
            const savePathLabel = document.createElement("label");
            savePathLabel.textContent = "Save to Folder *";
            savePathLabel.style.cssText = `color: white; font-size: 14px; font-weight: bold;`;
            const savePathSelect = document.createElement("select");
            savePathSelect.className = "model-save-path-select";
            savePathSelect.dataset.index = modelIndex;
            savePathSelect.style.cssText = `
                padding: 10px;
                background: #1a1a1a;
                border: 1px solid #444;
                border-radius: 5px;
                color: white;
                font-size: 14px;
            `;
            savePaths.forEach(path => {
                const option = document.createElement("option");
                option.value = path;
                option.textContent = path;
                if (modelData && modelData.save_path === path) {
                    option.selected = true;
                } else if (!modelData && path === "checkpoints") {
                    option.selected = true;
                }
                savePathSelect.appendChild(option);
            });
            // Добавляем опцию "Custom folder"
            const customOption = document.createElement("option");
            customOption.value = "__custom__";
            customOption.textContent = "Custom folder...";
            // Проверяем, является ли текущий путь кастомным (не в списке стандартных)
            if (modelData && modelData.save_path && !savePaths.includes(modelData.save_path)) {
                customOption.selected = true;
            }
            savePathSelect.appendChild(customOption);
            
            // Поле для ввода кастомной папки
            const customPathInput = document.createElement("input");
            customPathInput.type = "text";
            customPathInput.className = "model-custom-path-input";
            customPathInput.dataset.index = modelIndex;
            customPathInput.placeholder = "Enter custom folder path (e.g., my_models/custom)";
            customPathInput.value = (modelData && modelData.save_path && !savePaths.includes(modelData.save_path)) ? modelData.save_path : "";
            customPathInput.style.cssText = `
                padding: 10px;
                background: #1a1a1a;
                border: 1px solid #444;
                border-radius: 5px;
                color: white;
                font-size: 14px;
                display: none;
                margin-top: 6px;
            `;
            
            // Показываем/скрываем поле ввода в зависимости от выбора
            const updateCustomPathVisibility = () => {
                if (savePathSelect.value === "__custom__") {
                    customPathInput.style.display = "block";
                    customPathInput.required = true;
                    } else {
                    customPathInput.style.display = "none";
                    customPathInput.required = false;
                }
            };
            
            savePathSelect.onchange = updateCustomPathVisibility;
            updateCustomPathVisibility(); // Инициализация
            
            savePathGroup.appendChild(savePathLabel);
            savePathGroup.appendChild(savePathSelect);
            savePathGroup.appendChild(customPathInput);
            modelItem.appendChild(savePathGroup);
            
            // HuggingFace API Token (опционально)
            const hfTokenGroup = document.createElement("div");
            hfTokenGroup.style.cssText = `display: flex; flex-direction: column; gap: 6px; margin-top: 12px;`;
            const hfTokenLabel = document.createElement("label");
            hfTokenLabel.textContent = "HuggingFace API Token (optional)";
            hfTokenLabel.style.cssText = `color: white; font-size: 14px; font-weight: bold;`;
            const hfTokenInput = document.createElement("input");
            hfTokenInput.type = "password";
            hfTokenInput.className = "model-hf-token-input";
            hfTokenInput.dataset.index = modelIndex;
            hfTokenInput.placeholder = "hf_xxxxxxxxxxxxx (leave empty for public models)";
            hfTokenInput.value = modelData ? modelData.hf_token || "" : "";
            hfTokenInput.style.cssText = `
                padding: 10px;
                        background: #1a1a1a;
                border: 1px solid #444;
                border-radius: 5px;
                color: white;
                font-size: 14px;
            `;
            hfTokenGroup.appendChild(hfTokenLabel);
            hfTokenGroup.appendChild(hfTokenInput);
            modelItem.appendChild(hfTokenGroup);
            
            return modelItem;
        }
        
        // Функция для обновления индексов моделей
        function updateModelIndices() {
            const modelItems = document.querySelectorAll('.model-item');
            modelItems.forEach((item, index) => {
                item.dataset.index = index;
                const title = item.querySelector('div:first-child > div:first-child');
                if (title) {
                    title.textContent = `Model #${index + 1}`;
                }
                item.querySelectorAll('input, select').forEach(input => {
                    input.dataset.index = index;
                });
            });
        }
        
        // Функция для рендеринга формы добавления пресета
        function renderAddView(content, presetData = null) {
            // Очищаем контент перед рендерингом
            content.innerHTML = '';
            
            // Если редактируем существующий пресет, используем его данные
            if (presetData) {
                const models = presetData.models || (presetData.model_id ? [{
                    model_id: presetData.model_id,
                    model_path: presetData.model_path || "",
                    save_path: presetData.save_path || "checkpoints",
                    hf_token: presetData.hf_token || ""
                }] : []);
                modelsInForm = models.length > 0 ? models : [{}];
                        } else {
                modelsInForm = [{}]; // Начинаем с одной пустой модели
            }
            
            const form = document.createElement("div");
            form.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 16px;
            `;
            
            // Название пресета
            const nameGroup = document.createElement("div");
            nameGroup.style.cssText = `display: flex; flex-direction: column; gap: 6px;`;
            const nameLabel = document.createElement("label");
            nameLabel.textContent = "Preset Name *";
            nameLabel.style.cssText = `color: white; font-size: 14px; font-weight: bold;`;
            const nameInput = document.createElement("input");
            nameInput.type = "text";
            nameInput.id = "preset-name-input";
            nameInput.placeholder = "Enter preset name";
            nameInput.value = presetData ? (presetData.name || "") : "";
            nameInput.style.cssText = `
                padding: 10px;
                background: #1a1a1a;
                border: 1px solid #444;
                border-radius: 5px;
                color: white;
                font-size: 14px;
            `;
            nameGroup.appendChild(nameLabel);
            nameGroup.appendChild(nameInput);
            form.appendChild(nameGroup);
            
            // Категория (опционально)
            const categoryGroup = document.createElement("div");
            categoryGroup.style.cssText = `display: flex; flex-direction: column; gap: 6px;`;
            const categoryLabel = document.createElement("label");
            categoryLabel.textContent = "Category (optional)";
            categoryLabel.style.cssText = `color: white; font-size: 14px; font-weight: bold;`;
            const categoryInput = document.createElement("input");
            categoryInput.type = "text";
            categoryInput.id = "preset-category-input";
            categoryInput.placeholder = "Enter category name";
            categoryInput.value = presetData ? (presetData.category || "") : "";
            categoryInput.style.cssText = `
                padding: 10px;
                background: #1a1a1a;
                border: 1px solid #444;
                border-radius: 5px;
                color: white;
                font-size: 14px;
            `;
            categoryGroup.appendChild(categoryLabel);
            categoryGroup.appendChild(categoryInput);
            form.appendChild(categoryGroup);
            
            // Секция моделей
            const modelsSection = document.createElement("div");
            modelsSection.style.cssText = `display: flex; flex-direction: column; gap: 12px;`;
            
            const modelsHeader = document.createElement("div");
            modelsHeader.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            
            const modelsTitle = document.createElement("div");
            modelsTitle.textContent = "Models *";
            modelsTitle.style.cssText = `
                color: white;
                        font-size: 16px;
                        font-weight: bold;
                    `;

            const addModelBtn = document.createElement("button");
            addModelBtn.innerHTML = "➕ Add Model";
            addModelBtn.style.cssText = `
                padding: 8px 16px;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                        font-size: 14px;
                font-weight: bold;
            `;
            addModelBtn.onclick = () => {
                const modelsContainer = document.getElementById("models-container");
                const newIndex = modelsContainer.children.length;
                const newModelItem = createModelItem(newIndex);
                modelsContainer.appendChild(newModelItem);
                modelsInForm.push({});
            };
            
            modelsHeader.appendChild(modelsTitle);
            modelsHeader.appendChild(addModelBtn);
            modelsSection.appendChild(modelsHeader);
            
            // Контейнер для моделей
            const modelsContainer = document.createElement("div");
            modelsContainer.id = "models-container";
            modelsContainer.style.cssText = `display: flex; flex-direction: column; gap: 12px;`;
            
            // Добавляем модели (из данных пресета или одну пустую)
            if (modelsInForm.length > 0) {
                modelsInForm.forEach((modelData, index) => {
                    const modelItem = createModelItem(index, modelData);
                    modelsContainer.appendChild(modelItem);
                });
            } else {
                const firstModel = createModelItem(0);
                modelsContainer.appendChild(firstModel);
            }
            modelsSection.appendChild(modelsContainer);
            form.appendChild(modelsSection);
            
            // Сообщение об ошибке
            const errorMsg = document.createElement("div");
            errorMsg.id = "preset-error-msg";
            errorMsg.style.cssText = `
                color: #f55;
                            font-size: 12px;
                min-height: 20px;
            `;
            form.appendChild(errorMsg);
            
            // Кнопка сохранения
            const saveBtn = document.createElement("button");
            saveBtn.textContent = presetData ? "💾 Update Preset" : "💾 Save Preset";
            saveBtn.style.cssText = `
                padding: 12px;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                margin-top: 10px;
            `;
            saveBtn.onclick = async () => {
                await savePreset();
            };
            form.appendChild(saveBtn);
            
            content.appendChild(form);
        }
        
        // Функция для сохранения пресета
        async function savePreset() {
            const nameInput = document.getElementById("preset-name-input");
            const categoryInput = document.getElementById("preset-category-input");
            const errorMsg = document.getElementById("preset-error-msg");
            
            const name = nameInput.value.trim();
            const category = categoryInput.value.trim();
            
            // Валидация названия
            if (!name) {
                errorMsg.textContent = "Preset name is required";
                nameInput.focus();
                return;
            }
            
            // Собираем все модели из формы
            const modelItems = document.querySelectorAll('.model-item');
            const models = [];
            
            for (const item of modelItems) {
                const useHfRepoCheckbox = item.querySelector('.model-use-hf-repo-checkbox');
                const modelIdInput = item.querySelector('.model-id-input');
                const directUrlInput = item.querySelector('.model-direct-url-input');
                const modelPathInput = item.querySelector('.model-path-input');
                const savePathSelect = item.querySelector('.model-save-path-select');
                const customPathInput = item.querySelector('.model-custom-path-input');
                const hfTokenInput = item.querySelector('.model-hf-token-input');
                
                const useHfRepo = useHfRepoCheckbox ? useHfRepoCheckbox.checked : false;
                const modelId = modelIdInput ? modelIdInput.value.trim() : "";
                const directUrl = directUrlInput ? directUrlInput.value.trim() : "";
                const modelPath = modelPathInput ? modelPathInput.value.trim() : "";
                let savePath = savePathSelect.value;
                const hfToken = hfTokenInput ? hfTokenInput.value.trim() : "";
                
                // Если выбрана кастомная папка, берем значение из поля ввода
                if (savePath === "__custom__") {
                    savePath = customPathInput ? customPathInput.value.trim() : "";
                    if (!savePath) {
                        errorMsg.textContent = `Model #${parseInt(item.dataset.index) + 1}: Custom folder path is required when "Custom folder..." is selected`;
                        if (customPathInput) customPathInput.focus();
                    return;
                    }
                }
                
                // Валидация модели
                if (useHfRepo) {
                    if (!modelId) {
                        errorMsg.textContent = `Model #${parseInt(item.dataset.index) + 1}: HuggingFace Model ID is required`;
                        if (modelIdInput) modelIdInput.focus();
                        return;
                    }
                } else {
                    if (!directUrl) {
                        errorMsg.textContent = `Model #${parseInt(item.dataset.index) + 1}: Direct URL is required`;
                        if (directUrlInput) directUrlInput.focus();
                        return;
                    }
                }
                
                const modelData = {
                    save_path: savePath,
                    hf_token: hfToken || ""  // Опциональный API ключ
                };
                
                if (useHfRepo) {
                    modelData.model_id = modelId;
                    modelData.model_path = modelPath || "";
                } else {
                    modelData.direct_url = directUrl;
                }
                
                models.push(modelData);
            }
            
            // Проверяем, что есть хотя бы одна модель
            if (models.length === 0) {
                errorMsg.textContent = "At least one model is required";
                return;
            }
            
            errorMsg.textContent = "";
            
            // Загружаем текущие пресеты
            let presetsData = { categories: [], presets: [] };
            try {
                const response = await api.fetchApi("/preset_download_manager/presets");
                presetsData = await response.json();
            } catch (error) {
                console.error("[PresetDownloadManager] Ошибка загрузки пресетов:", error);
            }
            
            // Если редактируем существующий пресет, обновляем его
            if (editingPresetId) {
                const presetIndex = presetsData.presets.findIndex(p => p.id === editingPresetId);
                if (presetIndex !== -1) {
                    // Обновляем существующий пресет
                    presetsData.presets[presetIndex] = {
                        id: editingPresetId,
                        name: name,
                        category: category || "Uncategorized",
                        models: models
                    };
                } else {
                    errorMsg.textContent = "Preset not found";
                    return;
                }
            } else {
                // Создаём новый пресет
                const newPreset = {
                    id: `preset-${Date.now()}`,
                    name: name,
                    category: category || "Uncategorized",
                    models: models
                };
                
                presetsData.presets.push(newPreset);
            }
            
            // Сохраняем
            try {
                const response = await api.fetchApi("/preset_download_manager/presets", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(presetsData)
                });
                
                const result = await response.json();
                
                // Показываем сообщение о результате сохранения
                if (result.status === "success") {
                    showToast("Preset saved successfully! Your presets are saved in presets.json and will persist after ComfyUI restart.", "success", 5000);
                } else if (result.status === "warning") {
                    showToast("Preset saved, but there may be an issue with file permissions. Please check the console.", "warning", 5000);
                } else {
                    showToast(result.message || "Error saving preset", "error");
                    return;
                }
                
                // Сбрасываем режим редактирования и возвращаемся к списку
                editingPresetId = null;
                currentView = 'list';
                const content = document.getElementById("preset-manager-content");
                if (content) {
                    await renderListView(content);
                }
                const footer = document.getElementById("preset-manager-footer");
                if (footer) {
                    renderFooter(footer);
                }
            } catch (error) {
                console.error("[PresetDownloadManager] Ошибка сохранения пресета:", error);
                errorMsg.textContent = "Error saving preset: " + error.message;
                showToast("Error saving preset: " + error.message, "error");
            }
        }
        
        // Функция для удаления пресета
        async function deletePreset(presetId) {
            let presetsData = { categories: [], presets: [] };
            try {
                const response = await api.fetchApi("/preset_download_manager/presets");
                presetsData = await response.json();
                } catch (error) {
                console.error("[PresetDownloadManager] Ошибка загрузки пресетов:", error);
                return;
            }
            
            presetsData.presets = presetsData.presets.filter(p => p.id !== presetId);
            
            try {
                await api.fetchApi("/preset_download_manager/presets", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(presetsData)
                });
            } catch (error) {
                console.error("[PresetDownloadManager] Ошибка удаления пресета:", error);
                showToast("Error deleting preset: " + error.message, "error");
            }
        }
        
        // Функция для показа кастомного диалога подтверждения
        function showConfirmDialog(message, onConfirm, onCancel = null) {
            return new Promise((resolve) => {
                // Создаем overlay
                const overlay = document.createElement("div");
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    z-index: 10005;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                
                // Создаем контейнер диалога
                const dialog = document.createElement("div");
                dialog.style.cssText = `
                    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                    border: 2px solid #444;
                    border-radius: 16px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                    padding: 24px;
                    max-width: 400px;
                    width: 90%;
                    font-family: Arial, sans-serif;
                `;
                
                // Текст сообщения
                const messageDiv = document.createElement("div");
                messageDiv.textContent = message;
                messageDiv.style.cssText = `
                    color: #ddd;
                    font-size: 16px;
                    margin-bottom: 24px;
                    line-height: 1.5;
                `;
                
                // Кнопки
                const buttonsDiv = document.createElement("div");
                buttonsDiv.style.cssText = `
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                `;
                
                const cancelBtn = document.createElement("button");
                cancelBtn.textContent = "Cancel";
                cancelBtn.style.cssText = `
                    padding: 10px 20px;
                    background: #666;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: bold;
                    transition: all 0.2s;
                `;
                cancelBtn.onmouseover = () => {
                    cancelBtn.style.background = "#777";
                };
                cancelBtn.onmouseout = () => {
                    cancelBtn.style.background = "#666";
                };
                
                const confirmBtn = document.createElement("button");
                confirmBtn.textContent = "Delete";
                confirmBtn.style.cssText = `
                    padding: 10px 20px;
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: bold;
                    transition: all 0.2s;
                `;
                confirmBtn.onmouseover = () => {
                    confirmBtn.style.background = "linear-gradient(135deg, #f55 0%, #e33 100%)";
                };
                confirmBtn.onmouseout = () => {
                    confirmBtn.style.background = "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
                };
                
                const closeDialog = (confirmed) => {
                    if (overlay.parentNode) {
                        document.body.removeChild(overlay);
                    }
                    if (confirmed) {
                        if (onConfirm) onConfirm();
                        resolve(true);
                    } else {
                        if (onCancel) onCancel();
                        resolve(false);
                    }
                };
                
                cancelBtn.onclick = () => closeDialog(false);
                confirmBtn.onclick = () => closeDialog(true);
                
                // Закрытие по клику на overlay
                overlay.onclick = (e) => {
                    if (e.target === overlay) {
                        closeDialog(false);
                    }
                };
                
                // Закрытие по Escape
                const escapeHandler = (e) => {
                    if (e.key === 'Escape') {
                        closeDialog(false);
                        document.removeEventListener('keydown', escapeHandler);
                    }
                };
                document.addEventListener('keydown', escapeHandler);
                
                buttonsDiv.appendChild(cancelBtn);
                buttonsDiv.appendChild(confirmBtn);
                
                dialog.appendChild(messageDiv);
                dialog.appendChild(buttonsDiv);
                overlay.appendChild(dialog);
                document.body.appendChild(overlay);
                
                // Фокус на кнопке отмены
                cancelBtn.focus();
            });
        }
        
        // Функция для показа красивых уведомлений (toast)
        function showToast(message, type = 'info', duration = 4000) {
            // Типы: 'success', 'error', 'info', 'warning'
            
            // Создаем контейнер для уведомлений, если его ещё нет
            let toastContainer = document.getElementById('toast-container');
            if (!toastContainer) {
                toastContainer = document.createElement("div");
                toastContainer.id = 'toast-container';
                toastContainer.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10004;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    pointer-events: none;
                `;
                document.body.appendChild(toastContainer);
            }
            
            const toast = document.createElement("div");
            toast.style.cssText = `
                background: ${type === 'success' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                          type === 'error' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' :
                          type === 'warning' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
                          'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'};
                color: white;
                padding: 16px 24px;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                max-width: 400px;
                min-width: 300px;
                font-size: 14px;
                line-height: 1.5;
                display: flex;
                align-items: center;
                gap: 12px;
                animation: slideInRight 0.3s ease-out;
                font-family: Arial, sans-serif;
                pointer-events: auto;
            `;
            
            // Добавляем анимацию, если её ещё нет
            if (!document.getElementById('toast-animations')) {
                const style = document.createElement('style');
                style.id = 'toast-animations';
                style.textContent = `
                    @keyframes slideInRight {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    @keyframes slideOutRight {
                        from {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Иконка в зависимости от типа
            let icon = '';
            if (type === 'success') {
                icon = '✅';
            } else if (type === 'error') {
                icon = '❌';
            } else if (type === 'warning') {
                icon = '⚠️';
            } else {
                icon = 'ℹ️';
            }
            
            const iconSpan = document.createElement("span");
            iconSpan.textContent = icon;
            iconSpan.style.cssText = `font-size: 20px; flex-shrink: 0;`;
            
            const messageSpan = document.createElement("span");
            messageSpan.textContent = message;
            messageSpan.style.cssText = `flex: 1; word-wrap: break-word;`;
            
            const closeBtn = document.createElement("button");
            closeBtn.textContent = "✕";
            closeBtn.style.cssText = `
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 16px;
                line-height: 1;
                flex-shrink: 0;
                transition: background 0.2s;
            `;
            closeBtn.onmouseover = () => {
                closeBtn.style.background = "rgba(255, 255, 255, 0.3)";
            };
            closeBtn.onmouseout = () => {
                closeBtn.style.background = "rgba(255, 255, 255, 0.2)";
            };
            
            const closeToast = () => {
                toast.style.animation = "slideOutRight 0.3s ease-out";
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                    // Удаляем контейнер, если он пустой
                    if (toastContainer && toastContainer.children.length === 0) {
                        if (toastContainer.parentNode) {
                            document.body.removeChild(toastContainer);
                        }
                    }
                }, 300);
            };
            
            closeBtn.onclick = closeToast;
            
            toast.appendChild(iconSpan);
            toast.appendChild(messageSpan);
            toast.appendChild(closeBtn);
            
            // Добавляем в контейнер
            toastContainer.appendChild(toast);
            
            // Автоматическое закрытие
            if (duration > 0) {
                setTimeout(closeToast, duration);
            }
            
            return toast;
        }
        
        // Функция для показа модального окна с инструкцией
        function showHelpModal() {
            let currentLang = 'en'; // По умолчанию английский
            
            // Тексты для английского языка
            const textsEn = {
                title: "📖 Help & Instructions",
                directUrl: {
                    title: "🔗 Direct URL (Default)",
                    description: "The direct download link to the model file. This is the default and recommended method.",
                    howTo: "How to get a Direct URL:",
                    step1: "1. Go to the model page on <a href=\"https://huggingface.co\" target=\"_blank\" style=\"color: #3b82f6;\">huggingface.co</a>",
                    step2: "2. Navigate to the file you want to download",
                    step3: "3. Click on the file name or right-click and \"Copy link address\"",
                    step4: "4. The URL should look like: <code style=\"background: #2a2a2a; padding: 2px 6px; border-radius: 4px;\">https://huggingface.co/user/model/resolve/main/file.safetensors</code>",
                    tip: "💡 This is the default option - just paste the direct URL. No need to enable HuggingFace Repository unless you need it."
                },
                useHfRepo: {
                    title: "☐ Use HuggingFace Repository",
                    description: "Enable this checkbox to use HuggingFace Model ID instead of Direct URL. When enabled, you'll see additional fields for HuggingFace Model ID and Model Path."
                },
                modelId: {
                    title: "HuggingFace Model ID",
                    description: "This is the model identifier on HuggingFace in the format <code style=\"background: #2a2a2a; padding: 2px 6px; border-radius: 4px; color: #3b82f6;\">username/model-name</code>",
                    examples: "Examples:",
                    tip: "💡 You can find the Model ID on the model page at <a href=\"https://huggingface.co\" target=\"_blank\" style=\"color: #3b82f6;\">huggingface.co</a> - it's the path in the URL after the domain."
                },
                modelPath: {
                    title: "📁 Model Path (Optional)",
                    description: "Path to a specific file within the model repository. Leave empty if you want to download the entire model.",
                    examples: "Examples:",
                    example1: "• <code style=\"background: #2a2a2a; padding: 2px 6px; border-radius: 4px;\">model.safetensors</code> - to download a single file",
                    example2: "• <code style=\"background: #2a2a2a; padding: 2px 6px; border-radius: 4px;\">vae/vae.safetensors</code> - for a file in a subfolder",
                    example3: "• <strong>Empty</strong> - download the entire model (all files from the repository)",
                    tip: "💡 If left empty, the system will download all model files. This is useful for complete models but may take more time and space."
                },
                saveFolder: {
                    title: "💾 Save to Folder",
                    description: "The folder in ComfyUI where the model will be saved. Select the model type from the list.",
                    available: "Available folders:",
                    folder1: "• <code style=\"background: #2a2a2a; padding: 2px 6px; border-radius: 4px;\">checkpoints</code> - for main models (Stable Diffusion, etc.)",
                    folder2: "• <code style=\"background: #2a2a2a; padding: 2px 6px; border-radius: 4px;\">loras</code> - for LoRA models",
                    folder3: "• <code style=\"background: #2a2a2a; padding: 2px 6px; border-radius: 4px;\">vae</code> - for VAE models",
                    folder4: "• <code style=\"background: #2a2a2a; padding: 2px 6px; border-radius: 4px;\">upscale_models</code> - for upscale models",
                    folder5: "• And other model types..."
                },
                presets: {
                    title: "🎯 Presets",
                    description: "A preset is a group of models that can be downloaded together with one click.",
                    howTo: "How to use:",
                    step1: "1. Create a preset using the \"➕ Add Preset\" button",
                    step2: "2. Add one or more models to the preset",
                    step3: "3. Save the preset",
                    step4: "4. Click \"⬇️ Download\" on the preset to download all models at once"
                },
                apiToken: {
                    title: "🔑 HuggingFace API Token",
                    description: "Some models on HuggingFace require authorization (private/gated models). For such models, you need to specify an API key.",
                    howTo: "How to get an API key:",
                    step1: "1. Register on <a href=\"https://huggingface.co\" target=\"_blank\" style=\"color: #3b82f6;\">huggingface.co</a>",
                    step2: "2. Go to <a href=\"https://huggingface.co/settings/tokens\" target=\"_blank\" style=\"color: #3b82f6;\">Settings → Access Tokens</a>",
                    step3: "3. Create a new token (read access is sufficient)",
                    step4: "4. Copy the token (starts with <code style=\"background: #2a2a2a; padding: 2px 6px; border-radius: 4px;\">hf_</code>)",
                    tip: "💡 For public models, an API key is not required - leave the field empty."
                },
                tips: {
                    title: "⚡ Tips & Tricks",
                    tip1: "Direct URL is the default - just paste the download link",
                    tip2: "Files are automatically checked before download - existing files are skipped",
                    tip3: "When using Model Path, files are saved directly to the selected folder without subdirectories",
                    tip4: "You can add multiple models to one preset",
                    tip5: "Use categories to organize presets",
                    tip6: "Edit presets using the ✏️ button",
                    tip7: "Select multiple presets and download them all at once",
                    tip8: "On timeout, the download will automatically resume on the next attempt",
                    tip9: "Use proxy or mirrors if access to HuggingFace is restricted",
                    tip10: "For private models, specify the HuggingFace API Token",
                    tip11: "Presets are saved automatically in presets.json and persist after ComfyUI restart"
                }
            };
            
            // Тексты для русского языка
            const textsRu = {
                title: "📖 Справка и Инструкции",
                directUrl: {
                    title: "🔗 Direct URL (По умолчанию)",
                    description: "Прямая ссылка для скачивания файла модели. Это опция по умолчанию и рекомендуемый способ.",
                    howTo: "Как получить прямую ссылку:",
                    step1: "1. Перейдите на страницу модели на <a href=\"https://huggingface.co\" target=\"_blank\" style=\"color: #3b82f6;\">huggingface.co</a>",
                    step2: "2. Перейдите к файлу, который хотите скачать",
                    step3: "3. Нажмите на имя файла или правой кнопкой мыши \"Копировать адрес ссылки\"",
                    step4: "4. URL должен выглядеть так: <code style=\"background: #2a2a2a; padding: 2px 6px; border-radius: 4px;\">https://huggingface.co/user/model/resolve/main/file.safetensors</code>",
                    tip: "💡 Это опция по умолчанию - просто вставьте прямую ссылку. Не нужно включать HuggingFace Repository, если это не требуется."
                },
                useHfRepo: {
                    title: "☐ Use HuggingFace Repository",
                    description: "Включите этот чекбокс для использования HuggingFace Model ID вместо прямой ссылки. При включении появятся дополнительные поля для HuggingFace Model ID и Model Path."
                },
                modelId: {
                    title: "HuggingFace Model ID",
                    description: "Это идентификатор модели на HuggingFace в формате <code style=\"background: #2a2a2a; padding: 2px 6px; border-radius: 4px; color: #3b82f6;\">username/model-name</code>",
                    examples: "Примеры:",
                    tip: "💡 Вы можете найти Model ID на странице модели на <a href=\"https://huggingface.co\" target=\"_blank\" style=\"color: #3b82f6;\">huggingface.co</a> - это путь в URL после домена."
                },
                modelPath: {
                    title: "Model Path (Optional)",
                    description: "Путь к конкретному файлу внутри репозитория модели. Оставьте пустым, если хотите загрузить всю модель.",
                    examples: "Примеры:",
                    example1: "• <code style=\"background: #2a2a2a; padding: 2px 6px; border-radius: 4px;\">model.safetensors</code> - для загрузки одного файла",
                    example2: "• <code style=\"background: #2a2a2a; padding: 2px 6px; border-radius: 4px;\">vae/vae.safetensors</code> - для файла в подпапке",
                    example3: "• <strong>Пусто</strong> - загрузить всю модель (все файлы из репозитория)",
                    tip: "💡 Если оставить пустым, система загрузит все файлы модели. Это полезно для полных моделей, но может занять больше времени и места."
                },
                saveFolder: {
                    title: "Save to Folder",
                    description: "Папка в ComfyUI, куда будет сохранена модель. Выберите тип модели из списка.",
                    available: "Доступные папки:",
                    folder1: "• <code style=\"background: #2a2a2a; padding: 2px 6px; border-radius: 4px;\">checkpoints</code> - для основных моделей (Stable Diffusion и т.д.)",
                    folder2: "• <code style=\"background: #2a2a2a; padding: 2px 6px; border-radius: 4px;\">loras</code> - для LoRA моделей",
                    folder3: "• <code style=\"background: #2a2a2a; padding: 2px 6px; border-radius: 4px;\">vae</code> - для VAE моделей",
                    folder4: "• <code style=\"background: #2a2a2a; padding: 2px 6px; border-radius: 4px;\">upscale_models</code> - для моделей апскейла",
                    folder5: "• И другие типы моделей..."
                },
                presets: {
                    title: "Presets",
                    description: "Пресет - это группа моделей, которые можно загрузить вместе одним кликом.",
                    howTo: "Как использовать:",
                    step1: "1. Создайте пресет с помощью кнопки \"➕ Add Preset\"",
                    step2: "2. Добавьте одну или несколько моделей в пресет",
                    step3: "3. Сохраните пресет",
                    step4: "4. Нажмите \"⬇️ Download\" на пресете, чтобы загрузить все модели сразу"
                },
                apiToken: {
                    title: "HuggingFace API Token",
                    description: "Некоторые модели на HuggingFace требуют авторизации (private/gated models). Для таких моделей необходимо указать API ключ.",
                    howTo: "Как получить API ключ:",
                    step1: "1. Зарегистрируйтесь на <a href=\"https://huggingface.co\" target=\"_blank\" style=\"color: #3b82f6;\">huggingface.co</a>",
                    step2: "2. Перейдите в <a href=\"https://huggingface.co/settings/tokens\" target=\"_blank\" style=\"color: #3b82f6;\">Settings → Access Tokens</a>",
                    step3: "3. Создайте новый токен (read access достаточно)",
                    step4: "4. Скопируйте токен (начинается с <code style=\"background: #2a2a2a; padding: 2px 6px; border-radius: 4px;\">hf_</code>)",
                    tip: "💡 Для публичных моделей API ключ не требуется - оставьте поле пустым."
                },
                tips: {
                    title: "Tips & Tricks",
                    tip1: "Прямая ссылка по умолчанию - просто вставьте ссылку для скачивания",
                    tip2: "Файлы автоматически проверяются перед загрузкой - существующие файлы пропускаются",
                    tip3: "При использовании Model Path файлы сохраняются напрямую в выбранную папку без подпапок",
                    tip4: "Вы можете добавить несколько моделей в один пресет",
                    tip5: "Используйте категории для организации пресетов",
                    tip6: "Редактируйте пресеты с помощью кнопки ✏️",
                    tip7: "Выберите несколько пресетов и загрузите их все сразу",
                    tip8: "При таймауте загрузка автоматически возобновится при следующей попытке",
                    tip9: "Используйте прокси или зеркала, если доступ к HuggingFace ограничен",
                    tip10: "Для приватных моделей укажите HuggingFace API Token",
                    tip11: "Пресеты сохраняются автоматически в presets.json и сохраняются после перезапуска ComfyUI"
                }
            };
            
            // Функция для получения текущих текстов
            const getTexts = () => currentLang === 'ru' ? textsRu : textsEn;
            
            // Функция для обновления контента
            const updateContent = () => {
                const t = getTexts();
                content.innerHTML = `
                    <div style="margin-bottom: 24px;">
                        <h3 style="color: #3b82f6; font-size: 18px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                            <span>🔗</span> <span>${t.directUrl.title}</span>
                        </h3>
                        <p style="margin-bottom: 8px; padding-left: 28px;">
                            ${t.directUrl.description}
                        </p>
                        <p style="margin-bottom: 8px; padding-left: 28px; color: #aaa;">
                            <strong>${t.directUrl.howTo}</strong><br>
                            ${t.directUrl.step1}<br>
                            ${t.directUrl.step2}<br>
                            ${t.directUrl.step3}<br>
                            ${t.directUrl.step4}
                        </p>
                        <p style="margin-bottom: 16px; padding-left: 28px; color: #888; font-size: 12px;">
                            ${t.directUrl.tip}
                        </p>
                    </div>
                    
                    <div style="margin-bottom: 24px;">
                        <h3 style="color: #3b82f6; font-size: 18px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                            <span>☐</span> <span>${t.useHfRepo.title}</span>
                        </h3>
                        <p style="margin-bottom: 16px; padding-left: 28px;">
                            ${t.useHfRepo.description}
                        </p>
                    </div>
                    
                    <div style="margin-bottom: 24px;">
                        <h3 style="color: #3b82f6; font-size: 18px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                            <span>🔍</span> <span>${t.modelId.title}</span>
                        </h3>
                        <p style="margin-bottom: 8px; padding-left: 28px;">
                            ${t.modelId.description}
                        </p>
                        <p style="margin-bottom: 8px; padding-left: 28px; color: #aaa;">
                            <strong>${t.modelId.examples}</strong><br>
                            • <code style="background: #2a2a2a; padding: 2px 6px; border-radius: 4px;">runwayml/stable-diffusion-v1-5</code><br>
                            • <code style="background: #2a2a2a; padding: 2px 6px; border-radius: 4px;">stabilityai/stable-diffusion-xl-base-1.0</code><br>
                            • <code style="background: #2a2a2a; padding: 2px 6px; border-radius: 4px;">lightx2v/Qwen-Image-Lightning</code>
                        </p>
                        <p style="margin-bottom: 16px; padding-left: 28px; color: #888; font-size: 12px;">
                            ${t.modelId.tip}
                        </p>
                    </div>
                    
                    <div style="margin-bottom: 24px;">
                        <h3 style="color: #3b82f6; font-size: 18px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                            <span>📁</span> <span>${t.modelPath.title}</span>
                        </h3>
                        <p style="margin-bottom: 8px; padding-left: 28px;">
                            ${t.modelPath.description}
                        </p>
                        <p style="margin-bottom: 8px; padding-left: 28px; color: #aaa;">
                            <strong>${t.modelPath.examples}</strong><br>
                            ${t.modelPath.example1}<br>
                            ${t.modelPath.example2}<br>
                            ${t.modelPath.example3}
                        </p>
                        <p style="margin-bottom: 16px; padding-left: 28px; color: #888; font-size: 12px;">
                            ${t.modelPath.tip}
                        </p>
                    </div>
                    
                    <div style="margin-bottom: 24px;">
                        <h3 style="color: #3b82f6; font-size: 18px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                            <span>💾</span> <span>${t.saveFolder.title}</span>
                        </h3>
                        <p style="margin-bottom: 8px; padding-left: 28px;">
                            ${t.saveFolder.description}
                        </p>
                        <p style="margin-bottom: 8px; padding-left: 28px; color: #aaa;">
                            <strong>${t.saveFolder.available}</strong><br>
                            ${t.saveFolder.folder1}<br>
                            ${t.saveFolder.folder2}<br>
                            ${t.saveFolder.folder3}<br>
                            ${t.saveFolder.folder4}<br>
                            ${t.saveFolder.folder5}
                        </p>
                    </div>
                    
                    <div style="margin-bottom: 24px;">
                        <h3 style="color: #3b82f6; font-size: 18px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                            <span>🎯</span> <span>${t.presets.title}</span>
                        </h3>
                        <p style="margin-bottom: 8px; padding-left: 28px;">
                            ${t.presets.description}
                        </p>
                        <p style="margin-bottom: 8px; padding-left: 28px; color: #aaa;">
                            <strong>${t.presets.howTo}</strong><br>
                            ${t.presets.step1}<br>
                            ${t.presets.step2}<br>
                            ${t.presets.step3}<br>
                            ${t.presets.step4}
                        </p>
                    </div>
                    
                    <div style="margin-bottom: 24px;">
                        <h3 style="color: #3b82f6; font-size: 18px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                            <span>🔑</span> <span>${t.apiToken.title}</span>
                        </h3>
                        <p style="margin-bottom: 8px; padding-left: 28px;">
                            ${t.apiToken.description}
                        </p>
                        <p style="margin-bottom: 8px; padding-left: 28px; color: #aaa;">
                            <strong>${t.apiToken.howTo}</strong><br>
                            ${t.apiToken.step1}<br>
                            ${t.apiToken.step2}<br>
                            ${t.apiToken.step3}<br>
                            ${t.apiToken.step4}
                        </p>
                        <p style="margin-bottom: 16px; padding-left: 28px; color: #888; font-size: 12px;">
                            ${t.apiToken.tip}
                        </p>
                    </div>
                    
                    <div style="margin-bottom: 24px;">
                        <h3 style="color: #3b82f6; font-size: 18px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                            <span>⚡</span> <span>${t.tips.title}</span>
                        </h3>
                        <ul style="padding-left: 48px; color: #aaa; margin: 0;">
                            <li style="margin-bottom: 8px;">${t.tips.tip1}</li>
                            <li style="margin-bottom: 8px;">${t.tips.tip2}</li>
                            <li style="margin-bottom: 8px;">${t.tips.tip3}</li>
                            <li style="margin-bottom: 8px;">${t.tips.tip4}</li>
                            <li style="margin-bottom: 8px;">${t.tips.tip5}</li>
                            <li style="margin-bottom: 8px;">${t.tips.tip6}</li>
                            <li style="margin-bottom: 8px;">${t.tips.tip7}</li>
                            <li style="margin-bottom: 8px;">${t.tips.tip8}</li>
                            <li style="margin-bottom: 8px;">${t.tips.tip9}</li>
                            <li style="margin-bottom: 8px;">${t.tips.tip10}</li>
                            <li style="margin-bottom: 8px;">${t.tips.tip11}</li>
                        </ul>
                    </div>
                `;
            };
            // Создаем overlay
            const overlay = document.createElement("div");
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 10002;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            // Создаем контейнер модального окна
            const container = document.createElement("div");
            container.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                border: 2px solid #444;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                z-index: 10003;
                width: 90%;
                max-width: 700px;
                max-height: 85vh;
                display: flex;
                flex-direction: column;
                font-family: Arial, sans-serif;
            `;
            
            overlay.addEventListener('mousedown', (e) => {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                    if (container.parentNode) {
                        document.body.removeChild(container);
                    }
                }
            });
            
            // Заголовок
            const header = document.createElement("div");
            header.style.cssText = `
                padding: 16px 20px;
                border-bottom: 2px solid #333;
                display: flex;
                align-items: center;
                justify-content: space-between;
            `;
            
            const title = document.createElement("div");
            title.id = "help-title";
            title.style.cssText = `
                color: white;
                font-size: 24px;
                font-weight: bold;
            `;
            
            // Кнопки переключения языка
            const langButtons = document.createElement("div");
            langButtons.style.cssText = `
                display: flex;
                gap: 8px;
                align-items: center;
            `;
            
            const enBtn = document.createElement("button");
            enBtn.textContent = "EN";
            enBtn.id = "help-lang-en";
            enBtn.style.cssText = `
                padding: 6px 12px;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                transition: all 0.2s;
            `;
            
            const ruBtn = document.createElement("button");
            ruBtn.textContent = "RU";
            ruBtn.id = "help-lang-ru";
            ruBtn.style.cssText = `
                padding: 6px 12px;
                background: #666;
                color: #ccc;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                transition: all 0.2s;
            `;
            
            const updateLangButtons = () => {
                if (currentLang === 'en') {
                    enBtn.style.background = "#3b82f6";
                    enBtn.style.color = "white";
                    ruBtn.style.background = "#666";
                    ruBtn.style.color = "#ccc";
                } else {
                    enBtn.style.background = "#666";
                    enBtn.style.color = "#ccc";
                    ruBtn.style.background = "#3b82f6";
                    ruBtn.style.color = "white";
                }
            };
            
            enBtn.onclick = () => {
                currentLang = 'en';
                updateLangButtons();
                updateContent();
                title.textContent = getTexts().title;
            };
            
            ruBtn.onclick = () => {
                currentLang = 'ru';
                updateLangButtons();
                updateContent();
                title.textContent = getTexts().title;
            };
            
            enBtn.onmouseover = () => {
                if (currentLang !== 'en') {
                    enBtn.style.background = "#555";
                }
            };
            enBtn.onmouseout = () => {
                if (currentLang !== 'en') {
                    enBtn.style.background = "#666";
                }
            };
            
            ruBtn.onmouseover = () => {
                if (currentLang !== 'ru') {
                    ruBtn.style.background = "#555";
                }
            };
            ruBtn.onmouseout = () => {
                if (currentLang !== 'ru') {
                    ruBtn.style.background = "#666";
                }
            };
            
            langButtons.appendChild(enBtn);
            langButtons.appendChild(ruBtn);
            updateLangButtons();
            
            const closeBtn = document.createElement("button");
            closeBtn.textContent = "✕";
            closeBtn.style.cssText = `
                background: transparent;
                border: none;
                color: #ccc;
                cursor: pointer;
                padding: 0;
                font-size: 32px;
                width: 32px;
                height: 32px;
                line-height: 32px;
                text-align: center;
                border-radius: 8px;
                transition: all 0.2s;
            `;
            closeBtn.onmouseover = () => {
                closeBtn.style.background = "rgba(255, 255, 255, 0.1)";
                closeBtn.style.color = "white";
            };
            closeBtn.onmouseout = () => {
                closeBtn.style.background = "transparent";
                closeBtn.style.color = "#ccc";
            };
            closeBtn.onclick = () => {
                if (overlay.parentNode) document.body.removeChild(overlay);
                if (container.parentNode) document.body.removeChild(container);
            };
            
            const headerRight = document.createElement("div");
            headerRight.style.cssText = `
                display: flex;
                align-items: center;
                gap: 12px;
            `;
            headerRight.appendChild(langButtons);
            headerRight.appendChild(closeBtn);
            
            header.appendChild(title);
            header.appendChild(headerRight);
            container.appendChild(header);
            
            // Контент с инструкцией
            const content = document.createElement("div");
            content.id = "help-content";
            content.style.cssText = `
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                color: #ddd;
                font-size: 14px;
                line-height: 1.6;
            `;
            
            // Инициализация контента
            title.textContent = getTexts().title;
            updateContent();
            
            container.appendChild(content);
            
            // Добавляем в DOM
            document.body.appendChild(overlay);
            document.body.appendChild(container);
        }
        
        // Функция для показа модального окна редактирования JSON
        async function showJSONEditor() {
            try {
                // Загружаем текущие пресеты
                const response = await api.fetchApi("/preset_download_manager/presets");
                const data = await response.json();
                const jsonText = JSON.stringify(data, null, 2);
                
                // Создаем overlay
                const overlay = document.createElement("div");
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                                width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                
                // Создаем контейнер модального окна
                const container = document.createElement("div");
                container.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                    border: 2px solid #444;
                    border-radius: 16px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                    z-index: 10001;
                    width: 90%;
                    max-width: 900px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    font-family: 'Courier New', monospace;
                `;
                
                overlay.addEventListener('mousedown', (e) => {
                    if (e.target === overlay) {
                        document.body.removeChild(overlay);
                        if (container.parentNode) {
                            document.body.removeChild(container);
                        }
                    }
                });
                
                // Заголовок
                const header = document.createElement("div");
                header.style.cssText = `
                    padding: 16px 20px;
                    border-bottom: 2px solid #333;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                `;
                
                const title = document.createElement("div");
                title.textContent = "{ } JSON Editor";
                title.style.cssText = `
                                color: white;
                    font-size: 24px;
                                font-weight: bold;
                `;
                
                const closeBtn = document.createElement("button");
                closeBtn.textContent = "✕";
                closeBtn.style.cssText = `
                    background: transparent;
                                border: none;
                    color: #ccc;
                                cursor: pointer;
                    padding: 0;
                    font-size: 32px;
                    width: 32px;
                    height: 32px;
                    line-height: 32px;
                    text-align: center;
                    border-radius: 8px;
                    transition: all 0.2s;
                `;
                closeBtn.onmouseover = () => {
                    closeBtn.style.background = "rgba(255, 255, 255, 0.1)";
                    closeBtn.style.color = "white";
                };
                closeBtn.onmouseout = () => {
                    closeBtn.style.background = "transparent";
                    closeBtn.style.color = "#ccc";
                };
                closeBtn.onclick = () => {
                    if (overlay.parentNode) document.body.removeChild(overlay);
                    if (container.parentNode) document.body.removeChild(container);
                };
                
                header.appendChild(title);
                header.appendChild(closeBtn);
                container.appendChild(header);
                
                // Информационное сообщение
                const infoDiv = document.createElement("div");
                infoDiv.style.cssText = `
                    padding: 12px 20px;
                    background: rgba(59, 130, 246, 0.1);
                    border-bottom: 1px solid #333;
                    color: #aaa;
                    font-size: 13px;
                    line-height: 1.5;
                `;
                infoDiv.innerHTML = `
                    💡 <strong>Direct JSON editing</strong><br>
                    Edit the JSON below to modify custom presets. Changes will replace current configuration when you click "Apply Changes".
                `;
                container.appendChild(infoDiv);
                
                // Область контента с textarea
                const content = document.createElement("div");
                content.style.cssText = `
                    flex: 1;
                    overflow: hidden;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                `;
                
                const textarea = document.createElement("textarea");
                textarea.value = jsonText;
                textarea.style.cssText = `
                    flex: 1;
                    width: 100%;
                    min-height: 400px;
                    background: #0d1117;
                    color: #c9d1d9;
                    border: 1px solid #30363d;
                    border-radius: 8px;
                    padding: 16px;
                    font-family: 'Courier New', monospace;
                                font-size: 14px;
                    line-height: 1.6;
                    resize: none;
                    outline: none;
                    tab-size: 2;
                `;
                textarea.setAttribute("spellcheck", "false");
                
                // Сообщение о валидности JSON
                const validationMsg = document.createElement("div");
                validationMsg.id = "json-editor-validation";
                validationMsg.style.cssText = `
                    margin-top: 12px;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 13px;
                    font-weight: bold;
                    color: #5f5;
                    background: rgba(95, 255, 95, 0.1);
                `;
                validationMsg.textContent = "✓ Valid JSON";
                
                // Функция проверки валидности JSON
                const validateJSON = () => {
                    try {
                        JSON.parse(textarea.value);
                        validationMsg.style.color = "#5f5";
                        validationMsg.style.background = "rgba(95, 255, 95, 0.1)";
                        validationMsg.textContent = "✓ Valid JSON";
                        return true;
                    } catch (e) {
                        validationMsg.style.color = "#f55";
                        validationMsg.style.background = "rgba(255, 85, 85, 0.1)";
                        validationMsg.textContent = `❌ Invalid JSON: ${e.message}`;
                        return false;
                    }
                };
                
                textarea.addEventListener('input', validateJSON);
                content.appendChild(textarea);
                content.appendChild(validationMsg);
                container.appendChild(content);
                
                // Footer с кнопками
                const footer = document.createElement("div");
                footer.style.cssText = `
                    padding: 16px 20px;
                    border-top: 2px solid #333;
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                `;
                
                const cancelBtn = document.createElement("button");
                cancelBtn.textContent = "Cancel";
                cancelBtn.style.cssText = `
                    padding: 10px 24px;
                    border: 2px solid #666;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    background: transparent;
                    color: #ccc;
                    transition: all 0.2s;
                `;
                cancelBtn.onmouseover = () => {
                    cancelBtn.style.background = "#333";
                    cancelBtn.style.borderColor = "#777";
                };
                cancelBtn.onmouseout = () => {
                    cancelBtn.style.background = "transparent";
                    cancelBtn.style.borderColor = "#666";
                };
                cancelBtn.onclick = () => {
                    if (overlay.parentNode) document.body.removeChild(overlay);
                    if (container.parentNode) document.body.removeChild(container);
                };
                
                const applyBtn = document.createElement("button");
                applyBtn.textContent = "Apply Changes";
                applyBtn.style.cssText = `
                    padding: 10px 24px;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    background: #3b82f6;
                    color: white;
                    transition: all 0.2s;
                `;
                applyBtn.onmouseover = () => {
                    applyBtn.style.background = "#2563eb";
                };
                applyBtn.onmouseout = () => {
                    applyBtn.style.background = "#3b82f6";
                };
                applyBtn.onclick = async () => {
                    if (!validateJSON()) {
                        return;
                    }
                    
                    try {
                        const parsed = JSON.parse(textarea.value);
                        const response = await api.fetchApi("/preset_download_manager/presets", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(parsed)
                        });
                        
                        if (response.ok) {
                            validationMsg.style.color = "#5f5";
                            validationMsg.style.background = "rgba(95, 255, 95, 0.1)";
                            validationMsg.textContent = "✓ Changes applied successfully!";
                            
                            // Обновляем список пресетов в основном окне
                            const mainContent = document.getElementById("preset-manager-content");
                            if (mainContent) {
                                await renderListView(mainContent);
                            }
                            
                            // Закрываем окно через небольшую задержку
                            setTimeout(() => {
                                if (overlay.parentNode) document.body.removeChild(overlay);
                                if (container.parentNode) document.body.removeChild(container);
                            }, 1000);
                        } else {
                            throw new Error("Failed to save presets");
                        }
                    } catch (error) {
                        validationMsg.style.color = "#f55";
                        validationMsg.style.background = "rgba(255, 85, 85, 0.1)";
                        validationMsg.textContent = `❌ Error: ${error.message}`;
                    }
                };
                
                footer.appendChild(cancelBtn);
                footer.appendChild(applyBtn);
                container.appendChild(footer);
                
                // Добавляем в DOM
                document.body.appendChild(overlay);
                document.body.appendChild(container);
                
                // Фокус на textarea
                textarea.focus();
                // Выделяем весь текст для удобства
                textarea.select();
                
    } catch (error) {
        showToast("Error loading JSON: " + error.message, "error");
    }
        }

function updateDeleteButton() {
            const deleteBtn = document.getElementById("delete-selected-btn");
            const downloadBtn = document.getElementById("download-selected-btn");
            
            const count = selectedPresetsForDeletion.size;
            
            // Обновляем кнопку Delete
            if (deleteBtn) {
                if (count > 0) {
                    deleteBtn.innerHTML = `🗑️ Delete Selected (${count})`;
                    deleteBtn.disabled = false;
                    deleteBtn.style.background = "#f55";
                    deleteBtn.style.color = "#fff";
                    deleteBtn.style.opacity = "1";
                    deleteBtn.style.cursor = "pointer";
                } else {
                    deleteBtn.innerHTML = "🗑️ Delete Selected";
                    deleteBtn.disabled = true;
                    deleteBtn.style.background = "#666";
                    deleteBtn.style.color = "#999";
                    deleteBtn.style.opacity = "0.5";
                    deleteBtn.style.cursor = "not-allowed";
                }
            }
            
            // Обновляем кнопку Download
            if (downloadBtn) {
                if (count > 0) {
                    downloadBtn.innerHTML = `⬇️ Download Selected (${count})`;
                    downloadBtn.disabled = false;
                    downloadBtn.style.background = "#3b82f6";
                    downloadBtn.style.color = "#fff";
                    downloadBtn.style.opacity = "1";
                    downloadBtn.style.cursor = "pointer";
                } else {
                    downloadBtn.innerHTML = "⬇️ Download Selected";
                    downloadBtn.disabled = true;
                    downloadBtn.style.background = "#666";
                    downloadBtn.style.color = "#999";
                    downloadBtn.style.opacity = "0.5";
                    downloadBtn.style.cursor = "not-allowed";
                }
            }
        }
        
        // Функция для рендеринга footer
        function renderFooter(footer) {
            footer.innerHTML = '';
            
            const leftButtons = document.createElement("div");
            leftButtons.className = "preset-manager-footer-left";
            leftButtons.style.cssText = `display: flex; gap: 12px;`;
            
            if (currentView === 'list') {
                // Кнопка "Add Preset"
                const addBtn = document.createElement("button");
                addBtn.id = "add-preset-btn";
                addBtn.innerHTML = "➕ Add Preset";
                addBtn.style.cssText = `
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    background: #3b82f6;
                    color: white;
                    transition: all 0.2s;
                `;
                addBtn.onmouseover = () => { addBtn.style.background = "#2563eb"; };
                addBtn.onmouseout = () => { addBtn.style.background = "#3b82f6"; };
                addBtn.onclick = () => {
                    editingPresetId = null; // Сбрасываем режим редактирования
                    currentView = 'add';
                    const content = document.getElementById("preset-manager-content");
                    if (content) {
                        renderAddView(content);
                    }
                    renderFooter(footer);
                };
                leftButtons.appendChild(addBtn);
                
                // Кнопка "Delete Selected"
                const deleteBtn = document.createElement("button");
                deleteBtn.id = "delete-selected-btn";
                deleteBtn.innerHTML = "🗑️ Delete Selected";
                deleteBtn.style.cssText = `
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: not-allowed;
                    background: #666;
                    color: #999;
                    opacity: 0.5;
                    transition: all 0.2s;
                `;
                deleteBtn.disabled = true;
                deleteBtn.onclick = async () => {
                    if (selectedPresetsForDeletion.size === 0) return;
                    const confirmed = await showConfirmDialog(
                        `Delete ${selectedPresetsForDeletion.size} selected preset(s)?`,
                        async () => {
                            for (const presetId of selectedPresetsForDeletion) {
                                await deletePreset(presetId);
                            }
                            selectedPresetsForDeletion.clear();
                            const content = document.getElementById("preset-manager-content");
                            if (content) {
                                await renderListView(content);
                            }
                            renderFooter(footer);
                        }
                    );
                };
                leftButtons.appendChild(deleteBtn);
                
                // Кнопка "Download Selected"
                const downloadSelectedBtn = document.createElement("button");
                downloadSelectedBtn.id = "download-selected-btn";
                downloadSelectedBtn.innerHTML = "⬇️ Download Selected";
                downloadSelectedBtn.style.cssText = `
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: not-allowed;
                    background: #666;
                    color: #999;
                    opacity: 0.5;
                    transition: all 0.2s;
                `;
                downloadSelectedBtn.disabled = true;
                downloadSelectedBtn.onclick = async () => {
                    if (selectedPresetsForDeletion.size === 0) return;
                    await downloadSelectedPresets(selectedPresetsForDeletion);
                };
                leftButtons.appendChild(downloadSelectedBtn);
                
                // Кнопка "Import"
                const importBtn = document.createElement("button");
                importBtn.id = "import-btn";
                importBtn.innerHTML = "📥 Import";
                importBtn.style.cssText = `
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    background: #666;
                            color: white;
                    transition: all 0.2s;
                `;
                importBtn.onmouseover = () => { importBtn.style.background = "#777"; };
                importBtn.onmouseout = () => { importBtn.style.background = "#666"; };
                importBtn.onclick = () => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".json";
                    input.onchange = async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const text = await file.text();
                        try {
                            const data = JSON.parse(text);
                            await api.fetchApi("/preset_download_manager/presets", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(data)
                            });
                            const content = document.getElementById("preset-manager-content");
                            if (content) {
                                await renderListView(content);
                            }
                            showToast("Presets imported successfully!", "success", 3000);
                        } catch (error) {
                            showToast("Error importing presets: " + error.message, "error");
                        }
                    };
                    input.click();
                };
                leftButtons.appendChild(importBtn);
                
                // Кнопка "Export"
                const exportBtn = document.createElement("button");
                exportBtn.id = "export-btn";
                exportBtn.innerHTML = "📤 Export";
                exportBtn.style.cssText = `
                    padding: 10px 20px;
                            border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: bold;
                            cursor: pointer;
                    background: #666;
                    color: white;
                    transition: all 0.2s;
                `;
                exportBtn.onmouseover = () => { exportBtn.style.background = "#777"; };
                exportBtn.onmouseout = () => { exportBtn.style.background = "#666"; };
                exportBtn.onclick = async () => {
                    try {
                        const response = await api.fetchApi("/preset_download_manager/presets");
                        const data = await response.json();
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "custom-presets.json";
                        a.click();
                        URL.revokeObjectURL(url);
                    } catch (error) {
                        showToast("Error exporting presets: " + error.message, "error");
                    }
                };
                leftButtons.appendChild(exportBtn);
                
                // Кнопка "Edit JSON"
                const editJsonBtn = document.createElement("button");
                editJsonBtn.id = "edit-json-btn";
                editJsonBtn.innerHTML = "{ } Edit JSON";
                editJsonBtn.style.cssText = `
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                            font-weight: bold;
                    cursor: pointer;
                    background: #666;
                    color: white;
                    transition: all 0.2s;
                `;
                editJsonBtn.onmouseover = () => { editJsonBtn.style.background = "#777"; };
                editJsonBtn.onmouseout = () => { editJsonBtn.style.background = "#666"; };
                editJsonBtn.onclick = async () => {
                    await showJSONEditor();
                };
                leftButtons.appendChild(editJsonBtn);
            } else if (currentView === 'add') {
                // Кнопка "Back to List"
                const backBtn = document.createElement("button");
                backBtn.innerHTML = "← Back to List";
                backBtn.style.cssText = `
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    background: #666;
                    color: white;
                    transition: all 0.2s;
                `;
                backBtn.onmouseover = () => { backBtn.style.background = "#777"; };
                backBtn.onmouseout = () => { backBtn.style.background = "#666"; };
                backBtn.onclick = async () => {
                    editingPresetId = null; // Сбрасываем режим редактирования
                    currentView = 'list';
                    const content = document.getElementById("preset-manager-content");
                    if (content) {
                        await renderListView(content);
                    }
                    renderFooter(footer);
                };
                leftButtons.appendChild(backBtn);
            }
            
            footer.appendChild(leftButtons);
        }

        // Обработчик создания ноды - используем beforeRegisterNodeDef как в ResolutionMaster
        // Это более надежный способ, который работает до создания ноды
        const nodeDef = app.graph._node_types_by_name?.PresetDownloadManager || 
                       app.graph._node_types_by_name?.["HF Preset Download Manager"];
        
        if (nodeDef) {
            const originalOnNodeCreated = nodeDef.prototype.onNodeCreated;
            nodeDef.prototype.onNodeCreated = function() {
                if (originalOnNodeCreated) {
                    originalOnNodeCreated.apply(this, arguments);
                }
                
                console.log("[PresetDownloadManager] Нода создана через prototype:", this.id, this.type);
                
                // Создаём экземпляр менеджера для этой ноды
                this.presetManager = new PresetDownloadManagerNode(this);
                
                // Принудительно обновляем canvas
                const forceRedraw = () => {
                    if (app.graph && app.graph.setDirtyCanvas) {
                        app.graph.setDirtyCanvas(true, true);
                    }
                    if (this.setDirtyCanvas) {
                        this.setDirtyCanvas(true);
                    }
                };
                
                // Немедленная перерисовка
                requestAnimationFrame(() => {
                    forceRedraw();
                });
                
                // Дополнительные перерисовки для надежности
                setTimeout(() => {
                    requestAnimationFrame(forceRedraw);
                }, 50);
                setTimeout(() => {
                    requestAnimationFrame(forceRedraw);
                }, 200);
            };
        }
        
        // Дополнительный обработчик через app.graph.onNodeCreated (на случай если beforeRegisterNodeDef не сработал)
        const originalGraphNodeCreated = app.graph.onNodeCreated;
        app.graph.onNodeCreated = function(node) {
            if (originalGraphNodeCreated) {
                originalGraphNodeCreated.apply(this, arguments);
            }
            
            if (node.type === "PresetDownloadManager" && !node.presetManager) {
                console.log("[PresetDownloadManager] Нода создана через onNodeCreated:", node.id, node.type);
                
                // Создаём экземпляр менеджера для этой ноды
                node.presetManager = new PresetDownloadManagerNode(node);
                
                // Принудительно обновляем canvas
                const forceRedraw = () => {
                    if (app.graph && app.graph.setDirtyCanvas) {
                        app.graph.setDirtyCanvas(true, true);
                    }
                    if (node.setDirtyCanvas) {
                        node.setDirtyCanvas(true);
                    }
                };
                
                requestAnimationFrame(() => {
                    forceRedraw();
                });
                
                setTimeout(() => {
                    requestAnimationFrame(forceRedraw);
                }, 100);
                setTimeout(() => {
                    requestAnimationFrame(forceRedraw);
                }, 300);
            }
        };
        
        // Обрабатываем уже созданные ноды
        setTimeout(() => {
            console.log("[PresetDownloadManager] Проверка существующих нод...");
            if (app.graph && app.graph._nodes) {
                app.graph._nodes.forEach(node => {
                    if (node.type === "PresetDownloadManager") {
                        console.log("[PresetDownloadManager] Найдена существующая нода:", node.id);
                        // Создаём экземпляр менеджера для существующей ноды
                        if (!node.presetManager) {
                            node.presetManager = new PresetDownloadManagerNode(node);
                        }
                        // Принудительно обновляем canvas
                        if (app.graph && app.graph.setDirtyCanvas) {
                            app.graph.setDirtyCanvas(true, true);
                        }
                    }
                });
            }
        }, 2000);
        
        // Дополнительный механизм отслеживания новых нод через MutationObserver
        if (app.canvas && app.canvas.graph) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                        // Проверяем, не добавилась ли новая нода
                        setTimeout(() => {
                            if (app.graph && app.graph._nodes) {
                                app.graph._nodes.forEach(node => {
                                    if (node.type === "PresetDownloadManager" && !node.presetManager) {
                                        console.log("[PresetDownloadManager] Обнаружена новая нода через MutationObserver:", node.id);
                                        node.presetManager = new PresetDownloadManagerNode(node);
                                        if (app.graph && app.graph.setDirtyCanvas) {
                                            requestAnimationFrame(() => {
                                                app.graph.setDirtyCanvas(true, true);
                                            });
                                        }
                                    }
                                });
                            }
                        }, 100);
                    }
                });
            });
            
            // Наблюдаем за изменениями в canvas
            const canvasElement = document.querySelector('.litegraph canvas') || document.querySelector('canvas');
            if (canvasElement && canvasElement.parentElement) {
                observer.observe(canvasElement.parentElement, {
                    childList: true,
                    subtree: true
                });
            }
        }
        
        console.log("[PresetDownloadManager] Расширение инициализировано!");
    }
});

console.log("[PresetDownloadManager] Модуль загружен!");

console.log("[PresetDownloadManager] Модуль загружен!");
