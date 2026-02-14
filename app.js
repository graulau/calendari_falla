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
  demo: false,
  signupSuccess: null,
  route: { name: "home", params: {} },
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
  },
};

const elements = {
  page: document.querySelector("main.page"),
  loadingOverlay: document.getElementById("loading-overlay"),
  heroSection: document.querySelector("section.hero"),
  upcomingSection: document.getElementById("upcoming"),
  calendarSection: document.getElementById("calendar"),
  eventsRouteSection: document.getElementById("events-route"),
  eventsRouteList: document.getElementById("events-route-list"),
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
  extraField: document.getElementById("extra-field"),
  extraLabel: document.getElementById("extra-label"),
  signupPanel: document.getElementById("signup-panel"),
  signupForm: document.getElementById("signup-form"),
  signupSubmit: document.getElementById("signup-submit"),
  signupConfirm: document.getElementById("signup-confirm"),
  signupHint: document.getElementById("signup-hint"),
  signupSuccess: document.getElementById("signup-success"),
  saveSignupAccess: document.getElementById("save-signup-access"),
  saveSignupHint: document.getElementById("save-signup-hint"),
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
  adminEditor: document.getElementById("admin-editor"),
  adminEditorTitle: document.getElementById("admin-editor-title"),
  adminForm: document.getElementById("admin-form"),
  adminFormHint: document.getElementById("admin-form-hint"),
  adminNew: document.getElementById("admin-new"),
  adminDelete: document.getElementById("admin-delete"),
  adminModel: document.getElementById("admin-model"),
  adminExtraLabel: document.getElementById("admin-extra-label"),
  adminExtraLabelVal: document.getElementById("admin-extra-label-val"),
  adminCloseSelect: document.getElementById("admin-close-select"),
  adminCloseBtn: document.getElementById("admin-close-btn"),
  demoToggle: document.getElementById("demo-toggle"),
  demoToggleInput: document.getElementById("demo-toggle-input"),
  dayModal: document.getElementById("day-modal"),
  dayModalBackdrop: document.getElementById("day-modal-backdrop"),
  dayModalClose: document.getElementById("day-modal-close"),
  dayModalTitle: document.getElementById("day-modal-title"),
  dayModalList: document.getElementById("day-modal-list"),
  headerHomeBtn: document.getElementById("header-home-btn"),
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
  cleanupEventsRouteObserver();

  if (state.eventsRoute.visibleCount < items.length) {
    state.eventsRoute.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        renderEventsRouteBatch();
      });
    });
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
  return t("status.open");
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
  const keepSuccess = state.signupSuccess && state.signupSuccess.eventId === event.id;

  elements.eventName.textContent = getEventText(event, "title");
  elements.eventDesc.textContent = getEventText(event, "description");
  elements.eventWhen.textContent = formatDateTime(event.date, event.time);
  elements.eventWhere.textContent = getEventText(event, "place") || "-";
  elements.eventStatus.textContent = updateStatus(event);
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
  if (elements.signupPanel) elements.signupPanel.hidden = !!keepSuccess;
  elements.signupSuccess.hidden = !keepSuccess;
  elements.signupConfirm.hidden = true;
  elements.signupHint.textContent = keepSuccess ? t("form.ok") : "";
  elements.signupHint.classList.remove("error");
  state.pendingDuplicate = null;
  if (!keepSuccess && elements.saveSignupHint) {
    elements.saveSignupHint.textContent = "";
  }

  if (event.model === "extended") {
    elements.extraField.hidden = false;
    const label = getEventText(event, "extra_label") || "Detalle";
    elements.extraLabel.textContent = label;
  } else {
    elements.extraField.hidden = true;
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
    if (state.demo) return;
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
  if (!state.signupSuccess || state.signupSuccess.eventId !== eventId) {
    state.signupSuccess = null;
  }
  renderEventDetails(event);
  if (!event.attendees) {
    loadEventDetails(eventId);
  }
}

async function adminList() {
  if (!state.admin.authenticated) return;
  try {
    const data = await jsonp("admin_list", { secret: state.admin.secret });
    if (!data.ok) throw new Error(data.error || "Admin error");
    state.admin.events = data.events || [];
    renderAdminEvents();
  } catch (err) {
    console.error(err);
    elements.adminLoginHint.textContent = "No se pudo cargar el panel.";
  }
}

function renderAdminEvents() {
  elements.adminEvents.innerHTML = "";
  if (elements.adminCloseSelect) {
    elements.adminCloseSelect.innerHTML = "";
    const active = state.admin.events.filter((event) => event.status === "active");
    active.forEach((event) => {
      const option = document.createElement("option");
      option.value = event.id;
      option.textContent = `${event.title || event.id} (${event.date || ""})`;
      elements.adminCloseSelect.appendChild(option);
    });
  }
  state.admin.events.forEach((event) => {
    const row = document.createElement("div");
    row.className = "admin-event";
    row.innerHTML = `
      <div>
        <h5>${event.title || event.id}</h5>
        <p class="form-hint">${event.date || ""}</p>
      </div>
      <button class="ghost" data-id="${event.id}">Editar</button>
    `;
    row.querySelector("button").onclick = () => openAdminEditor(event.id);
    elements.adminEvents.appendChild(row);
  });
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
  form.extra_label_val.value = event.extra_label_val || "";
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
    extra_label_val: form.extra_label_val.value.trim(),
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

async function adminClose() {
  if (!elements.adminCloseSelect) return;
  const id = elements.adminCloseSelect.value;
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

function initDemo() {
  state.demo = true;
  const banner = document.getElementById("demo-banner");
  if (banner) banner.hidden = false;
  const demo = (CONFIG.DEMO_EVENTS || []).map((event) => {
    const count = (event.attendees || []).length;
    return { ...event, count };
  });
  state.events = demo;
  state.dataLoaded = true;
  resolveRoute();
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
  if (state.demo) {
    setSignupSaving(true);
    try {
      const formData = new FormData(elements.signupForm);
      const name = (formData.get("name") || "").toString().trim();
      if (!name) return;

      const event = state.events.find((item) => item.id === state.selectedEvent.id);
      if (!event) return;

      const duplicate = (event.attendees || []).some(
        (attendee) => attendee.toLowerCase() === name.toLowerCase()
      );
      if (duplicate && !allowDuplicate) {
        elements.signupConfirm.hidden = false;
        elements.signupHint.textContent = t("form.duplicate");
        elements.signupHint.classList.add("error");
        return;
      }

      if (event.limit && event.count >= event.limit) {
        elements.signupHint.textContent = t("form.full");
        elements.signupHint.classList.add("error");
        return;
      }

      event.attendees = event.attendees || [];
      event.attendees.push(name);
      event.count = event.attendees.length;

      if (elements.signupPanel) elements.signupPanel.hidden = true;
      elements.signupSuccess.hidden = false;
      elements.signupConfirm.hidden = true;
      const tokenUrl = `${window.location.origin}${window.location.pathname}#/inscripcion/demo-${Date.now()}`;
      elements.signupHint.textContent = t("form.ok");
      elements.signupHint.classList.remove("error");
      state.signupSuccess = { eventId: event.id, tokenUrl };

      renderEventDetails(event);
      return;
    } finally {
      setSignupSaving(false);
    }
  }

  const formData = new FormData(elements.signupForm);
  const name = (formData.get("name") || "").toString().trim();
  const extra = (formData.get("extra") || "").toString().trim();
  if (!name) return;

  setSignupSaving(true);
  elements.signupHint.textContent = "";

  try {
    const result = await jsonp("signup", {
      event_id: state.selectedEvent.id,
      name,
      extra,
      allow_duplicate: allowDuplicate ? "1" : "0",
    });

    if (!result.ok && result.code === "duplicate") {
      state.pendingDuplicate = { name, extra };
      elements.signupConfirm.hidden = false;
      elements.signupHint.textContent = t("form.duplicate");
      elements.signupHint.classList.add("error");
      return;
    }

    if (!result.ok && result.code === "full") {
      elements.signupHint.textContent = t("form.full");
      elements.signupHint.classList.add("error");
      return;
    }

    if (!result.ok) {
      elements.signupHint.textContent = t("form.error");
      elements.signupHint.classList.add("error");
      return;
    }

    if (elements.signupPanel) elements.signupPanel.hidden = true;
    elements.signupSuccess.hidden = false;
    elements.signupConfirm.hidden = true;
    const tokenUrl = `${window.location.origin}${window.location.pathname}#/inscripcion/${result.token}`;
    elements.signupHint.textContent = t("form.ok");
    elements.signupHint.classList.remove("error");
    state.signupSuccess = { eventId: result.event_id, tokenUrl };

    await refreshEvent(result.event_id);
  } catch (err) {
    console.error(err);
    elements.signupHint.textContent = t("form.error");
  } finally {
    setSignupSaving(false);
  }
}

async function refreshEvent(eventId) {
  try {
    if (state.demo) return;
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

    if (state.demo) {
      elements.tokenEditor.hidden = true;
      alert(t("token.loaded"));
      return;
    }

    const data = await jsonp("signup_by_token", { token });
    if (!data.ok) {
      state.tokenRecord = null;
      elements.tokenEditor.hidden = true;
      return;
    }

    state.tokenRecord = data;
    elements.tokenEditor.hidden = false;
    const nameInput = elements.editForm.elements.namedItem("name");
    const extraInput = elements.editForm.elements.namedItem("extra");
    if (nameInput) nameInput.value = data.signup.name;
    if (data.event.model === "extended") {
      elements.editExtraField.hidden = false;
      elements.editExtraLabel.textContent = data.event.extra_label || "Detalle";
      if (extraInput) extraInput.value = data.signup.extra || "";
    } else {
      elements.editExtraField.hidden = true;
      if (extraInput) extraInput.value = "";
    }
  } catch (err) {
    console.error(err);
  }
}

async function updateTokenRecord() {
  if (!state.tokenRecord) return;
  if (state.demo) {
    alert(t("token.updated"));
    return;
  }
  const nameInput = elements.editForm.elements.namedItem("name");
  const extraInput = elements.editForm.elements.namedItem("extra");
  const name = nameInput ? nameInput.value.trim() : "";
  const extra = extraInput ? extraInput.value.trim() : "";
  try {
    const data = await jsonp("edit", {
      token: state.tokenRecord.signup.token,
      name,
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
  if (state.demo) {
    alert(t("token.deleted"));
    return;
  }
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
  renderRoute(route);
  window.scrollTo(0, 0);
}

function setupEvents() {
  document.getElementById("year").textContent = new Date().getFullYear();

  if (elements.headerHomeBtn) {
    elements.headerHomeBtn.onclick = () => navigate("/");
  }

  if (elements.ctaUpcoming) {
    elements.ctaUpcoming.onclick = () => navigate("/eventos");
  }

  if (elements.ctaCalendar) {
    elements.ctaCalendar.onclick = () => navigate("/calendario");
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

  if (elements.saveSignupAccess) {
    elements.saveSignupAccess.onclick = async () => {
      const tokenUrl = state.signupSuccess && state.signupSuccess.tokenUrl;
      if (!tokenUrl) return;
      const text = `${t("signup.successTitle")}: ${tokenUrl}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: t("signup.successTitle"), text, url: tokenUrl });
          if (elements.saveSignupHint) elements.saveSignupHint.textContent = t("signup.savedAccess");
          return;
        } catch (_err) {
          // fall back to copy
        }
      }
      await navigator.clipboard.writeText(tokenUrl);
      if (elements.saveSignupHint) {
        elements.saveSignupHint.textContent = t("signup.savedAccess");
      }
    };
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

  if (elements.adminCloseBtn) {
    elements.adminCloseBtn.onclick = () => adminClose();
  }

  if (elements.adminDelete) {
    elements.adminDelete.onclick = () => adminDelete();
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

  const query = new URLSearchParams(window.location.search);
  if (query.has("demo")) {
    localStorage.setItem("use_demo", query.get("demo") === "1" ? "1" : "0");
  }

  const storedDemo = localStorage.getItem("use_demo");
  const useDemo =
    storedDemo === "1" ||
    (!CONFIG.API_URL || CONFIG.API_URL.includes("PASTE")) ||
    (CONFIG.DEMO && storedDemo !== "0");

  if (CONFIG.ALLOW_DEMO_TOGGLE && elements.demoToggle && elements.demoToggleInput) {
    elements.demoToggle.hidden = false;
    elements.demoToggleInput.checked = useDemo;
    elements.demoToggleInput.addEventListener("change", () => {
      localStorage.setItem("use_demo", elements.demoToggleInput.checked ? "1" : "0");
      window.location.reload();
    });
  }

  toggleAdminExtraFields();

  if (useDemo) {
    initDemo();
  } else {
    loadEvents();
  }

  if (!window.location.hash) {
    navigate("/", { replace: true });
  } else {
    resolveRoute();
  }
}

init();
