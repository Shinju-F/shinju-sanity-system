/**
 * Shinju Sanity System - Менеджер пользовательского интерфейса (актор-ориентированная версия)
 * Управляет кнопками, панелями и взаимодействием с пользователем
 * Application V1 API
 */

if (!window.ShinjuSanity) {
  window.ShinjuSanity = {};
}

class SanityUIManager {
  constructor() {
    this.buttonsApp = null;
    this.dmPanelApp = null;
    this.playerPanelApp = null;
    this.libraryPanelApp = null;
    
    // Конфигурация позиций кнопок
    this.buttonPositions = {
      'bottom-left': { 
        bottom: '10px', 
        left: '10px',
        flexDirection: 'column'
      },
      'bottom-right': { 
        bottom: '10px', 
        right: '10px',
        flexDirection: 'column'
      },
      'top-left': { 
        top: '10px', 
        left: '10px',
        flexDirection: 'column'
      },
      'top-right': { 
        top: '10px', 
        right: '10px',
        flexDirection: 'column'
      }
    };
    
    this.initialized = false;
  }
  
  /**
   * Инициализация UI менеджера
   */
  initialize() {
    if (this.initialized) return;
    
    console.log('Shinju Sanity UI | Инициализация интерфейса...');
    
    // Проверяем, включена ли система - с безопасной проверкой
    try {
      const systemEnabled = game.settings.get('shinju-sanity-system', 'enableSystem');
      if (!systemEnabled) {
        console.log('Shinju Sanity UI | Система отключена в настройках');
        return;
      }
    } catch (error) {
      console.warn('Shinju Sanity UI | Настройки еще не загружены, откладываем инициализацию:', error);
      setTimeout(() => this.initialize(), 1000);
      return;
    }
    
    // Проверяем доступность ядра
    if (!window.ShinjuSanity.Core) {
      console.warn('Shinju Sanity UI | Ядро системы не загружено');
      setTimeout(() => this.initialize(), 2000);
      return;
    }
    
    // Создаем кнопки управления
    this.createControlButtons();
    
    // Обновляем UI при изменении настроек
    Hooks.on('renderSettingsConfig', () => {
      setTimeout(() => this.updateButtonPosition(), 100);
    });
    
    // Обновляем кнопки при изменении персонажа
    Hooks.on('updateUser', (user, data, options, userId) => {
      if (user.id === game.user.id) {
        setTimeout(() => this.refreshButtons(), 500);
      }
    });
    
    this.initialized = true;
    console.log('Shinju Sanity UI | Интерфейс инициализирован');
  }
  
  /**
   * Создает кнопки управления в интерфейсе
   */
  createControlButtons() {
    // Проверяем, включена ли система
    if (!game.settings.get('shinju-sanity-system', 'enableSystem')) {
      this.removeButtons();
      return;
      // Обновляем позиции при ресайзе окна
  window.addEventListener('resize', () => {
    this.updateAllPanelPositions();
  });
    }
    
    // Удаляем старые кнопки, если есть
    this.removeButtons();
    
    // Создаем контейнер для кнопок
    const buttonsContainer = document.createElement('div');
    buttonsContainer.id = 'sanity-control-buttons';
    buttonsContainer.className = 'sanity-buttons-container';
    
    // Применяем позиционирование
    this.applyButtonPosition(buttonsContainer);
    
    // Создаем кнопки в зависимости от прав пользователя
    if (game.user.isGM) {
      this.createGMButtons(buttonsContainer);
    } else if (game.settings.get('shinju-sanity-system', 'showPlayerButtons')) {
      this.createPlayerButtons(buttonsContainer);
    }
    
    // Добавляем контейнер в DOM, только если есть кнопки
    if (buttonsContainer.children.length > 0) {
      document.body.appendChild(buttonsContainer);
      this.buttonsApp = buttonsContainer;
      console.log('Shinju Sanity UI | Кнопки созданы');
    }
  }
  
  /**
   * Удаляет кнопки из интерфейсе
   */
  removeButtons() {
    const oldButtons = document.getElementById('sanity-control-buttons');
    if (oldButtons) {
      oldButtons.remove();
      this.buttonsApp = null;
    }
  }
  
 /**
 * Применяет позиционирование к контейнеру кнопок
 */
applyButtonPosition(container) {
  try {
    // Фиксированное позиционирование в левом нижнем углу
    Object.assign(container.style, {
      position: 'fixed',
      left: '15px',
      bottom: '15px',
      zIndex: '1000',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      background: 'rgba(15, 15, 26, 0.9)',
      padding: '10px',
      borderRadius: '15px',
      border: '2px solid #9b59b6',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.7), inset 0 0 10px rgba(155, 89, 182, 0.2)',
      backdropFilter: 'blur(8px)',
      pointerEvents: 'auto',
      minWidth: '50px',
      minHeight: '50px',
      maxWidth: '50px',
      transition: 'all 0.3s ease'
    });
  } catch (error) {
    console.warn('SanityUIManager | Ошибка применения позиции кнопок:', error);
    // Значение по умолчанию - левый нижний угол
    Object.assign(container.style, {
      position: 'fixed',
      left: '15px',
      bottom: '15px',
      zIndex: '1000',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'auto'
    });
  }
}
  
  /**
 * Создает кнопки для мастера
 */
createGMButtons(container) {
  // Кнопка панели мастера
  this.createButton(
    container,
    'Мастер',
    'fas fa-crown',
    () => this.showDMPanel(),
    'sanity-dm-panel-btn',
    'Панель управления рассудком'
  );
  
  // Кнопка панели игрока
  if (game.user.character) {
    this.createButton(
      container,
      'Мой рассудок',
      'fas fa-brain',
      () => this.showPlayerPanel(),
      'sanity-player-panel-btn',
      'Просмотр состояния рассудка'
    );
  }
  
  // Кнопка библиотеки
  this.createButton(
    container,
    'Библиотека',
    'fas fa-book',
    () => this.showLibraryPanel(),
    'sanity-library-btn',
    'Библиотека состояний'
  );
  
  // Кнопка быстрого урона
  this.createButton(
    container,
    'Урон',
    'fas fa-skull',
    () => this.showQuickDamageDialog(),
    'sanity-quick-damage-btn',
    'Быстрый урон рассудку'
  );
  
  // Кнопка восстановления
  this.createButton(
    container,
    'Лечение',
    'fas fa-heart',
    () => this.showQuickHealDialog(),
    'sanity-quick-heal-btn',
    'Быстрое восстановление'
  );
}

/**
 * Создает кнопки для игрока
 */
createPlayerButtons(container) {
  // Проверяем, есть ли у игрока персонаж
  if (!game.user.character) {
    return;
  }
  
  // Кнопка панели игрока
  this.createButton(
    container,
    'Рассудок',
    'fas fa-brain',
    () => this.showPlayerPanel(),
    'sanity-player-panel-btn',
    'Мой рассудок'
  );
  
  // Кнопка библиотеки
  this.createButton(
    container,
    'Библиотека',
    'fas fa-book',
    () => this.showLibraryPanel(),
    'sanity-library-btn',
    'Библиотека состояний'
  );
}

/**
 * Создает кнопку с указанными параметрами
 */
createButton(container, text, icon, onClick, id, title = '') {
  const button = document.createElement('button');
  button.id = id;
  button.className = 'sanity-control-button';
  button.innerHTML = `<i class="${icon}"></i> <span>${text}</span>`;
  button.title = title;
  button.addEventListener('click', onClick);
  
  // Стили для компактного вида
  button.style.cssText = `
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(145deg, rgba(52, 73, 94, 0.8), rgba(26, 26, 46, 0.9));
    border: 1px solid var(--color-border);
    color: var(--color-light);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: all 0.3s ease;
    position: relative;
    padding: 0;
    margin: 0;
    overflow: hidden;
    box-sizing: border-box;
  `;
  
  container.appendChild(button);
  return button;
}
  
  /**
 * Показывает/скрывает панель мастера
 */
showDMPanel() {
  if (!game.user.isGM) return;
  
  try {
    if (!this.dmPanelApp) {
      const DMPanel = window.ShinjuSanity.DMPanel;
      if (!DMPanel) {
        ui.notifications.error("Панель мастера не загружена");
        return;
      }
      this.dmPanelApp = new DMPanel();
    }
    
    // TOGGLE: если открыта - закрываем, если закрыта - открываем
    if (this.dmPanelApp.rendered) {
      this.dmPanelApp.close();
      this.dmPanelApp = null; // Сбрасываем ссылку
    } else {
      this.dmPanelApp.render(true);
      // Ждем рендеринга и позиционируем
      setTimeout(() => {
        this.positionPanelToLeft(this.dmPanelApp, 'dm-panel');
      }, 100);
    }
    
  } catch (error) {
    console.error('SanityUIManager | Ошибка открытия панели мастера:', error);
    ui.notifications.error(`Ошибка: ${error.message}`);
  }
}

/**
 * Показывает/скрывает панель игрока
 */
showPlayerPanel() {
  try {
    // Проверяем, есть ли у пользователя персонаж
    if (!game.user.character) {
      ui.notifications.warn("У вас нет активного персонажа");
      return;
    }
    
    if (!this.playerPanelApp) {
      const PlayerPanel = window.ShinjuSanity.PlayerPanel;
      if (!PlayerPanel) {
        ui.notifications.error("Панель игрока не загружена");
        return;
      }
      this.playerPanelApp = new PlayerPanel();
    }
    
    // TOGGLE: если открыта - закрываем, если закрыта - открываем
    if (this.playerPanelApp.rendered) {
      this.playerPanelApp.close();
      this.playerPanelApp = null; // Сбрасываем ссылку
    } else {
      this.playerPanelApp.render(true);
      // Ждем рендеринга и позиционируем
      setTimeout(() => {
        this.positionPanelToLeft(this.playerPanelApp, 'player-panel');
      }, 100);
    }
    
  } catch (error) {
    console.error('SanityUIManager | Ошибка открытия панели игрока:', error);
    ui.notifications.error(`Ошибка: ${error.message}`);
  }
}

/**
 * Показывает/скрывает библиотеку состояний
 */
showLibraryPanel() {
  try {
    if (!this.libraryPanelApp) {
      const LibraryPanel = window.ShinjuSanity.LibraryPanel;
      if (!LibraryPanel) {
        ui.notifications.error("Библиотека не загружена");
        return;
      }
      this.libraryPanelApp = new LibraryPanel();
    }
    
    // TOGGLE: если открыта - закрываем, если закрыта - открываем
    if (this.libraryPanelApp.rendered) {
      this.libraryPanelApp.close();
      this.libraryPanelApp = null; // Сбрасываем ссылку
    } else {
      this.libraryPanelApp.render(true);
      // Ждем рендеринга и позиционируем
      setTimeout(() => {
        this.positionPanelToLeft(this.libraryPanelApp, 'library-panel');
      }, 100);
    }
    
  } catch (error) {
    console.error('SanityUIManager | Ошибка открытия библиотеки:', error);
    ui.notifications.error(`Ошибка: ${error.message}`);
  }
  
}
  
  /**
   * Показывает диалог быстрого урона рассудку
   */
  showQuickDamageDialog() {
    if (!game.user.isGM) {
      ui.notifications.warn("Только мастер может наносить урон рассудку");
      return;
    }
    
    try {
      const actors = window.ShinjuSanity.Core?.getAllPlayerActors?.() || [];
      if (actors.length === 0) {
        ui.notifications.warn("Нет игровых персонажей");
        return;
      }
      
      const content = `
        <form class="sanity-dialog-form">
          <div class="form-group">
            <label>Выберите цель:</label>
            <select id="damage-target" style="width: 100%">
              <option value="all">Все игроки</option>
              ${actors.map(actor => `<option value="${actor.id}">${actor.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Количество урона:</label>
            <input type="number" id="damage-amount" min="1" value="1" style="width: 100%">
          </div>
          <div class="form-group">
            <label>Источник урона (опционально):</label>
            <input type="text" id="damage-source" placeholder="Например: Кошмар, Ужас и т.д." style="width: 100%">
          </div>
        </form>
      `;
      
      new Dialog({
        title: 'Урон рассудку',
        content: content,
        buttons: {
          apply: {
            icon: '<i class="fas fa-skull"></i>',
            label: 'Применить урон',
            callback: async (html) => {
              const target = html.find('#damage-target').val();
              const amount = parseInt(html.find('#damage-amount').val());
              const source = html.find('#damage-source').val().trim() || 'Неизвестно';
              
              if (amount <= 0) {
                ui.notifications.warn("Некорректное количество урона");
                return;
              }
              
              try {
                if (target === 'all') {
                  for (const actor of actors) {
                    await window.ShinjuSanity.Core.applySanityDamage(actor.id, amount, source);
                  }
                  ui.notifications.info(`Урон рассудку применен всем игрокам`);
                } else {
                  await window.ShinjuSanity.Core.applySanityDamage(target, amount, source);
                  const actor = actors.find(a => a.id === target);
                  ui.notifications.info(`Урон рассудку применен ${actor?.name}`);
                }
                
                // Обновляем панель мастера, если она открыта
                if (this.dmPanelApp?.rendered) {
                  this.dmPanelApp.refresh();
                }
                
              } catch (error) {
                ui.notifications.error(`Ошибка: ${error.message}`);
              }
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Отмена'
          }
        },
        default: 'apply',
        width: 400
      }).render(true);
    } catch (error) {
      console.error('SanityUIManager | Ошибка показа диалога урона:', error);
      ui.notifications.error(`Ошибка: ${error.message}`);
    }
  }
  
  /**
   * Показывает диалог быстрого восстановления рассудка
   */
  showQuickHealDialog() {
    if (!game.user.isGM) {
      ui.notifications.warn("Только мастер может восстанавливать рассудок");
      return;
    }
    
    try {
      const actors = window.ShinjuSanity.Core?.getAllPlayerActors?.() || [];
      if (actors.length === 0) {
        ui.notifications.warn("Нет игровых персонажей");
        return;
      }
      
      const content = `
        <form class="sanity-dialog-form">
          <div class="form-group">
            <label>Выберите цель:</label>
            <select id="heal-target" style="width: 100%">
              <option value="all">Все игроки</option>
              ${actors.map(actor => `<option value="${actor.id}">${actor.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Количество восстановления:</label>
            <input type="number" id="heal-amount" min="1" value="1" style="width: 100%">
          </div>
          <div class="form-group">
            <label>Источник восстановления (опционально):</label>
            <input type="text" id="heal-source" placeholder="Например: Отдых, Лечение и т.д." style="width: 100%">
          </div>
        </form>
      `;
      
      new Dialog({
        title: 'Восстановление рассудка',
        content: content,
        buttons: {
          apply: {
            icon: '<i class="fas fa-heart"></i>',
            label: 'Восстановить',
            callback: async (html) => {
              const target = html.find('#heal-target').val();
              const amount = parseInt(html.find('#heal-amount').val());
              const source = html.find('#heal-source').val().trim() || 'Неизвестно';
              
              if (amount <= 0) {
                ui.notifications.warn("Некорректное количество восстановления");
                return;
              }
              
              try {
                if (target === 'all') {
                  for (const actor of actors) {
                    await window.ShinjuSanity.Core.restoreSanity(actor.id, amount, source);
                  }
                  ui.notifications.info(`Рассудок восстановлен всем игрокам`);
                } else {
                  await window.ShinjuSanity.Core.restoreSanity(target, amount, source);
                  const actor = actors.find(a => a.id === target);
                  ui.notifications.info(`Рассудок восстановлен ${actor?.name}`);
                }
                
                // Обновляем панель мастера, если она открыта
                if (this.dmPanelApp?.rendered) {
                  this.dmPanelApp.refresh();
                }
                
              } catch (error) {
                ui.notifications.error(`Ошибка: ${error.message}`);
              }
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Отмена'
          }
        },
        default: 'apply',
        width: 400
      }).render(true);
    } catch (error) {
      console.error('SanityUIManager | Ошибка показа диалога восстановления:', error);
      ui.notifications.error(`Ошибка: ${error.message}`);
    }
  }
  
  /**
   * Регистрирует горячие клавиши
   */
  registerHotkeys() {
    try {
      // Горячая клавиша для отладки вкладок
game.keybindings.register('shinju-sanity-system', 'debugTabs', {
  name: 'Отладка вкладок',
  hint: 'Принудительное переключение вкладок (Alt+Shift+D)',
  editable: [{ key: 'KeyD', modifiers: ['Alt', 'Shift'] }],
  restricted: false,
  onDown: () => {
    const playerPanel = window.ShinjuSanity?.UI?.playerPanelApp;
    if (playerPanel && playerPanel.rendered) {
      const tabs = ['overview', 'conditions', 'history', 'info'];
      const currentIndex = tabs.indexOf(playerPanel.currentTab);
      const nextIndex = (currentIndex + 1) % tabs.length;
      playerPanel.switchTab(tabs[nextIndex]);
      ui.notifications.info(`Переключено на: ${tabs[nextIndex]}`);
    }
  }
});
      
      // Горячая клавиша для панели игрока
      game.keybindings.register('shinju-sanity-system', 'togglePlayerPanel', {
        name: 'Открыть/Закрыть панель игрока',
        hint: 'Быстрый доступ к своей панели рассудка (Shift+S)',
        editable: [{ key: 'KeyS', modifiers: ['Shift'] }],
        restricted: false,
        onDown: () => {
          this.showPlayerPanel();
        }
      });
      
      // Горячая клавиша для быстрого урона (только для GM)
      game.keybindings.register('shinju-sanity-system', 'quickDamage', {
        name: 'Быстрый урон рассудку',
        hint: 'Открыть диалог быстрого урона рассудку (Ctrl+D)',
        editable: [{ key: 'KeyD', modifiers: ['Control'] }],
        restricted: true,
        onDown: () => {
          if (game.user.isGM) {
            this.showQuickDamageDialog();
          }
        }
      });
      
      console.log('Shinju Sanity UI | Горячие клавиши зарегистрированы');
    } catch (error) {
      console.warn('Shinju Sanity UI | Ошибка регистрации горячих клавиш:', error);
    }
  }
  
  /**
   * Обновляет панель мастера
   */
  updateDMPanel() {
    if (this.dmPanelApp && this.dmPanelApp.rendered) {
      this.dmPanelApp.refresh();
    }
  }
  
  /**
   * Обновляет панель игрока для конкретного актора
   */
  updatePlayerPanel(actorId) {
    if (this.playerPanelApp && this.playerPanelApp.rendered) {
      const currentActorId = this.playerPanelApp.actorId;
      if (currentActorId === actorId || (game.user.character && game.user.character.id === actorId)) {
        this.playerPanelApp.refresh();
      }
    }
  }
  
  /**
   * Пересоздает кнопки
   */
  refreshButtons() {
    // Добавляем небольшую задержку для гарантии что настройки загружены
    setTimeout(() => {
      this.createControlButtons();
    }, 100);
  }
  /**
 * Позиционирует панель в левой части экрана
 */
positionPanelToLeft(panel, panelId) {
  if (!panel || !panel.element || !panel.element[0]) return;
  
  const windowElement = panel.element[0].closest('.window-app');
  if (!windowElement) return;
  
  // Смещения для разных панелей чтобы не перекрывались
  const offsets = {
    'player-panel': 50,
    'dm-panel': 70,
    'library-panel': 90
  };
  
  const leftOffset = offsets[panelId] || 50;
  
  // Применяем позиционирование
  windowElement.style.cssText = `
    position: fixed !important;
    left: ${leftOffset}px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    margin: 0 !important;
    z-index: 100 !important;
    max-height: 90vh !important;
    max-width: 90vw !important;
    min-width: 300px !important;
  `;
  
  // Делаем окно перетаскиваемым
  const header = windowElement.querySelector('.window-header');
  if (header) {
    header.style.cursor = 'move';
    header.style.pointerEvents = 'auto';
  }
  
  console.log(`SanityUIManager | Панель ${panelId} позиционирована слева`);
}

/**
 * Скрывает другие панели
 */
hideOtherPanels(currentPanelId) {
  const panels = {
    'player-panel': this.playerPanelApp,
    'dm-panel': this.dmPanelApp,
    'library-panel': this.libraryPanelApp
  };
  
  for (const [panelId, panel] of Object.entries(panels)) {
    if (panelId !== currentPanelId && panel && panel.rendered) {
      panel.minimize(); // Сворачиваем вместо закрытия
    }
  }
}

/**
 * Обновляет позиционирование всех открытых панелей
 */
updateAllPanelPositions() {
  if (this.playerPanelApp && this.playerPanelApp.rendered) {
    this.positionPanelToLeft(this.playerPanelApp, 'player-panel');
  }
  if (this.dmPanelApp && this.dmPanelApp.rendered) {
    this.positionPanelToLeft(this.dmPanelApp, 'dm-panel');
  }
  if (this.libraryPanelApp && this.libraryPanelApp.rendered) {
    this.positionPanelToLeft(this.libraryPanelApp, 'library-panel');
  }
}
}

// Экспортируем класс
window.ShinjuSanity.UI = new SanityUIManager();