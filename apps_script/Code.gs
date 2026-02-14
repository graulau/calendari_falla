const CONFIG = {
  SHEET_EVENTS: "events",
  SHEET_SIGNUPS: "signups",
  TZ: "Europe/Madrid",
  ADMIN_EMAIL: "castielfabibfalla@gmail.com",
  ADMIN_SECRET: "CAMBIA_ESTA_CLAVE",
  SHEET_ID: "1KkkDO2AnInjDdFBmxm2lQ2bux-xOUe_jzH-qtcP2_b0",
};

const EVENT_HEADERS = [
  "id",
  "title",
  "title_val",
  "date",
  "time",
  "place",
  "place_val",
  "description",
  "description_val",
  "model",
  "extra_label",
  "extra_label_val",
  "limit",
  "status",
  "created_at",
  "updated_at",
];

const SIGNUP_HEADERS = [
  "id",
  "event_id",
  "name",
  "extra",
  "token",
  "created_at",
  "updated_at",
  "deleted_at",
];

function setup() {
  const ss = getSpreadsheet_();
  const events = ensureSheet_(ss, CONFIG.SHEET_EVENTS, EVENT_HEADERS);
  const signups = ensureSheet_(ss, CONFIG.SHEET_SIGNUPS, SIGNUP_HEADERS);
  events.setFrozenRows(1);
  signups.setFrozenRows(1);
}

function doGet(e) {
  const params = e ? e.parameter : {};
  const action = params.action || "events";
  const callback = params.callback;
  let result;

  try {
    if (action === "events") result = listEvents_();
    else if (action === "event") result = getEvent_(params.id);
    else if (action === "signup") result = createSignup_(params);
    else if (action === "edit") result = editSignup_(params);
    else if (action === "delete") result = deleteSignup_(params);
    else if (action === "signup_by_token") result = signupByToken_(params.token);
    else if (action === "admin_list") result = adminList_(params);
    else if (action === "admin_save") result = adminSave_(params);
    else if (action === "admin_delete") result = adminDelete_(params);
    else if (action === "admin_close") result = adminClose_(params);
    else result = { ok: false, error: "Unknown action" };
  } catch (err) {
    result = { ok: false, error: err.message };
  }

  return output_(result, callback);
}

function output_(data, callback) {
  const json = JSON.stringify(data);
  if (callback) {
    return ContentService.createTextOutput(`${callback}(${json});`).setMimeType(
      ContentService.MimeType.JAVASCRIPT
    );
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function listEvents_() {
  const events = mapRows_(getSheet_(CONFIG.SHEET_EVENTS));
  const signups = mapRows_(getSheet_(CONFIG.SHEET_SIGNUPS));

  const counts = {};
  const attendeesMap = {};
  signups.forEach((row) => {
    if (row.deleted_at) return;
    counts[row.event_id] = (counts[row.event_id] || 0) + 1;
    if (!attendeesMap[row.event_id]) attendeesMap[row.event_id] = [];
    attendeesMap[row.event_id].push(row.name);
  });

  const result = events
    .filter((event) => event.id)
    .map((event) => {
      return {
        id: event.id,
        title: event.title || "",
        title_val: event.title_val || "",
        date: normalizeDate_(event.date),
        time: normalizeTime_(event.time),
        place: event.place || "",
        place_val: event.place_val || "",
        description: event.description || "",
        description_val: event.description_val || "",
        model: event.model || "basic",
        extra_label: event.extra_label || "",
        extra_label_val: event.extra_label_val || "",
        limit: toNumber_(event.limit),
        status: event.status || "active",
        count: counts[event.id] || 0,
        attendees: attendeesMap[event.id] || [],
      };
    });

  return { ok: true, events: result };
}

function getEvent_(id) {
  if (!id) return { ok: false, error: "Missing id" };
  const events = mapRows_(getSheet_(CONFIG.SHEET_EVENTS));
  const event = events.find((row) => row.id === id);
  if (!event) return { ok: false, error: "Event not found" };

  const signups = mapRows_(getSheet_(CONFIG.SHEET_SIGNUPS))
    .filter((row) => row.event_id === id && !row.deleted_at)
    .map((row) => ({ name: row.name, extra: row.extra, token: row.token }));

  const response = {
    id: event.id,
    title: event.title || "",
    title_val: event.title_val || "",
    date: normalizeDate_(event.date),
    time: normalizeTime_(event.time),
    place: event.place || "",
    place_val: event.place_val || "",
    description: event.description || "",
    description_val: event.description_val || "",
    model: event.model || "basic",
    extra_label: event.extra_label || "",
    extra_label_val: event.extra_label_val || "",
    limit: toNumber_(event.limit),
    status: event.status || "active",
    count: signups.length,
    attendees: signups.map((row) => row.name),
  };

  return { ok: true, event: response };
}

function createSignup_(params) {
  const eventId = safeParam_(params.event_id);
  const name = safeParam_(params.name);
  const extra = safeParam_(params.extra);
  const allowDuplicate = safeParam_(params.allow_duplicate) === "1";

  if (!eventId || !name) return { ok: false, error: "Missing data" };

  const eventsSheet = getSheet_(CONFIG.SHEET_EVENTS);
  const events = mapRows_(eventsSheet);
  const event = events.find((row) => row.id === eventId);
  if (!event) return { ok: false, error: "Event not found" };

  const status = event.status || "active";
  if (status !== "active") return { ok: false, code: "closed", error: "Event closed" };

  const signupsSheet = getSheet_(CONFIG.SHEET_SIGNUPS);
  const signups = mapRows_(signupsSheet).filter(
    (row) => row.event_id === eventId && !row.deleted_at
  );

  const limit = toNumber_(event.limit);
  if (limit && signups.length >= limit) {
    return { ok: false, code: "full", error: "Full" };
  }

  const normalizedName = name.toLowerCase();
  const duplicate = signups.find((row) => row.name.toLowerCase() === normalizedName);
  if (duplicate && !allowDuplicate) {
    return { ok: false, code: "duplicate", error: "Duplicate" };
  }

  const now = new Date();
  const id = newId_();
  const token = newToken_();
  signupsSheet.appendRow([
    id,
    eventId,
    name,
    extra,
    token,
    now,
    now,
    "",
  ]);

  const newCount = signups.length + 1;
  if (limit && newCount >= limit) {
    notifyLimit_(event, newCount, limit);
  }

  return { ok: true, event_id: eventId, token };
}

function editSignup_(params) {
  const token = safeParam_(params.token);
  const name = safeParam_(params.name);
  const extra = safeParam_(params.extra);
  if (!token || !name) return { ok: false, error: "Missing data" };

  const sheet = getSheet_(CONFIG.SHEET_SIGNUPS);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { ok: false, error: "Not found" };

  for (let i = 1; i < data.length; i += 1) {
    const row = data[i];
    if (row[4] === token && !row[7]) {
      sheet.getRange(i + 1, 3).setValue(name);
      sheet.getRange(i + 1, 4).setValue(extra);
      sheet.getRange(i + 1, 7).setValue(new Date());
      return { ok: true, event_id: row[1] };
    }
  }

  return { ok: false, error: "Not found" };
}

function deleteSignup_(params) {
  const token = safeParam_(params.token);
  if (!token) return { ok: false, error: "Missing token" };

  const sheet = getSheet_(CONFIG.SHEET_SIGNUPS);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { ok: false, error: "Not found" };

  for (let i = 1; i < data.length; i += 1) {
    const row = data[i];
    if (row[4] === token && !row[7]) {
      sheet.getRange(i + 1, 8).setValue(new Date());
      sheet.getRange(i + 1, 7).setValue(new Date());
      return { ok: true, event_id: row[1] };
    }
  }

  return { ok: false, error: "Not found" };
}

function signupByToken_(token) {
  if (!token) return { ok: false, error: "Missing token" };

  const signups = mapRows_(getSheet_(CONFIG.SHEET_SIGNUPS));
  const signup = signups.find((row) => row.token === token && !row.deleted_at);
  if (!signup) return { ok: false, error: "Not found" };

  const events = mapRows_(getSheet_(CONFIG.SHEET_EVENTS));
  const event = events.find((row) => row.id === signup.event_id);
  if (!event) return { ok: false, error: "Event not found" };

  return {
    ok: true,
    signup: {
      name: signup.name,
      extra: signup.extra,
      token: signup.token,
    },
    event: {
      id: event.id,
      title: event.title || "",
      model: event.model || "basic",
      extra_label: event.extra_label || "",
    },
  };
}

function adminList_(params) {
  if (!isAdmin_(params)) return { ok: false, error: "Unauthorized" };
  const events = mapRows_(getSheet_(CONFIG.SHEET_EVENTS))
    .filter((event) => event.id)
    .map((event) => ({
      id: event.id,
      title: event.title || "",
      title_val: event.title_val || "",
      date: normalizeDate_(event.date),
      time: normalizeTime_(event.time),
      place: event.place || "",
      place_val: event.place_val || "",
      description: event.description || "",
      description_val: event.description_val || "",
      model: event.model || "basic",
      extra_label: event.extra_label || "",
      extra_label_val: event.extra_label_val || "",
      limit: toNumber_(event.limit),
      status: event.status || "active",
    }));

  return { ok: true, events };
}

function adminSave_(params) {
  if (!isAdmin_(params)) return { ok: false, error: "Unauthorized" };

  let id = safeParam_(params.id);
  if (!id) id = newId_();

  const eventData = {
    id,
    title: safeParam_(params.title),
    title_val: safeParam_(params.title_val),
    date: safeParam_(params.date),
    time: safeParam_(params.time),
    place: safeParam_(params.place),
    place_val: safeParam_(params.place_val),
    description: safeParam_(params.description),
    description_val: safeParam_(params.description_val),
    model: safeParam_(params.model) || "basic",
    extra_label: safeParam_(params.extra_label),
    extra_label_val: safeParam_(params.extra_label_val),
    limit: safeParam_(params.limit),
    status: safeParam_(params.status) || "active",
  };

  const sheet = getSheet_(CONFIG.SHEET_EVENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const now = new Date();

  for (let i = 1; i < data.length; i += 1) {
    if (data[i][0] === id) {
      const row = headers.map((header) => {
        if (header === "created_at") return data[i][headers.indexOf("created_at")];
        if (header === "updated_at") return now;
        return eventData[header] !== undefined ? eventData[header] : data[i][headers.indexOf(header)];
      });
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([row]);
      return { ok: true, id };
    }
  }

  const row = headers.map((header) => {
    if (header === "created_at") return now;
    if (header === "updated_at") return now;
    return eventData[header] || "";
  });
  sheet.appendRow(row);
  return { ok: true, id };
}

function adminClose_(params) {
  if (!isAdmin_(params)) return { ok: false, error: "Unauthorized" };
  const id = safeParam_(params.id);
  if (!id) return { ok: false, error: "Missing id" };
  const sheet = getSheet_(CONFIG.SHEET_EVENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const statusIndex = headers.indexOf("status");
  const updatedIndex = headers.indexOf("updated_at");
  if (statusIndex === -1) return { ok: false, error: "Missing status column" };
  for (let i = 1; i < data.length; i += 1) {
    if (data[i][0] === id) {
      sheet.getRange(i + 1, statusIndex + 1).setValue("closed");
      if (updatedIndex !== -1) {
        sheet.getRange(i + 1, updatedIndex + 1).setValue(new Date());
      }
      return { ok: true, id };
    }
  }
  return { ok: false, error: "Not found" };
}

function adminDelete_(params) {
  if (!isAdmin_(params)) return { ok: false, error: "Unauthorized" };
  const id = safeParam_(params.id);
  if (!id) return { ok: false, error: "Missing id" };
  const sheet = getSheet_(CONFIG.SHEET_EVENTS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i += 1) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { ok: true, id };
    }
  }
  return { ok: false, error: "Not found" };
}

function isAdmin_(params) {
  const secret = safeParam_(params.secret);
  return secret && secret === CONFIG.ADMIN_SECRET;
}

function notifyLimit_(event, current, limit) {
  try {
    MailApp.sendEmail({
      to: CONFIG.ADMIN_EMAIL,
      subject: `Evento completo: ${event.title}`,
      htmlBody: `El evento <b>${event.title}</b> ha alcanzado el limite (${current}/${limit}).`,
    });
  } catch (err) {
    Logger.log(err);
  }
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}

function getSheet_(name) {
  const sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error(`Missing sheet ${name}`);
  return sheet;
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(CONFIG.SHEET_ID);
}

function mapRows_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map((row) => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = row[index];
    });
    return entry;
  });
}

function normalizeDate_(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, CONFIG.TZ, "yyyy-MM-dd");
  }
  return value.toString();
}

function normalizeTime_(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, CONFIG.TZ, "HH:mm");
  }
  return value.toString();
}

function safeParam_(value) {
  if (value === undefined || value === null) return "";
  return value.toString().trim();
}

function toNumber_(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

function newId_() {
  return Utilities.getUuid().slice(0, 8);
}

function newToken_() {
  return Utilities.getUuid().replace(/-/g, "");
}
