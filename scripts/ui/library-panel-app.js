
/**
 * Shinju Sanity System - Приложение библиотеки состояний (оптимизированная версия)
 * Application V1 API
 */

if (!window.ShinjuSanity) {
  window.ShinjuSanity = {};
}

class LibraryPanel extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "sanity-library-panel",
      title: "Библиотека состояний рассудка",
      template: "modules/shinju-sanity-system/templates/library-panel.html",
      width: 850,
      height: 650,
      resizable: true,
      classes: ["sanity-system", "sanity-library-panel", "gothic-panel"],
      dragDrop: [{ dragSelector: null, dropSelector: null }]
    });
  }

  constructor(options = {}) {
    super(options);
    this.currentTab = 'psychosis';
    this.currentTier = 1;
    this.searchTerm = '';
    this.cache = new Map();
  }
  
  /**
   * Получает данные для рендеринга шаблона
   */
  async getData() {
    // Проверяем доступность базы данных
    if (!window.ShinjuSanity.ConditionsDB) {
      return {
        currentTab: this.currentTab,
        currentTier: this.currentTier,
        allConditions: [],
        stats: this.getEmptyStats(),
        tabStats: this.getEmptyTabStats(),
        error: "База данных условий не загружена"
      };
    }
    
    try {
      // Получаем состояния для текущей вкладки
      let allConditions = [];
      if (this.currentTab === 'psychosis') {
        allConditions = this.getAllPsychoses();
      } else {
        allConditions = this.getAllInspirations();
      }
      
      // Фильтруем по выбранному уровню
      let filteredConditions = allConditions.filter(c => c.tier === this.currentTier);
      
      // Применяем поиск, если есть поисковый запрос
      if (this.searchTerm && this.searchTerm.trim()) {
        filteredConditions = this.applySearch(filteredConditions, this.searchTerm);
      }
      
      // Статистика для текущей вкладки
      const tabStats = {
        tier1: allConditions.filter(c => c.tier === 1).length,
        tier2: allConditions.filter(c => c.tier === 2).length,
        tier3: allConditions.filter(c => c.tier === 3).length,
        tier4: allConditions.filter(c => c.tier === 4).length,
        tier5: allConditions.filter(c => c.tier === 5).length
      };
      
      // Общая статистика
      const stats = {
        totalPsychoses: this.getAllPsychoses().length,
        totalInspirations: this.getAllInspirations().length,
        totalConditions: this.getAllPsychoses().length + this.getAllInspirations().length
      };
      
      return {
        currentTab: this.currentTab,
        currentTier: this.currentTier,
        searchTerm: this.searchTerm,
        allConditions: filteredConditions,
        stats: stats,
        tabStats: tabStats,
        error: null
      };
      
    } catch (error) {
      console.error('LibraryPanel | Ошибка получения данных:', error);
      return {
        currentTab: this.currentTab,
        currentTier: this.currentTier,
        allConditions: [],
        stats: this.getEmptyStats(),
        tabStats: this.getEmptyTabStats(),
        error: `Ошибка загрузки: ${error.message}`
      };
    }
  }
  
  /**
   * Получает все психозы из базы данных
   */
  getAllPsychoses() {
    const cacheKey = 'psychoses_all';
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
    
    if (!window.ShinjuSanity.ConditionsDB?.psychoses) {
      return [];
    }
    
    const psychoses = [];
    const db = window.ShinjuSanity.ConditionsDB.psychoses;
    
    // Обрабатываем все уровни
    for (let tier = 1; tier <= 5; tier++) {
      const tierKey = `tier${tier}`;
      if (db[tierKey] && Array.isArray(db[tierKey])) {
        db[tierKey].forEach(psychosis => {
          psychoses.push({
            ...psychosis,
            tier: tier,
            type: 'psychosis'
          });
        });
      }
    }
    
    this.cache.set(cacheKey, psychoses);
    return psychoses;
  }
  
  /**
   * Получает все воодушевления из базы данных
   */
  getAllInspirations() {
    const cacheKey = 'inspirations_all';
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
    
    if (!window.ShinjuSanity.ConditionsDB?.inspirations) {
      return [];
    }
    
    const inspirations = [];
    const db = window.ShinjuSanity.ConditionsDB.inspirations;
    
    // Обрабатываем все уровни
    for (let tier = 1; tier <= 5; tier++) {
      const tierKey = `tier${tier}`;
      if (db[tierKey] && Array.isArray(db[tierKey])) {
        db[tierKey].forEach(inspiration => {
          inspirations.push({
            ...inspiration,
            tier: tier,
            type: 'inspiration'
          });
        });
      }
    }
    
    this.cache.set(cacheKey, inspirations);
    return inspirations;
  }
  
  /**
   * Применяет поисковый запрос к состояниям
   */
  applySearch(conditions, searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return conditions;
    
    return conditions.filter(condition => {
      return (
        (condition.name && condition.name.toLowerCase().includes(term)) ||
        (condition.description && condition.description.toLowerCase().includes(term)) ||
        (condition.type && condition.type.toLowerCase().includes(term)) ||
        (condition.tier && condition.tier.toString().includes(term))
      );
    });
  }
  
  /**
   * Создает пустую статистику
   */
  getEmptyStats() {
    return {
      totalConditions: 0,
      totalPsychoses: 0,
      totalInspirations: 0
    };
  }
  
  getEmptyTabStats() {
    return {
      tier1: 0,
      tier2: 0,
      tier3: 0,
      tier4: 0,
      tier5: 0
    };
  }
  
  /**
   * Активирует слушатели событий
   */
  activateListeners(html) {
    super.activateListeners(html);
    
    // Кнопка обновления
    html.find('.refresh-btn').click(() => this.refresh());
    
    // Кнопка закрытия
    html.find('.close-btn').click(() => this.close());
    
    // Переключение вкладок
    html.find('.gothic-tab-btn').click((event) => {
      event.preventDefault();
      event.stopPropagation();
      const tab = event.currentTarget.dataset.tab;
      this.switchTab(tab);
    });
    
    // Переключение уровней
    html.find('.tier-filter-btn').click((event) => {
      event.preventDefault();
      event.stopPropagation();
      const tier = parseInt(event.currentTarget.dataset.tier);
      this.switchTier(tier);
    });
    
    // Поиск по нажатию Enter
    html.find('.search-input').on('keypress', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.searchTerm = event.target.value;
        this.performSearch();
      }
    });
    
    // Поиск при изменении (с задержкой)
    let searchTimeout;
    html.find('.search-input').on('input', (event) => {
      clearTimeout(searchTimeout);
      this.searchTerm = event.target.value;
      searchTimeout = setTimeout(() => {
        this.performSearch();
      }, 300);
    });
    
    // Кнопка очистки поиска
    html.find('.search-clear').click(() => {
      this.searchTerm = '';
      html.find('.search-input').val('');
      this.performSearch();
    });
    
    // Кнопка поиска
    html.find('.search-btn').click(() => {
      this.searchTerm = html.find('.search-input').val();
      this.performSearch();
    });

    // Инициализация скролла
    this.initializeScroll();
  }
  
  /**
   * Инициализирует скроллируемый контейнер
   */
  initializeScroll() {
    // Стилизация скроллбара будет через CSS
    console.log('LibraryPanel | Скролл инициализирован');
  }
  
  /**
   * Переключает вкладку
   */
  switchTab(tab) {
    this.currentTab = tab;
    this.currentTier = 1; // Сбрасываем на первый уровень
    this.cache.clear(); // Очищаем кэш при смене вкладки
    this.refresh();
  }
  
  /**
   * Переключает уровень
   */
  switchTier(tier) {
    this.currentTier = tier;
    this.refresh();
  }
  
  /**
   * Выполняет поиск по состояниям
   */
  performSearch() {
    this.refresh();
  }
  
  /**
   * Обновляет данные и перерисовывает панель
   */
  async refresh() {
    if (this.rendered) {
      await this.render(true);
    }
  }

  /**
   * При рендере активируем слушатели
   */
  async _render(force = false, options = {}) {
    const rendered = await super._render(force, options);
    
    if (rendered && this.element) {
      // Даем время для отрисовки DOM
      setTimeout(() => {
        this.activateListeners(this.element);
      }, 50);
    }
    
    return rendered;
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
window.ShinjuSanity.LibraryPanel = LibraryPanel;
