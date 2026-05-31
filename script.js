const state = {
  activeTab: "metrics",
  metrics: [],
  tools: [],
  filters: {
    search: "",
    type: "all",
    categories: [],
    leadingLagging: "all",
    difficulty: "all",
    sort: "source"
  },
  toolFilters: {
    search: "",
    language: "all",
    category: "all",
    metric: "all",
    relatedMetricId: "all"
  },
  expandedMetricIds: new Set()
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
  tabButtons: [...document.querySelectorAll(".tab-button")],
  tabPanels: {
    metrics: document.querySelector("#metricsPanel"),
    tools: document.querySelector("#toolsPanel")
  },
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
  cardTemplate: document.querySelector("#metricCardTemplate"),
  toolSearchInput: document.querySelector("#toolSearchInput"),
  toolLanguageFilter: document.querySelector("#toolLanguageFilter"),
  toolCategoryFilter: document.querySelector("#toolCategoryFilter"),
  toolMetricFilter: document.querySelector("#toolMetricFilter"),
  toolResetButton: document.querySelector("#toolResetButton"),
  toolResultsCount: document.querySelector("#toolResultsCount"),
  toolResultsSummary: document.querySelector("#toolResultsSummary"),
  toolCardsContainer: document.querySelector("#toolCardsContainer"),
  toolEmptyState: document.querySelector("#toolEmptyState"),
  toolCardTemplate: document.querySelector("#toolCardTemplate")
};

async function init() {
  bindEvents();

  await Promise.all([loadMetrics(), loadTools()]);

  setActiveTab(state.activeTab);
  render();
  renderTools();
}

async function loadMetrics() {
  try {
    const response = await fetch("data/metrics.json");

    if (!response.ok) {
      throw new Error(`Failed to load metrics: ${response.status}`);
    }

    const metrics = await response.json();
    state.metrics = metrics.map((metric, index) => ({
      ...metric,
      sourceOrder: index,
      searchText: buildMetricSearchText(metric)
    }));

    populateStaticFilters();
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

async function loadTools() {
  try {
    const response = await fetch("data/tools.json");

    if (!response.ok) {
      throw new Error(`Failed to load tools: ${response.status}`);
    }

    const tools = await response.json();
    state.tools = tools.map((tool, index) => ({
      ...tool,
      sourceOrder: index,
      searchText: buildToolSearchText(tool)
    }));

    populateToolFilters();
  } catch (error) {
    elements.toolResultsCount.textContent = "Unable to load tool data.";
    elements.toolCardsContainer.innerHTML = "";
    elements.toolEmptyState.hidden = false;
    elements.toolEmptyState.innerHTML = `
      <h2>Tool data could not be loaded.</h2>
      <p>${escapeHtml(error.message)}</p>
    `;
  }
}

function bindEvents() {
  for (const button of elements.tabButtons) {
    button.addEventListener("click", () => {
      setActiveTab(button.dataset.tab);
    });
  }

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

  elements.toolSearchInput.addEventListener("input", (event) => {
    state.toolFilters.search = event.target.value.trim().toLowerCase();
    renderTools();
  });

  elements.toolLanguageFilter.addEventListener("change", (event) => {
    state.toolFilters.language = event.target.value;
    renderTools();
  });

  elements.toolCategoryFilter.addEventListener("change", (event) => {
    state.toolFilters.category = event.target.value;
    renderTools();
  });

  elements.toolMetricFilter.addEventListener("change", (event) => {
    state.toolFilters.metric = event.target.value;
    renderTools();
  });

  elements.toolResetButton.addEventListener("click", resetToolFilters);
}

function setActiveTab(tab) {
  state.activeTab = tab;

  for (const button of elements.tabButtons) {
    const isActive = button.dataset.tab === tab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  }

  for (const [panelName, panel] of Object.entries(elements.tabPanels)) {
    panel.hidden = panelName !== tab;
  }
}

function buildMetricSearchText(metric) {
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

function buildToolSearchText(tool) {
  return [
    tool.name,
    tool.language,
    tool.category,
    ...(tool.metrics || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
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

function populateToolFilters() {
  populateOptions(
    elements.toolLanguageFilter,
    "All languages",
    getUniqueValues(state.tools.map((tool) => tool.language))
  );

  populateOptions(
    elements.toolCategoryFilter,
    "All categories",
    getUniqueValues(state.tools.map((tool) => tool.category))
  );

  populateOptions(
    elements.toolMetricFilter,
    "All metrics",
    getUniqueValues(state.tools.flatMap((tool) => tool.metrics || []))
  );
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

function resetToolFilters() {
  state.toolFilters = {
    search: "",
    language: "all",
    category: "all",
    metric: "all",
    relatedMetricId: "all"
  };

  elements.toolSearchInput.value = "";
  elements.toolLanguageFilter.value = "all";
  elements.toolCategoryFilter.value = "all";
  elements.toolMetricFilter.value = "all";

  renderTools();
}

function render() {
  const filteredMetrics = applyFilters(state.metrics);
  const sortedMetrics = applySort(filteredMetrics);

  const count = sortedMetrics.length;
  const total = state.metrics.length;
  elements.resultsCount.innerHTML = `<strong>${count}</strong> of ${total} metric${total === 1 ? "" : "s"} shown`;
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

function renderTools() {
  const filteredTools = applyToolFilters(state.tools);

  const count = filteredTools.length;
  const total = state.tools.length;
  elements.toolResultsCount.innerHTML = `<strong>${count}</strong> of ${total} tool${total === 1 ? "" : "s"} shown`;
  elements.toolResultsSummary.innerHTML = buildToolSummary();

  elements.toolCardsContainer.innerHTML = "";
  elements.toolEmptyState.hidden = count > 0;

  if (count === 0) {
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const tool of filteredTools) {
    fragment.append(createToolCard(tool));
  }

  elements.toolCardsContainer.append(fragment);
}

function buildSummary() {
  const parts = [];
  const sortLabels = {
    source: "Source order",
    name: "Name A-Z",
    category: "Category A-Z",
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
    parts.push(`Search "<span>${escapeHtml(state.filters.search)}</span>"`);
  }

  return parts.join(" | ");
}

function buildToolSummary() {
  const parts = ["Browse by <span>language</span>, <span>category</span>, and <span>measured metric</span>"];

  if (state.toolFilters.relatedMetricId !== "all") {
    const relatedMetric = state.metrics.find((metric) => String(metric.id) === state.toolFilters.relatedMetricId);
    if (relatedMetric) {
      parts.push(`Related to <span>${escapeHtml(relatedMetric.name)}</span>`);
    }
  }

  if (state.toolFilters.language !== "all") {
    parts.push(`<span>${escapeHtml(state.toolFilters.language)}</span>`);
  }
  if (state.toolFilters.category !== "all") {
    parts.push(`<span>${escapeHtml(state.toolFilters.category)}</span>`);
  }
  if (state.toolFilters.metric !== "all") {
    parts.push(`Metric <span>${escapeHtml(state.toolFilters.metric)}</span>`);
  }
  if (state.toolFilters.search) {
    parts.push(`Search "<span>${escapeHtml(state.toolFilters.search)}</span>"`);
  }

  return parts.join(" | ");
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

function applyToolFilters(tools) {
  return tools.filter((tool) => {
    const matchesSearch = !state.toolFilters.search || tool.searchText.includes(state.toolFilters.search);
    const matchesLanguage = state.toolFilters.language === "all" || tool.language === state.toolFilters.language;
    const matchesCategory = state.toolFilters.category === "all" || tool.category === state.toolFilters.category;
    const matchesMetric =
      state.toolFilters.metric === "all" || (tool.metrics || []).includes(state.toolFilters.metric);
    const matchesRelatedMetric =
      state.toolFilters.relatedMetricId === "all" ||
      (tool.relatedMetricIds || []).includes(state.toolFilters.relatedMetricId);

    return matchesSearch && matchesLanguage && matchesCategory && matchesMetric && matchesRelatedMetric;
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
    chip.innerHTML = `<span>${escapeHtml(category)}</span><span class="chip__remove" aria-hidden="true">x</span>`;
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
  const relatedTools = getRelatedTools(metric.id);
  const isExpanded = state.expandedMetricIds.has(String(metric.id));

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

  const toolsToggle = card.querySelector(".metric-card__tools-toggle");
  const toolsPanel = card.querySelector(".metric-card__tools-panel");
  const toolsList = card.querySelector(".metric-card__tools-list");
  const toolsLink = card.querySelector(".metric-card__tools-link");

  toolsToggle.textContent = relatedTools.length > 0
    ? `Show related tools (${relatedTools.length})`
    : "Show related tools";
  toolsToggle.setAttribute("aria-expanded", String(isExpanded));
  toolsPanel.hidden = !isExpanded;

  if (relatedTools.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "metric-card__tools-empty";
    emptyMessage.textContent = "No tools are mapped to this metric yet in the current static dataset.";
    toolsList.append(emptyMessage);
    toolsLink.hidden = true;
  } else {
    for (const tool of relatedTools) {
      toolsList.append(createRelatedToolChip(tool));
    }

    toolsLink.addEventListener("click", () => {
      openToolFinderForMetric(metric.id);
    });
  }

  toolsToggle.addEventListener("click", () => {
    toggleMetricTools(metric.id);
  });

  return card;
}

function getRelatedTools(metricId) {
  return state.tools.filter((tool) => (tool.relatedMetricIds || []).includes(String(metricId)));
}

function createRelatedToolChip(tool) {
  const article = document.createElement("article");
  article.className = "related-tool";

  const name = document.createElement("p");
  name.className = "related-tool__name";
  name.textContent = tool.name;

  const meta = document.createElement("p");
  meta.className = "related-tool__meta";
  meta.textContent = `${tool.language} | ${tool.category}`;

  article.append(name, meta);
  return article;
}

function toggleMetricTools(metricId) {
  const normalizedId = String(metricId);

  if (state.expandedMetricIds.has(normalizedId)) {
    state.expandedMetricIds.delete(normalizedId);
  } else {
    state.expandedMetricIds.add(normalizedId);
  }

  render();
}

function openToolFinderForMetric(metricId) {
  state.toolFilters.search = "";
  state.toolFilters.relatedMetricId = String(metricId);
  elements.toolSearchInput.value = "";
  setActiveTab("tools");
  renderTools();
}

function createToolCard(tool) {
  const card = elements.toolCardTemplate.content.firstElementChild.cloneNode(true);

  card.querySelector(".tool-card__eyebrow").textContent = tool.language;
  card.querySelector(".tool-card__title").textContent = tool.name;
  card.querySelector(".tool-card__category").textContent = tool.category;

  const list = card.querySelector(".tool-card__list");
  for (const metric of tool.metrics || []) {
    const item = document.createElement("li");
    item.textContent = metric;
    list.append(item);
  }

  return card;
}

function formatType(type) {
  return type === "meta_metric" ? "Meta-metric" : "Software metric";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

init();
