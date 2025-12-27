/**
 * Shinju Sanity System - Приложение панели мастера (актор-ориентированная версия)
 * Application V1 API
 */

if (!window.ShinjuSanity) {
  window.ShinjuSanity = {};
}

class DMPanel extends Application {
  constructor(options = {}) {
  super(options);
  
  // Настройки окна
  this.options = foundry.utils.mergeObject({
    id: "sanity-dm-panel",
    title: "Панель управления рассудком",
    template: "modules/shinju-sanity-system/templates/dm-panel.html",
    width: 900,
    height: 700,
    resizable: true,
    dragDrop: [{ dragSelector: ".window-header", dropSelector: null }],
    classes: ["sanity-system", "sanity-dm-panel"]
  }, options);
  
  this.playersData = [];
  this.refreshInterval = null;
  this.currentDMTab = 'all-players'; // Значение по умолчанию
}
  
  /**
   * Статический геттер для свойств по умолчанию
   */
  static get defaultOptions() {
  return foundry.utils.mergeObject(super.defaultOptions, {
    id: "sanity-dm-panel",
    title: "Панель управления рассудком",
    template: "modules/shinju-sanity-system/templates/dm-panel.html",
    width: 900,
    height: 700,
    resizable: true,
    dragDrop: [{ dragSelector: ".window-header", dropSelector: null }],
    classes: ["sanity-system", "sanity-dm-panel"]
  });
}
   /**
   * Переопределяем рендеринг для сохранения состояния вкладок
   */
  async _render(force = false, options = {}) {
  // Сохраняем текущую вкладку
  const currentTab = this.currentDMTab || 'all-players';
  
  // Вызываем родительский рендеринг
  const rendered = await super._render(force, options);
  
  // Восстанавливаем вкладку после рендеринга
  if (rendered && this.element && currentTab) {
    setTimeout(() => {
      this.switchDMTab(currentTab, this.element);
    }, 50);
  }
  
  return rendered;
}
  /**
   * Получает данные для рендеринга шаблона
   */
  async getData() {
  // Сохраняем текущую вкладку перед обновлением
  const currentTab = this.currentDMTab || 'all-players';
  
  // Проверяем доступность handlebars хелперов
  if (typeof Handlebars === 'undefined') {
    return {
      players: [],
      totalPlayers: 0,
      systemEnabled: false,
      isGM: game.user.isGM,
      error: "Handlebars не загружен",
      currentDMTab: currentTab
    };
  }
  
  // Проверяем доступность ядра
  if (!window.ShinjuSanity.Core) {
    return {
      players: [],
      totalPlayers: 0,
      systemEnabled: false,
      isGM: game.user.isGM,
      error: "Ядро системы не загружено",
      currentDMTab: currentTab
    };
  }
  
  // Получаем всех игровых акторов
  const playerActors = window.ShinjuSanity.Core.getAllPlayerActors();
  
  // Собираем данные для каждого актора
  this.playersData = await Promise.all(playerActors.map(async actor => {
    try {
      const sanityData = window.ShinjuSanity.Core.getActorSanityData(actor.id);
      if (!sanityData) {
        return null;
      }
      
      // Находим пользователя, которому принадлежит актор
      const owners = game.users.filter(user => 
        user.character && user.character.id === actor.id
      );
      const user = owners.length > 0 ? owners[0] : null;
      
      return {
  id: actor.id,
  name: actor.name,
  img: actor.img || 'icons/svg/mystery-man.svg',
  playerName: user?.name || 'Нет игрока',
  isOnline: user?.active || false,
  ownerId: user?.id,
  
  // Данные рассудка
  sanity: sanityData.current,
  maxSanity: sanityData.max,
  sanityPercentage: window.ShinjuSanity.Core.getSanityPercentage(actor.id),
  stressLevel: sanityData.stressLevel || 0, // Добавлено || 0
  formula: sanityData.formula || '10 + (ИНТ + ХАР + МДР)',
        
        // Активные состояния
        activeConditions: sanityData.activeConditions || [],
        
        // История стресса
        stressHistory: sanityData.stressHistory || [],
        
        // Метаданные
        lastUpdate: sanityData.lastUpdate,
        initialized: sanityData.initialized || false
      };
    } catch (error) {
      console.warn(`DMPanel | Ошибка получения данных для ${actor.name}:`, error);
      return null;
    }
  })).then(results => results.filter(r => r !== null));
  
  return {
    players: this.playersData,
    totalPlayers: this.playersData.length,
    systemEnabled: game.settings.get('shinju-sanity-system', 'enableSystem'),
    isGM: game.user.isGM,
    error: null,
    currentDMTab: currentTab
  };
}
  

  /**
 * Активирует слушатели событий
 */
activateListeners(html) {
  super.activateListeners(html);
  
  const self = this;
  
  // Кнопка обновления
  html.find('.refresh-btn').click(() => this.refresh());
  
  // Кнопка закрытия
  html.find('.close-btn').click(() => this.close());
  
  // Обработчики для компактных кнопок
  html.find('.damage-all-btn').click(() => {
    if (game.user.isGM) {
      self.showQuickDamageDialog();
    }
  });
  
  html.find('.heal-all-btn').click((event) => {
    event.stopPropagation();
    // Открываем диалог по умолчанию
    self.showQuickHealAmountDialog(1);
  });
  
  html.find('.reset-all-btn').click(async () => {
    if (!game.user.isGM) return;
    
    const confirmed = await Dialog.confirm({
      title: "Сброс всего рассудка",
      content: "<p>Вы уверены, что хотите сбросить рассудок всех игроков к максимуму?</p>",
      yes: () => true,
      no: () => false,
      defaultYes: false
    });
    
    if (confirmed) {
      try {
        const result = await window.ShinjuSanity.Core.resetAllSanity();
        ui.notifications.info(`Рассудок сброшен для ${result.length} игроков`);
        this.refresh();
      } catch (error) {
        ui.notifications.error(`Ошибка сброса рассудка: ${error.message}`);
      }
    }
  });
  
  // Обработчики для выпадающего меню восстановления
  html.find('.heal-dropdown-menu .heal-action-btn').click(function(event) {
    event.stopPropagation();
    const amount = this.dataset.amount;
    if (amount === 'full') {
      self.showFullHealDialog();
    } else {
      self.showQuickHealAmountDialog(parseInt(amount));
    }
  });
  
  // Переключение вкладок мастера
  html.find('.dm-tab-btn').click(function(event) {
    event.preventDefault();
    event.stopPropagation();
    const tabName = this.dataset.tab;
    self.switchDMTab(tabName, html);
  });
  
  // Выбор игрока для просмотра
  html.find('.view-player-btn').click(async () => {
    const playerId = html.find('.player-select-dropdown').val();
    if (playerId) {
      await self.loadPlayerView(playerId, html);
    }
  });
  
  // Автоматическая загрузка при выборе из списка
  html.find('.player-select-dropdown').change(async function() {
    const playerId = this.value;
    if (playerId) {
      await self.loadPlayerView(playerId, html);
    }
  });
  
  // Управление отдельными игроками
  this.bindPlayerControls(html);
  
  // Автообновление каждые 30 секунд
  this.startAutoRefresh();
  
  // Принудительно активируем перетаскивание для заголовка окна
  setTimeout(() => {
    const windowHeader = html.closest('.window-app').find('.window-header');
    if (windowHeader.length) {
      windowHeader.css({
        'cursor': 'move',
        'pointer-events': 'auto'
      });
      
      // Также активируем стандартные кнопки окна
      windowHeader.find('a').css('pointer-events', 'auto');
    }
  }, 100);
}
  
  
  /**
 * Привязывает обработчики к элементам управления игроками
 */
bindPlayerControls(html) {
  const self = this;
  
  // Урон рассудку
  html.find('.damage-btn').click(function(event) {
    event.stopPropagation();
    const playerId = this.dataset.playerId;
    if (playerId) {
      self.showPlayerDamageDialog(playerId);
    }
  });
  
  // Восстановление рассудка
  html.find('.heal-btn').click(function(event) {
    event.stopPropagation();
    const playerId = this.dataset.playerId;
    if (playerId) {
      self.showPlayerHealDialog(playerId);
    }
  });
  
  // Кнопка "Просмотреть" в карточке игрока
  html.find('.view-btn').click(function(event) {
    event.stopPropagation();
    const playerId = this.dataset.playerId;
    if (playerId) {
      // Переключаемся на вкладку просмотра
      self.switchDMTab('single-player', html);
      // Выбираем игрока в выпадающем списке
      html.find('.player-select-dropdown').val(playerId);
      // Загружаем данные
      self.loadPlayerView(playerId, html);
    }
  });
}
  
  /**
 * Переключает вкладки в панели мастера
 */
switchDMTab(tabName, html) {
  this.currentDMTab = tabName;
  
  if (!html && this.element) {
    html = this.element;
  }
  
  if (html) {
    console.log('DMPanel | Переключение вкладки на:', tabName);
    
    // Убираем активный класс у всех кнопок вкладок
    html.find('.dm-tab-btn').removeClass('active');
    
    // Добавляем активный класс выбранной кнопке
    html.find(`.dm-tab-btn[data-tab="${tabName}"]`).addClass('active');
    
    // Переключаем видимость контента
    if (tabName === 'all-players') {
      html.find('.dm-content-wrapper').show();
      html.find('.quick-actions-panel').show();
      html.find('.player-view-tab').hide();
      
      // Скрываем выпадающий список выбора игрока
      html.find('.player-selector').hide();
    } else {
      html.find('.dm-content-wrapper').hide();
      html.find('.quick-actions-panel').hide();
      html.find('.player-view-tab').show();
      
      // Показываем выпадающий список выбора игрока
      html.find('.player-selector').show();
      
      // Очищаем контейнер просмотра, если игрок не выбран
      if (!html.find('.player-select-dropdown').val()) {
        html.find('#player-view-container').html(`
          <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Выберите игрока для просмотра...</p>
          </div>
        `);
      }
    }
  }
}
  
  /**
   * Загружает данные игрока для просмотра
   */
  async loadPlayerView(playerId, html) {
    if (!html && this.element) {
      html = this.element;
    }
    
    if (!playerId) return;
    
    const container = html.find('#player-view-container');
    container.html(`
      <div class="loading-state">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Загрузка данных игрока...</p>
      </div>
    `);
    
    try {
      // Получаем данные игрока через ядро системы
      const playerData = this.playersData.find(p => p.id === playerId);
      if (!playerData) {
        container.html(`
          <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Данные игрока не найдены</p>
          </div>
        `);
        return;
      }
      
      // Формируем HTML для просмотра
      const htmlContent = await this.generatePlayerViewHTML(playerData);
      container.html(htmlContent);
      
      // Активируем слушатели для этой вкладки
      this.activatePlayerViewListeners(container, playerId);
      
    } catch (error) {
      console.error('DMPanel | Ошибка загрузки данных игрока:', error);
      container.html(`
        <div class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Ошибка загрузки: ${error.message}</p>
        </div>
      `);
    }
  }
  
  /**
   * Генерирует HTML для просмотра данных игрока
   */
  async generatePlayerViewHTML(playerData) {
    // Получаем актуальные данные из ядра
    const sanityData = window.ShinjuSanity.Core.getActorSanityData(playerData.id);
    
    if (!sanityData) {
      return `
        <div class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Данные рассудка не инициализированы</p>
        </div>
      `;
    }
    
    const sanityPercentage = sanityData.max > 0 ? (sanityData.current / sanityData.max) * 100 : 0;
    
    return `
      <div class="player-view-content">
        <!-- Заголовок игрока -->
        <div class="player-view-header">
          <div class="player-view-avatar">
            <img src="${playerData.img}" alt="${playerData.name}">
            <div class="player-status-indicator ${playerData.isOnline ? 'online' : 'offline'}">
              <i class="fas fa-circle"></i>
            </div>
          </div>
          <div class="player-view-info">
            <h3>${playerData.name}</h3>
            <p class="player-user">Игрок: ${playerData.playerName}</p>
            <div class="player-stats">
              <span class="stat-badge">
                <i class="fas fa-brain"></i>
                Рассудок: ${sanityData.current}/${sanityData.max}
              </span>
              <span class="stat-badge stress-${sanityData.stressLevel}">
                <i class="fas fa-exclamation-triangle"></i>
                Уровень стресса: ${sanityData.stressLevel}
              </span>
              <span class="stat-badge">
                <i class="fas fa-chart-line"></i>
                ${sanityPercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
        
        <!-- Быстрые действия -->
        <div class="player-quick-actions">
          <button class="action-btn damage-btn" data-player-id="${playerData.id}">
            <i class="fas fa-skull"></i> Урон рассудку
          </button>
          <button class="action-btn heal-btn" data-player-id="${playerData.id}">
            <i class="fas fa-heart"></i> Восстановить
          </button>
          <button class="action-btn reset-btn" data-player-id="${playerData.id}">
            <i class="fas fa-redo"></i> Сбросить стресс
          </button>
        </div>
        
        <!-- Вкладки -->
        <div class="player-view-tabs">
          <button class="view-tab-btn active" data-tab="conditions">Состояния</button>
          <button class="view-tab-btn" data-tab="history">История</button>
          <button class="view-tab-btn" data-tab="details">Детали</button>
        </div>
        
        <!-- Контент вкладок -->
        <div class="player-view-tab-content">
          <!-- Состояния -->
          <div class="view-tab-pane active" data-tab="conditions">
            ${this.generateConditionsHTML(sanityData.activeConditions)}
          </div>
          
          <!-- История -->
          <div class="view-tab-pane" data-tab="history">
            ${this.generateHistoryHTML(sanityData.stressHistory)}
          </div>
          
          <!-- Детали -->
          <div class="view-tab-pane" data-tab="details">
            ${this.generateDetailsHTML(playerData, sanityData)}
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Генерирует HTML для состояний
   */
  generateConditionsHTML(conditions) {
    if (!conditions || conditions.length === 0) {
      return `<div class="empty-message">Нет активных состояний</div>`;
    }
    
    return conditions.map(condition => `
      <div class="view-condition-card ${condition.type}">
        <div class="condition-header">
          <h4>
            <i class="fas fa-${condition.type === 'psychosis' ? 'skull' : 'sparkles'}"></i>
            ${condition.name}
          </h4>
          <span class="condition-tier">Уровень ${condition.tier}</span>
        </div>
        <div class="condition-description">
          <p>${condition.description || 'Нет описания'}</p>
        </div>
        <div class="condition-footer">
          <span class="condition-type ${condition.type}">
            ${condition.type === 'psychosis' ? 'Психоз' : 'Воодушевление'}
          </span>
          <button class="remove-condition-btn" data-condition-id="${condition.id}">
            <i class="fas fa-times"></i> Удалить
          </button>
        </div>
      </div>
    `).join('');
  }
  
  /**
   * Генерирует HTML для истории
   */
  generateHistoryHTML(history) {
    if (!history || history.length === 0) {
      return `<div class="empty-message">История изменений пуста</div>`;
    }
    
    const sortedHistory = [...history]
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 20);
    
    return `
      <div class="history-list">
        ${sortedHistory.map(entry => `
          <div class="history-item">
            <div class="history-header">
              <span class="history-change">${entry.from || 1} → ${entry.to || 1}</span>
              <span class="history-time">${entry.timestamp ? new Date(entry.timestamp).toLocaleString('ru-RU') : 'Неизвестно'}</span>
            </div>
            ${entry.reason ? `<p class="history-reason">${entry.reason}</p>` : ''}
            ${entry.conditionApplied ? `
              <div class="history-condition">
                Получено: ${entry.conditionApplied.name}
                (${entry.conditionApplied.type === 'psychosis' ? 'Психоз' : 'Воодушевление'})
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }
  
  /**
   * Генерирует HTML для деталей
   */
  generateDetailsHTML(playerData, sanityData) {
    return `
      <div class="details-grid">
        <div class="detail-item">
          <span class="detail-label">Максимальный рассудок:</span>
          <span class="detail-value">${sanityData.max}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Текущий рассудок:</span>
          <span class="detail-value">${sanityData.current}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Уровень стресса:</span>
          <span class="detail-value stress-${sanityData.stressLevel}">${sanityData.stressLevel}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Последнее обновление:</span>
          <span class="detail-value">${sanityData.lastUpdate ? new Date(sanityData.lastUpdate).toLocaleString('ru-RU') : 'Неизвестно'}</span>
        </div>
      </div>
    `;
  }
  
  /**
   * Активирует слушатели в просмотре игрока
   */
  activatePlayerViewListeners(container, playerId) {
    const self = this;
    
    // Переключение вкладок
    container.find('.view-tab-btn').click(function() {
      const tabName = this.dataset.tab;
      self.switchPlayerViewTab(tabName, container);
    });
    
    // Управление игроком
    container.find('.damage-btn').click(function() {
      const playerId = this.dataset.playerId;
      self.showPlayerDamageDialog(playerId);
    });
    
    container.find('.heal-btn').click(function() {
      const playerId = this.dataset.playerId;
      self.showPlayerHealDialog(playerId);
    });
    
    container.find('.reset-btn').click(function() {
      const playerId = this.dataset.playerId;
      self.showResetStressDialog(playerId);
    });
    
    // Удаление состояния
    container.find('.remove-condition-btn').click(function() {
      const conditionId = this.dataset.conditionId;
      const playerId = container.find('.action-btn').first().data('player-id');
      if (playerId && conditionId) {
        self.removeCondition(playerId, conditionId);
      }
    });
  }
  
  /**
   * Переключает вкладки в просмотре игрока
   */
  switchPlayerViewTab(tabName, container) {
    container.find('.view-tab-btn').removeClass('active');
    container.find('.view-tab-pane').removeClass('active').hide();
    
    container.find(`.view-tab-btn[data-tab="${tabName}"]`).addClass('active');
    container.find(`.view-tab-pane[data-tab="${tabName}"]`).addClass('active').show();
  }
  
  /**
   * Показывает диалог быстрого восстановления определенного количества
   */
  async showQuickHealAmountDialog(amount) {
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
            <label>Восстановление: <strong>${amount} пунктов рассудка</strong></label>
          </div>
          <div class="form-group">
            <label>Выберите цель:</label>
            <select id="heal-target" style="width: 100%">
              <option value="all">Все игроки</option>
              ${actors.map(actor => `<option value="${actor.id}">${actor.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Источник восстановления (опционально):</label>
            <input type="text" id="heal-source" placeholder="Например: Отдых, Лечение и т.д." style="width: 100%">
          </div>
        </form>
      `;
      
      new Dialog({
        title: `Быстрое восстановление ${amount} пунктов`,
        content: content,
        buttons: {
          apply: {
            icon: '<i class="fas fa-heart"></i>',
            label: 'Восстановить',
            callback: async (html) => {
              const target = html.find('#heal-target').val();
              const source = html.find('#heal-source').val().trim() || `Быстрое восстановление`;
              
              try {
                if (target === 'all') {
                  for (const actor of actors) {
                    await window.ShinjuSanity.Core.restoreSanity(actor.id, amount, source);
                  }
                  ui.notifications.info(`Восстановлено ${amount} пунктов рассудка всем игрокам`);
                } else {
                  await window.ShinjuSanity.Core.restoreSanity(target, amount, source);
                  const actor = actors.find(a => a.id === target);
                  ui.notifications.info(`Восстановлено ${amount} пунктов рассудка ${actor?.name}`);
                }
                
                if (this?.rendered) {
                  setTimeout(() => this.refresh(), 100);
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
      console.error('DMPanel | Ошибка показа диалога восстановления:', error);
      ui.notifications.error(`Ошибка: ${error.message}`);
    }
  }
  
  /**
   * Показывает диалог полного восстановления
   */
  async showFullHealDialog() {
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
            <label><strong>Полное восстановление рассудка</strong></label>
            <p>Будет восстановлен рассудок до максимума у выбранных целей</p>
          </div>
          <div class="form-group">
            <label>Выберите цель:</label>
            <select id="heal-target" style="width: 100%">
              <option value="all">Все игроки</option>
              ${actors.map(actor => `<option value="${actor.id}">${actor.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Источник восстановления (опционально):</label>
            <input type="text" id="heal-source" placeholder="Например: Длительный отдых, Магия и т.д." style="width: 100%">
          </div>
        </form>
      `;
      
      new Dialog({
        title: 'Полное восстановление рассудка',
        content: content,
        buttons: {
          apply: {
            icon: '<i class="fas fa-heartbeat"></i>',
            label: 'Полное восстановление',
            callback: async (html) => {
              const target = html.find('#heal-target').val();
              const source = html.find('#heal-source').val().trim() || `Полное восстановление`;
              
              try {
                if (target === 'all') {
                  for (const actor of actors) {
                    const data = window.ShinjuSanity.Core.getActorSanityData(actor.id);
                    if (data) {
                      const healAmount = data.max - data.current;
                      if (healAmount > 0) {
                        await window.ShinjuSanity.Core.restoreSanity(actor.id, healAmount, source);
                      }
                    }
                  }
                  ui.notifications.info(`Полное восстановление рассудка всем игрокам`);
                } else {
                  const data = window.ShinjuSanity.Core.getActorSanityData(target);
                  if (data) {
                    const healAmount = data.max - data.current;
                    if (healAmount > 0) {
                      await window.ShinjuSanity.Core.restoreSanity(target, healAmount, source);
                      const actor = actors.find(a => a.id === target);
                      ui.notifications.info(`Полное восстановление рассудка ${actor?.name}`);
                    }
                  }
                }
                
                if (this?.rendered) {
                  setTimeout(() => this.refresh(), 100);
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
      console.error('DMPanel | Ошибка показа диалога полного восстановления:', error);
      ui.notifications.error(`Ошибка: ${error.message}`);
    }
  }
  
  /**
   * Показывает диалог урона рассудку
   */
  async showPlayerDamageDialog(playerId) {
    const player = this.playersData.find(p => p.id === playerId);
    if (!player) {
      ui.notifications.warn("Игрок не найден");
      return;
    }
    
    const content = `
      <form class="sanity-dialog-form">
        <div class="form-group">
          <label>Игрок: <strong>${player.name}</strong></label>
        </div>
        <div class="form-group">
          <label>Текущий рассудок: ${player.sanity}/${player.maxSanity} (${player.sanityPercentage.toFixed(1)}%)</label>
        </div>
        <div class="form-group">
          <label for="damage-amount">Количество урона:</label>
          <input type="number" id="damage-amount" 
                 min="1" value="1" 
                 style="width: 100%">
        </div>
        <div class="form-group">
          <label for="damage-source">Источник урона (опционально):</label>
          <input type="text" id="damage-source" 
                 placeholder="Например: Кошмар, Ужас и т.д." 
                 style="width: 100%">
        </div>
      </form>
    `;
    
    new Dialog({
      title: `Урон рассудку: ${player.name}`,
      content: content,
      buttons: {
        apply: {
          icon: '<i class="fas fa-skull"></i>',
          label: 'Применить урон',
          callback: async (html) => {
            const amount = parseInt(html.find('#damage-amount').val());
            const source = html.find('#damage-source').val().trim() || 'Неизвестно';
            
            // ИСПРАВЛЕНИЕ: Проверяем только минимальное значение
            if (amount <= 0) {
              ui.notifications.warn("Некорректное количество урона");
              return;
            }
            
            try {
              await window.ShinjuSanity.Core.applySanityDamage(playerId, amount, source);
              ui.notifications.info(`Урон рассудку применен к ${player.name}`);
              this.refresh();
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
      close: () => {},
      width: 450
    }).render(true);
  }
  
  /**
   * Показывает диалог восстановления рассудка
   */
  async showPlayerHealDialog(playerId) {
    const player = this.playersData.find(p => p.id === playerId);
    if (!player) {
      ui.notifications.warn("Игрок не найден");
      return;
    }
    
    const maxHeal = player.maxSanity - player.sanity;
    
    const content = `
      <form class="sanity-dialog-form">
        <div class="form-group">
          <label>Игрок: <strong>${player.name}</strong></label>
        </div>
        <div class="form-group">
          <label>Текущий рассудок: ${player.sanity}/${player.maxSanity} (${player.sanityPercentage.toFixed(1)}%)</label>
        </div>
        <div class="form-group">
          <label for="heal-amount">Количество восстановления (макс: ${maxHeal}):</label>
          <input type="number" id="heal-amount" 
                 min="1" max="${maxHeal}" value="1" 
                 style="width: 100%">
        </div>
        <div class="form-group">
          <label for="heal-source">Источник восстановления (опционально):</label>
          <input type="text" id="heal-source" 
                 placeholder="Например: Отдых, Лечение и т.д." 
                 style="width: 100%">
        </div>
      </form>
    `;
    
    new Dialog({
      title: `Восстановление рассудка: ${player.name}`,
      content: content,
      buttons: {
        apply: {
          icon: '<i class="fas fa-heart"></i>',
          label: 'Восстановить',
          callback: async (html) => {
            const amount = parseInt(html.find('#heal-amount').val());
            const source = html.find('#heal-source').val().trim() || 'Неизвестно';
            
            if (amount <= 0) {
              ui.notifications.warn("Некорректное количество восстановления");
              return;
            }
            
            if (amount > maxHeal) {
              ui.notifications.warn(`Можно восстановить максимум ${maxHeal} пунктов рассудка`);
              return;
            }
            
            try {
              await window.ShinjuSanity.Core.restoreSanity(playerId, amount, source);
              ui.notifications.info(`Рассудок восстановлен у ${player.name}`);
              this.refresh();
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
      close: () => {}
    }).render(true);
  }
  
  /**
   * Показывает диалог сброса уровня стресса
   */
  async showResetStressDialog(playerId) {
  const player = this.playersData.find(p => p.id === playerId);
  if (!player) {
    ui.notifications.warn("Игрок не найден");
    return;
  }
  
  const content = `
    <form class="sanity-dialog-form">
      <div class="form-group">
        <label>Игрок: <strong>${player.name}</strong></label>
      </div>
      <div class="form-group">
        <label>Текущий уровень стресса: <span class="stress-level-${player.stressLevel}">${player.stressLevel}</span></label>
      </div>
      <div class="form-group">
        <label for="stress-level-${playerId}">Новый уровень стресса (0-5):</label>
        <input type="number" id="stress-level-${playerId}" 
               min="0" max="5" value="0"  <!-- ИЗМЕНИЛОСЬ: min="0" -->
               style="width: 100%">
      </div>
      <div class="warning">
        <p><i class="fas fa-exclamation-triangle"></i> Внимание: при сбросе уровня стресса будут удалены все активные состояния и восстановлен рассудок до максимума!</p>
        <p><i class="fas fa-info-circle"></i> Уровень 0 = Нормальное состояние (нет активных состояний)</p>
      </div>
    </form>
  `;
  
  new Dialog({
    title: `Сброс уровня стресса: ${player.name}`,
    content: content,
    buttons: {
      apply: {
        icon: '<i class="fas fa-redo"></i>',
        label: 'Сбросить',
        callback: async (html) => {
          const newLevel = parseInt(html.find(`#stress-level-${playerId}`).val());
          
          if (newLevel < 0 || newLevel > 5) {
            ui.notifications.warn("Уровень стресса должен быть от 0 до 5");
            return;
          }
          
          try {
            await window.ShinjuSanity.Core.resetStressLevel(playerId, newLevel);
            ui.notifications.info(`Уровень стресса сброшен до ${newLevel} для ${player.name}`);
            this.refresh();
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
    close: () => {}
  }).render(true);
}
  
  /**
   * Удаляет состояние у игрока
   */
  async removeCondition(playerId, conditionId) {
    if (!game.user.isGM) return;
    
    const confirmed = await Dialog.confirm({
      title: "Удаление состояния",
      content: "<p>Вы уверены, что хотите удалить это состояние?</p>",
      yes: () => true,
      no: () => false,
      defaultYes: false
    });
    
    if (!confirmed) return;
    
    try {
      await window.ShinjuSanity.Core.removeCondition(playerId, conditionId);
      ui.notifications.info("Состояние удалено");
      this.refresh();
    } catch (error) {
      ui.notifications.error(`Ошибка при удалении состояния: ${error.message}`);
    }
  }
  
  /**
   * Показывает диалог быстрого урона всем
   */
  showQuickDamageDialog() {
    const players = this.playersData;
    
    const content = `
      <form class="sanity-dialog-form">
        <div class="form-group">
          <label>Выберите цель:</label>
          <select id="damage-target" style="width: 100%">
            <option value="all">Все игроки</option>
            ${players.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
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
                for (const player of players) {
                  await window.ShinjuSanity.Core.applySanityDamage(player.id, amount, source);
                }
                ui.notifications.info(`Урон рассудку применен всем игрокам`);
              } else {
                await window.ShinjuSanity.Core.applySanityDamage(target, amount, source);
                const player = players.find(p => p.id === target);
                ui.notifications.info(`Урон рассудку применен ${player?.name}`);
              }
              this.refresh();
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
      close: () => {}
    }).render(true);
  }
  
  /**
   * Показывает диалог быстрого восстановления всем
   */
  showQuickHealDialog() {
    const players = this.playersData;
    
    const content = `
      <form class="sanity-dialog-form">
        <div class="form-group">
          <label>Выберите цель:</label>
          <select id="heal-target" style="width: 100%">
            <option value="all">Все игроки</option>
            ${players.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
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
                for (const player of players) {
                  await window.ShinjuSanity.Core.restoreSanity(player.id, amount, source);
                }
                ui.notifications.info(`Рассудок восстановлен всем игрокам`);
              } else {
                await window.ShinjuSanity.Core.restoreSanity(target, amount, source);
                const player = players.find(p => p.id === target);
                ui.notifications.info(`Рассудок восстановлен ${player?.name}`);
              }
              this.refresh();
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
      close: () => {}
    }).render(true);
  }
  
  /**
   * Запускает автообновление панели
   */
  startAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    this.refreshInterval = setInterval(() => {
      if (this.rendered) {
        this.refresh();
      }
    }, 30000); // 30 секунд
  }
  
  /**
   * Останавливает автообновление
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
  
  /**
   * Обновляет данные и перерисовывает панель
   */
  async refresh() {
  if (this.rendered) {
    // Сохраняем текущее состояние
    const currentTab = this.currentDMTab || 'all-players';
    let selectedPlayerId = null;
    
    if (currentTab === 'single-player' && this.element) {
      selectedPlayerId = this.element.find('.player-select-dropdown').val();
    }
    
    // Перерисовываем панель
    await this.render(true);
    
    // Восстанавливаем состояние
    if (this.element) {
      // Восстанавливаем вкладку
      this.switchDMTab(currentTab, this.element);
      
      // Восстанавливаем выбранного игрока
      if (currentTab === 'single-player' && selectedPlayerId) {
        setTimeout(() => {
          this.element.find('.player-select-dropdown').val(selectedPlayerId);
          this.loadPlayerView(selectedPlayerId, this.element);
        }, 100);
      }
    }
  }
}
  
  /**
   * Закрывает панель
   */
  async close(options = {}) {
  this.stopAutoRefresh?.(); // Для DMPanel
  return super.close(options);
}
  
  /**
   * Показывает или скрывает окно
   */
  toggle() {
    if (this.rendered) {
      this.close();
    } else {
      this.render(true);
    }
  }
}

// Регистрируем класс
window.ShinjuSanity.DMPanel = DMPanel;