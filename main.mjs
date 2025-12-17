Hooks.once("init", () => {
    console.log("Iniciando modulo de prueba");
});

let tempDroppedActorData = null; // Variable temporal para almacenar datos del actor arrastrado

// Добавляем ключи локализации для рангов
const RANGES_DATA = {
    starter: { attr: 0, social: 0, skill: 5, skillMax: 1, name: "Starter" },
    rookie: { attr: 2, social: 2, skill: 10, skillMax: 2, name: "Rookie" },
    standard: { attr: 4, social: 4, skill: 14, skillMax: 3, name: "Standard" },
    advance: { attr: 6, social: 6, skill: 17, skillMax: 4, name: "Advanced" },
    expert: { attr: 8, social: 8, skill: 19, skillMax: 5, name: "Expert" },
    ace: { attr: 10, social: 10, skill: 20, skillMax: 5, name: "Ace" } 
};

const GENDERS = ["male", "female", "genderless"];
const NATURES = ["hardy", "lonely", "brave", "adamant", "naughty",
                 "bold", "docile", "relaxed", "impish", "lax",
                 "timid", "hasty", "serious", "jolly", "naive",
                 "modest", "mild", "quiet", "bashful", "rash",
                 "calm", "gentle", "sassy", "careful", "quirky"];

Hooks.on("renderActorDirectory", (app, element, data) => {
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
            openPokemonGenerator();
        });
    }
});

async function openPokemonGenerator(actor){
    tempDroppedActorData = null; 

    // Генерируем опции с локализованными названиями рангов
    const rangeOptions = `
        <option value="starter">${game.i18n.localize(RANGES_DATA.starter.nameKey)}</option>
        <option value="rookie">${game.i18n.localize(RANGES_DATA.rookie.nameKey)}</option>
        <option value="standard">${game.i18n.localize(RANGES_DATA.standard.nameKey)}</option>
        <option value="advanced">${game.i18n.localize(RANGES_DATA.advanced.nameKey)}</option>
        <option value="expert">${game.i18n.localize(RANGES_DATA.expert.nameKey)}</option>
        <option value="ace">${game.i18n.localize(RANGES_DATA.ace.nameKey)}</option>
    `;

    const dialogContent = `
        <div class="custom-drag-and-drop-container">
            <div style="margin-bottom: 10px;">
                <label for="pokemon-range-selector">${game.i18n.localize("GAXXGENERATOR.SelectTheRank")}:</label>
                <select id="pokemon-range-selector" style="width: 100%; padding: 5px;">
                    ${rangeOptions}
                </select>
            </div>
            <div class="custom-drop-zone" style="border: 2px dashed #ccc; padding: 20px; text-align: center; margin: 10px; background-color: #f9f9f9;">
                ${game.i18n.localize("GAXXGENERATOR.DragAnActorOrToken")}
            </div>
            <div class="actor-display-container">
                ${game.i18n.localize("GAXXGENERATOR.ReleasedActorWillAppear")}
            </div>
        </div>
    `;

    new Dialog({
        title: game.i18n.localize("GAXXGENERATOR.ActorProcessingMenuTitle"),
        content: dialogContent,
        buttons: {
            generate: {
                label: game.i18n.localize("GAXXGENERATOR.GenerateAndCreateButton"),
                icon: "<i class='fas fa-dice'></i>",
                callback: (html) => {
                    generateAndImportActor(undefined, html);
                }
            },
            close: {
                label: game.i18n.localize("GAXXGENERATOR.CloseButton"),
                icon: "<i class='fas fa-times'></i>",
            }
        },
        render: (html) => {
            const dropZone = html.find(".custom-drop-zone");
            dropZone.on("dragover", (event) => {
                event.preventDefault(); dropZone.css("background-color", "#e9e9e9");
            });
            dropZone.on("dragleave", (event) => {
                dropZone.css("background-color", "#f9f9f9");
            });
            dropZone.on("drop", async (event) => {
                event.preventDefault(); dropZone.css("background-color", "#f9f9f9");
                const dragData = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
                let droppedActor = null;
                if (dragData.type === "Actor" && dragData.uuid) {
                    droppedActor = await fromUuid(dragData.uuid);
                } else if (dragData.tokenId) {
                    const token = canvas.tokens.get(dragData.tokenId);
                    droppedActor = token ? token.actor : null;
                }
                if (droppedActor) {
                    handleActorDrop(undefined, droppedActor, html);
                } else {
                    ui.notifications.warn(game.i18n.localize("GAXXGENERATOR.InvalidActorWarning"));
                }
            });
        },
        default: "close"
    }).render(true);
}

async function generateAndImportActor(sourceActor, dialogHtml) {
    if (!tempDroppedActorData) {
        ui.notifications.warn(game.i18n.localize("GAXXGENERATOR.NoActorDraggedWarning"));
        return;
    }
    const rangeSelector = dialogHtml.find('#pokemon-range-selector');
    const selectedRangeKey = rangeSelector.val();
    const rangeData = RANGES_DATA[selectedRangeKey];

    const randomIndex = getRandomInt(0, GENDERS.length - 1);
    const randomGender = GENDERS[randomIndex];
    const randomNatureIndex = getRandomInt(0, NATURES.length - 1);
    const randomNature = NATURES[randomNatureIndex];

    if (!rangeData) {
        ui.notifications.error(game.i18n.localize("GAXXGENERATOR.InvalidRangeError"));
        return;
    }

    let actorDataToImport = foundry.utils.deepClone(tempDroppedActorData);
    actorDataToImport.name = game.i18n.format("GAXXGENERATOR.WildPokemonName", {
        rank: game.i18n.localize(rangeData.nameKey),
        name: actorDataToImport.name
    });

    if (actorDataToImport.system) {
        actorDataToImport.system.gender = randomGender;
        actorDataToImport.system.personality = randomNature;

        actorDataToImport.system.rank = selectedRangeKey;
        if (actorDataToImport.system.skills) {
             Object.keys(actorDataToImport.system.skills).forEach(skillKey => {
                 actorDataToImport.system.skills[skillKey].max = rangeData.skillMax;
             });
        }

        distributePoints(actorDataToImport.system.attributes, rangeData.attr, 999); 
        distributePoints(actorDataToImport.system.social, rangeData.social, 5); 
        distributePoints(actorDataToImport.system.skills, rangeData.skill, rangeData.skillMax); 
    } else {
        console.warn("Estructura 'system' no encontrada en los datos del actor.");
    }

    const importedActor = await Actor.create(actorDataToImport);

    const actorContainer = dialogHtml.find(".actor-display-container");
    const resultHTML = `
        <div style="padding: 10px; border: 1px solid #4CAF50; margin-top: 10px; background-color: white;">
            <strong>${game.i18n.format("GAXXGENERATOR.ActorImportedSuccess", { name: importedActor.name })}</strong><br>
            ${game.i18n.localize("GAXXGENERATOR.RangeLabel")}: ${game.i18n.localize(rangeData.nameKey)}
        </div>
    `;
    actorContainer.html(resultHTML);
    tempDroppedActorData = null;
}

function handleActorDrop(sourceActor, droppedActor, dialogHtml) {
    tempDroppedActorData = droppedActor.toObject();
    console.log("Ruta system.rank:", droppedActor.system.rank);

    const actorContainer = dialogHtml.find(".actor-display-container");
    const actorHTML = `
        <div class="dropped-actor-card" style="display: flex; align-items: center; padding: 10px; border: 1px solid #ccc; margin-top: 10px; background-color: white;">
            <img src="${droppedActor.img}" style="width: 50px; height: 50px; margin-right: 10px;"/>
            <div>
                <strong>${droppedActor.name}</strong><br>
                <span>${game.i18n.localize("GAXXGENERATOR.ReadyToGenerateText")}</span>
            </div>
        </div>
    `;
    actorContainer.html(actorHTML);
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function distributePoints(attributesObject, pointsToDistribute, maxRankLimit) {
    const keys = Object.keys(attributesObject);
    let remainingPoints = pointsToDistribute;

    while (remainingPoints > 0) {
        const randomKey = keys[getRandomInt(0, keys.length - 1)];
        const currentVal = attributesObject[randomKey].value;
        const pokemonMax = attributesObject[randomKey].max || 999; 

        if (currentVal < maxRankLimit && currentVal < pokemonMax) {
            attributesObject[randomKey].value += 1;
            remainingPoints -= 1;
        } else if (keys.every(k => attributesObject[k].value >= maxRankLimit || attributesObject[k].value >= attributesObject[k].max)) {
            console.warn(game.i18n.localize("GAXXGENERATOR.PointsDistributionWarning"));
            break;
        }
    }
}