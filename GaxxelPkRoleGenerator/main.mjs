Hooks.once("init", () => {
    console.log("Iniciando modulo de prueba");
});

let tempDroppedActorData = null; // Variable temporal para almacenar datos del actor arrastrado


const RANGES_DATA = {
    starter: { attr: 0, social: 0, skill: 5, skillMax: 1, name: "Starter" },
    rookie: { attr: 2, social: 2, skill: 10, skillMax: 2, name: "Rookie" },
    standard: { attr: 4, social: 4, skill: 14, skillMax: 3, name: "Standard" },
    advance: { attr: 6, social: 6, skill: 17, skillMax: 4, name: "Advance" },
    expert: { attr: 8, social: 8, skill: 19, skillMax: 5, name: "Expert" },
    ace: { attr: 10, social: 10, skill: 20, skillMax: 5, name: "Ace" } 
};

const GENDERS = ["male", "female"];
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
            <button type="button" class="my-custom-actor-button" data-action="myCustomAction" title="Generar Pokemon Salvaje">
                <i class="fas fa-magic"></i>
                <span>Generar Pokemon</span>
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




//la funcion para generar el pokemon
async function openPokemonGenerator(actor){
    tempDroppedActorData = null; 

    const dialogContent = `
        <div class="custom-drag-and-drop-container">
            <div style="margin-bottom: 10px;">
                <label for="pokemon-range-selector">Selecciona el Rango:</label>
                <select id="pokemon-range-selector" style="width: 100%; padding: 5px;">
                    <option value="starter">${RANGES_DATA.starter.name}</option>
                    <option value="rookie">${RANGES_DATA.rookie.name}</option>
                    <option value="standard">${RANGES_DATA.standard.name}</option>
                    <option value="advance">${RANGES_DATA.advance.name}</option>
                    <option value="expert">${RANGES_DATA.expert.name}</option>
                    <option value="ace">${RANGES_DATA.ace.name}</option> <!-- NUEVA OPCIÓN -->
                </select>
            </div>
            <div class="custom-drop-zone" style="border: 2px dashed #ccc; padding: 20px; text-align: center; margin: 10px; background-color: #f9f9f9;">
                Arrastra un actor o token aquí
            </div>
            <div class="actor-display-container">
                <!-- Aquí aparecerá el actor soltado -->
            </div>
        </div>
    `;

    // ... (El resto del código del diálogo sigue igual) ...
    new Dialog({
        title: "Actor Processing Menu",
        content: dialogContent,
        buttons: {
            generate: {
                label: "Generar y Crear Actor",
                icon: "<i class='fas fa-dice'></i>",
                callback: (html) => {
                    generateAndImportActor(undefined, html);
                }
            },
            close: {
                label: "Cerrar",
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
                    ui.notifications.warn("Lo que has soltado no es un actor o token válido.");
                }
            });
        },
        default: "close"
    }).render(true);
}

//funcion para generar e importar actor con estadisticas aleatorias
async function generateAndImportActor(sourceActor, dialogHtml) {
    if (!tempDroppedActorData) {
        ui.notifications.warn("Por favor, arrastra un actor al menú primero.");
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
        ui.notifications.error("Rango de Pokémon no válido.");
        return;
    }

    let actorDataToImport = foundry.utils.deepClone(tempDroppedActorData);
    actorDataToImport.name = `${rangeData.name} salvaje ${actorDataToImport.name}`;
    

    // --- DISTRIBUCIÓN DE PUNTOS USANDO LAS RUTAS CORRECTAS ---
    if (actorDataToImport.system) {
                // 1. Forzar el límite máximo individual de SKILLS en los datos antes de la distribución

        // ASIGNAR EL GÉNERO ALEATORIO (asumiendo actor.system.gender como ruta)
        actorDataToImport.system.gender = randomGender;
        // ASIGNAR LA NATURALEZA ALEATORIA (asumiendo actor.system.nature como ruta)
        actorDataToImport.system.personality = randomNature;


        actorDataToImport.system.rank = selectedRangeKey; // Aseguramos que el rango esté actualizado
        if (actorDataToImport.system.skills) { // Usamos 'skills' (plural)
             Object.keys(actorDataToImport.system.skills).forEach(skillKey => {
                 // Forzamos el límite máximo del Pokémon ('.max') a ser igual al límite del rango (skillMax)
                 actorDataToImport.system.skills[skillKey].max = rangeData.skillMax;
             });
        }

        

        // 1. Atributos Normales (strength, dexterity, vitality, special, insight)
        // No tienen límite de rango fijo (usamos 999), solo el límite del Pokémon (el .max)
        distributePoints(actorDataToImport.system.attributes, rangeData.attr, 999); 
        
        // 2. Atributos Sociales (Clever, Cute, etc.)
        // Tienen un límite fijo de 5. **AJUSTA 'social' si la ruta no es correcta**
        distributePoints(actorDataToImport.system.social, rangeData.social, 5); 

        // 3. Skills (Brawl, Channel, Medicine, etc.)
        // El límite depende del rango actual (skillMax). **AJUSTA 'skill' si la ruta no es correcta**
        distributePoints(actorDataToImport.system.skills, rangeData.skill, rangeData.skillMax); 
        
    } else {
        console.warn("Estructura 'system' no encontrada en los datos del actor.");
    }
    // ----------------------------

    // 3. Importar el actor modificado
    const importedActor = await Actor.create(actorDataToImport);

    // 4. Actualizar la interfaz del diálogo
    const actorContainer = dialogHtml.find(".actor-display-container");
    const resultHTML = `
        <div style="padding: 10px; border: 1px solid #4CAF50; margin-top: 10px; background-color: white;">
            <strong>¡${importedActor.name} importado!</strong><br>
            Rango: ${rangeData.name}
        </div>
    `;
    actorContainer.html(resultHTML);
    tempDroppedActorData = null;
}

//Funcion que se encarga de manejar el drop del actor
function handleActorDrop(sourceActor, droppedActor, dialogHtml) {
    // Almacenar los datos del actor en la variable temporal global
    tempDroppedActorData = droppedActor.toObject();
    console.log("Ruta system.rank:", droppedActor.system.rank);
    // Actualizar la interfaz para mostrar que un actor ha sido arrastrado
    const actorContainer = dialogHtml.find(".actor-display-container");
    const actorHTML = `
        <div class="dropped-actor-card" style="display: flex; align-items: center; padding: 10px; border: 1px solid #ccc; margin-top: 10px; background-color: white;">
            <img src="${droppedActor.img}" style="width: 50px; height: 50px; margin-right: 10px;"/>
            <div>
                <strong>${droppedActor.name}</strong><br>
                <span>Listo para generar estadísticas aleatorias.</span>
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


// Función para distribuir puntos aleatoriamente, respetando límites (sin cambios)
function distributePoints(attributesObject, pointsToDistribute, maxRankLimit) {
    const keys = Object.keys(attributesObject);
    let remainingPoints = pointsToDistribute;

    // AQUI ESTÁ EL CAMBIO CRUCIAL:
    // No reiniciamos a 0. Mantenemos el valor base existente del Pokémon.
    // keys.forEach(key => { attributesObject[key].value = 0; }); 

    while (remainingPoints > 0) {
        const randomKey = keys[getRandomInt(0, keys.length - 1)];
        const currentVal = attributesObject[randomKey].value;
        const pokemonMax = attributesObject[randomKey].max || 999; 

        // Verificamos si podemos aumentar el valor sin superar el límite de rango Y el límite del pokemon
        if (currentVal < maxRankLimit && currentVal < pokemonMax) {
            attributesObject[randomKey].value += 1;
            remainingPoints -= 1;
        } else if (keys.every(k => attributesObject[k].value >= maxRankLimit || attributesObject[k].value >= attributesObject[k].max)) {
            console.warn(`No se pudieron distribuir todos los puntos para ${keys} (límite ${maxRankLimit} o máximo del Pokémon alcanzado).`);
            break;
        }
    }
}
