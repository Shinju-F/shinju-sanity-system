/**
 * Shinju Sanity System - Оптимизированное ядро системы
 * Актор-ориентированный подход
 */

const MODULE_ID = 'shinju-sanity-system';

class SanityCore {
  constructor() {
    this.cache = new Map();
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return this;
    
    console.log('Sanity Core | Инициализация');
    
    // Проверяем базу данных
    if (!window.ShinjuSanity?.ConditionsDB) {
      console.error('Sanity Core | База данных условий не загружена');
      return this;
    }
    
    if (typeof window.ShinjuSanity.ConditionsDB.getRandomPsychosis !== 'function' ||
        typeof window.ShinjuSanity.ConditionsDB.getRandomInspiration !== 'function') {
      console.error('Sanity Core | Методы базы данных не определены');
      return this;
    }
    
    console.log('Sanity Core | База данных проверена:', {
      psychoses: Object.keys(window.ShinjuSanity.ConditionsDB.psychoses || {}).length,
      inspirations: Object.keys(window.ShinjuSanity.ConditionsDB.inspirations || {}).length
    });
    
    if (game.system?.id !== 'dnd5e') {
      console.warn('Sanity Core | Требуется D&D 5e');
      return this;
    }

    if (!game.settings.get(MODULE_ID, 'enableSystem')) {
      console.log('Sanity Core | Система отключена');
      return this;
    }

    this.initActors();
    this.registerHooks();
    this.initialized = true;
    
    return this;
  }

  // Основные методы
 getActorSanityData(actorId) {
  // Проверяем кэш
  if (this.cache.has(actorId)) {
    return this.cache.get(actorId);
  }
  
  const actor = game.actors.get(actorId);
  if (!actor || !this.isPlayerActor(actor)) {
    return null;
  }
  
  // Получаем данные из флагов
  let data = actor.getFlag(MODULE_ID, 'sanityData');
  
  // Если данных нет, создаем и сохраняем
  if (!data) {
    data = this.calcInitialSanity(actor);
    actor.setFlag(MODULE_ID, 'sanityData', data).catch(console.warn);
  }
  
  // Валидируем данные
  data = this.validateData(data, actor);
  
  // Сохраняем в кэш
  this.cache.set(actorId, data);
  
  return data;
}

  getSanityPercentage(actorId) {
    const data = this.getActorSanityData(actorId);
    return data && data.max > 0 ? (data.current / data.max) * 100 : 0;
  }

  getAllPlayerActors() {
    return game.actors ? Array.from(game.actors.values()).filter(a => this.isPlayerActor(a)) : [];
  }

  isPlayerActor(actor) {
    return actor && actor.hasPlayerOwner;
  }

  async applySanityDamage(actorId, damage, source = "Неизвестно") {
    const actor = game.actors.get(actorId);
    if (!actor) throw new Error(`Актор ${actorId} не найден`);

    const data = this.getActorSanityData(actorId);
    let newValue = Math.max(0, data.current - damage);
    
    const result = { old: data.current, new: newValue, damage, source };
    
    await this.updateData(actorId, { current: newValue });

    if (this.getSanityPercentage(actorId) <= 0) {
      const stressResult = await this.handleZeroSanity(actorId);
      result.stressChange = stressResult;
      
      if (stressResult.newStress > stressResult.oldStress) {
        const condition = await this.applyRandomCondition(actorId, stressResult.newStress);
        result.condition = condition;
      }
    }

    if (game.settings.get(MODULE_ID, 'enableChatMessages')) {
      this.sendDamageMessage(actor, result);
    }

    return result;
  }
async initializeAllActors() {
  const actors = this.getAllPlayerActors();
  const results = [];
  
  for (const actor of actors) {
    try {
      const data = this.ensureData(actor);
      results.push({
        success: true,
        actor: actor.name,
        stressLevel: data.stressLevel,
        sanity: `${data.current}/${data.max}`
      });
    } catch (error) {
      results.push({
        success: false,
        actor: actor.name,
        error: error.message
      });
    }
  }
  
  console.log('Sanity Core | Инициализировано персонажей:', results);
  return results;
}
  /**
   * Применяет случайное состояние (психоз или воодушевление)
   * if (!db) {
      console.error('Sanity Core | База данных условий не загружена');
      return null;
    }

    // Проверяем функции базы данных
    if (typeof db.getRandomPsychosis !== 'function' || typeof db.getRandomInspiration !== 'function') {
      console.error('Sanity Core | Функции базы данных не загружены');
      return null;
    }
   */
  async applyRandomCondition(actorId, stressLevel) {
  const db = window.ShinjuSanity?.ConditionsDB;
  if (!db) return null;

  // Шансы в зависимости от уровня стресса
  let psychosisChance;
  if (stressLevel === 5) {
    psychosisChance = 0.75; // 75% психоз, 25% воодушевление для 5 уровня
  } else {
    psychosisChance = 0.6; // 60% психоз, 40% воодушевление для 1-4 уровней
  }
  
  const isPsychosis = Math.random() < psychosisChance;
  
  const condition = isPsychosis 
    ? db.getRandomPsychosis?.(stressLevel)
    : db.getRandomInspiration?.(stressLevel);

  if (!condition) {
    console.warn(`SanityCore | Не найдено состояние для уровня ${stressLevel}`);
    return null;
  }

  const data = this.getActorSanityData(actorId);
  const conditions = [...(data.activeConditions || []), {
    ...condition,
    appliedAt: Date.now(),
    actorId: actorId,
    stressLevelApplied: stressLevel // Сохраняем уровень стресса при применении
  }];

  await this.updateData(actorId, { activeConditions: conditions });

  if (game.settings.get(MODULE_ID, 'enableChatMessages')) {
    this.sendConditionMessage(actorId, condition);
  }

  return condition;
}

  async restoreSanity(actorId, healing, source = "Неизвестно") {
    const actor = game.actors.get(actorId);
    if (!actor) throw new Error(`Актор ${actorId} не найден`);

    const data = this.getActorSanityData(actorId);
    const newValue = Math.min(data.max, data.current + healing);
    
    const result = { old: data.current, new: newValue, healing, source };
    
    await this.updateData(actorId, { current: newValue });

    if (game.settings.get(MODULE_ID, 'enableChatMessages')) {
      this.sendHealMessage(actor, result);
    }

    return result;
  }

  // Вспомогательные методы
  async ensureData(actor) {
  if (!actor) return null;
  
  // Проверяем кэш
  if (this.cache.has(actor.id)) {
    return this.cache.get(actor.id);
  }

  try {
    // Пытаемся получить существующие данные
    let data = actor.getFlag(MODULE_ID, 'sanityData');
    
    // Если данных нет, создаем новые
    if (!data) {
      console.log(`Sanity Core | Инициализация нового персонажа: ${actor.name}`);
      data = this.calcInitialSanity(actor);
      
      // Сохраняем данные
      await actor.setFlag(MODULE_ID, 'sanityData', data);
      console.log(`Sanity Core | Данные сохранены для ${actor.name}, уровень стресса: ${data.stressLevel}`);
    }
    
    // Валидируем данные
    data = this.validateData(data, actor);
    
    // Сохраняем в кэш
    this.cache.set(actor.id, data);
    
    return data;
    
  } catch (error) {
    console.error(`Sanity Core | Ошибка инициализации данных для ${actor.name}:`, error);
    
    // Возвращаем дефолтные данные в случае ошибки
    const defaultData = this.calcInitialSanity(actor);
    this.cache.set(actor.id, defaultData);
    return defaultData;
  }
}

 calcInitialSanity(actor) {
  const int = actor.system?.abilities?.int?.mod || 0;
  const cha = actor.system?.abilities?.cha?.mod || 0;
  const wis = actor.system?.abilities?.wis?.mod || 0;
  
  const max = Math.max(1, 10 + int + cha + wis);
  
  return {
    current: max,
    max: max,
    stressLevel: 0, // ДОЛЖНО БЫТЬ 0
    stressHistory: [],
    activeConditions: [],
    lastUpdate: Date.now(),
    formula: `10 + ${int} (ИНТ) + ${cha} (ХАР) + ${wis} (МДР) = ${max}`
  };
}

 validateData(data, actor) {
  const defaults = this.calcInitialSanity(actor);
  
  // Гарантируем наличие всех необходимых полей
  const validated = {
    current: Number(data.current) || defaults.current,
    max: Number(data.max) || defaults.max,
    stressLevel: Number(data.stressLevel) || defaults.stressLevel,
    stressHistory: Array.isArray(data.stressHistory) ? data.stressHistory : defaults.stressHistory,
    activeConditions: Array.isArray(data.activeConditions) ? data.activeConditions : defaults.activeConditions,
    lastUpdate: data.lastUpdate || defaults.lastUpdate,
    formula: data.formula || defaults.formula
  };
  
  // Ограничиваем уровень стресса 0-5
  validated.stressLevel = Math.min(5, Math.max(0, validated.stressLevel));
  
  return validated;
}

  async updateData(actorId, update) {
  const actor = game.actors.get(actorId);
  if (!actor) {
    throw new Error(`Актор ${actorId} не найден`);
  }

  // Получаем текущие данные
  let currentData = actor.getFlag(MODULE_ID, 'sanityData');
  if (!currentData) {
    currentData = this.calcInitialSanity(actor);
  }

  // Обновляем данные
  const newData = foundry.utils.mergeObject(currentData, { 
    ...update, 
    lastUpdate: Date.now() 
  });

  // Валидируем
  const validatedData = this.validateData(newData, actor);
  
  // Сохраняем
  await actor.setFlag(MODULE_ID, 'sanityData', validatedData);
  
  // Обновляем кэш
  this.cache.set(actorId, validatedData);
  
  return validatedData;
}

  // Уровни стресса
  // sanity-core.js - ИСПРАВЛЕННАЯ функция handleZeroSanity
async handleZeroSanity(actorId) {
  const data = this.getActorSanityData(actorId);
  const oldLevel = data.stressLevel;
  let newLevel = oldLevel;
  let result = { 
    oldStress: oldLevel, 
    newStress: newLevel,
    condition: null,
    restoredValue: 0
  };

  // Шансы для разных уровней
  const getChances = (level) => {
    if (level === 5) return { psychosis: 0.75, inspiration: 0.25 };
    return { psychosis: 0.6, inspiration: 0.4 };
  };

  // Восстанавливаем до 50% от максимума
  const restoredValue = Math.floor(data.max * 0.5);
  result.restoredValue = restoredValue;

  // 1. СЛУЧАЙ: Текущий уровень 0 - первый стресс
  if (oldLevel === 0) {
    newLevel = 1;
    result.newStress = newLevel;
    
    await this.updateData(actorId, { 
      stressLevel: newLevel, 
      current: restoredValue
    });

    const chances = getChances(1);
    
    await this.addHistory(actorId, {
      from: 0,
      to: 1,
      timestamp: Date.now(),
      reason: `Достигнут 0% рассудка. Первый стресс. Восстановлено до ${restoredValue} (50% от максимума)`,
      psychosisChance: chances.psychosis,
      inspirationChance: chances.inspiration
    });

    // При переходе с 0 на 1 - применяем состояние 1 уровня
    const condition = await this.applyRandomCondition(actorId, 1);
    result.condition = condition;
    
    return result;
  }
  
  // 2. СЛУЧАЙ: Текущий уровень 1-4 - повышаем уровень
  if (oldLevel >= 1 && oldLevel < 5) {
    newLevel = oldLevel + 1;
    result.newStress = newLevel;
    
    await this.updateData(actorId, { 
      stressLevel: newLevel, 
      current: restoredValue
    });

    // ВАЖНО: При переходе с 1 на 2 применяем состояние 2 уровня
    // При переходе с 2 на 3 применяем состояние 3 уровня и т.д.
    const conditionLevel = newLevel; // Состояние = НОВОМУ уровню стресса
    const chances = getChances(newLevel);
    
    await this.addHistory(actorId, {
      from: oldLevel,
      to: newLevel,
      timestamp: Date.now(),
      reason: `Достигнут 0% рассудка. Повышен уровень стресса. Восстановлено до ${restoredValue} (50% от максимума)`,
      psychosisChance: chances.psychosis,
      inspirationChance: chances.inspiration
    });

    // Применяем состояние СООТВЕТСТВУЮЩЕГО уровня стресса
    const condition = await this.applyRandomCondition(actorId, conditionLevel);
    result.condition = condition;
    
    return result;
  }
  
  // 3. СЛУЧАЙ: Текущий уровень 5 - возможен сброс
  if (oldLevel === 5) {
    // 50% шанс сбросить на уровень 4
    if (Math.random() < 0.5) {
      newLevel = 4;
      result.newStress = newLevel;
      
      await this.updateData(actorId, { 
        stressLevel: newLevel, 
        current: restoredValue
      });

      const chances = getChances(4);
      
      await this.addHistory(actorId, {
        from: 5,
        to: 4,
        timestamp: Date.now(),
        reason: `Достигнут 0% рассудка. Сброс с 5 уровня! Восстановлено до ${restoredValue} (50% от максимума)`,
        psychosisChance: chances.psychosis,
        inspirationChance: chances.inspiration
      });

      // При сбросе с 5 на 4 применяем состояние 4 уровня
      const condition = await this.applyRandomCondition(actorId, 4);
      result.condition = condition;
      
      return result;
    } 
    // 50% шанс остаться на 5 уровне
    else {
      newLevel = 5; // Остаемся на 5
      result.newStress = newLevel;
      
      await this.updateData(actorId, { 
        current: restoredValue
      });

      const chances = getChances(5);
      
      await this.addHistory(actorId, {
        from: 5,
        to: 5,
        timestamp: Date.now(),
        reason: `Достигнут 0% рассудка. Критическое состояние сохраняется. Восстановлено до ${restoredValue} (50% от максимума)`,
        psychosisChance: chances.psychosis,
        inspirationChance: chances.inspiration
      });

      // При повторном достижении 0% на 5 уровне применяем состояние 5 уровня
      const condition = await this.applyRandomCondition(actorId, 5);
      result.condition = condition;
      
      return result;
    }
  }

  // На всякий случай - fallback
  console.warn(`SanityCore | Неизвестный уровень стресса: ${oldLevel}`);
  await this.updateData(actorId, { current: restoredValue });
  
  return result;
}

  // sanity-core.js - ИСПРАВЛЕННАЯ функция addHistory
async addHistory(actorId, entry) {
    const actor = game.actors.get(actorId);
    if (!actor) return;
    
    // Получаем актуальные данные напрямую из флагов
    const currentData = actor.getFlag(MODULE_ID, 'sanityData');
    if (!currentData) return;
    
    // Инициализируем историю если ее нет
    if (!Array.isArray(currentData.stressHistory)) {
      currentData.stressHistory = [];
    }
    
    // Добавляем новую запись
    currentData.stressHistory.push({
      ...entry,
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    
    // Ограничиваем размер истории (последние 50 записей)
    if (currentData.stressHistory.length > 50) {
      currentData.stressHistory = currentData.stressHistory.slice(-50);
    }
    
    // Обновляем только историю
    await actor.setFlag(MODULE_ID, 'sanityData', {
      ...currentData,
      lastUpdate: Date.now()
    });
    
    // ОЧИЩАЕМ КЭШ - это критически важно!
    this.cache.delete(actorId);
    
    console.log(`Sanity Core | История обновлена для ${actor.name}, записей: ${currentData.stressHistory.length}`);
  }

  async removeCondition(actorId, conditionId) {
    const data = this.getActorSanityData(actorId);
    const conditions = (data.activeConditions || []).filter(c => c.id !== conditionId);
    await this.updateData(actorId, { activeConditions: conditions });
  }

  // Массовые операции
  async resetAllSanity() {
    const actors = this.getAllPlayerActors();
    const results = [];

    for (const actor of actors) {
      const data = this.getActorSanityData(actor.id);
      if (data) {
        await this.updateData(actor.id, { current: data.max });
        results.push({ actor: actor.name, restored: data.max });
      }
    }

    return results;
  }

  /**
 * Сбрасывает уровень стресса персонажа (исправленная версия)
 * @param {string} actorId - ID актора
 * @param {number} level - Новый уровень стресса (0-5)
 * @returns {Promise<Object>} Результат сброса
 */
async resetStressLevel(actorId, level = 0) {
  const actor = game.actors.get(actorId);
  if (!actor) throw new Error(`Актор ${actorId} не найден`);
  
  // Получаем текущие данные
  const data = this.getActorSanityData(actorId);
  if (!data) {
    throw new Error(`Данные рассудка для актора ${actorId} не найдены`);
  }
  
  // Ограничиваем уровень 0-5
  const newLevel = Math.min(5, Math.max(0, level));
  
  // Создаем запись истории
  const historyEntry = {
    from: data.stressLevel,
    to: newLevel,
    timestamp: Date.now(),
    reason: "Ваш уровень стресса снизился. Вы чувствуете облегчение",
    psychosisChance: 0,
    inspirationChance: 0
  };
  
  // Подготавливаем новые данные
  const newData = {
    stressLevel: newLevel,
    current: data.max, // Полное восстановление рассудка
    activeConditions: [], // Очищаем все активные состояния
    lastUpdate: Date.now()
  };
  
  // Получаем текущие данные актора (не из кэша)
  let currentData = actor.getFlag(MODULE_ID, 'sanityData');
  if (!currentData) {
    // Если данных нет, создаем начальные
    currentData = this.calcInitialSanity(actor);
  }
  
  // Инициализируем историю, если её нет
  if (!Array.isArray(currentData.stressHistory)) {
    currentData.stressHistory = [];
  }
  
  // Добавляем новую запись в историю
  currentData.stressHistory.push(historyEntry);
  
  // Ограничиваем размер истории
  if (currentData.stressHistory.length > 50) {
    currentData.stressHistory = currentData.stressHistory.slice(-50);
  }
  
  // Объединяем изменения с текущими данными
  const finalData = foundry.utils.mergeObject(currentData, newData);
  
  // Сохраняем данные
  await actor.setFlag(MODULE_ID, 'sanityData', finalData);
  
  // Обновляем кэш
  this.cache.set(actorId, finalData);
  
  // Отправляем сообщение в чат
  if (game.settings.get(MODULE_ID, 'enableChatMessages')) {
    const html = `
      <div class="sanity-chat-message reset">
        <div class="sanity-message-header">
          <i class="fas fa-redo"></i>
          <h3>Сброс уровня стресса</h3>
        </div>
        <div class="sanity-message-content">
          <p class="message-main-text">
            <strong>${actor.name}</strong>: уровень стресса сброшен ${data.stressLevel} → ${newLevel}
          </p>
          <p class="message-source">Рассудок восстановлен до максимума</p>
        </div>
      </div>
    `;
    
    ChatMessage.create({ 
      content: html, 
      speaker: { actor: actor.id },
      style: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }
  
  return { 
    actorId: actorId,
    actorName: actor.name,
    oldLevel: data.stressLevel, 
    newLevel: newLevel,
    sanityRestored: data.max,
    conditionsRemoved: data.activeConditions?.length || 0
  };
}

  // Сообщения
  sendDamageMessage(actor, result) {
  const html = `
    <div class="sanity-chat-message damage">
      <div class="sanity-message-header">
        <i class="fas fa-skull"></i>
        <h3>Урон рассудку</h3>
      </div>
      <div class="sanity-message-content">
        <p class="message-main-text">
          <strong>${actor.name}</strong>: ${result.old} → ${result.new} (-${result.damage})
        </p>
        <p class="message-source">${result.source}</p>
      </div>
    </div>
  `;
  
  ChatMessage.create({ 
  content: html, 
  speaker: { actor: actor.id },
  style: CONST.CHAT_MESSAGE_STYLES.OTHER  // ЗАМЕНИЛИ type на style
});
}

  sendHealMessage(actor, result) {
  const html = `
    <div class="sanity-chat-message healing">
      <div class="sanity-message-header">
        <i class="fas fa-heart"></i>
        <h3>Восстановление рассудка</h3>
      </div>
      <div class="sanity-message-content">
        <p class="message-main-text">
          <strong>${actor.name}</strong>: ${result.old} → ${result.new} (+${result.healing})
        </p>
        <p class="message-source">${result.source}</p>
      </div>
    </div>
  `;
  
  ChatMessage.create({ 
  content: html, 
  speaker: { actor: actor.id },
  style: CONST.CHAT_MESSAGE_STYLES.OTHER  // ЗАМЕНИЛИ type на style
});
}

  sendConditionMessage(actorId, condition) {
    try {
      const actor = game.actors.get(actorId);
      if (!actor) {
        console.error(`Sanity Core | Актор ${actorId} не найден для отправки сообщения`);
        return;
      }

      const type = condition.type === 'psychosis' ? 'Психоз' : 'Воодушевление';
      const icon = condition.type === 'psychosis' ? 'skull' : 'sparkles';
      
      const html = `
        <div class="sanity-chat-message ${condition.type}">
          <div class="sanity-message-header">
            <i class="fas fa-${icon}"></i>
            <h3>${type}</h3>
          </div>
          <div class="sanity-message-content">
            <p class="message-main-text">
              <strong>${actor.name}</strong> получает <strong>${condition.name}</strong>
            </p>
            <p class="message-secondary-text">
              ${condition.description || 'Нет описания'}
            </p>
            <div class="condition-details-message">
              <p><i class="fas fa-theater-masks"></i> Обсудите с мастером проявления этого состояния</p>
            </div>
          </div>
        </div>
      `;
      
      ChatMessage.create({ 
  content: html, 
  speaker: { actor: actor.id },
  style: CONST.CHAT_MESSAGE_STYLES.OTHER  // ЗАМЕНИЛИ type на style
});
      
    } catch (error) {
      console.error('Sanity Core | Ошибка в sendConditionMessage:', error);
    }
  }

  // Инициализация
  initActors() {
  if (!game.actors) {
    setTimeout(() => this.initActors(), 1000);
    return;
  }

  console.log(`Sanity Core | Инициализация персонажей...`);
  
  const playerActors = this.getAllPlayerActors();
  console.log(`Sanity Core | Найдено ${playerActors.length} игровых персонажей`);
  
  playerActors.forEach(actor => {
    try {
      const data = this.ensureData(actor);
      console.log(`Sanity Core | ${actor.name}: уровень стресса = ${data.stressLevel}, рассудок = ${data.current}/${data.max}`);
    } catch (e) {
      console.warn(`Ошибка инициализации ${actor.name}:`, e);
    }
  });
  }

  registerHooks() {
  Hooks.on('updateActor', (actor, data, options, userId) => {
    if (this.isPlayerActor(actor)) {
      this.cache.delete(actor.id);
      // Принудительно инициализируем данные, если их нет
      setTimeout(() => {
        try {
          this.ensureData(actor);
        } catch (e) {
          console.warn(`Ошибка обновления данных ${actor.name}:`, e);
        }
      }, 100);
    }
  });

  Hooks.on('createActor', (actor, data, options, userId) => {
    if (this.isPlayerActor(actor)) {
      console.log(`Sanity Core | Инициализация нового персонажа: ${actor.name}`);
      // Даем время на полное создание актора
      setTimeout(() => {
        try {
          this.ensureData(actor);
          console.log(`Sanity Core | Персонаж ${actor.name} инициализирован с уровнем стресса 0`);
        } catch (e) {
          console.warn(`Ошибка инициализации ${actor.name}:`, e);
        }
      }, 1000);
    }
  });

  // Также слушаем назначение персонажа игроку
  Hooks.on('updateUser', (user, data, options, userId) => {
    if (data.character && game.actors) {
      const actor = game.actors.get(data.character);
      if (actor && this.isPlayerActor(actor)) {
        setTimeout(() => {
          this.ensureData(actor);
        }, 500);
      }
    }
  });

  // Инициализация при загрузке мира
  Hooks.on('ready', () => {
    this.initActors();
  });
}

  clearCache() {
    this.cache.clear();
  }
}

// Экспорт
window.ShinjuSanity = window.ShinjuSanity || {};
window.ShinjuSanity.Core = new SanityCore();