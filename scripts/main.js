/**
 * Shinju Sanity System - Основной файл
 */

Hooks.once('init', function() {
  console.log('Sanity System | Инициализация');
  
  window.ShinjuSanity = window.ShinjuSanity || {};
  
  // Настройки
  game.settings.register('shinju-sanity-system', 'enableSystem', {
    name: 'Включить систему рассудка',
    hint: 'Активировать систему в кампании',
    scope: 'world', config: true, type: Boolean, default: true
  });
  // Слушатель изменений настроек - будет установлен в хуке ready
  Hooks.once('ready', () => {
    // Проверяем что настройки загружены
    if (game.settings.settings.get('shinju-sanity-system')) {
      game.settings.settings.get('shinju-sanity-system').forEach(setting => {
        Hooks.on(`updateSetting.shinju-sanity-system.${setting.key}`, (setting, value) => {
          if (game.user.isGM) {
            ui.notifications.info(
              `Настройка "${setting.name}" изменена. Для применения изменений может потребоваться перезагрузка страницы.`,
              { permanent: false }
            );
          }
        });
      });
    }
  });
  
  game.settings.register('shinju-sanity-system', 'showPlayerButtons', {
    name: 'Кнопки игрокам',
    hint: 'Показывать кнопки управления игрокам',
    scope: 'world', config: true, type: Boolean, default: true
  });
  
  // Настройки модуля
  game.settings.register('shinju-sanity-system', 'enableSystem', {
    name: 'Включить систему рассудка',
    hint: 'Активировать систему в кампании',
    scope: 'world', config: true, type: Boolean, default: true,
    onChange: () => {
      if (window.ShinjuSanity.UI) {
        window.ShinjuSanity.UI.refreshButtons();
      }
    }
  });
  
  game.settings.register('shinju-sanity-system', 'showPlayerButtons', {
    name: 'Кнопки игрокам',
    hint: 'Показывать кнопки управления игрокам',
    scope: 'world', config: true, type: Boolean, default: true,
    onChange: () => {
      if (window.ShinjuSanity.UI) {
        window.ShinjuSanity.UI.refreshButtons();
      }
    }
  });
  
  game.settings.register('shinju-sanity-system', 'buttonPosition', {
    name: 'Позиция кнопок',
    hint: 'Расположение кнопок на экране',
    scope: 'world', config: true, type: String,
    choices: {
      'bottom-left': 'Снизу слева',
      'bottom-right': 'Снизу справа',
      'top-left': 'Сверху слева',
      'top-right': 'Сверху справа'
    },
    default: 'bottom-left',
    onChange: () => {
      if (window.ShinjuSanity.UI) {
        window.ShinjuSanity.UI.refreshButtons();
      }
    }
  });
  
  game.settings.register('shinju-sanity-system', 'enableChatMessages', {
    name: 'Сообщения в чат',
    hint: 'Автоматические сообщения об изменениях',
    scope: 'world', config: true, type: Boolean, default: true
  });

  game.settings.register('shinju-sanity-system', 'debugMode', {
  name: 'Режим отладки',
  hint: 'Включить вывод отладочных сообщений в консоль',
  scope: 'world', config: true, type: Boolean, default: false
});
  
  // Регистрация горячих клавиш в init хуке
  if (window.ShinjuSanity.UI?.registerHotkeys) {
    window.ShinjuSanity.UI.registerHotkeys();
  }
});

Hooks.once('ready', async function() {
  // Проверяем систему
  if (game.system.id !== 'dnd5e') {
    console.warn('Sanity System | Требуется D&D 5e');
    return;
  }
  
  // Проверяем настройки с безопасной проверкой
  let systemEnabled = false;
  try {
    systemEnabled = game.settings.get('shinju-sanity-system', 'enableSystem');
  } catch (error) {
    console.warn('Sanity System | Настройки еще не загружены, откладываем запуск:', error);
    setTimeout(() => Hooks.callAll('ready'), 1000);
    return;
  }
  
  if (!systemEnabled) {
    console.log('Sanity System | Отключена в настройках');
    return;
  }
  
  try {
    // Инициализируем ядро
    if (window.ShinjuSanity.Core) {
      window.ShinjuSanity.Core.initialize();
      
      // Отладочная информация
      if (game.settings.get('shinju-sanity-system', 'debugMode')) {
        console.log('Sanity System | Режим отладки включен');
        console.log('Sanity System | Акторы:', game.actors?.size || 0);
        console.log('Sanity System | Пользователи:', game.users?.size || 0);
      }
    }
    
    // Инициализируем UI с небольшой задержкой
    setTimeout(() => {
      if (window.ShinjuSanity.UI) {
        window.ShinjuSanity.UI.initialize();
      }
    }, 1000); // Увеличил задержку до 1 секунды
    
    console.log('Sanity System | Готов к работе');
  } catch (error) {
    console.error('Sanity System | Ошибка запуска:', error);
  }
});
// Дебаг функция для тестирования вкладок
Hooks.once('ready', function() {
  // Добавляем глобальную функцию для тестирования
  window.debugSanityTabs = function() {
    const playerPanel = window.ShinjuSanity?.UI?.playerPanelApp;
    if (playerPanel && playerPanel.rendered) {
      console.log('=== DEBUG SANITY TABS ===');
      console.log('Текущая вкладка:', playerPanel.currentTab);
      console.log('HTML элемент:', playerPanel.element?.length);
      
      // Принудительно переключаем все вкладки
      const tabs = ['overview', 'conditions', 'history', 'info'];
      tabs.forEach((tab, index) => {
        setTimeout(() => {
          console.log(`Переключение на вкладку: ${tab}`);
          playerPanel.switchTab(tab);
        }, index * 1000);
      });
    } else {
      console.log('Player panel не найден или не отрендерен');
    }
  };
  
  // Автоматически тестируем при открытии панели
  Hooks.on('renderPlayerPanel', (app, html, data) => {
    console.log('=== PLAYER PANEL RENDERED ===');
    console.log('Данные:', {
      hasCharacter: data.hasCharacter,
      activeConditions: data.activeConditions?.length || 0,
      recentHistory: data.recentHistory?.length || 0,
      currentTab: data.currentTab
    });
    
    // Принудительно показываем все вкладки для теста
    setTimeout(() => {
      const $tabs = html.find('.tab-content');
      console.log('Найдено контейнеров вкладок:', $tabs.length);
      
      $tabs.each((index, element) => {
        const tabName = element.dataset.tab;
        console.log(`Вкладка ${index}:`, tabName, 'видима:', $(element).is(':visible'));
      });
    }, 100);
  });
  // Отладочная команда для проверки данных
Hooks.on('ready', () => {
  // Добавляем отладочную команду в консоль
  window.debugSanityData = function(actorId) {
    const actor = game.actors.get(actorId) || game.user.character;
    if (!actor) {
      console.error('Актор не найден');
      return;
    }
    
    console.log('=== ОТЛАДКА ДАННЫХ РАССУДКА ===');
    console.log('Актор:', actor.name, `(${actor.id})`);
    
    const data = window.ShinjuSanity.Core?.getActorSanityData?.(actor.id);
    if (data) {
      console.log('Данные рассудка:', data);
      console.log('Уровень стресса:', data.stressLevel);
      console.log('Активные состояния:', data.activeConditions?.length || 0);
      console.log('Записей истории:', data.stressHistory?.length || 0);
    } else {
      console.log('Данные не инициализированы');
    }
    
    // Проверяем флаги
    const flags = actor.getFlag('shinju-sanity-system', 'sanityData');
    console.log('Флаги актора:', flags);
    
    console.log('===============================');
  };
  // Экстренное исправление данных при загрузке
Hooks.on('ready', async () => {
  // Ждем полной загрузки
  setTimeout(async () => {
    // Принудительная инициализация всех персонажей
    if (window.ShinjuSanity.Core && game.actors) {
      const actors = window.ShinjuSanity.Core.getAllPlayerActors();
      console.log(`Sanity System | Принудительная инициализация ${actors.length} персонажей`);
      
      for (const actor of actors) {
        try {
          await window.ShinjuSanity.Core.ensureData(actor);
        } catch (error) {
          console.warn(`Ошибка инициализации ${actor.name}:`, error);
        }
      }
    }
    
    // Добавляем глобальную команду для перезагрузки данных
    window.reloadSanityData = async function() {
      if (window.ShinjuSanity.Core) {
        window.ShinjuSanity.Core.clearCache();
        
        // Переинициализируем всех персонажей
        const actors = window.ShinjuSanity.Core.getAllPlayerActors();
        for (const actor of actors) {
          try {
            await window.ShinjuSanity.Core.ensureData(actor);
            console.log(`Данные перезагружены: ${actor.name}`);
          } catch (error) {
            console.error(`Ошибка перезагрузки ${actor.name}:`, error);
          }
        }
        
        ui.notifications.info("Данные рассудка перезагружены");
      }
    };
    
    console.log('Sanity System | Команда перезагрузки доступна: reloadSanityData()');
    
  }, 3000); // Задержка 3 секунды для полной загрузки
});
  console.log('Sanity System | Отладочная команда доступна: debugSanityData(actorId)');
});
});