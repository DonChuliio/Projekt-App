// js/recipes/recipes.js

import { SUPABASE_URL, SUPABASE_KEY } from "../config/supabase.js";
import { getValidAccessToken } from "../auth/auth.js";
import {
    loadRecipes,
    createRecipe,
    updateRecipe,
    deleteRecipe
} from "../data/recipes-data.js?v=1.54";

let recipes = [];
let initialized = false;

function removeRecipeDialogs() {
    document.getElementById("recipe-action-dialog")?.remove();
    document.getElementById("recipe-editor-dialog")?.remove();
    document.getElementById("recipe-view-dialog")?.remove();
    document.getElementById("recipe-export-dialog")?.remove();
}

function createOverlay(id) {
    const overlay = document.createElement("div");
    overlay.id = id;
    overlay.className = "packlist-dialog-overlay";
    overlay.addEventListener("click", event => {
        if (event.target === overlay) overlay.remove();
    });
    return overlay;
}

function createDialog(extraClass = "") {
    const dialog = document.createElement("div");
    dialog.className = `packlist-dialog recipe-dialog ${extraClass}`.trim();
    return dialog;
}

function ingredientLines(value) {
    return value
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean);
}

async function createBringExport(name, items) {
    const token = await getValidAccessToken();

    const response = await fetch(`${SUPABASE_URL}/rest/v1/bring_exports`, {
        method: "POST",
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        },
        body: JSON.stringify({ name, items })
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    const row = (await response.json())[0];
    if (!row?.id) {
        throw new Error("Keine Export-ID erhalten.");
    }

    return row.id;
}

function renderRecipeList() {
    const list = document.getElementById("recipes-list");
    if (!list) return;
    list.innerHTML = "";
    const query = (document.getElementById("recipe-search")?.value || "")
        .trim().toLocaleLowerCase("de");
    const filtered = recipes.filter(recipe => [
        recipe.name,
        ...(Array.isArray(recipe.ingredients) ? recipe.ingredients : []),
        recipe.description
    ].join("\n").toLocaleLowerCase("de").includes(query));

        if (!filtered.length) {
            const empty = document.createElement("p");
            empty.className = "recipes-empty";
            empty.textContent = recipes.length
                ? "Keine passenden Rezepte gefunden."
                : "Noch keine Rezepte.";
            list.appendChild(empty);
            return;
        }

        for (const recipe of filtered) {
            const card = document.createElement("div");
            card.className = "recipe-card";
            card.tabIndex = 0;
            card.setAttribute("role", "button");

            const info = document.createElement("div");
            const name = document.createElement("strong");
            name.textContent = recipe.name;

            const count = document.createElement("small");
            const total = Array.isArray(recipe.ingredients)
                ? recipe.ingredients.length
                : 0;
            count.textContent = `${total} ${total === 1 ? "Zutat" : "Zutaten"}`;

            info.append(name, count);
            card.appendChild(info);

            const open = () => openRecipeMenu(recipe);
            card.addEventListener("click", open);
            card.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    open();
                }
            });

            list.appendChild(card);
        }

}

export async function renderRecipes() {
    const list = document.getElementById("recipes-list");
    if (!list) return;

    list.innerHTML = "";

    try {
        recipes = await loadRecipes();

        renderRecipeList();
    } catch (error) {
        console.error("Rezepte konnten nicht geladen werden:", error);
        const message = document.createElement("p");
        message.className = "recipes-empty";
        message.textContent = "Rezepte konnten nicht geladen werden.";
        list.appendChild(message);
    }
}

function openRecipeMenu(recipe) {
    removeRecipeDialogs();

    const overlay = createOverlay("recipe-action-dialog");
    const dialog = createDialog();

    const title = document.createElement("h3");
    title.textContent = recipe.name;

    const text = document.createElement("p");
    text.textContent = "Was möchtest du machen?";

    const view = document.createElement("button");
    view.type = "button";
    view.textContent = "Anzeigen";
    view.onclick = () => openRecipeView(recipe);

    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Bearbeiten";
    edit.onclick = () => openRecipeEditor(recipe);

    const bring = document.createElement("button");
    bring.type = "button";
    bring.textContent = "An Bring! exportieren";
    bring.onclick = () => openRecipeExport(recipe);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "recipe-delete";
    remove.textContent = "Rezept löschen";
    remove.onclick = async () => {
        if (!confirm("Rezept wirklich löschen?")) return;

        remove.disabled = true;
        try {
            await deleteRecipe(recipe.id);
            overlay.remove();
            await renderRecipes();
        } catch (error) {
            console.error("Rezept konnte nicht gelöscht werden:", error);
            alert("Das Rezept konnte nicht gelöscht werden.");
            remove.disabled = false;
        }
    };

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "packlist-dialog-cancel";
    cancel.textContent = "Abbrechen";
    cancel.onclick = () => overlay.remove();

    dialog.append(title, text, view, edit, bring, remove, cancel);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
}

function openRecipeView(recipe) {
    removeRecipeDialogs();

    const overlay = createOverlay("recipe-view-dialog");
    const dialog = createDialog();

    const title = document.createElement("h3");
    title.textContent = recipe.name;

    const ingredientsSection = document.createElement("section");
    ingredientsSection.className = "recipe-view-section";
    const ingredientsTitle = document.createElement("h4");
    ingredientsTitle.textContent = "Zutaten";

    const ingredients = document.createElement("ul");
    ingredients.className = "recipe-view-list";
    for (const item of recipe.ingredients || []) {
        const li = document.createElement("li");
        li.textContent = item;
        ingredients.appendChild(li);
    }
    ingredientsSection.append(ingredientsTitle, ingredients);

    const descriptionSection = document.createElement("section");
    descriptionSection.className = "recipe-view-section";
    const descriptionTitle = document.createElement("h4");
    descriptionTitle.textContent = "Beschreibung";
    const description = document.createElement("p");
    description.className = "recipe-view-description";
    description.textContent = recipe.description?.trim() || "Keine Beschreibung.";
    descriptionSection.append(descriptionTitle, description);

    const close = document.createElement("button");
    close.type = "button";
    close.className = "packlist-dialog-cancel";
    close.textContent = "Schließen";
    close.onclick = () => overlay.remove();

    dialog.append(title, ingredientsSection, descriptionSection, close);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
}

function openRecipeEditor(recipe = null) {
    removeRecipeDialogs();

    const overlay = createOverlay("recipe-editor-dialog");
    const dialog = createDialog();

    const title = document.createElement("h3");
    title.textContent = recipe ? "Rezept bearbeiten" : "Neues Rezept";

    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Rezeptname";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "z. B. Tomatensuppe";
    nameInput.value = recipe?.name || "";

    const ingredientsLabel = document.createElement("label");
    ingredientsLabel.textContent = "Zutaten – eine Zutat pro Zeile";
    const ingredientsInput = document.createElement("textarea");
    ingredientsInput.className = "recipe-ingredients-input";
    ingredientsInput.placeholder = "500 g Tomaten\n1 Zwiebel\n200 ml Sahne";
    ingredientsInput.value = Array.isArray(recipe?.ingredients)
        ? recipe.ingredients.join("\n")
        : "";

    const descriptionLabel = document.createElement("label");
    descriptionLabel.textContent = "Beschreibung";
    const descriptionInput = document.createElement("textarea");
    descriptionInput.className = "recipe-description-input";
    descriptionInput.placeholder = "Zubereitung, Hinweise oder eigene Notizen...";
    descriptionInput.value = recipe?.description || "";

    const save = document.createElement("button");
    save.type = "button";
    save.textContent = "Speichern";
    save.onclick = async () => {
        const name = nameInput.value.trim();
        const ingredients = ingredientLines(ingredientsInput.value);

        if (!name) {
            alert("Bitte einen Rezeptnamen eingeben.");
            nameInput.focus();
            return;
        }

        save.disabled = true;
        save.textContent = "Wird gespeichert...";

        const payload = {
            name,
            ingredients,
            description: descriptionInput.value
        };

        try {
            if (recipe) {
                await updateRecipe(recipe.id, payload);
            } else {
                await createRecipe(payload);
            }

            overlay.remove();
            await renderRecipes();
        } catch (error) {
            console.error("Rezept konnte nicht gespeichert werden:", error);
            alert("Das Rezept konnte nicht gespeichert werden.");
            save.disabled = false;
            save.textContent = "Speichern";
        }
    };

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "packlist-dialog-cancel";
    cancel.textContent = "Abbrechen";
    cancel.onclick = () => overlay.remove();

    dialog.append(
        title,
        nameLabel,
        nameInput,
        ingredientsLabel,
        ingredientsInput,
        descriptionLabel,
        descriptionInput,
        save,
        cancel
    );

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => nameInput.focus());
}

function openRecipeExport(recipe) {
    removeRecipeDialogs();

    const items = (recipe.ingredients || [])
        .map(item => String(item).trim())
        .filter(Boolean);

    if (!items.length) {
        alert("Dieses Rezept enthält noch keine Zutaten.");
        return;
    }

    const overlay = createOverlay("recipe-export-dialog");
    const dialog = createDialog("packlist-export-dialog");

    const title = document.createElement("h3");
    title.textContent = "An Bring! exportieren";

    const text = document.createElement("p");
    text.textContent = "Wähle aus, welche Zutaten an Bring! übergeben werden sollen.";

    const section = document.createElement("section");
    section.className = "packlist-export-bucket recipe-export-list";

    const checks = [];
    for (const item of items) {
        const row = document.createElement("label");
        row.className = "packlist-export-item";

        const check = document.createElement("input");
        check.type = "checkbox";
        check.checked = true;
        check.dataset.itemText = item;

        const label = document.createElement("span");
        label.textContent = item;

        row.append(check, label);
        section.appendChild(row);
        checks.push(check);
    }

    const count = document.createElement("span");
    count.className = "packlist-export-count";

    const updateCount = () => {
        const selected = checks.filter(check => check.checked).length;
        count.textContent = `${selected} von ${items.length} Zutaten ausgewählt`;
    };
    checks.forEach(check => check.addEventListener("change", updateCount));

    const actions = document.createElement("div");
    actions.className = "packlist-export-actions";

    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.textContent = "Auswahl bestätigen";
    confirm.onclick = async () => {
        const selected = checks
            .filter(check => check.checked)
            .map(check => check.dataset.itemText)
            .filter(Boolean);

        if (!selected.length) {
            alert("Bitte mindestens eine Zutat auswählen.");
            return;
        }

        confirm.disabled = true;
        confirm.textContent = "Export wird vorbereitet...";

        try {
            const id = await createBringExport(recipe.name, selected);
            window.location.href =
                `https://dock-woad.vercel.app/api/bring-export?id=${encodeURIComponent(id)}`;
        } catch (error) {
            console.error("Bring!-Export fehlgeschlagen:", error);
            alert("Der Bring!-Export konnte nicht vorbereitet werden.");
            confirm.disabled = false;
            confirm.textContent = "Auswahl bestätigen";
        }
    };

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "packlist-dialog-cancel";
    cancel.textContent = "Abbrechen";
    cancel.onclick = () => overlay.remove();

    actions.append(count, confirm, cancel);
    dialog.append(title, text, section, actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    updateCount();
}

export function initRecipes() {
    if (initialized) return;
    initialized = true;

    document
        .getElementById("recipe-search")
        ?.addEventListener("input", renderRecipeList);

    document
        .getElementById("recipe-add")
        ?.addEventListener("click", () => openRecipeEditor());

    document
        .querySelector('[data-tile="red-folder"]')
        ?.addEventListener("click", () => {
            window.setTimeout(renderRecipes, 130);
        });

    renderRecipes();
}
