import { assignWildStats, assignBattleStats, assignAverageStats } from './scripts/generatorLogic.js';

Hooks.once("init", () => {
    console.log("Iniciando modulo de prueba");

    // Регистрация настроек модуля
    game.settings.register("GaxxelPkRoleGenerator", "randomizeGender", {
        name: "GAXXGENERATOR.Settings.RandomizeGenderName",
        hint: "GAXXGENERATOR.Settings.RandomizeGenderHint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("GaxxelPkRoleGenerator", "randomizeNature", {
        name: "GAXXGENERATOR.Settings.RandomizeNatureName",
        hint: "GAXXGENERATOR.Settings.RandomizeNatureHint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });
});

const RANGES_DATA = {
    starter: { attr: 0, social: 0, skill: 5, skillMax: 1, nameKey: "GAXXGENERATOR.RankStarter" },
    rookie: { attr: 2, social: 2, skill: 10, skillMax: 2, nameKey: "GAXXGENERATOR.RankRookie" },
    standard: { attr: 4, social: 4, skill: 14, skillMax: 3, nameKey: "GAXXGENERATOR.RankStandard" },
    advanced: { attr: 6, social: 6, skill: 17, skillMax: 4, nameKey: "GAXXGENERATOR.RankAdvanced" },
    expert: { attr: 8, social: 8, skill: 19, skillMax: 5, nameKey: "GAXXGENERATOR.RankExpert" },
    ace: { attr: 10, social: 10, skill: 20, skillMax: 5, nameKey: "GAXXGENERATOR.RankAce" }
};

const GENERATION_TYPES = {
    wild: { nameKey: "GAXXGENERATOR.GenerationTypeWild" },
    battle: { nameKey: "GAXXGENERATOR.GenerationTypeBattle" },
    average: { nameKey: "GAXXGENERATOR.GenerationTypeAverage" }
};

const COMBAT_BIAS_TYPES = {
    tank: { nameKey: "GAXXGENERATOR.CombatBiasTank" },
    physical: { nameKey: "GAXXGENERATOR.CombatBiasPhysical" },
    special: { nameKey: "GAXXGENERATOR.CombatBiasSpecial" }
};

const GENDERS = ["male", "female"];
const NATURES = ["hardy", "lonely", "brave", "adamant", "naughty",
                 "bold", "docile", "relaxed", "impish", "lax",
                 "timid", "hasty", "serious", "jolly", "naive",
                 "modest", "mild", "quiet", "bashful", "rash",
                 "calm", "gentle", "sassy", "careful", "quirky"];

Hooks.on("renderActorDirectory", (app, element, data) => {
    if (!game.user.isGM) return;
    
    const headerActions = element.querySelector('.header-actions.action-buttons.flexrow');

    if (headerActions) {
        const jHeaderActions = $(headerActions);

        const newButtonHtml = `
            <button type="button" class="my-custom-actor-button" data-action="myCustomAction" title="${game.i18n.localize("GAXXGENERATOR.GeneratePokemon")}">
                <i class="fas fa-magic"></i>
                <span>${game.i18n.localize("GAXXGENERATOR.GeneratePokemon")}</span>
            </button>
        `;

        jHeaderActions.append(newButtonHtml);
        jHeaderActions.off('click', '.my-custom-actor-button');
        jHeaderActions.on('click', '.my-custom-actor-button', (event) => {
            event.preventDefault();
            new PokemonGeneratorApp().render({ force: true });
        });
    }
});

class PokemonGeneratorApp extends foundry.applications.api.HandlebarsApplicationMixin(
    foundry.applications.api.ApplicationV2
) {
    constructor(options = {}) {
        super(options);
        this.#droppedActor = null;
        this.#dragDropHandler = null;
        this.#selectedRange = "starter";
        this.#selectedGenType = "wild";
        this.#selectedCombatBias = "tank";
        this._onGenerateBound = this._onGenerate.bind(this);
    }

    static DEFAULT_OPTIONS = {
        id: "pokemon-generator-app",
        tag: "div",
        window: {
            title: "GAXXGENERATOR.ActorProcessingMenuTitle",
            icon: "fas fa-magic",
            resizable: false,
        },
        classes: ["pokemon-generator-window"],
        position: {
            width: 400,
            height: "auto"
        }
    };

    static PARTS = {
        content: {
            template: "modules/GaxxelPkRoleGenerator/templates/pokemon-generator.hbs"
        },
        footer: {
            template: "modules/GaxxelPkRoleGenerator/templates/pokemon-generator-footer.hbs"
        }
    };

    #droppedActor;
    #dragDropHandler;
    #selectedRange;
    #selectedGenType;
    #selectedCombatBias;
    _onGenerateBound;

    _prepareContext() {
        const ranges = Object.entries(RANGES_DATA).map(([key, data]) => ({
            key,
            nameKey: data.nameKey,
            selected: key === this.#selectedRange
        }));
        const generationTypes = Object.entries(GENERATION_TYPES).map(([key, data]) => ({
            key,
            nameKey: data.nameKey,
            selected: key === this.#selectedGenType
        }));
        const combatBiasTypes = Object.entries(COMBAT_BIAS_TYPES).map(([key, data]) => ({
            key,
            nameKey: data.nameKey,
            selected: key === this.#selectedCombatBias
        }));
        return {
            ranges,
            generationTypes,
            combatBiasTypes,
            droppedActor: this.#droppedActor,
            showCombatBias: this.#selectedGenType === 'battle',
            i18n: (key) => game.i18n.localize(key)
        };
    }

    _onRender(context, options) {
        super._onRender(context, options);
        this.#activateListeners(this.element);
    }

    #activateListeners(html) {
        if (!this.#dragDropHandler) {
            this.#dragDropHandler = new foundry.applications.ux.DragDrop({
                dropSelector: ".custom-drop-zone",
                callbacks: {
                    drop: this._onDrop.bind(this),
                    dragover: (event) => {
                        const target = event.target.closest(".custom-drop-zone");
                        if (target) target.style.backgroundColor = "#4a4a4a";
                    },
                    dragleave: (event) => {
                        const target = event.target.closest(".custom-drop-zone");
                        if (target) target.style.backgroundColor = "#2a2a2a";
                    }
                }
            });
        }
        this.#dragDropHandler.bind(this.element);

        const closeBtn = html.querySelector('[data-action="close"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        const generateBtn = html.querySelector('[data-action="generate"]');
        if (generateBtn) {
            generateBtn.removeEventListener('click', this._onGenerateBound);
            generateBtn.addEventListener('click', this._onGenerateBound);
        }

        const selectEl = html.querySelector('[name="range"]');
        if (selectEl) {
            selectEl.addEventListener('change', (event) => {
                this.#selectedRange = event.target.value;
            });
            selectEl.value = this.#selectedRange;
        }

        const genTypeEl = html.querySelector('[name="generationType"]');
        const combatBiasContainer = html.querySelector('.combat-bias-container');
        if (genTypeEl) {
            genTypeEl.addEventListener('change', (event) => {
                this.#selectedGenType = event.target.value;
                // Показываем/скрываем контейнер боевого уклона
                if (combatBiasContainer) {
                    combatBiasContainer.style.display = this.#selectedGenType === 'battle' ? 'block' : 'none';
                }
            });
            genTypeEl.value = this.#selectedGenType;
            // Инициализация видимости
            if (combatBiasContainer) {
                combatBiasContainer.style.display = this.#selectedGenType === 'battle' ? 'block' : 'none';
            }
        }

        const combatBiasEl = html.querySelector('[name="combatBias"]');
        if (combatBiasEl) {
            combatBiasEl.addEventListener('change', (event) => {
                this.#selectedCombatBias = event.target.value;
            });
            combatBiasEl.value = this.#selectedCombatBias;
        }
    }

    async _onDrop(event) {
        event.preventDefault();
        const target = event.target.closest(".custom-drop-zone");
        if (target) target.style.backgroundColor = "#2a2a2a";

        let dragData = null;
        try {
            dragData = JSON.parse(event.dataTransfer.getData("text/plain"));
        } catch (e) {
            return;
        }

        let droppedActor = null;
        if (dragData.type === "Actor" && dragData.uuid) {
            droppedActor = await fromUuid(dragData.uuid);
        } else if (dragData.tokenId) {
            const token = canvas.tokens.get(dragData.tokenId);
            droppedActor = token ? token.actor : null;
        }

        if (droppedActor) {
            this.#droppedActor = droppedActor;
            this.render({ parts: ["content"] });
        } else {
            ui.notifications.warn(game.i18n.localize("GAXXGENERATOR.InvalidActorWarning"));
        }
    }

    async _onGenerate(event) {
        event.preventDefault();
        
        if (!this.#droppedActor) {
            ui.notifications.warn(game.i18n.localize("GAXXGENERATOR.NoActorDraggedWarning"));
            return;
        }

        const selectedRangeKey = this.#selectedRange;
        const selectedGenType = this.#selectedGenType;
        const selectedCombatBias = this.#selectedCombatBias;

        const rangeData = RANGES_DATA[selectedRangeKey];
        if (!rangeData) {
            ui.notifications.error(game.i18n.localize("GAXXGENERATOR.InvalidRangeError"));
            return;
        }

        const randomizeGender = game.settings.get("GaxxelPkRoleGenerator", "randomizeGender");
        const randomizeNature = game.settings.get("GaxxelPkRoleGenerator", "randomizeNature");

        let actorDataToImport = this.#droppedActor.toObject();
        actorDataToImport.name = game.i18n.format("GAXXGENERATOR.WildPokemonName", {
            rank: game.i18n.localize(rangeData.nameKey),
            name: actorDataToImport.name
        });

        if (actorDataToImport.system) {
            if (randomizeGender) {
                actorDataToImport.system.gender = GENDERS[Math.floor(Math.random() * GENDERS.length)];
            } else {
                actorDataToImport.system.gender = this.#droppedActor.system.gender || "genderless";
            }

            if (randomizeNature) {
                actorDataToImport.system.personality = NATURES[Math.floor(Math.random() * NATURES.length)];
            } else {
                actorDataToImport.system.personality = this.#droppedActor.system.personality || "hardy";
            }

            actorDataToImport.system.rank = selectedRangeKey;
            
            // Обновление максимальных значений навыков
            if (actorDataToImport.system.skills) {
                Object.keys(actorDataToImport.system.skills).forEach(skillKey => {
                    actorDataToImport.system.skills[skillKey].max = rangeData.skillMax;
                });
            }

            const attrPoints = rangeData.attr;
            const socPoints = rangeData.social;
            const skillPoints = rangeData.skill;
            const skillMax = rangeData.skillMax;

            if (selectedGenType === 'wild') {
                assignWildStats(actorDataToImport.system.attributes, actorDataToImport.system.social, actorDataToImport.system.skills, attrPoints, socPoints, skillPoints, skillMax);
            } else if (selectedGenType === 'battle') {
                assignBattleStats(actorDataToImport.system.attributes, actorDataToImport.system.social, actorDataToImport.system.skills, attrPoints, socPoints, skillPoints, skillMax, selectedCombatBias);
            } else if (selectedGenType === 'average') {
                assignAverageStats(actorDataToImport.system.attributes, actorDataToImport.system.social, actorDataToImport.system.skills, attrPoints, socPoints, skillPoints, skillMax);
            }
        }

        const importedActor = await Actor.create(actorDataToImport);
        
        const container = this.element.querySelector(".actor-display-container");
        if (container) {
            container.innerHTML = `
                <div style="padding: 10px; border: 1px solid #4CAF50; margin-top: 10px; background-color: #1e1e1e; color: #ddd;">
                    <strong>${game.i18n.format("GAXXGENERATOR.ActorImportedSuccess", { name: importedActor.name })}</strong><br>
                    ${game.i18n.localize("GAXXGENERATOR.RangeLabel")}: ${game.i18n.localize(rangeData.nameKey)}<br>
                    ${game.i18n.localize("GAXXGENERATOR.GenerationTypeLabel")}: ${game.i18n.localize(GENERATION_TYPES[selectedGenType].nameKey)}${selectedGenType === 'battle' ? ` (${game.i18n.localize(COMBAT_BIAS_TYPES[selectedCombatBias].nameKey)})` : ''}
                </div>
            `;
        }
    }
}