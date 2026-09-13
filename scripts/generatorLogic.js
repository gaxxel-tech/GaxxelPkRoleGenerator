// Ключи боевых атрибутов
const COMBAT_ATTRIBUTES = ['strength', 'dexterity', 'vitality', 'special', 'insight'];

// Ключи социальных атрибутов
const SOCIAL_ATTRIBUTES = ['tough', 'cool', 'beauty', 'clever', 'cute'];

// Базовые боевые навыки, общие для всех боевых уклонов
const BASE_COMBAT_SKILLS = ['clash', 'evasion'];

function getRandomArrayItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Вспомогательная функция для безопасного получения максимума
function getMax(attrObj, defaultMax = 999) {
    return attrObj?.max ?? defaultMax;
}

/**
 * Генерация типа "Wild" (Дикий) — полностью случайное распределение очков.
 */
export function assignWildStats(attributes, social, skills, attrPoints, socPoints, skillPoints, skillMax) {
    // Боевые атрибуты
    let remaining = attrPoints;
    while (remaining > 0) {
        const key = getRandomArrayItem(COMBAT_ATTRIBUTES);
        const attr = attributes[key];
        if (attr && attr.value < getMax(attr)) {
            attr.value++;
            remaining--;
        } else {
            // Если все атрибуты достигли максимума – выходим
            if (COMBAT_ATTRIBUTES.every(k => !attributes[k] || attributes[k].value >= getMax(attributes[k]))) {
                break;
            }
        }
    }

    // Социальные атрибуты
    remaining = socPoints;
    while (remaining > 0) {
        const key = getRandomArrayItem(SOCIAL_ATTRIBUTES);
        const soc = social[key];
        if (soc && soc.value < getMax(soc, 5)) {
            soc.value++;
            remaining--;
        } else {
            if (SOCIAL_ATTRIBUTES.every(k => !social[k] || social[k].value >= getMax(social[k], 5))) {
                break;
            }
        }
    }

    // Навыки
    remaining = skillPoints;
    const skillKeys = Object.keys(skills);
    while (remaining > 0) {
        const key = getRandomArrayItem(skillKeys);
        if (skills[key].value < skillMax) {
            skills[key].value++;
            remaining--;
        } else if (skillKeys.every(k => skills[k].value >= skillMax)) {
            break;
        }
    }
}

/**
 * Генерация типа "Battle" (Боевой) — упор на боевые характеристики с учётом уклона.
 * @param {string} combatBias - 'tank', 'physical', 'special'
 */
export function assignBattleStats(attributes, social, skills, attrPoints, socPoints, skillPoints, skillMax, combatBias) {
    // 1. Определяем приоритетные и исключаемые атрибуты
    let priorityAttrs = [];
    let excludedAttrs = [];
    if (combatBias === 'tank') {
        priorityAttrs = ['vitality', 'insight'];
        excludedAttrs = [];
    } else if (combatBias === 'physical') {
        priorityAttrs = ['strength'];
        excludedAttrs = ['special'];
    } else if (combatBias === 'special') {
        priorityAttrs = ['special'];
        excludedAttrs = ['strength'];
    } else {
        priorityAttrs = COMBAT_ATTRIBUTES;
        excludedAttrs = [];
    }

    // Доступные атрибуты (не исключённые)
    let availableAttrs = COMBAT_ATTRIBUTES.filter(attr => !excludedAttrs.includes(attr));
    if (availableAttrs.length === 0) availableAttrs = COMBAT_ATTRIBUTES;

    // Приоритетные атрибуты, которые есть в attributes и не исключены
    let priorityAvailable = priorityAttrs.filter(attr => !excludedAttrs.includes(attr) && attributes[attr]);
    if (priorityAvailable.length === 0) priorityAvailable = availableAttrs;

    // Распределяем 70% очков на приоритетные
    let priorityPoints = Math.floor(attrPoints * 0.7);
    let remaining = attrPoints;

    let tempRemaining = priorityPoints;
    while (tempRemaining > 0) {
        const key = getRandomArrayItem(priorityAvailable);
        const attr = attributes[key];
        if (attr && attr.value < getMax(attr)) {
            attr.value++;
            tempRemaining--;
            remaining--;
        } else {
            // Если этот атрибут достиг максимума, убираем его из списка
            priorityAvailable = priorityAvailable.filter(k => k !== key);
            if (priorityAvailable.length === 0) break;
        }
    }

    // Оставшиеся очки распределяем по всем доступным атрибутам
    let availableForRemaining = availableAttrs.filter(attr => attributes[attr]);
    while (remaining > 0) {
        const key = getRandomArrayItem(availableForRemaining);
        const attr = attributes[key];
        if (attr && attr.value < getMax(attr)) {
            attr.value++;
            remaining--;
        } else {
            availableForRemaining = availableForRemaining.filter(k => k !== key);
            if (availableForRemaining.length === 0) break;
        }
    }

    // Социальные атрибуты — случайно (с учётом максимума)
    remaining = socPoints;
    // Создаём копию SOCIAL_ATTRIBUTES для удаления достигших максимума
    let socialAvailable = [...SOCIAL_ATTRIBUTES];
    while (remaining > 0) {
        const key = getRandomArrayItem(socialAvailable);
        const soc = social[key];
        if (soc && soc.value < getMax(soc, 5)) {
            soc.value++;
            remaining--;
        } else {
            socialAvailable = socialAvailable.filter(k => k !== key);
            if (socialAvailable.length === 0) break;
        }
    }

    // 2. Навыки: определяем приоритетные и исключаемые
    let prioritySkills = [...BASE_COMBAT_SKILLS];
    let excludedSkills = [];
    if (combatBias === 'tank') {
        prioritySkills.push('brawl', 'channel');
        excludedSkills = [];
    } else if (combatBias === 'physical') {
        prioritySkills.push('brawl');
        excludedSkills = ['channel'];
    } else if (combatBias === 'special') {
        prioritySkills.push('channel');
        excludedSkills = ['brawl'];
    }

    const allSkillKeys = Object.keys(skills);
    let availableSkills = allSkillKeys.filter(skill => !excludedSkills.includes(skill));
    if (availableSkills.length === 0) availableSkills = allSkillKeys;

    let prioritySkillAvailable = prioritySkills.filter(skill => !excludedSkills.includes(skill) && skills[skill]);
    if (prioritySkillAvailable.length === 0) prioritySkillAvailable = availableSkills;

    const skillPriorityPoints = Math.floor(skillPoints * 0.7);
    let skillRemaining = skillPoints;
    let tempSkillRemaining = skillPriorityPoints;

    while (tempSkillRemaining > 0) {
        const key = getRandomArrayItem(prioritySkillAvailable);
        const sk = skills[key];
        if (sk && sk.value < skillMax) {
            sk.value++;
            tempSkillRemaining--;
            skillRemaining--;
        } else {
            prioritySkillAvailable = prioritySkillAvailable.filter(k => k !== key);
            if (prioritySkillAvailable.length === 0) break;
        }
    }

    let skillAvailableForRemaining = availableSkills.filter(skill => skills[skill]);
    while (skillRemaining > 0) {
        const key = getRandomArrayItem(skillAvailableForRemaining);
        const sk = skills[key];
        if (sk && sk.value < skillMax) {
            sk.value++;
            skillRemaining--;
        } else {
            skillAvailableForRemaining = skillAvailableForRemaining.filter(k => k !== key);
            if (skillAvailableForRemaining.length === 0) break;
        }
    }
}

/**
 * Генерация типа "Average" (Сбалансированный) — равномерное распределение.
 */
export function assignAverageStats(attributes, social, skills, attrPoints, socPoints, skillPoints, skillMax) {
    // Боевые атрибуты равномерно
    let remaining = attrPoints;
    let index = 0;
    while (remaining > 0) {
        const key = COMBAT_ATTRIBUTES[index % COMBAT_ATTRIBUTES.length];
        const attr = attributes[key];
        if (attr && attr.value < getMax(attr)) {
            attr.value++;
            remaining--;
        }
        index++;
        if (index > 1000) break; // защита от бесконечного цикла
    }

    // Социальные атрибуты равномерно
    remaining = socPoints;
    index = 0;
    while (remaining > 0) {
        const key = SOCIAL_ATTRIBUTES[index % SOCIAL_ATTRIBUTES.length];
        const soc = social[key];
        if (soc && soc.value < getMax(soc, 5)) {
            soc.value++;
            remaining--;
        }
        index++;
        if (index > 1000) break;
    }

    // Навыки равномерно
    const skillKeys = Object.keys(skills);
    remaining = skillPoints;
    index = 0;
    while (remaining > 0) {
        const key = skillKeys[index % skillKeys.length];
        if (skills[key].value < skillMax) {
            skills[key].value++;
            remaining--;
        }
        index++;
        if (index > 1000) break;
    }
}