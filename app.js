import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, IMGBB_API_KEY } from "./firebase-config.js";

const state = {
  recipes: [],
  filteredRecipes: [],
  selectedRecipeId: null,
  editingRecipeId: null,
  activeView: "home",
  searchQuery: "",
  activeTag: "Alle",
  uploadedImageUrl: "",
  uploadInProgress: false,
  detailPortions: 1,
};

const refs = {};

document.addEventListener("DOMContentLoaded", () => {
  refs.pageTitle = document.getElementById("pageTitle");
  refs.homeView = document.getElementById("homeView");
  refs.searchView = document.getElementById("searchView");
  refs.formView = document.getElementById("formView");
  refs.detailView = document.getElementById("detailView");
  refs.homeCards = document.getElementById("homeCards");
  refs.searchCards = document.getElementById("searchCards");
  refs.searchInput = document.getElementById("searchInput");
  refs.tagFilters = document.getElementById("tagFilters");
  refs.detailContent = document.getElementById("detailContent");
  refs.toastContainer = document.getElementById("toastContainer");
  refs.recipeForm = document.getElementById("recipeForm");
  refs.formTitleText = document.getElementById("formTitleText");
  refs.recipeTitle = document.getElementById("recipeTitle");
  refs.prepTime = document.getElementById("prepTime");
  refs.totalTime = document.getElementById("totalTime");
  refs.servings = document.getElementById("servings");
  refs.ingredientRows = document.getElementById("ingredientRows");
  refs.recipeInstructions = document.getElementById("recipeInstructions");
  refs.recipeImageUrl = document.getElementById("recipeImageUrl");
  refs.recipeImageFile = document.getElementById("recipeImageFile");
  refs.uploadStatus = document.getElementById("uploadStatus");
  refs.recipeTags = document.getElementById("recipeTags");
  refs.deleteRecipeButton = document.getElementById("deleteRecipeButton");

  bindEvents();
  registerServiceWorker();
  renderIngredientRows();
  subscribeToRecipes();
  renderTagFilters();
  showView("home");
});

function bindEvents() {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.nav;
      if (view === "form") {
        openForm();
        return;
      }
      showView(view);
    });
  });

  document.getElementById("addRecipeButton").addEventListener("click", () => openForm());
  document.getElementById("backFromForm").addEventListener("click", () => {
    state.editingRecipeId = null;
    showView("home");
  });

  refs.searchInput.addEventListener("input", (event) => {
    state.searchQuery = event.target.value.trim();
    applyFilters();
  });

  document.getElementById("addIngredientRow").addEventListener("click", () => {
    const rows = getIngredientRows();
    rows.push({ name: "", amount: "", unit: "" });
    renderIngredientRows(rows);
  });

  refs.recipeForm.addEventListener("submit", handleRecipeSubmit);
  refs.recipeImageFile.addEventListener("change", handleImageUpload);
  refs.deleteRecipeButton.addEventListener("click", () => {
    if (!state.editingRecipeId) return;
    deleteRecipe(state.editingRecipeId);
  });
}

function subscribeToRecipes() {
  const recipesQuery = query(collection(db, "recipes"), orderBy("createdAt", "desc"));

  onSnapshot(
    recipesQuery,
    (snapshot) => {
      state.recipes = snapshot.docs.map((documentSnapshot) => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data(),
      }));
      applyFilters();

      if (state.selectedRecipeId) {
        const selected = state.recipes.find((recipe) => recipe.id === state.selectedRecipeId);
        if (selected) {
          renderDetail(selected);
        }
      }
    },
    (error) => {
      console.error("Firestore error:", error);
      showToast("Fehler beim Laden der Rezepte. Bitte erneut versuchen.", "error");
    }
  );
}

function applyFilters() {
  const queryText = state.searchQuery.toLowerCase();
  let results = [...state.recipes];

  if (state.activeTag && state.activeTag !== "Alle") {
    results = results.filter((recipe) =>
      (recipe.tags || []).some((tag) => tag.toLowerCase() === state.activeTag.toLowerCase())
    );
  }

  if (queryText) {
    results = results.filter((recipe) => {
      const searchableText = [
        recipe.title,
        recipe.instructions,
        ...(recipe.ingredients || []).map((ingredient) => ingredient.name),
        ...(recipe.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(queryText);
    });
  }

  state.filteredRecipes = results;
  renderHomeCards();
  renderSearchCards();
  renderTagFilters();
}

function renderTagFilters() {
  const tags = ["Alle", ...new Set(state.recipes.flatMap((recipe) => recipe.tags || []))];

  refs.tagFilters.innerHTML = tags
    .map(
      (tag) => `
        <button
          type="button"
          data-tag="${escapeHtml(tag)}"
          class="rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            state.activeTag === tag
              ? "border-amber-500 bg-amber-100 text-amber-700"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
          }"
        >
          ${escapeHtml(tag)}
        </button>
      `
    )
    .join("");

  refs.tagFilters.querySelectorAll("[data-tag]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextTag = button.dataset.tag;
      state.activeTag = nextTag;
      applyFilters();
    });
  });
}

function renderHomeCards() {
  if (!state.filteredRecipes.length) {
    refs.homeCards.innerHTML = emptyStateMarkup("Noch keine passenden Rezepte gefunden.");
    return;
  }

  refs.homeCards.innerHTML = state.filteredRecipes
    .map(
      (recipe) => `
        <article data-id="${recipe.id}" class="recipe-card group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <img src="${recipe.imageUrl || defaultRecipeImage()}" alt="${escapeHtml(recipe.title)}" class="h-44 w-full object-cover" />
          <div class="space-y-3 p-4">
            <div class="flex items-start justify-between gap-3">
              <h3 class="text-lg font-bold text-slate-900">${escapeHtml(recipe.title)}</h3>
              <span class="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">${recipe.servings || 1} Port.</span>
            </div>
            <div class="flex items-center gap-2 text-xs text-slate-500">
              <span class="rounded-full bg-slate-100 px-2 py-1">⏱ ${recipe.totalTimeMinutes || recipe.prepTimeMinutes || 0} min</span>
              <span class="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">${recipe.ingredients?.length || 0} Zutaten</span>
            </div>
            <div class="flex flex-wrap gap-2">
              ${(recipe.tags || []).slice(0, 3).map((tag) => `<span class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">${escapeHtml(tag)}</span>`).join("")}
            </div>
          </div>
        </article>
      `
    )
    .join("");

  refs.homeCards.querySelectorAll(".recipe-card").forEach((card) => {
    card.addEventListener("click", () => openRecipeDetail(card.dataset.id));
  });
}

function renderSearchCards() {
  if (!state.filteredRecipes.length) {
    refs.searchCards.innerHTML = emptyStateMarkup("Keine Ergebnisse für deine Suche.");
    return;
  }

  refs.searchCards.innerHTML = state.filteredRecipes
    .map(
      (recipe) => `
        <article data-id="${recipe.id}" class="recipe-card cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div class="flex gap-3 p-3">
            <img src="${recipe.imageUrl || defaultRecipeImage()}" alt="${escapeHtml(recipe.title)}" class="h-20 w-20 rounded-xl object-cover" />
            <div class="min-w-0 flex-1">
              <h3 class="truncate text-base font-bold text-slate-900">${escapeHtml(recipe.title)}</h3>
              <p class="mt-1 text-xs text-slate-500">${recipe.totalTimeMinutes || recipe.prepTimeMinutes || 0} min • ${recipe.servings || 1} Portionen</p>
              <div class="mt-2 flex flex-wrap gap-1">
                ${(recipe.tags || []).slice(0, 2).map((tag) => `<span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">${escapeHtml(tag)}</span>`).join("")}
              </div>
            </div>
          </div>
        </article>
      `
    )
    .join("");

  refs.searchCards.querySelectorAll(".recipe-card").forEach((card) => {
    card.addEventListener("click", () => openRecipeDetail(card.dataset.id));
  });
}

function showView(viewName) {
  state.activeView = viewName;
  refs.pageTitle.textContent =
    viewName === "home"
      ? "Rezepte"
      : viewName === "search"
        ? "Suche"
        : viewName === "form"
          ? "Rezept"
          : "Details";

  refs.homeView.classList.toggle("hidden", viewName !== "home");
  refs.searchView.classList.toggle("hidden", viewName !== "search");
  refs.formView.classList.toggle("hidden", viewName !== "form");
  refs.detailView.classList.toggle("hidden", viewName !== "detail");

  document.querySelectorAll(".nav-button").forEach((button) => {
    const isActive = button.dataset.nav === viewName;
    button.classList.toggle("bg-amber-100", isActive);
    button.classList.toggle("text-amber-700", isActive);
  });
}

function openForm(recipeId = null) {
  state.editingRecipeId = recipeId;
  state.uploadedImageUrl = "";
  refs.uploadStatus.textContent = "";
  refs.recipeForm.reset();
  refs.formTitleText.textContent = recipeId ? "Rezept bearbeiten" : "Neues Rezept";
  refs.deleteRecipeButton.classList.toggle("hidden", !recipeId);

  if (recipeId) {
    const recipe = state.recipes.find((item) => item.id === recipeId);
    if (!recipe) return;
    refs.recipeTitle.value = recipe.title || "";
    refs.prepTime.value = recipe.prepTimeMinutes || 0;
    refs.totalTime.value = recipe.totalTimeMinutes || 0;
    refs.servings.value = recipe.servings || 1;
    refs.recipeInstructions.value = recipe.instructions || "";
    refs.recipeImageUrl.value = recipe.imageUrl || "";
    refs.recipeTags.value = (recipe.tags || []).join(", ");
    renderIngredientRows(recipe.ingredients || [{ name: "", amount: "", unit: "" }]);
    state.uploadedImageUrl = recipe.imageUrl || "";
  } else {
    refs.recipeImageUrl.value = "";
    renderIngredientRows();
  }

  showView("form");
}

function renderIngredientRows(rows = [{ name: "", amount: "", unit: "" }]) {
  refs.ingredientRows.innerHTML = rows
    .map(
      (ingredient, index) => `
        <div class="ingredient-row grid grid-cols-[1.2fr_0.7fr_0.7fr_auto] gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
          <input data-field="name" data-index="${index}" value="${escapeAttribute(ingredient.name || "")}" placeholder="Zutat" class="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200" />
          <input data-field="amount" data-index="${index}" type="number" min="0" step="0.25" value="${ingredient.amount ?? ""}" placeholder="Menge" class="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200" />
          <input data-field="unit" data-index="${index}" value="${escapeAttribute(ingredient.unit || "")}" placeholder="Einheit" class="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200" />
          <button type="button" data-remove-index="${index}" class="rounded-lg border border-red-200 bg-red-50 px-2 text-sm font-medium text-red-600 hover:bg-red-100">×</button>
        </div>
      `
    )
    .join("");

  refs.ingredientRows.querySelectorAll("[data-remove-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const currentRows = getIngredientRows();
      const index = Number(button.dataset.removeIndex);
      currentRows.splice(index, 1);
      const nextRows = currentRows.length ? currentRows : [{ name: "", amount: "", unit: "" }];
      renderIngredientRows(nextRows);
    });
  });
}

function getIngredientRows() {
  return Array.from(refs.ingredientRows.querySelectorAll(".ingredient-row")).map((row) => ({
    name: row.querySelector("[data-field='name']")?.value || "",
    amount: row.querySelector("[data-field='amount']")?.value || "",
    unit: row.querySelector("[data-field='unit']")?.value || "",
  }));
}

async function handleRecipeSubmit(event) {
  event.preventDefault();

  const title = refs.recipeTitle.value.trim();
  const instructions = refs.recipeInstructions.value.trim();
  const imageUrl = refs.recipeImageUrl.value.trim() || state.uploadedImageUrl || defaultRecipeImage();

  if (!title || !instructions) {
    showToast("Bitte Titel und Zubereitung ausfüllen.", "error");
    return;
  }

  const ingredientRows = getIngredientRows()
    .map((ingredient) => ({
      name: ingredient.name.trim(),
      amount: Number(ingredient.amount) || 0,
      unit: ingredient.unit.trim(),
    }))
    .filter((ingredient) => ingredient.name || ingredient.amount || ingredient.unit);

  const tags = refs.recipeTags.value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const recipeData = {
    title,
    prepTimeMinutes: Number(refs.prepTime.value) || 0,
    totalTimeMinutes: Number(refs.totalTime.value) || 0,
    servings: Number(refs.servings.value) || 1,
    ingredients: ingredientRows,
    instructions,
    imageUrl,
    tags,
    createdAt: state.editingRecipeId ? undefined : serverTimestamp(),
  };

  try {
    if (state.editingRecipeId) {
      await updateDoc(doc(db, "recipes", state.editingRecipeId), recipeData);
      showToast("Rezept aktualisiert.", "success");
    } else {
      await addDoc(collection(db, "recipes"), recipeData);
      showToast("Rezept gespeichert.", "success");
    }
    state.editingRecipeId = null;
    refs.recipeForm.reset();
    renderIngredientRows();
    showView("home");
  } catch (error) {
    console.error("Save recipe error:", error);
    showToast("Speichern fehlgeschlagen. Bitte erneut versuchen.", "error");
  }
}

async function deleteRecipe(recipeId) {
  const recipe = state.recipes.find((item) => item.id === recipeId);
  if (!recipe) return;

  const confirmed = window.confirm(`Rezept "${recipe.title}" wirklich löschen?`);
  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "recipes", recipeId));
    showToast("Rezept gelöscht.", "success");
    state.editingRecipeId = null;
    showView("home");
  } catch (error) {
    console.error("Delete recipe error:", error);
    showToast("Löschen fehlgeschlagen.", "error");
  }
}

async function handleImageUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  state.uploadInProgress = true;
  refs.uploadStatus.textContent = "Bild wird hochgeladen...";

  try {
    const result = await uploadImageToImgbb(file);
    const uploadedUrl = result?.data?.url || result?.data?.display_url;
    if (!uploadedUrl) {
      throw new Error("Keine Bild-URL aus ImgBB erhalten.");
    }
    state.uploadedImageUrl = uploadedUrl;
    refs.recipeImageUrl.value = uploadedUrl;
    refs.uploadStatus.textContent = "Upload erfolgreich";
    showToast("Bild wurde hochgeladen.", "success");
  } catch (error) {
    console.error("Image upload error:", error);
    refs.uploadStatus.textContent = "Upload fehlgeschlagen";
    showToast("Bild-Upload fehlgeschlagen.", "error");
  } finally {
    state.uploadInProgress = false;
    event.target.value = "";
  }
}

async function uploadImageToImgbb(file) {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("key", IMGBB_API_KEY);

  const response = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("ImgBB API request failed");
  }

  return response.json();
}

function openRecipeDetail(recipeId) {
  state.selectedRecipeId = recipeId;
  const recipe = state.recipes.find((item) => item.id === recipeId);
  if (!recipe) return;
  renderDetail(recipe);
  showView("detail");
}

function renderDetail(recipe) {
  if (!recipe) return;

  state.detailPortions = Number(recipe.servings) || 1;
  const portions = state.detailPortions;
  const ingredientMarkup = (recipe.ingredients || [])
    .map((ingredient) => {
      const amount = ingredient.amount ? Number(ingredient.amount) : 0;
      const scaledAmount = amount > 0 ? (amount / Number(recipe.servings || 1)) * portions : 0;
      const formattedAmount =
        scaledAmount % 1 === 0
          ? String(Math.round(scaledAmount))
          : scaledAmount.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");

      return `
        <label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <input type="checkbox" class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
          <span class="text-sm text-slate-700">
            <span class="font-medium">${formattedAmount !== "0" ? formattedAmount : ""}</span>
            <span class="ml-1">${escapeHtml(ingredient.unit || "")}</span>
            <span class="ml-1">${escapeHtml(ingredient.name || "")}</span>
          </span>
        </label>
      `;
    })
    .join("");

  refs.detailContent.innerHTML = `
    <div class="space-y-4">
      <div class="relative">
        <button data-back="detail" type="button" class="absolute left-4 top-4 z-10 rounded-full bg-white/90 px-3 py-2 text-sm font-medium shadow-sm">← Zurück</button>
        <img src="${recipe.imageUrl || defaultRecipeImage()}" alt="${escapeHtml(recipe.title)}" class="h-64 w-full object-cover" />
      </div>

      <div class="space-y-4 px-4 pb-8 pt-2">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.18em] text-amber-600">Rezept</p>
            <h2 class="mt-1 text-2xl font-bold text-slate-900">${escapeHtml(recipe.title)}</h2>
          </div>
          <button data-edit="${recipe.id}" type="button" class="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Bearbeiten</button>
        </div>

        <div class="flex flex-wrap gap-2">
          <span class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">⏱ ${recipe.totalTimeMinutes || recipe.prepTimeMinutes || 0} min</span>
          <span class="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">${recipe.servings || 1} Portionen</span>
          ${(recipe.tags || []).map((tag) => `<span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">${escapeHtml(tag)}</span>`).join("")}
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-base font-semibold text-slate-900">Portionen anpassen</h3>
            <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">${portions} Personen</span>
          </div>
          <input id="portionSlider" type="range" min="1" max="12" value="${portions}" class="w-full accent-amber-500" />
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 class="mb-3 text-base font-semibold text-slate-900">Zutaten</h3>
          <div class="space-y-2">${ingredientMarkup}</div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 class="mb-3 text-base font-semibold text-slate-900">Zubereitung</h3>
          <div class="prose max-w-none text-sm leading-7 text-slate-700 whitespace-pre-line">${escapeHtml(recipe.instructions || "")}</div>
        </div>
      </div>
    </div>
  `;

  refs.detailContent.querySelector("[data-back='detail']").addEventListener("click", () => showView("home"));
  refs.detailContent.querySelector("[data-edit]").addEventListener("click", () => openForm(recipe.id));

  const slider = document.getElementById("portionSlider");
  if (slider) {
    slider.addEventListener("input", (event) => {
      state.detailPortions = Number(event.target.value) || 1;
      renderDetail(recipe);
    });
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((error) => {
        console.warn("Service worker registration failed:", error);
      });
    });
  }
}

function defaultRecipeImage() {
  return "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80";
}

function emptyStateMarkup(message) {
  return `
    <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
      ${message}
    </div>
  `;
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `max-w-full rounded-xl border px-4 py-2 text-sm font-medium shadow-sm ${
    type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
  }`;
  toast.textContent = message;
  refs.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2500);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

