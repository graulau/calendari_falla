import { buildHashPath, nextVisibleCount, parseHashRoute } from "./router.js";

const CONFIG = window.CONFIG;
const I18N = window.I18N;

const state = {
  lang: "es",
  events: [],
  dataLoaded: false,
  selectedEvent: null,
  calendarDate: new Date(),
  pendingDuplicate: null,
  tokenRecord: null,
  signupSuccess: null,
  signupUi: {
    count: 1,
    max: 5,
    nextRowId: 1,
  },
  route: { name: "home", params: {} },
  access: {
    unlocked: false,
    failed: 0,
    lockedUntil: 0,
    context: "app",
    pendingRoute: null,
  },
  eventsRoute: {
    visibleCount: 0,
    initialBatch: 20,
    batchSize: 10,
    observer: null,
  },
  admin: {
    authenticated: false,
    secret: "",
    events: [],
    editingId: null,
    activeTab: "active",
  },
};

const elements = {
  page: document.querySelector("main.page"),
  loadingOverlay: document.getElementById("loading-overlay"),
  accessGate: document.getElementById("access-gate"),
  accessGateForm: document.getElementById("access-gate-form"),
  accessGateHint: document.getElementById("access-gate-hint"),
  accessGateMessage: document.getElementById("access-gate-message"),
  heroSection: document.querySelector("section.hero"),
  upcomingSection: document.getElementById("upcoming"),
  calendarSection: document.getElementById("calendar"),
  eventsRouteSection: document.getElementById("events-route"),
  eventsRouteList: document.getElementById("events-route-list"),
  eventsRouteLoadMore: document.getElementById("events-route-load-more"),
  eventsRouteSentinel: document.getElementById("events-route-sentinel"),
  tokenSection: document.getElementById("token-section"),
  legalSection: document.getElementById("legal"),
  heroList: document.getElementById("hero-list"),
  upcomingList: document.getElementById("upcoming-list"),
  calendarGrid: document.getElementById("calendar-grid"),
  calendarLabel: document.getElementById("calendar-label"),
  eventDetail: document.getElementById("event-detail"),
  eventName: document.getElementById("event-name"),
  eventDesc: document.getElementById("event-desc"),
  eventWhen: document.getElementById("event-when"),
  eventWhere: document.getElementById("event-where"),
  eventStatus: document.getElementById("event-status"),
  attendeesList: document.getElementById("attendees-list"),
  attendeesTitle: document.getElementById("attendees-title"),
  modelInfo: document.getElementById("model-info"),
  eventAvailability: document.getElementById("event-availability"),
  signupPanel: document.getElementById("signup-panel"),
  signupForm: document.getElementById("signup-form"),
  signupRows: document.getElementById("signup-rows"),
  signupCountDec: document.getElementById("signup-count-dec"),
  signupCountInc: document.getElementById("signup-count-inc"),
  signupCountValue: document.getElementById("signup-count-value"),
  signupSubmit: document.getElementById("signup-submit"),
  signupConfirm: document.getElementById("signup-confirm"),
  signupHint: document.getElementById("signup-hint"),
  saveSignupAccess: document.getElementById("save-signup-access"),
  saveSignupHint: document.getElementById("save-signup-hint"),
  saveCalendarEvent: document.getElementById("save-calendar-event"),
  signupCompleteModal: document.getElementById("signup-complete-modal"),
  signupCompleteBackdrop: document.getElementById("signup-complete-backdrop"),
  signupCompleteClose: document.getElementById("signup-complete-close"),
  signupCompleteBody: document.getElementById("signup-complete-body"),
  tokenForm: document.getElementById("token-form"),
  tokenEditor: document.getElementById("token-editor"),
  editForm: document.getElementById("edit-form"),
  editExtraField: document.getElementById("edit-extra-field"),
  editExtraLabel: document.getElementById("edit-extra-label"),
  closeEvent: document.getElementById("close-event"),
  adminSection: document.getElementById("admin-section"),
  adminLoginForm: document.getElementById("admin-login-form"),
  adminLoginHint: document.getElementById("admin-login-hint"),
  adminLoginCard: document.getElementById("admin-login-card"),
  adminPanel: document.getElementById("admin-panel"),
  adminEvents: document.getElementById("admin-events"),
  adminEventsEmpty: document.getElementById("admin-events-empty"),
  adminEditor: document.getElementById("admin-editor"),
  adminEditorTitle: document.getElementById("admin-editor-title"),
  adminForm: document.getElementById("admin-form"),
  adminFormHint: document.getElementById("admin-form-hint"),
  adminNew: document.getElementById("admin-new"),
  adminDelete: document.getElementById("admin-delete"),
  adminModel: document.getElementById("admin-model"),
  adminExtraLabel: document.getElementById("admin-extra-label"),
  adminExtraLabelVal: document.getElementById("admin-extra-label-val"),
  adminTabActive: document.getElementById("admin-tab-active"),
  adminTabClosed: document.getElementById("admin-tab-closed"),
  dayModal: document.getElementById("day-modal"),
  dayModalBackdrop: document.getElementById("day-modal-backdrop"),
  dayModalClose: document.getElementById("day-modal-close"),
  dayModalTitle: document.getElementById("day-modal-title"),
  dayModalList: document.getElementById("day-modal-list"),
  headerLogoBtn: document.getElementById("header-logo-btn"),
  headerHomeBtn: document.getElementById("header-home-btn"),
  headerCalendarBtn: document.getElementById("header-calendar-btn"),
  ctaUpcoming: document.getElementById("cta-upcoming"),
  ctaCalendar: document.getElementById("cta-calendar"),
};

function applyI18n() {
  const dict = I18N[state.lang] || I18N.es;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === state.lang);
  });
}

function setGlobalLoading(active) {
  if (!elements.loadingOverlay) return;
  elements.loadingOverlay.hidden = !active;
}

function setSignupSaving(active) {
  if (!elements.signupSubmit) return;
  elements.signupSubmit.classList.toggle("is-loading", active);
  elements.signupSubmit.disabled = active;
  if (active) {
    elements.signupSubmit.textContent = t("signup.saving");
  } else {
    elements.signupSubmit.textContent = t("signup.submit");
  }
}

function navigate(path, { replace = false } = {}) {
  const hash = buildHashPath(path);
  if (replace) {
    const base = `${window.location.pathname}${window.location.search}`;
    history.replaceState(null, "", `${base}${hash}`);
    resolveRoute();
    return;
  }
  if (window.location.hash === hash) {
    resolveRoute();
    return;
  }
  window.location.hash = hash;
}

function setLanguage(lang) {
  state.lang = lang;
  localStorage.setItem("lang", lang);
  applyI18n();
  resolveRoute();
}

function t(key) {
  return (I18N[state.lang] && I18N[state.lang][key]) || I18N.es[key] || key;
}

function normalizeName(value) {
  return value.replace(/\s+/g, " ").trim();
}

function parseNamesInput(rawValue) {
  return rawValue
    .split(/[\n,]+/)
    .map((part) => normalizeName(part))
    .filter(Boolean);
}

function isValidFullName(name) {
  return normalizeName(name).split(" ").length >= 2;
}

function parseEventOptions(rawValue) {
  if (!rawValue) return [];
  return rawValue
    .split(/[|,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getEventOptionsText(event) {
  if (!event) return "";
  if (state.lang === "val" && event.extra_options_val) {
    return event.extra_options_val;
  }
  return event.extra_options || "";
}

function getSignupExtraValue(form) {
  const select = form.elements.namedItem("extra_select");
  const input = form.elements.namedItem("extra_text");
  if (select && !select.hidden) {
    return (select.value || "").toString().trim();
  }
  return input ? input.value.trim() : "";
}

function nextSignupRowId() {
  const value = `r${state.signupUi.nextRowId}`;
  state.signupUi.nextRowId += 1;
  return value;
}

function buildDefaultSignupEntries(count) {
  const safeCount = Math.max(1, Math.min(state.signupUi.max, count || 1));
  return Array.from({ length: safeCount }, () => ({
    rowId: nextSignupRowId(),
    name: "",
    extra: "",
  }));
}

function getSignupEntriesFromDom() {
  if (!elements.signupRows) return [];
  return Array.from(elements.signupRows.querySelectorAll(".signup-row-item")).map((row) => {
    const nameInput = row.querySelector("input[name='row_name']");
    const extraInput = row.querySelector("input[name='row_extra']");
    const extraSelect = row.querySelector("select[name='row_extra']");
    const extraValue =
      extraSelect && !extraSelect.hidden
        ? (extraSelect.value || "").toString().trim()
        : extraInput
          ? extraInput.value.trim()
          : "";
    return {
      rowId: row.dataset.rowId || nextSignupRowId(),
      name: nameInput ? normalizeName(nameInput.value) : "",
      extra: extraValue,
      rowElement: row,
    };
  });
}

function updateSignupCountLabel(count) {
  state.signupUi.count = Math.max(1, Math.min(state.signupUi.max, count));
  if (elements.signupCountValue) {
    elements.signupCountValue.textContent = String(state.signupUi.count);
  }
  if (elements.signupCountDec) {
    elements.signupCountDec.disabled = state.signupUi.count <= 1;
  }
  if (elements.signupCountInc) {
    elements.signupCountInc.disabled = state.signupUi.count >= state.signupUi.max;
  }
}

function createSignupRowElement(event, entry, index) {
  const row = document.createElement("div");
  row.className = "signup-row-item";
  row.dataset.rowId = entry.rowId;
  const extraLabel = getEventText(event, "extra_label") || "Detalle";
  const options = parseEventOptions(getEventOptionsText(event));
  const isExtended = event.model === "extended";

  row.innerHTML = `
    <div class="signup-row-grid ${isExtended ? "extended" : ""}">
      <label>
        <span>${t("signup.name")} #${index + 1}</span>
        <input type="text" name="row_name" value="${escapeHtml(entry.name || "")}" />
      </label>
      ${
        isExtended
          ? `
        <label>
          <span>${escapeHtml(extraLabel)}</span>
          ${
            options.length
              ? `<select name="row_extra">${options
                  .map(
                    (option) =>
                      `<option value="${escapeHtml(option)}" ${entry.extra === option ? "selected" : ""}>${escapeHtml(option)}</option>`
                  )
                  .join("")}</select>`
              : `<input type="text" name="row_extra" value="${escapeHtml(entry.extra || "")}" />`
          }
        </label>
      `
          : ""
      }
    </div>
    <p class="form-hint error signup-row-error" hidden></p>
  `;
  return row;
}

function renderSignupRows(event, entries) {
  if (!elements.signupRows || !event) return;
  const data =
    entries && entries.length ? entries.slice(0, state.signupUi.max) : buildDefaultSignupEntries(1);
  elements.signupRows.innerHTML = "";
  data.forEach((entry, index) => {
    elements.signupRows.appendChild(createSignupRowElement(event, entry, index));
  });
  updateSignupCountLabel(data.length);
}

function resizeSignupRows(nextCount) {
  if (!state.selectedEvent) return;
  const current = getSignupEntriesFromDom().map((row) => ({
    rowId: row.rowId,
    name: row.name,
    extra: row.extra,
  }));
  const target = Math.max(1, Math.min(state.signupUi.max, nextCount));
  let result = current.slice(0, target);
  while (result.length < target) {
    result.push({ rowId: nextSignupRowId(), name: "", extra: "" });
  }
  renderSignupRows(state.selectedEvent, result);
}

function clearSignupRowErrors() {
  if (!elements.signupRows) return;
  elements.signupRows.querySelectorAll(".signup-row-item").forEach((row) => {
    row.classList.remove("has-error");
    const hint = row.querySelector(".signup-row-error");
    if (hint) {
      hint.hidden = true;
      hint.textContent = "";
    }
  });
}

function applySignupRowErrors(errors) {
  if (!elements.signupRows || !errors || !errors.length) return;
  const rows = Array.from(elements.signupRows.querySelectorAll(".signup-row-item"));
  const byId = new Map(rows.map((row) => [row.dataset.rowId, row]));
  errors.forEach((errorItem) => {
    const row = byId.get(errorItem.client_row_id);
    if (!row) return;
    row.classList.add("has-error");
    const hint = row.querySelector(".signup-row-error");
    if (!hint) return;
    const key = `form.${errorItem.code}`;
    hint.textContent = t(key) === key ? t("form.error") : t(key);
    hint.hidden = false;
  });
}

function toUtcStamp(dateStr, timeStr) {
  const time = timeStr || "09:00";
  const source = `${dateStr}T${time}:00`;
  const date = new Date(source);
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildGoogleCalendarUrl(event) {
  const title = getEventText(event, "title") || "Evento";
  const description = getEventText(event, "description") || "";
  const place = getEventText(event, "place") || "";
  const start = toUtcStamp(event.date, event.time || "09:00");
  const endDate = new Date(`${event.date}T${event.time || "09:00"}:00`);
  endDate.setHours(endDate.getHours() + 1);
  const end = endDate.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const query = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details: description,
    location: place,
    dates: `${start}/${end}`,
  });
  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

function hasCalendarData(event) {
  if (!event) return false;
  const title = getEventText(event, "title");
  return Boolean(title && event.date && event.time && getEventText(event, "place"));
}

function openSignupCompleteModal() {
  if (!elements.signupCompleteModal || !state.signupSuccess) return;
  elements.signupCompleteModal.hidden = false;
  document.body.classList.add("modal-open");

  if (elements.signupCompleteBody) {
    elements.signupCompleteBody.textContent = t("signup.successBody");
  }

  if (elements.saveCalendarEvent) {
    elements.saveCalendarEvent.hidden = !hasCalendarData(state.selectedEvent);
  }

  if (elements.saveSignupHint) {
    elements.saveSignupHint.textContent = "";
  }
}

async function closeSignupCompleteModal({ refresh = true } = {}) {
  if (!elements.signupCompleteModal) return;
  const eventId = state.signupSuccess && state.signupSuccess.eventId;
  elements.signupCompleteModal.hidden = true;
  document.body.classList.remove("modal-open");
  if (elements.signupCompleteClose) {
    elements.signupCompleteClose.blur();
  }
  state.signupSuccess = null;
  if (elements.signupPanel) {
    elements.signupPanel.hidden = false;
  }
  if (refresh && eventId) {
    await refreshEvent(eventId);
  }
}

function saveAccessState() {
  sessionStorage.setItem("access_unlocked", state.access.unlocked ? "1" : "0");
  sessionStorage.setItem("access_failed", String(state.access.failed || 0));
  sessionStorage.setItem("access_locked_until", String(state.access.lockedUntil || 0));
}

function isAccessLocked() {
  return state.access.lockedUntil && Date.now() < state.access.lockedUntil;
}

function registerAccessFailure() {
  state.access.failed += 1;
  if (state.access.failed >= 5) {
    state.access.failed = 0;
    state.access.lockedUntil = Date.now() + 5 * 60 * 1000;
  }
  saveAccessState();
}

function clearAccessFailures() {
  state.access.unlocked = true;
  state.access.failed = 0;
  state.access.lockedUntil = 0;
  saveAccessState();
}

function setAccessGateMessage(route) {
  if (!elements.accessGateMessage) return;
  if (route && route.name === "event-detail") {
    elements.accessGateMessage.textContent = t("access.eventPrompt");
    state.access.context = "event";
    return;
  }
  elements.accessGateMessage.textContent = t("access.appPrompt");
  state.access.context = "app";
}

function requiredSecretForRoute(route) {
  if (route.name === "event-detail") {
    const event = state.events.find((item) => item.id === route.params.id);
    const eventPin = event && event.event_pin ? String(event.event_pin).trim() : "";
    if (eventPin) return eventPin;
  }
  return CONFIG.APP_PASSWORD || "";
}

function shouldProtectRoute(route) {
  return ["home", "calendar", "events", "event-detail"].includes(route.name);
}

function gateRoute(route) {
  state.access.pendingRoute = route;
  setAccessGateMessage(route);
  hideAllRouteSections();
  elements.accessGate.hidden = false;
  const input = elements.accessGateForm && elements.accessGateForm.elements.namedItem("secret");
  if (input) input.value = "";
}

function formatAvailability(event) {
  if (!event.limit) return null;
  const remaining = Math.max(event.limit - event.count, 0);
  const ratio = event.limit ? remaining / event.limit : 0;
  let level = "green";
  if (ratio <= 0.2) level = "red";
  else if (ratio <= 0.5) level = "amber";
  const text = t("availability.free").replace("{count}", remaining);
  return { text, level };
}

function getEventText(event, field) {
  if (!event) return "";
  if (state.lang === "val" && event[`${field}_val`]) {
    return event[`${field}_val`];
  }
  return event[field] || "";
}

function dateLongFormatter() {
  const locale = state.lang === "val" ? "ca-ES" : "es-ES";
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: CONFIG.TZ,
  });
}

function formatDateTime(dateStr, timeStr) {
  if (!dateStr) return "";
  const date = new Date(`${dateStr}T${timeStr || "00:00"}:00`);
  const dateText = dateLongFormatter().format(date);
  if (!timeStr) return dateText;
  return `${dateText} - ${timeStr}`;
}

function upcomingEvents() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return state.events
    .filter((event) => event.status === "active")
    .filter((event) => new Date(`${event.date}T00:00:00`) >= today)
    .sort((a, b) => {
      const left = `${a.date || ""}T${a.time || "00:00"}`;
      const right = `${b.date || ""}T${b.time || "00:00"}`;
      return left.localeCompare(right);
    });
}

function createEventCard(event, { preview = false } = {}) {
  const card = document.createElement("div");
  card.className = "event-card";
  const title = getEventText(event, "title");
  const description = getEventText(event, "description");
  const place = getEventText(event, "place") || "-";
  const attendees = (event.attendees || []).slice(0, 6);
  const attendeesHtml = attendees.map((name) => `<span class="attendee">${name}</span>`).join("");
  const attendeesFallback =
    event.count > 0
      ? `<span class="form-hint">${t("attendees.loading")}</span>`
      : `<span class="form-hint">${t("empty.attendees")}</span>`;
  const info = formatAvailability(event);

  card.innerHTML = `
    <div class="event-chip">
      <img src="assets/icons/calendar.svg" alt="" width="16" height="16" />
      ${formatDateTime(event.date, event.time)}
    </div>
    <h4>${title}</h4>
    <p>${description}</p>
    <div class="event-meta">
      <div>
        <span>${t("event.where")}</span>
        <p>${place}</p>
      </div>
      <div>
        <span>${t("event.limit")}</span>
        <p>${event.limit ? `${event.count}/${event.limit}` : `${event.count}`}</p>
      </div>
      <div>
        ${info ? `<span class="availability-pill ${info.level}">${info.text}</span>` : ""}
      </div>
    </div>
    <div class="attendees preview">
      ${attendeesHtml || attendeesFallback}
      ${
        event.attendees && event.attendees.length > 6
          ? `<button class="ghost mini" data-role="more">${t("cards.more")}</button>`
          : ""
      }
    </div>
    <div class="hero-actions">
      <button class="ghost" data-role="open">${t("hero.open")}</button>
    </div>
  `;

  const openButton = card.querySelector("button[data-role='open']");
  if (openButton) {
    openButton.onclick = () => navigate(`/eventos/${encodeURIComponent(event.id)}`);
  }

  const moreButton = card.querySelector("button[data-role='more']");
  if (moreButton) {
    moreButton.onclick = () => navigate(`/eventos/${encodeURIComponent(event.id)}`);
  }

  if (preview) {
    card.classList.add("preview-card");
  }

  return card;
}

function renderHero() {
  const items = upcomingEvents();
  if (!elements.heroList) return;
  elements.heroList.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "form-hint";
    empty.textContent = t("empty.events");
    elements.heroList.appendChild(empty);
    return;
  }

  items.slice(0, 3).forEach((event) => {
    const row = document.createElement("div");
    row.className = "hero-row";
    row.innerHTML = `
      <div class="hero-row-info">
        <span class="hero-row-title">${getEventText(event, "title")}</span>
        <span class="hero-row-date">${formatDateTime(event.date, event.time)}</span>
      </div>
      <button class="ghost">${t("hero.open")}</button>
    `;
    row.querySelector("button").onclick = () => navigate(`/eventos/${encodeURIComponent(event.id)}`);
    elements.heroList.appendChild(row);
  });
}

function renderUpcoming() {
  const items = upcomingEvents();
  elements.upcomingList.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "event-card";
    empty.textContent = t("empty.events");
    elements.upcomingList.appendChild(empty);
    return;
  }

  items.slice(0, 6).forEach((event) => {
    elements.upcomingList.appendChild(createEventCard(event, { preview: true }));
  });
}

function cleanupEventsRouteObserver() {
  if (state.eventsRoute.observer) {
    state.eventsRoute.observer.disconnect();
    state.eventsRoute.observer = null;
  }
}

function renderEventsRouteBatch() {
  const items = upcomingEvents();
  const start = state.eventsRoute.visibleCount;
  const end = nextVisibleCount(start, state.eventsRoute.batchSize, items.length);
  const fragment = document.createDocumentFragment();

  items.slice(start, end).forEach((event) => {
    fragment.appendChild(createEventCard(event));
  });

  elements.eventsRouteList.appendChild(fragment);
  state.eventsRoute.visibleCount = end;

  if (elements.eventsRouteSentinel) {
    elements.eventsRouteSentinel.hidden = state.eventsRoute.visibleCount >= items.length;
  }
  if (elements.eventsRouteLoadMore) {
    elements.eventsRouteLoadMore.hidden = state.eventsRoute.visibleCount >= items.length;
  }
}

function renderEventsRoute() {
  const items = upcomingEvents();
  elements.eventsRouteList.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "event-card";
    empty.textContent = t("empty.events");
    elements.eventsRouteList.appendChild(empty);
    if (elements.eventsRouteSentinel) elements.eventsRouteSentinel.hidden = true;
    if (elements.eventsRouteLoadMore) elements.eventsRouteLoadMore.hidden = true;
    return;
  }

  state.eventsRoute.visibleCount = Math.min(state.eventsRoute.initialBatch, items.length);
  const initialFragment = document.createDocumentFragment();
  items.slice(0, state.eventsRoute.visibleCount).forEach((event) => {
    initialFragment.appendChild(createEventCard(event));
  });
  elements.eventsRouteList.appendChild(initialFragment);

  if (!elements.eventsRouteSentinel) return;
  elements.eventsRouteSentinel.hidden = state.eventsRoute.visibleCount >= items.length;
  if (elements.eventsRouteLoadMore) {
    elements.eventsRouteLoadMore.hidden = state.eventsRoute.visibleCount >= items.length;
  }
  cleanupEventsRouteObserver();

  if (state.eventsRoute.visibleCount < items.length) {
    state.eventsRoute.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        renderEventsRouteBatch();
      });
    }, { rootMargin: "240px 0px", threshold: 0.01 });
    state.eventsRoute.observer.observe(elements.eventsRouteSentinel);
  }
}

function renderCalendar() {
  const date = new Date(state.calendarDate);
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const locale = state.lang === "val" ? "ca-ES" : "es-ES";
  elements.calendarLabel.textContent = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(firstDay);

  elements.calendarGrid.innerHTML = "";
  for (let i = 0; i < startDay; i += 1) {
    const filler = document.createElement("div");
    filler.className = "calendar-day";
    elements.calendarGrid.appendChild(filler);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayEvents = state.events.filter((event) => event.date === dateStr && event.status === "active");
    const cell = document.createElement("div");
    cell.className = "calendar-day";
    if (dayEvents.length) {
      cell.classList.add("has-event");
      cell.onclick = () => openDayModal(dateStr, dayEvents);
    }
    cell.innerHTML = `<span>${day}</span>`;
    if (dayEvents.length) {
      const dot = document.createElement("div");
      dot.className = "dot";
      cell.appendChild(dot);
    }
    elements.calendarGrid.appendChild(cell);
  }
}

function openDayModal(dateStr, events) {
  if (!elements.dayModal) return;
  const locale = state.lang === "val" ? "ca-ES" : "es-ES";
  const date = new Date(`${dateStr}T00:00:00`);
  elements.dayModalTitle.textContent = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(date);
  elements.dayModalList.innerHTML = "";
  events
    .slice()
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""))
    .forEach((event) => {
      const item = document.createElement("div");
      item.className = "modal-item";
      const time = event.time ? event.time : "";
      const title = getEventText(event, "title");
      item.innerHTML = `
        <div>
          <h5>${title}</h5>
          <p>${time}</p>
        </div>
        <button class="ghost">${t("hero.open")}</button>
      `;
      item.querySelector("button").onclick = () => {
        closeDayModal();
        navigate(`/eventos/${encodeURIComponent(event.id)}`);
      };
      elements.dayModalList.appendChild(item);
    });
  elements.dayModal.hidden = false;
}

function closeDayModal() {
  if (!elements.dayModal) return;
  elements.dayModal.hidden = true;
}

function updateStatus(event) {
  if (event.status !== "active") {
    return t(`status.${event.status}`);
  }
  if (event.limit && event.count >= event.limit) {
    return t("status.full");
  }
  return "";
}

function renderAttendees(event) {
  elements.attendeesList.innerHTML = "";
  if (elements.attendeesTitle) {
    const base = t("attendees.title");
    const total = event.limit ? `${event.count}/${event.limit}` : `${event.count}`;
    elements.attendeesTitle.textContent = `${base} (${total})`;
  }
  if (!event.attendees || !event.attendees.length) {
    if (event.count > 0) {
      const loading = document.createElement("p");
      loading.className = "form-hint";
      loading.textContent = t("attendees.loading");
      elements.attendeesList.appendChild(loading);
      loadEventDetails(event.id);
      return;
    }
    const empty = document.createElement("p");
    empty.className = "form-hint";
    empty.textContent = t("empty.attendees");
    elements.attendeesList.appendChild(empty);
    return;
  }
  const maxVisible = 12;
  const list = event.attendees.slice(0, maxVisible);
  list.forEach((name) => {
    const chip = document.createElement("div");
    chip.className = "attendee";
    chip.textContent = name;
    elements.attendeesList.appendChild(chip);
  });
  if (event.attendees.length > maxVisible) {
    const more = document.createElement("button");
    more.className = "ghost mini attendees-more";
    more.textContent = t("cards.more");
    more.onclick = () => {
      elements.attendeesList.innerHTML = "";
      event.attendees.forEach((name) => {
        const chip = document.createElement("div");
        chip.className = "attendee";
        chip.textContent = name;
        elements.attendeesList.appendChild(chip);
      });
    };
    elements.attendeesList.appendChild(more);
  }
}

function renderEventDetails(event) {
  state.selectedEvent = event;
  const extraLabel = getEventText(event, "extra_label");
  const modelText =
    event.model === "extended"
      ? t("model.extended").replace("{label}", extraLabel || t("signup.name"))
      : t("model.basic");

  elements.eventName.textContent = getEventText(event, "title");
  elements.eventDesc.textContent = getEventText(event, "description");
  elements.eventWhen.textContent = formatDateTime(event.date, event.time);
  elements.eventWhere.textContent = getEventText(event, "place") || "-";
  const statusText = updateStatus(event);
  elements.eventStatus.textContent = statusText;
  elements.eventStatus.hidden = !statusText;
  elements.modelInfo.textContent = modelText;

  if (elements.eventAvailability) {
    const info = formatAvailability(event);
    if (info) {
      elements.eventAvailability.innerHTML = `<span class="availability-pill ${info.level}">${info.text}</span>`;
    } else {
      elements.eventAvailability.innerHTML = "";
    }
  }

  elements.signupForm.reset();
  renderSignupRows(event, buildDefaultSignupEntries(state.signupUi.count || 1));
  clearSignupRowErrors();
  if (elements.signupPanel) elements.signupPanel.hidden = false;
  elements.signupConfirm.hidden = true;
  elements.signupHint.textContent = "";
  elements.signupHint.classList.remove("error");
  state.pendingDuplicate = null;
  if (elements.saveSignupHint) {
    elements.saveSignupHint.textContent = "";
  }

  if (event.limit && event.count >= event.limit) {
    setSignupSaving(false);
    elements.signupSubmit.disabled = true;
    elements.signupHint.textContent = t("form.full");
    elements.signupHint.classList.add("error");
  } else {
    setSignupSaving(false);
  }

  renderAttendees(event);
}

async function loadEventDetails(eventId) {
  try {
    const data = await jsonp("event", { id: eventId });
    if (data.ok) {
      state.events = state.events.map((ev) => (ev.id === eventId ? data.event : ev));
      if (state.route.name === "event-detail" && state.route.params.id === eventId) {
        renderEventDetails(data.event);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

function renderEventDetailRoute(eventId) {
  const event = state.events.find((item) => item.id === eventId);
  if (!event) {
    navigate("/eventos", { replace: true });
    return;
  }
  renderEventDetails(event);
  if (!event.attendees) {
    loadEventDetails(eventId);
  }
}

async function adminList() {
  if (!state.admin.authenticated) return;
  setGlobalLoading(true);
  try {
    const data = await jsonp("admin_list", { secret: state.admin.secret });
    if (!data.ok) throw new Error(data.error || "Admin error");
    state.admin.events = data.events || [];
    renderAdminEvents();
  } catch (err) {
    console.error(err);
    elements.adminLoginHint.textContent = "No se pudo cargar el panel.";
  } finally {
    setGlobalLoading(false);
  }
}

function renderAdminEvents() {
  elements.adminEvents.innerHTML = "";
  const activeEvents = state.admin.events.filter((event) => event.status === "active");
  const closedEvents = state.admin.events.filter((event) => event.status === "closed");
  const visibleEvents = state.admin.activeTab === "closed" ? closedEvents : activeEvents;

  if (elements.adminTabActive) {
    elements.adminTabActive.textContent = `Activos (${activeEvents.length})`;
    elements.adminTabActive.classList.toggle("active", state.admin.activeTab === "active");
  }
  if (elements.adminTabClosed) {
    elements.adminTabClosed.textContent = `Cerrados (${closedEvents.length})`;
    elements.adminTabClosed.classList.toggle("active", state.admin.activeTab === "closed");
  }
  if (elements.adminEventsEmpty) {
    elements.adminEventsEmpty.hidden = visibleEvents.length > 0;
  }

  visibleEvents.forEach((event) => {
    const row = document.createElement("div");
    row.className = "admin-event";
    row.innerHTML = `
      <div class="admin-event-content">
        <h5>${event.title || event.id}</h5>
        <p class="form-hint">${event.date || ""}</p>
      </div>
      <div class="admin-event-actions">
        <button class="ghost" data-action="edit">Editar</button>
        <button class="ghost" data-action="list">Lista</button>
        ${
          state.admin.activeTab === "active"
            ? `<button class="danger" data-action="close">Cerrar</button>`
            : `<button class="primary" data-action="duplicate">Duplicar</button>`
        }
      </div>
    `;
    row.querySelector("[data-action='edit']").onclick = () => openAdminEditor(event.id);
    row.querySelector("[data-action='list']").onclick = () => openAdminListView(event.id);
    if (state.admin.activeTab === "active") {
      row.querySelector("[data-action='close']").onclick = () => adminClose(event.id);
    } else {
      row.querySelector("[data-action='duplicate']").onclick = () => adminDuplicate(event.id);
    }
    elements.adminEvents.appendChild(row);
  });
}

function escapeHtml(value) {
  return (value || "")
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildAdminListHtml(payload) {
  const event = payload.event || {};
  const signups = payload.signups || [];
  const totals = payload.extra_totals || {};
  const totalsEntries = Object.entries(totals);
  const totalsHtml = totalsEntries.length
    ? totalsEntries
        .map(
          ([name, count]) =>
            `<span class="summary-pill"><img src="assets/icons/users.svg" alt="" />${escapeHtml(name)}: ${count}</span>`
        )
        .join("")
    : `<p class="muted">Sin acumulados para este evento.</p>`;
  const rowsHtml = signups.length
    ? signups
        .map((row, index) => {
          return `
            <li class="signup-row">
              <div class="signup-main">
                <span class="signup-index">#${index + 1}</span>
                <span class="signup-name">${escapeHtml(row.name)}</span>
              </div>
              ${
                row.extra
                  ? `<span class="summary-pill option-pill">${escapeHtml(row.extra)}</span>`
                  : `<span class="muted">-</span>`
              }
            </li>
          `;
        })
        .join("")
    : "<li class='muted'>No hay nadie apuntado.</li>";
  const when = event.date || "-";
  const where = event.place || "-";

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Lista ${escapeHtml(event.title || event.id || "evento")}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
    <style>
      :root {
        --blue-900: #0d1f4a;
        --blue-700: #173b7a;
        --blue-500: #2458b2;
        --gold: #f1c96a;
        --ink: #101623;
        --muted: #56627a;
        --card: #ffffff;
        --shadow: 0 14px 35px rgba(16, 22, 35, 0.14);
      }
      * { box-sizing: border-box; }
      body {
        font-family: "Inter", "Helvetica Neue", sans-serif;
        margin: 0;
        color: var(--ink);
        background: radial-gradient(circle at 20% 10%, #f2f7ff 0%, #f8fbff 48%, #fff 100%);
      }
      .page {
        width: min(900px, 94vw);
        margin: 24px auto;
      }
      .card {
        background: var(--card);
        border-radius: 20px;
        box-shadow: var(--shadow);
        border: 1px solid rgba(36, 88, 178, 0.12);
        padding: 18px;
        margin-bottom: 14px;
      }
      h1, h3 {
        margin: 0;
        font-family: "Space Grotesk", "Inter", sans-serif;
      }
      h1 { font-size: clamp(1.2rem, 3.8vw, 1.9rem); }
      .event-chip {
        margin-top: 8px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--blue-700);
        font-weight: 700;
        font-size: 0.85rem;
      }
      .event-chip img {
        width: 15px;
        height: 15px;
      }
      .meta {
        margin-top: 6px;
        color: var(--muted);
        font-size: 0.95rem;
      }
      .actions {
        margin-top: 14px;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      button {
        border: 1px solid rgba(36, 88, 178, 0.2);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.9);
        color: var(--blue-700);
        font-weight: 700;
        padding: 9px 14px;
      }
      button.primary {
        background: var(--blue-500);
        color: #fff;
        border-color: transparent;
      }
      .summary {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 10px;
      }
      .summary-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--blue-900);
        background: rgba(241, 201, 106, 0.3);
        border: 1px solid rgba(241, 201, 106, 0.65);
      }
      .summary-pill img {
        width: 14px;
        height: 14px;
      }
      .option-pill {
        background: rgba(36, 88, 178, 0.1);
        border-color: rgba(36, 88, 178, 0.25);
        color: var(--blue-700);
      }
      .signup-list {
        list-style: none;
        margin: 10px 0 0;
        padding: 0;
        display: grid;
        gap: 8px;
      }
      .signup-row {
        border: 1px solid rgba(36, 88, 178, 0.1);
        border-radius: 12px;
        padding: 10px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        background: rgba(255, 255, 255, 0.8);
      }
      .signup-main {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .signup-index {
        color: var(--muted);
        font-size: 0.85rem;
      }
      .signup-name {
        font-weight: 700;
        overflow-wrap: anywhere;
      }
      .muted {
        margin: 0;
        color: var(--muted);
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="card">
        <h1>${escapeHtml(event.title || event.id || "Evento")}</h1>
        <div class="event-chip">
          <img src="assets/icons/calendar.svg" alt="" />
          ${escapeHtml(when)}
        </div>
        <div class="meta">${escapeHtml(where)}</div>
        <div class="actions">
          <button onclick="window.print()">Imprimir</button>
          <button class="primary" onclick="shareList()">Compartir</button>
        </div>
      </section>
      <section class="card">
        <h3>Acumulado</h3>
        <div class="summary">${totalsHtml}</div>
      </section>
      <section class="card">
        <h3>Participantes (${signups.length})</h3>
        <ul class="signup-list">${rowsHtml}</ul>
      </section>
    </main>
    <script>
      async function shareList() {
        const text = document.body.innerText;
        if (navigator.share) {
          try {
            await navigator.share({ title: document.title, text });
            return;
          } catch (_err) {}
        }
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(text);
          alert("Lista copiada al portapapeles.");
          return;
        }
        alert("No se puede compartir automáticamente en este navegador.");
      }
    </script>
  </body>
</html>`;
}

async function openAdminListView(eventId) {
  const id = (eventId || "").toString().trim();
  if (!id) {
    alert("Este evento no tiene ID válido.");
    return;
  }
  const popup = window.open("", "_blank");
  if (!popup) {
    alert("Permite ventanas emergentes para abrir la lista.");
    return;
  }
  popup.document.write("<p style='font-family:Inter,Arial,sans-serif;padding:20px'>Cargando lista...</p>");
  try {
    const data = await jsonp("admin_event_signups", { secret: state.admin.secret, id });
    if (!data.ok) throw new Error(data.error || "Admin error");
    popup.document.open();
    popup.document.write(buildAdminListHtml(data));
    popup.document.close();
  } catch (err) {
    console.error(err);
    popup.document.open();
    popup.document.write(
      "<p style='font-family:Inter,Arial,sans-serif;padding:20px'>No se pudo cargar la lista.</p>"
    );
    popup.document.close();
  }
}

function openAdminEditor(id) {
  const event = state.admin.events.find((item) => item.id === id);
  if (!event) return;
  state.admin.editingId = id;
  elements.adminEditor.hidden = false;
  elements.adminEditorTitle.textContent = "Editar evento";
  const form = elements.adminForm;
  form.title.value = event.title || "";
  form.title_val.value = event.title_val || "";
  form.date.value = event.date || "";
  form.time.value = event.time || "";
  form.place.value = event.place || "";
  form.place_val.value = event.place_val || "";
  form.description.value = event.description || "";
  form.description_val.value = event.description_val || "";
  form.model.value = event.model || "basic";
  form.extra_label.value = event.extra_label || "";
  form.extra_options.value = event.extra_options || "";
  form.extra_options_val.value = event.extra_options_val || "";
  form.extra_label_val.value = event.extra_label_val || "";
  form.event_pin.value = event.event_pin || "";
  form.limit.value = event.limit || "";
  form.status.value = event.status || "active";
  toggleAdminExtraFields();
}

function openAdminNew() {
  state.admin.editingId = null;
  elements.adminEditor.hidden = false;
  elements.adminEditorTitle.textContent = "Nuevo evento";
  elements.adminForm.reset();
  toggleAdminExtraFields();
}

function toggleAdminExtraFields() {
  if (!elements.adminModel) return;
  const show = elements.adminModel.value === "extended";
  if (elements.adminExtraLabel) elements.adminExtraLabel.hidden = !show;
  if (elements.adminExtraLabelVal) elements.adminExtraLabelVal.hidden = !show;
}

async function adminSave() {
  const form = elements.adminForm;
  const payload = {
    secret: state.admin.secret,
    id: state.admin.editingId || "",
    title: form.title.value.trim(),
    title_val: form.title_val.value.trim(),
    date: form.date.value,
    time: form.time.value,
    place: form.place.value.trim(),
    place_val: form.place_val.value.trim(),
    description: form.description.value.trim(),
    description_val: form.description_val.value.trim(),
    model: form.model.value,
    extra_label: form.extra_label.value.trim(),
    extra_options: form.extra_options.value.trim(),
    extra_options_val: form.extra_options_val.value.trim(),
    extra_label_val: form.extra_label_val.value.trim(),
    event_pin: form.event_pin.value.trim(),
    limit: form.limit.value,
    status: form.status.value,
  };
  try {
    const data = await jsonp("admin_save", payload);
    if (!data.ok) throw new Error(data.error || "Admin error");
    elements.adminFormHint.textContent = "Guardado.";
    await adminList();
  } catch (err) {
    console.error(err);
    elements.adminFormHint.textContent = "No se pudo guardar.";
  }
}

async function adminClose(id) {
  if (!id) return;
  if (!confirm("Cerrar este evento?")) return;
  try {
    const data = await jsonp("admin_close", { secret: state.admin.secret, id });
    if (!data.ok) throw new Error(data.error || "Admin error");
    await adminList();
  } catch (err) {
    console.error(err);
  }
}

async function adminDuplicate(id) {
  if (!id) return;
  try {
    const data = await jsonp("admin_duplicate", { secret: state.admin.secret, id });
    if (!data.ok) throw new Error(data.error || "Admin error");
    elements.adminFormHint.textContent = "Evento duplicado.";
    state.admin.activeTab = "active";
    await adminList();
  } catch (err) {
    console.error(err);
    elements.adminFormHint.textContent = "No se pudo duplicar.";
  }
}

async function adminDelete() {
  const id = state.admin.editingId;
  if (!id) return;
  if (!confirm("Eliminar este evento?")) return;
  try {
    const data = await jsonp("admin_delete", { secret: state.admin.secret, id });
    if (!data.ok) throw new Error(data.error || "Admin error");
    elements.adminFormHint.textContent = "Eliminado.";
    elements.adminEditor.hidden = true;
    await adminList();
  } catch (err) {
    console.error(err);
    elements.adminFormHint.textContent = "No se pudo eliminar.";
  }
}

function jsonp(action, params = {}) {
  return new Promise((resolve, reject) => {
    if (!CONFIG.API_URL || CONFIG.API_URL.includes("PASTE")) {
      reject(new Error("API not configured"));
      return;
    }
    const callback = `cb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const query = new URLSearchParams({ action, callback, ...params }).toString();
    const script = document.createElement("script");
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timeout"));
    }, 12000);

    function cleanup() {
      delete window[callback];
      clearTimeout(timeout);
      script.remove();
    }

    window[callback] = (data) => {
      cleanup();
      resolve(data);
    };

    script.src = `${CONFIG.API_URL}?${query}`;
    script.onerror = () => {
      cleanup();
      reject(new Error("Network error"));
    };
    document.body.appendChild(script);
  });
}

async function loadEvents() {
  setGlobalLoading(true);
  try {
    const data = await jsonp("events");
    if (!data.ok) throw new Error(data.error || "API error");
    state.events = data.events || [];
    state.dataLoaded = true;
    resolveRoute();
  } catch (err) {
    console.error(err);
  } finally {
    setGlobalLoading(false);
  }
}

async function submitSignup({ allowDuplicate = false } = {}) {
  if (!state.selectedEvent) return;
  const event = state.selectedEvent;
  const rows = getSignupEntriesFromDom();
  clearSignupRowErrors();
  const errors = [];
  const validEntries = [];
  const seenNames = new Set();
  const isExtended = event.model === "extended";

  rows.forEach((row) => {
    if (!row.name) {
      errors.push({ client_row_id: row.rowId, code: "required_name" });
      return;
    }
    if (!isValidFullName(row.name)) {
      errors.push({ client_row_id: row.rowId, code: "invalid_name" });
      return;
    }
    const lower = row.name.toLowerCase();
    if (seenNames.has(lower)) {
      errors.push({ client_row_id: row.rowId, code: "duplicate_batch" });
      return;
    }
    seenNames.add(lower);
    if (isExtended && !row.extra) {
      errors.push({ client_row_id: row.rowId, code: "missing_extra" });
      return;
    }
    validEntries.push({
      client_row_id: row.rowId,
      name: row.name,
      extra: row.extra || "",
    });
  });

  if (errors.length) {
    applySignupRowErrors(errors);
    elements.signupHint.textContent = t("form.fixRows");
    elements.signupHint.classList.add("error");
  } else {
    elements.signupHint.classList.remove("error");
    elements.signupHint.textContent = "";
  }

  if (!validEntries.length) return;
  setSignupSaving(true);

  try {
    const result = await jsonp("signup_batch", {
      event_id: state.selectedEvent.id,
      entries: JSON.stringify(validEntries),
      allow_duplicate: allowDuplicate ? "1" : "0",
    });

    const rowErrors = result.errors || [];
    clearSignupRowErrors();
    if (rowErrors.length) {
      applySignupRowErrors(rowErrors);
    }
    const hasDuplicateErrors = rowErrors.some((item) => item.code === "duplicate");
    elements.signupConfirm.hidden = !hasDuplicateErrors;
    if (!result.ok && !result.saved_count) {
      elements.signupHint.textContent = t("form.fixRows");
      elements.signupHint.classList.add("error");
      return;
    }

    const pendingIds = new Set(rowErrors.map((item) => item.client_row_id));
    const pendingEntries = validEntries.filter((entry) => pendingIds.has(entry.client_row_id));

    if (pendingEntries.length) {
      renderSignupRows(event, pendingEntries.map((entry) => ({ rowId: entry.client_row_id, name: entry.name, extra: entry.extra })));
      applySignupRowErrors(rowErrors);
      elements.signupHint.textContent = t("form.partial")
        .replace("{saved}", String(result.saved_count || 0))
        .replace("{pending}", String(pendingEntries.length));
      elements.signupHint.classList.remove("error");
    } else {
      if (elements.signupPanel) elements.signupPanel.hidden = true;
      elements.signupConfirm.hidden = true;
      const tokenUrl = `${window.location.origin}${window.location.pathname}#/inscripcion/${result.token}`;
      elements.signupHint.textContent = "";
      elements.signupHint.classList.remove("error");
      state.signupSuccess = { eventId: result.event_id, tokenUrl };
      openSignupCompleteModal();
    }
  } catch (err) {
    console.error(err);
    elements.signupHint.textContent = t("form.error");
  } finally {
    setSignupSaving(false);
  }
}

async function refreshEvent(eventId) {
  try {
    const data = await jsonp("event", { id: eventId });
    if (data.ok) {
      state.events = state.events.map((ev) => (ev.id === eventId ? data.event : ev));
      if (state.route.name === "event-detail" && state.route.params.id === eventId) {
        renderEventDetails(data.event);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

async function loadTokenRecord(token) {
  if (!token) return;

  try {
    const tokenInput = elements.tokenForm.querySelector("input[name='token']");
    tokenInput.value = token;

    const data = await jsonp("signup_by_token", { token });
    if (!data.ok) {
      state.tokenRecord = null;
      elements.tokenEditor.hidden = true;
      return;
    }

    state.tokenRecord = data;
    elements.tokenEditor.hidden = false;
    const namesInput = elements.editForm.elements.namedItem("names");
    const extraInput = elements.editForm.elements.namedItem("extra_text");
    const extraSelect = elements.editForm.elements.namedItem("extra_select");
    if (namesInput) {
      const names = data.signup.names || (data.signup.name ? [data.signup.name] : []);
      namesInput.value = names.join("\n");
    }
    if (data.event.model === "extended") {
      elements.editExtraField.hidden = false;
      elements.editExtraLabel.textContent = data.event.extra_label || "Detalle";
      const options = parseEventOptions(getEventOptionsText(data.event));
      if (options.length && extraSelect && extraInput) {
        extraSelect.innerHTML = "";
        options.forEach((optionValue) => {
          const option = document.createElement("option");
          option.value = optionValue;
          option.textContent = optionValue;
          extraSelect.appendChild(option);
        });
        extraSelect.hidden = false;
        extraInput.hidden = true;
        if (data.signup.extra) extraSelect.value = data.signup.extra;
      } else {
        if (extraInput) {
          extraInput.hidden = false;
          extraInput.value = data.signup.extra || "";
        }
        if (extraSelect) {
          extraSelect.hidden = true;
          extraSelect.innerHTML = "";
        }
      }
    } else {
      elements.editExtraField.hidden = true;
      if (extraInput) extraInput.value = "";
      if (extraSelect) {
        extraSelect.hidden = true;
        extraSelect.innerHTML = "";
      }
    }
  } catch (err) {
    console.error(err);
  }
}

async function updateTokenRecord() {
  if (!state.tokenRecord) return;
  const namesInput = elements.editForm.elements.namedItem("names");
  const names = parseNamesInput(namesInput ? namesInput.value : "");
  const extra = getSignupExtraValue(elements.editForm);
  if (!names.length || names.length > 5 || names.some((name) => !isValidFullName(name))) {
    alert(t("form.invalidName"));
    return;
  }
  try {
    const data = await jsonp("edit", {
      token: state.tokenRecord.signup.token,
      names: JSON.stringify(names),
      extra,
    });
    if (data.ok) {
      alert(t("token.updated"));
      await refreshEvent(data.event_id);
    }
  } catch (err) {
    console.error(err);
  }
}

async function deleteTokenRecord() {
  if (!state.tokenRecord) return;
  if (!confirm(t("token.delete"))) return;
  try {
    const data = await jsonp("delete", { token: state.tokenRecord.signup.token });
    if (data.ok) {
      alert(t("token.deleted"));
      elements.tokenEditor.hidden = true;
      state.tokenRecord = null;
      await refreshEvent(data.event_id);
    }
  } catch (err) {
    console.error(err);
  }
}

function hideAllRouteSections() {
  elements.accessGate.hidden = true;
  elements.heroSection.hidden = true;
  elements.upcomingSection.hidden = true;
  elements.calendarSection.hidden = true;
  elements.eventsRouteSection.hidden = true;
  elements.eventDetail.hidden = true;
  elements.tokenSection.hidden = true;
  elements.legalSection.hidden = true;
  elements.adminSection.hidden = true;
}

function renderRoute(route) {
  state.route = route;
  closeDayModal();
  if (elements.signupCompleteModal && !elements.signupCompleteModal.hidden) {
    closeSignupCompleteModal({ refresh: false });
  }
  cleanupEventsRouteObserver();
  hideAllRouteSections();

  if (route.name === "home") {
    elements.heroSection.hidden = false;
    elements.upcomingSection.hidden = false;
    elements.legalSection.hidden = false;

    renderHero();
    renderUpcoming();
    return;
  }

  if (route.name === "calendar") {
    elements.calendarSection.hidden = false;
    renderCalendar();
    return;
  }

  if (route.name === "events") {
    elements.eventsRouteSection.hidden = false;
    renderEventsRoute();
    return;
  }

  if (route.name === "event-detail") {
    elements.eventDetail.hidden = false;
    renderEventDetailRoute(route.params.id);
    return;
  }

  if (route.name === "signup-token") {
    elements.tokenSection.hidden = false;
    elements.tokenEditor.hidden = true;
    loadTokenRecord(route.params.token);
    return;
  }

  if (route.name === "admin") {
    elements.adminSection.hidden = false;
    if (state.admin.authenticated) {
      elements.adminLoginCard.hidden = true;
      elements.adminPanel.hidden = false;
      adminList();
    } else {
      elements.adminLoginCard.hidden = false;
      elements.adminPanel.hidden = true;
    }
    return;
  }

  navigate("/", { replace: true });
}

function resolveRoute() {
  const route = parseHashRoute(window.location.hash || "#/");
  if (
    !state.dataLoaded &&
    (route.name === "home" || route.name === "calendar" || route.name === "events" || route.name === "event-detail")
  ) {
    return;
  }
  if (shouldProtectRoute(route) && !state.access.unlocked) {
    if (isAccessLocked()) {
      gateRoute(route);
      const minutes = Math.ceil((state.access.lockedUntil - Date.now()) / 60000);
      if (elements.accessGateHint) {
        elements.accessGateHint.textContent = t("access.locked").replace("{minutes}", String(minutes));
        elements.accessGateHint.classList.add("error");
      }
      return;
    }
    gateRoute(route);
    if (elements.accessGateHint) {
      elements.accessGateHint.textContent = "";
      elements.accessGateHint.classList.remove("error");
    }
    return;
  }
  renderRoute(route);
  window.scrollTo(0, 0);
}

function setupEvents() {
  document.getElementById("year").textContent = new Date().getFullYear();

  if (elements.headerLogoBtn) {
    elements.headerLogoBtn.onclick = () => navigate("/");
  }

  if (elements.headerHomeBtn) {
    elements.headerHomeBtn.onclick = () => navigate("/");
  }

  if (elements.headerCalendarBtn) {
    elements.headerCalendarBtn.onclick = () => navigate("/calendario");
  }

  if (elements.ctaUpcoming) {
    elements.ctaUpcoming.onclick = () => navigate("/eventos");
  }

  if (elements.eventsRouteLoadMore) {
    elements.eventsRouteLoadMore.onclick = () => renderEventsRouteBatch();
  }

  if (elements.ctaCalendar) {
    elements.ctaCalendar.onclick = () => navigate("/calendario");
  }

  if (elements.signupCountDec) {
    elements.signupCountDec.onclick = () => resizeSignupRows(state.signupUi.count - 1);
  }

  if (elements.signupCountInc) {
    elements.signupCountInc.onclick = () => {
      if (state.signupUi.count >= state.signupUi.max) {
        elements.signupHint.textContent = t("form.maxPeopleHard");
        elements.signupHint.classList.add("error");
        return;
      }
      elements.signupHint.textContent = "";
      elements.signupHint.classList.remove("error");
      resizeSignupRows(state.signupUi.count + 1);
    };
  }

  elements.closeEvent.onclick = () => {
    navigate("/eventos");
  };

  document.getElementById("prev-month").onclick = () => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
    if (state.route.name === "calendar") {
      renderCalendar();
    }
  };

  document.getElementById("next-month").onclick = () => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
    if (state.route.name === "calendar") {
      renderCalendar();
    }
  };

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.onclick = () => setLanguage(btn.dataset.lang);
  });

  elements.signupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitSignup({ allowDuplicate: false });
  });

  elements.signupConfirm.onclick = () => {
    submitSignup({ allowDuplicate: true });
  };

  if (elements.accessGateForm) {
    elements.accessGateForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (isAccessLocked()) {
        const minutes = Math.ceil((state.access.lockedUntil - Date.now()) / 60000);
        elements.accessGateHint.textContent = t("access.locked").replace("{minutes}", String(minutes));
        elements.accessGateHint.classList.add("error");
        return;
      }
      const secret = new FormData(elements.accessGateForm).get("secret").toString().trim();
      const route = state.access.pendingRoute || parseHashRoute(window.location.hash || "#/");
      const expectedSecret = requiredSecretForRoute(route);
      if (!expectedSecret || secret === expectedSecret) {
        clearAccessFailures();
        if (elements.accessGateHint) {
          elements.accessGateHint.textContent = "";
          elements.accessGateHint.classList.remove("error");
        }
        resolveRoute();
        return;
      }
      registerAccessFailure();
      if (isAccessLocked()) {
        elements.accessGateHint.textContent = t("access.locked").replace("{minutes}", "5");
      } else {
        elements.accessGateHint.textContent = t("access.invalid");
      }
      elements.accessGateHint.classList.add("error");
    });
  }

  if (elements.saveSignupAccess) {
    elements.saveSignupAccess.onclick = async () => {
      const tokenUrl = state.signupSuccess && state.signupSuccess.tokenUrl;
      const eventTitle = state.selectedEvent ? getEventText(state.selectedEvent, "title") : "";
      if (!tokenUrl) return;
      const text = `${eventTitle || t("signup.successTitle")}: ${tokenUrl}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: eventTitle || t("signup.successTitle"), text, url: tokenUrl });
          if (elements.saveSignupHint) elements.saveSignupHint.textContent = t("signup.savedAccess");
          return;
        } catch (_err) {
          // fall back to copy
        }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        if (elements.saveSignupHint) {
          elements.saveSignupHint.textContent = t("signup.savedAccess");
        }
      }
    };
  }

  if (elements.saveCalendarEvent) {
    elements.saveCalendarEvent.onclick = () => {
      if (!state.selectedEvent || !hasCalendarData(state.selectedEvent)) return;
      window.open(buildGoogleCalendarUrl(state.selectedEvent), "_blank", "noopener");
    };
  }

  if (elements.signupCompleteBackdrop) {
    elements.signupCompleteBackdrop.onclick = () => closeSignupCompleteModal();
  }

  if (elements.signupCompleteClose) {
    elements.signupCompleteClose.onclick = () => closeSignupCompleteModal();
  }

  elements.tokenForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = new FormData(elements.tokenForm).get("token").toString().trim();
    if (!value) return;
    const marker = "#/inscripcion/";
    const token = value.includes(marker) ? value.split(marker)[1] : value;
    navigate(`/inscripcion/${encodeURIComponent(token)}`);
  });

  elements.editForm.addEventListener("submit", (event) => {
    event.preventDefault();
    updateTokenRecord();
  });

  document.getElementById("delete-signup").onclick = () => {
    deleteTokenRecord();
  };

  if (elements.adminLoginForm) {
    elements.adminLoginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const secret = new FormData(elements.adminLoginForm).get("secret").toString().trim();
      if (!secret) return;
      state.admin.secret = secret;
      state.admin.authenticated = true;
      sessionStorage.setItem("admin_secret", secret);
      elements.adminLoginCard.hidden = true;
      elements.adminPanel.hidden = false;
      adminList();
    });
  }

  if (elements.adminNew) {
    elements.adminNew.onclick = () => openAdminNew();
  }

  if (elements.adminForm) {
    elements.adminForm.addEventListener("submit", (event) => {
      event.preventDefault();
      adminSave();
    });
  }

  if (elements.adminModel) {
    elements.adminModel.addEventListener("change", () => toggleAdminExtraFields());
  }

  if (elements.adminDelete) {
    elements.adminDelete.onclick = () => adminDelete();
  }

  if (elements.adminTabActive) {
    elements.adminTabActive.onclick = () => {
      state.admin.activeTab = "active";
      renderAdminEvents();
    };
  }

  if (elements.adminTabClosed) {
    elements.adminTabClosed.onclick = () => {
      state.admin.activeTab = "closed";
      renderAdminEvents();
    };
  }

  if (elements.dayModalBackdrop) {
    elements.dayModalBackdrop.onclick = () => closeDayModal();
  }

  if (elements.dayModalClose) {
    elements.dayModalClose.onclick = () => closeDayModal();
  }

  window.addEventListener("hashchange", () => {
    resolveRoute();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.signupCompleteModal && !elements.signupCompleteModal.hidden) {
      closeSignupCompleteModal();
    }
  });
}

function init() {
  const storedLang = localStorage.getItem("lang");
  if (storedLang) state.lang = storedLang;
  applyI18n();
  setupEvents();

  const adminSecret = sessionStorage.getItem("admin_secret");
  if (adminSecret) {
    state.admin.secret = adminSecret;
    state.admin.authenticated = true;
  }

  state.access.unlocked = sessionStorage.getItem("access_unlocked") === "1";
  state.access.failed = Number(sessionStorage.getItem("access_failed") || "0");
  state.access.lockedUntil = Number(sessionStorage.getItem("access_locked_until") || "0");

  toggleAdminExtraFields();
  loadEvents();

  if (!window.location.hash) {
    navigate("/", { replace: true });
  } else {
    resolveRoute();
  }
}

init();
