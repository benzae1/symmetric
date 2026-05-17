const state = {
  metrics: [],
  filters: {
    search: "",
    type: "all",
    categories: [],
    leadingLagging: "all",
    difficulty: "all",
    sort: "source"
  }
};

const difficultyOrder = {
  Easy: 1,
  "Easy-Medium": 2,
  Medium: 2,
  "Medium-Hard": 3,
  Hard: 3,
  "Easy-Hard": 3
};

const elements = {
  searchInput: document.querySelector("#searchInput"),
  typeFilter: document.querySelector("#typeFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  activeCategoryFilters: document.querySelector("#activeCategoryFilters"),
  categoryChips: document.querySelector("#categoryChips"),
  leadingFilter: document.querySelector("#leadingFilter"),
  difficultyFilter: document.querySelector("#difficultyFilter"),
  sortFilter: document.querySelector("#sortFilter"),
  leadingField: document.querySelector("#leadingField"),
  leadingHint: document.querySelector("#leadingHint"),
  resetButton: document.querySelector("#resetButton"),
  resultsCount: document.querySelector("#resultsCount"),
  resultsSummary: document.querySelector("#resultsSummary"),
  cardsContainer: document.querySelector("#cardsContainer"),
  emptyState: document.querySelector("#emptyState"),
  cardTemplate: document.querySelector("#metricCardTemplate")
};

async function init() {
  try {
    const response = await fetch("data/metrics.json");

    if (!response.ok) {
      throw new Error(`Failed to load metrics: ${response.status}`);
    }

    const metrics = await response.json();
    state.metrics = metrics.map((metric, index) => ({
      ...metric,
      sourceOrder: index,
      searchText: buildSearchText(metric)
    }));

    populateStaticFilters();
    bindEvents();
    render();
  } catch (error) {
    elements.resultsCount.textContent = "Unable to load metrics data.";
    elements.cardsContainer.innerHTML = "";
    elements.emptyState.hidden = false;
    elements.emptyState.innerHTML = `
      <h2>Data could not be loaded.</h2>
      <p>${escapeHtml(error.message)}</p>
    `;
  }
}

function buildSearchText(metric) {
  return [
    metric.name,
    metric.category,
    metric.shortDescription,
    metric.measurement,
    metric.leadingLagging,
    metric.difficulty,
    metric.difficultyJustification,
    ...(metric.tags || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim().toLowerCase();
    render();
  });

  elements.typeFilter.addEventListener("change", (event) => {
    state.filters.type = event.target.value;
    updateLeadingFilterState();
    render();
  });

  elements.categoryFilter.addEventListener("change", (event) => {
    const selectedCategory = event.target.value;
    if (selectedCategory && !state.filters.categories.includes(selectedCategory)) {
      state.filters.categories = [...state.filters.categories, selectedCategory];
    }
    elements.categoryFilter.value = "";
    render();
  });

  elements.leadingFilter.addEventListener("change", (event) => {
    state.filters.leadingLagging = event.target.value;
    render();
  });

  elements.difficultyFilter.addEventListener("change", (event) => {
    state.filters.difficulty = event.target.value;
    render();
  });

  elements.sortFilter.addEventListener("change", (event) => {
    state.filters.sort = event.target.value;
    render();
  });

  elements.resetButton.addEventListener("click", resetFilters);
}

function populateStaticFilters() {
  populateOptions(
    elements.categoryFilter,
    "Add a category filter",
    getUniqueValues(state.metrics.map((metric) => metric.category)),
    defaultSort,
    ""
  );

  populateOptions(
    elements.difficultyFilter,
    "All difficulties",
    getUniqueValues(state.metrics.map((metric) => metric.difficulty)),
    sortDifficultyValues
  );

  updateLeadingFilterState();
}

function updateLeadingFilterState() {
  const selectedType = state.filters.type;
  const metaOnly = selectedType === "meta_metric";
  const leadingOptions = metaOnly
    ? ["Not applicable"]
    : getUniqueValues(
        state.metrics
          .filter((metric) => selectedType === "all" || metric.type === selectedType)
          .map((metric) => metric.leadingLagging || "Not applicable")
      );

  populateOptions(elements.leadingFilter, "All", leadingOptions);

  elements.leadingField.classList.toggle("is-muted", metaOnly);
  elements.leadingHint.hidden = !metaOnly;

  if (metaOnly && state.filters.leadingLagging !== "all" && state.filters.leadingLagging !== "Not applicable") {
    state.filters.leadingLagging = "all";
    elements.leadingFilter.value = "all";
  }

  if (!leadingOptions.includes(state.filters.leadingLagging) && state.filters.leadingLagging !== "all") {
    state.filters.leadingLagging = "all";
    elements.leadingFilter.value = "all";
  }
}

function populateOptions(selectElement, defaultLabel, values, sorter = defaultSort, defaultValue = "all") {
  const currentValue = selectElement.value || defaultValue;
  const sortedValues = [...values].sort(sorter);

  selectElement.innerHTML = "";

  const defaultOption = new Option(defaultLabel, defaultValue);
  selectElement.add(defaultOption);

  for (const value of sortedValues) {
    selectElement.add(new Option(value, value));
  }

  selectElement.value = sortedValues.includes(currentValue) || currentValue === defaultValue
    ? currentValue
    : defaultValue;
}

function getUniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function sortDifficultyValues(a, b) {
  return (difficultyOrder[a] || Number.MAX_SAFE_INTEGER) - (difficultyOrder[b] || Number.MAX_SAFE_INTEGER);
}

function defaultSort(a, b) {
  return a.localeCompare(b);
}

function resetFilters() {
  state.filters = {
    search: "",
    type: "all",
    categories: [],
    leadingLagging: "all",
    difficulty: "all",
    sort: "source"
  };

  elements.searchInput.value = "";
  elements.typeFilter.value = "all";
  elements.categoryFilter.value = "";
  elements.difficultyFilter.value = "all";
  elements.sortFilter.value = "source";
  updateLeadingFilterState();
  elements.leadingFilter.value = "all";

  render();
}

function render() {
  const filteredMetrics = applyFilters(state.metrics);
  const sortedMetrics = applySort(filteredMetrics);

  const count = sortedMetrics.length;
  const total = state.metrics.length;
  elements.resultsCount.innerHTML =
    `<strong>${count}</strong> of ${total} metric${total === 1 ? "" : "s"} shown`;
  elements.resultsSummary.innerHTML = buildSummary();
  renderCategoryChips();

  elements.cardsContainer.innerHTML = "";
  elements.emptyState.hidden = count > 0;

  if (count === 0) {
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const metric of sortedMetrics) {
    fragment.append(createMetricCard(metric));
  }

  elements.cardsContainer.append(fragment);
}

function buildSummary() {
  const parts = [];
  const sortLabels = {
    source: "Source order",
    name: "Name A\u2013Z",
    category: "Category A\u2013Z",
    difficulty: "Difficulty"
  };
  parts.push(`Sorted by <span>${sortLabels[state.filters.sort] || state.filters.sort}</span>`);

  if (state.filters.type !== "all") {
    parts.push(`<span>${formatType(state.filters.type)}</span>`);
  }
  if (state.filters.categories.length > 0) {
    parts.push(`Categories <span>${escapeHtml(state.filters.categories.join(", "))}</span>`);
  }
  if (state.filters.difficulty !== "all") {
    parts.push(`<span>${escapeHtml(state.filters.difficulty)}</span>`);
  }
  if (state.filters.leadingLagging !== "all") {
    parts.push(`<span>${escapeHtml(state.filters.leadingLagging)}</span>`);
  }
  if (state.filters.search) {
    parts.push(`Search \u00BB<span>${escapeHtml(state.filters.search)}</span>\u00AB`);
  }

  return parts.join(" \u00B7 ");
}

function applyFilters(metrics) {
  return metrics.filter((metric) => {
    const matchesSearch = !state.filters.search || metric.searchText.includes(state.filters.search);
    const matchesType = state.filters.type === "all" || metric.type === state.filters.type;
    const matchesCategory =
      state.filters.categories.length === 0 || state.filters.categories.includes(metric.category);

    const leadingValue = metric.leadingLagging || "Not applicable";
    const matchesLeading =
      state.filters.leadingLagging === "all" || leadingValue === state.filters.leadingLagging;

    const matchesDifficulty =
      state.filters.difficulty === "all" || metric.difficulty === state.filters.difficulty;

    return matchesSearch && matchesType && matchesCategory && matchesLeading && matchesDifficulty;
  });
}

function renderCategoryChips() {
  elements.categoryChips.innerHTML = "";
  const hasCategories = state.filters.categories.length > 0;
  elements.activeCategoryFilters.hidden = !hasCategories;

  if (!hasCategories) {
    return;
  }

  for (const category of state.filters.categories) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.setAttribute("aria-label", `Remove category filter ${category}`);
    chip.innerHTML = `<span>${escapeHtml(category)}</span><span class="chip__remove" aria-hidden="true">×</span>`;
    chip.addEventListener("click", () => {
      state.filters.categories = state.filters.categories.filter((value) => value !== category);
      render();
    });
    elements.categoryChips.append(chip);
  }
}

function applySort(metrics) {
  const sorted = [...metrics];

  sorted.sort((left, right) => {
    switch (state.filters.sort) {
      case "name":
        return left.name.localeCompare(right.name);
      case "category":
        return left.category.localeCompare(right.category) || left.name.localeCompare(right.name);
      case "difficulty":
        return (
          (difficultyOrder[left.difficulty] || Number.MAX_SAFE_INTEGER) -
            (difficultyOrder[right.difficulty] || Number.MAX_SAFE_INTEGER) ||
          left.name.localeCompare(right.name)
        );
      case "source":
      default:
        return left.sourceOrder - right.sourceOrder;
    }
  });

  return sorted;
}

function createMetricCard(metric) {
  const card = elements.cardTemplate.content.firstElementChild.cloneNode(true);
  const indexLabel = String(metric.id).padStart(2, "0");

  card.querySelector(".metric-card__index").textContent = indexLabel;

  const metaEl = card.querySelector(".metric-card__meta");
  metaEl.innerHTML = "";
  for (const part of [formatType(metric.type), metric.category]) {
    if (!part) continue;
    const span = document.createElement("span");
    span.textContent = part;
    metaEl.append(span);
  }

  card.querySelector(".metric-card__title").textContent = metric.name;

  const difficultyEl = card.querySelector(".metric-card__difficulty");
  difficultyEl.textContent = metric.difficulty;
  difficultyEl.dataset.tier = String(difficultyOrder[metric.difficulty] || "");

  card.querySelector(".metric-card__description").textContent = metric.shortDescription;
  card.querySelector(".metric-card__measurement").textContent = metric.measurement;
  card.querySelector(".metric-card__justification").textContent = metric.difficultyJustification;

  const leadingRow = card.querySelector(".metric-card__leading-row");
  if (metric.leadingLagging) {
    card.querySelector(".metric-card__leading").textContent = metric.leadingLagging;
  } else {
    leadingRow.hidden = true;
  }

  const tagsList = card.querySelector(".metric-card__tags");
  for (const tag of metric.tags || []) {
    const item = document.createElement("li");
    item.textContent = tag;
    tagsList.append(item);
  }

  return card;
}

function formatType(type) {
  return type === "meta_metric" ? "Meta-metric" : "Software metric";
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

init();
