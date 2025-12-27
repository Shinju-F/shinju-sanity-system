
/**
 * Shinju Sanity System - Панель игрока (полностью исправленная версия)
 */

if (!window.ShinjuSanity) window.ShinjuSanity = {};

class PlayerPanel extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "sanity-player-panel",
      title: "Мой рассудок",
      template: "modules/shinju-sanity-system/templates/player-panel.html",
      width: 700,
      height: 650,
      resizable: true,
      classes: ["sanity-system", "sanity-player-panel", "gothic-panel"],
      dragDrop: [{ dragSelector: null, dropSelector: null }]
    });
  }

  constructor(options = {}) {
    super(options);
    this.options = foundry.utils.mergeObject(this.constructor.defaultOptions, options);
  }

  async getData() {
    const actor = game.user.character;
    if (!actor) {
      return {
        hasCharacter: false,
        message: "У вас нет активного персонажа. Назначьте персонажа в настройках пользователя."
      };
    }
    
    // Получаем данные через ядро системы
    const data = window.ShinjuSanity.Core?.getActorSanityData?.(actor.id);
    if (!data) {
      return {
        hasCharacter: true,
        actor: actor,
        sanity: 0,
        maxSanity: 0,
        sanityPercentage: 0,
        stressLevel: 1,
        activeConditions: [],
        recentHistory: [],
        error: "Данные рассудка не инициализированы"
      };
    }
    
    // Вычисляем модификаторы для формулы
    const abilities = actor.system?.abilities || {};
    const intMod = abilities.int?.mod || 0;
    const chaMod = abilities.cha?.mod || 0;
    const wisMod = abilities.wis?.mod || 0;
    
    // Формула рассудка
    const calculatedMax = Math.max(1, 10 + intMod + chaMod + wisMod);
    const formulaText = `10 + (${intMod >= 0 ? '+' : ''}${intMod}) + (${chaMod >= 0 ? '+' : ''}${chaMod}) + (${wisMod >= 0 ? '+' : ''}${wisMod}) = ${calculatedMax}`;
    
    // Вычисляем процент рассудка
    const sanityPercentage = data.max > 0 ? (data.current / data.max) * 100 : 0;
    
    // Определяем цвет шкалы
    const isLowSanity = sanityPercentage < 30;
    const isMediumSanity = sanityPercentage >= 30 && sanityPercentage < 70;
    const isHighSanity = sanityPercentage >= 70;
    
    // Шансы состояний
    let psychosisChance = 60;
    let inspirationChance = 40;
    if (data.stressLevel === 0) {
      psychosisChance = 60; // Для будущего повышения
      inspirationChance = 40;
    } else if (data.stressLevel === 5) {
      psychosisChance = 75;
      inspirationChance = 25;
    }
    
    // Получаем токен персонажа
    const tokenImg = actor.prototypeToken?.texture?.src || actor.img || 'icons/svg/mystery-man.svg';
    
    // Исправляем историю стресса с информацией о состояниях
    const recentHistory = (data.stressHistory || [])
      .slice(-10)
      .reverse()
      .map((entry, index) => {
        const historyEntry = {
          from: entry.from || 0,
          to: entry.to || 0,
          timestamp: entry.timestamp || Date.now(),
          reason: entry.reason || 'Изменение уровня стресса',
          psychosisChance: entry.psychosisChance || 0,
          inspirationChance: entry.inspirationChance || 0,
          conditionApplied: null
        };
        
        // Если было изменение уровня стресса, ищем примененное состояние
        if (entry.from !== entry.to && data.activeConditions) {
          // Ищем состояние, примененное примерно в это же время
          const appliedCondition = data.activeConditions.find(condition => {
            const conditionTime = condition.appliedAt || 0;
            const entryTime = entry.timestamp || 0;
            // Разница во времени менее 5 минут
            return Math.abs(conditionTime - entryTime) < 300000;
          });
          
          if (appliedCondition) {
            historyEntry.conditionApplied = {
              name: appliedCondition.name,
              type: appliedCondition.type,
              tier: appliedCondition.tier
            };
          }
        }
        
        return historyEntry;
      })
      .filter(entry => entry !== null);
    
    // Описания уровней стресса для вкладки "Справка"
    const stressDescriptions = [
      {
        level: 0,
        name: "Нормальное состояние",
        description: "Персонаж в норме, рассудок стабилен. При первом достижении 0% рассудка повысится уровень стресса."
      },
      {
        level: 1,
        name: "Легкое напряжение",
        description: "Первые признаки стресса, легкая тревожность."
      },
      {
        level: 2,
        name: "Средний стресс",
        description: "Заметное психическое напряжение, проблемы со сном."
      },
      {
        level: 3,
        name: "Сильное напряжение",
        description: "Серьезные психические проблемы, требуется помощь."
      },
      {
        level: 4,
        name: "Критический уровень",
        description: "Предел психических возможностей, риск полного срыва."
      },
      {
        level: 5,
        name: "Экстремальный стресс",
        description: "Максимальный уровень, есть шанс сбросить на уровень ниже."
      }
    ];
    
    // ВАЖНО: Возвращаем ВСЕ данные для всех вкладок
    return {
      // Основные данные
      hasCharacter: true,
      actor: {
        id: actor.id,
        name: actor.name,
        img: tokenImg,
        token: tokenImg
      },
      
      // Данные для вкладки "Обзор"
      sanity: data.current,
      maxSanity: data.max,
      sanityPercentage: sanityPercentage,
      isLowSanity: isLowSanity,
      isMediumSanity: isMediumSanity,
      isHighSanity: isHighSanity,
      stressLevel: data.stressLevel,
      psychosisChance: psychosisChance,
      inspirationChance: inspirationChance,
      formula: formulaText,
      abilityMods: {
        int: intMod,
        cha: chaMod,
        wis: wisMod
      },
      
      // Данные для вкладки "Состояния"
      activeConditions: data.activeConditions || [],
      
      // Данные для вкладки "История"
      recentHistory: recentHistory,
      
      // Данные для вкладки "Справка"
      stressDescriptions: stressDescriptions,
      
      // Метаданные
      isGM: game.user.isGM,
      lastUpdate: data.lastUpdate || Date.now()
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    
    // Кнопка обновления
    html.find('.refresh-btn').click(() => this.refresh());
    
    // Кнопка закрытия
    html.find('.close-btn').click(() => this.close());
    
    // Переключение вкладок - ИСПРАВЛЕННАЯ ВЕРСИЯ
    const self = this;
    html.find('.gothic-tab-btn').click(function(event) {
      event.preventDefault();
      event.stopPropagation();
      const tabName = this.dataset.tab;
      self.switchTab(tabName, html);
    });
    
    // Раскрытие/скрытие деталей состояний
    html.find('.condition-toggle').click(function(event) {
      event.preventDefault();
      event.stopPropagation();
      const conditionId = this.dataset.conditionId;
      self.toggleConditionDetails(conditionId, html);
    });
    
    // Инициализация - показываем первую вкладку
    setTimeout(() => {
      this.switchTab('overview', html);
    }, 100);
  }
  
  /**
   * Переключает активную вкладку
   */
  switchTab(tabName, html) {
    // Убираем активный класс у всех кнопок вкладок
    html.find('.gothic-tab-btn').removeClass('active');
    
    // Убираем активный класс у всех контентов вкладок
    html.find('.tab-content').removeClass('active');
    
    // Добавляем активный класс выбранной кнопке
    html.find(`.gothic-tab-btn[data-tab="${tabName}"]`).addClass('active');
    
    // Показываем выбранный контент
    html.find(`.tab-content[data-tab="${tabName}"]`).addClass('active');
    
    // Логи для отладки
    if (game.settings.get('shinju-sanity-system', 'debugMode')) {
      console.log(`PlayerPanel | Вкладка переключена: ${tabName}`);
      console.log(`PlayerPanel | Активные состояния: ${this.data?.activeConditions?.length || 0}`);
      console.log(`PlayerPanel | Записей истории: ${this.data?.recentHistory?.length || 0}`);
    }
  }
  
  /**
   * Переключает отображение деталей состояния
   */
  toggleConditionDetails(conditionId, html) {
    const $details = html.find(`#condition-details-${conditionId}`);
    const $toggle = html.find(`[data-condition-id="${conditionId}"] .toggle-icon i`);
    
    if ($details.is(':visible')) {
      $details.slideUp();
      $toggle.removeClass('fa-chevron-up').addClass('fa-chevron-down');
    } else {
      $details.slideDown();
      $toggle.removeClass('fa-chevron-down').addClass('fa-chevron-up');
    }
  }

  /**
   * Обновляет данные и перерисовывает панель
   */
  async refresh() {
    if (this.rendered) {
      // Сначала получаем свежие данные
      this.data = await this.getData();
      // Затем рендерим
      await this.render(true);
    }
  }
  
  /**
   * Закрывает панель
   */
  async close(options = {}) {
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
window.ShinjuSanity.PlayerPanel = PlayerPanel;
