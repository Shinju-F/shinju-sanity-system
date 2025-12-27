/**
 * Shinju Sanity System - Вспомогательные функции Handlebars
 * Дополнительные хелперы для работы с данными
 */

// Проверяем, что Handlebars доступен
if (typeof Handlebars === 'undefined') {
  console.error('Shinju Sanity System | Handlebars не найден');
} else {
  // Регистрируем хелперы
  Handlebars.registerHelper('lt', (a, b) => a < b);
  Handlebars.registerHelper('lte', (a, b) => a <= b);
  Handlebars.registerHelper('gt', (a, b) => a > b);
  Handlebars.registerHelper('gte', (a, b) => a >= b);
  Handlebars.registerHelper('eq', (a, b) => a === b);
  Handlebars.registerHelper('neq', (a, b) => a !== b);
  
  Handlebars.registerHelper('add', (a, b) => Number(a) + Number(b));
  Handlebars.registerHelper('subtract', (a, b) => Number(a) - Number(b));
  Handlebars.registerHelper('multiply', (a, b) => Number(a) * Number(b));
  Handlebars.registerHelper('divide', (a, b) => b === 0 ? 0 : Number(a) / Number(b));
  
  Handlebars.registerHelper('round', (number, precision = 0) => {
    const n = parseFloat(number);
    if (isNaN(n)) return 0;
    const factor = Math.pow(10, precision);
    return Math.round(n * factor) / factor;
  });
  
  Handlebars.registerHelper('truncate', (str, length) => {
    if (typeof str !== 'string') return '';
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
  });
  
  Handlebars.registerHelper('concat', (...args) => {
    // Последний аргумент - options от Handlebars
    const values = args.slice(0, -1);
    return values.join('');
  });
  
  Handlebars.registerHelper('lookup', (obj, key) => {
    return obj ? obj[key] : undefined;
  });
  
  Handlebars.registerHelper('timestampToDate', (timestamp) => {
    if (!timestamp) return 'Неизвестно';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Ошибка формата';
    }
  });
  
  Handlebars.registerHelper('formatNumber', (num, decimals = 1) => {
    const n = parseFloat(num);
    if (isNaN(n)) return '0';
    return n.toFixed(decimals);
  });
  
  Handlebars.registerHelper('ifCond', function(v1, operator, v2, options) {
    switch (operator) {
      case '==':
        return (v1 == v2) ? options.fn(this) : options.inverse(this);
      case '===':
        return (v1 === v2) ? options.fn(this) : options.inverse(this);
      case '!=':
        return (v1 != v2) ? options.fn(this) : options.inverse(this);
      case '!==':
        return (v1 !== v2) ? options.fn(this) : options.inverse(this);
      case '<':
        return (v1 < v2) ? options.fn(this) : options.inverse(this);
      case '<=':
        return (v1 <= v2) ? options.fn(this) : options.inverse(this);
      case '>':
        return (v1 > v2) ? options.fn(this) : options.inverse(this);
      case '>=':
        return (v1 >= v2) ? options.fn(this) : options.inverse(this);
      case '&&':
        return (v1 && v2) ? options.fn(this) : options.inverse(this);
      case '||':
        return (v1 || v2) ? options.fn(this) : options.inverse(this);
      default:
        return options.inverse(this);
    }
  });
  
  Handlebars.registerHelper('json', function(context) {
    return JSON.stringify(context);
  });
  
  console.log('Shinju Sanity System | Handlebars helpers зарегистрированы');
  // Хелпер для проверки содержит ли массив элемент
Handlebars.registerHelper('contains', function(array, value) {
  if (!Array.isArray(array)) return false;
  return array.includes(value);
});

// Хелпер для длины массива
Handlebars.registerHelper('length', function(array) {
  if (!array) return 0;
  return Array.isArray(array) ? array.length : 0;
});

// Хелпер для сравнения больше чем
Handlebars.registerHelper('gt', function(a, b) {
  return Number(a) > Number(b);
});

// Хелпер для сравнения меньше чем
Handlebars.registerHelper('lt', function(a, b) {
  return Number(a) < Number(b);
});

// Хелпер для получения элемента из объекта по ключу
Handlebars.registerHelper('lookup', function(obj, key) {
  return obj ? obj[key] : undefined;
});

// Хелпер для объединения строк
Handlebars.registerHelper('concat', function() {
  const args = Array.prototype.slice.call(arguments, 0, -1);
  return args.join('');
});

// Хелпер для сложения
Handlebars.registerHelper('add', function(a, b) {
  return Number(a) + Number(b);
});

// Хелпер для вычитания
Handlebars.registerHelper('subtract', function(a, b) {
  return Number(a) - Number(b);
});

// Хелпер для умножения
Handlebars.registerHelper('multiply', function(a, b) {
  return Number(a) * Number(b);
});

// Хелпер для деления
Handlebars.registerHelper('divide', function(a, b) {
  if (b === 0) return 0;
  return Number(a) / Number(b);
});

// Хелпер для округления
Handlebars.registerHelper('round', function(number, precision = 0) {
  const n = parseFloat(number);
  if (isNaN(n)) return 0;
  const factor = Math.pow(10, precision);
  return Math.round(n * factor) / factor;
});

// Хелпер для получения описания стресса
Handlebars.registerHelper('getCurrentStressDescription', function(stressLevel) {
  const descriptions = {
    1: { name: "Стабильное состояние", description: "Персонаж чувствует себя нормально, рассудок в порядке." },
    2: { name: "Легкое напряжение", description: "Первые признаки стресса, легкая тревожность." },
    3: { name: "Средний стресс", description: "Заметное психическое напряжение, проблемы со сном." },
    4: { name: "Сильное напряжение", description: "Серьезные психические проблемы, требуется помощь." },
    5: { name: "Критический уровень", description: "Предел психических возможностей, риск полного срыва." }
  };
  return descriptions[stressLevel] || descriptions[1];
});
// Хелпер для получения общей статистики по уровню
Handlebars.registerHelper('getTierTotalStats', function(stats, tier) {
  const psychosisKey = `tier${tier}Psychoses`;
  const inspirationKey = `tier${tier}Inspirations`;
  const psychosisCount = stats[psychosisKey] || 0;
  const inspirationCount = stats[inspirationKey] || 0;
  return psychosisCount + inspirationCount;
});

// Хелпер для получения статистики психозов по уровню
Handlebars.registerHelper('getTierPsychosisStats', function(stats, tier) {
  const key = `tier${tier}Psychoses`;
  return stats[key] || 0;
});

// Хелпер для получения статистики воодушевлений по уровню
Handlebars.registerHelper('getTierInspirationStats', function(stats, tier) {
  const key = `tier${tier}Inspirations`;
  return stats[key] || 0;
});

// Хелпер для проверки видимости уровня
Handlebars.registerHelper('isTierVisible', function(currentTier, tier) {
  return currentTier === 'all' || currentTier == tier;
});
// Хелпер для проверки условия (для unless)
Handlebars.registerHelper('unless', function(condition, options) {
  if (!condition) {
    return options.fn(this);
  }
  return options.inverse(this);
});
Handlebars.registerHelper('getStressDescriptionName', function(stressLevel) {
  const descriptions = {
    1: "Стабильное состояние",
    2: "Легкое напряжение", 
    3: "Средний стресс",
    4: "Сильное напряжение",
    5: "Критический уровень"
  };
  return descriptions[stressLevel] || descriptions[1];
});

// Хелпер для получения текста описания стресса
Handlebars.registerHelper('getStressDescriptionText', function(stressLevel) {
  const descriptions = {
    1: "Персонаж чувствует себя нормально, рассудок в порядке.",
    2: "Первые признаки стресса, легкая тревожность.",
    3: "Заметное психическое напряжение, проблемы со сном.",
    4: "Серьезные психические проблемы, требуется помощь.",
    5: "Предел психических возможностей, риск полного срыва."
  };
  return descriptions[stressLevel] || descriptions[1];
});
// Хелпер для получения иконки мозга по уровню стресса
Handlebars.registerHelper('getStressIcon', function(stressLevel) {
  const icons = {
    1: 'brain',          // Зеленый - норма
    2: 'brain',          // Желтый - можно добавить модификатор
    3: 'brain',          // Оранжевый
    4: 'brain',          // Красный
    5: 'brain'           // Фиолетовый
  };
  return icons[stressLevel] || 'brain';
});

// Хелпер для получения описания стресса по уровню
Handlebars.registerHelper('getStressDescription', function(stressLevel) {
  const descriptions = {
    0: { 
      name: "Нормальное состояние", 
      description: "Персонаж в норме, рассудок стабилен.",
      color: "#3498db",
      icon: "smile"
    },
    1: { 
      name: "Легкое напряжение", 
      description: "Первые признаки стресса, легкая тревожность.",
      color: "#2ecc71",
      icon: "meh"
    },
    2: { 
      name: "Средний стресс", 
      description: "Заметное психическое напряжение, проблемы со сном.",
      color: "#f1c40f", 
      icon: "frown"
    },
    3: { 
      name: "Сильное напряжение", 
      description: "Серьезные психические проблемы, требуется помощь.",
      color: "#e67e22",
      icon: "tired"
    },
    4: { 
      name: "Критический уровень", 
      description: "Предел психических возможностей, риск полного срыва.",
      color: "#e74c3c",
      icon: "dizzy"
    },
    5: { 
      name: "Экстремальный стресс", 
      description: "Максимальный уровень, есть шанс сбросить на уровень ниже.",
      color: "#9b59b6",
      icon: "skull"
    }
  };
  
  return descriptions[stressLevel] || descriptions[0];
});

// Хелпер для получения иконки уровня стресса
Handlebars.registerHelper('getStressIcon', function(stressLevel) {
  const icons = ['smile', 'meh', 'frown', 'tired', 'dizzy', 'skull'];
  return icons[stressLevel] || 'smile';
});

// Хелпер для проверки 0 уровня
Handlebars.registerHelper('isLevelZero', function(stressLevel) {
  return stressLevel === 0;
});// Хелпер для проверки, что массив пуст
Handlebars.registerHelper('isEmpty', function(array) {
  return !array || array.length === 0;
});

// Хелпер для форматирования процента
Handlebars.registerHelper('formatPercent', function(value) {
  if (value === 0 || value === null || value === undefined) return '-';
  return `${Math.round(value)}%`;
});

// Хелпер для получения класса уровня стресса
Handlebars.registerHelper('stressClass', function(stressLevel) {
  return `stress-${stressLevel}`;
});

// Хелпер для получения описания состояния
Handlebars.registerHelper('getConditionType', function(type) {
  return type === 'psychosis' ? 'Психоз' : 'Воодушевление';
});

// Хелпер для получения иконки состояния
Handlebars.registerHelper('getConditionIcon', function(type) {
  return type === 'psychosis' ? 'skull' : 'sparkles';
});

// Хелпер для сокращения текста
Handlebars.registerHelper('shorten', function(str, length) {
  if (!str || str.length <= length) return str;
  return str.substring(0, length) + '...';
});

// Хелпер для проверки равенства
Handlebars.registerHelper('isEqual', function(v1, v2) {
  return v1 === v2;
});

console.log('Shinju Sanity System | Все Handlebars helpers зарегистрированы');
}