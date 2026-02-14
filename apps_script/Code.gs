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
  "extra_options",
  "extra_options_val",
  "extra_label_val",
  "event_pin",
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
  ensureHeaders_(events, EVENT_HEADERS);
  ensureHeaders_(signups, SIGNUP_HEADERS);
  events.setFrozenRows(1);
  signups.setFrozenRows(1);
}

function normalizeHeaderName_(value) {
  return safeParam_(value).toLowerCase();
}

function getColumnIndex_(data, targetHeader) {
  if (!data || !data.length) return -1;
  const headers = data[0] || [];
  const normalizedTarget = normalizeHeaderName_(targetHeader);
  const candidates = [];

  headers.forEach((header, index) => {
    if (normalizeHeaderName_(header) === normalizedTarget) {
      candidates.push(index);
    }
  });

  if (!candidates.length) return -1;
  if (candidates.length === 1) return candidates[0];

  // If duplicates exist (e.g. "ID" + "id"), keep the column with real data.
  let bestIndex = candidates[0];
  let bestScore = -1;
  candidates.forEach((index) => {
    let score = 0;
    for (let row = 1; row < data.length; row += 1) {
      if (safeParam_(data[row][index])) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function doGet(e) {
  const params = e ? e.parameter : {};
  const action = params.action || "events";
  const callback = params.callback;
  let result;

  try {
    ensureHeaders_(getSheet_(CONFIG.SHEET_EVENTS), EVENT_HEADERS);
    ensureHeaders_(getSheet_(CONFIG.SHEET_SIGNUPS), SIGNUP_HEADERS);
    if (action === "events") result = listEvents_();
    else if (action === "event") result = getEvent_(params.id);
    else if (action === "signup") result = createSignup_(params);
    else if (action === "signup_batch") result = createSignupBatch_(params);
    else if (action === "edit") result = editSignup_(params);
    else if (action === "delete") result = deleteSignup_(params);
    else if (action === "signup_by_token") result = signupByToken_(params.token);
    else if (action === "admin_list") result = adminList_(params);
    else if (action === "admin_save") result = adminSave_(params);
    else if (action === "admin_delete") result = adminDelete_(params);
    else if (action === "admin_close") result = adminClose_(params);
    else if (action === "admin_event_signups") result = adminEventSignups_(params);
    else if (action === "admin_duplicate") result = adminDuplicate_(params);
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
        extra_options: event.extra_options || "",
        extra_options_val: event.extra_options_val || "",
        extra_label_val: event.extra_label_val || "",
        event_pin: event.event_pin || "",
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
    extra_options: event.extra_options || "",
    extra_options_val: event.extra_options_val || "",
    extra_label_val: event.extra_label_val || "",
    event_pin: event.event_pin || "",
    limit: toNumber_(event.limit),
    status: event.status || "active",
    count: signups.length,
    attendees: signups.map((row) => row.name),
  };

  return { ok: true, event: response };
}

function createSignup_(params) {
  const eventId = safeParam_(params.event_id);
  const names = parseNamesParam_(params.names);
  const extra = safeParam_(params.extra);
  const allowDuplicate = safeParam_(params.allow_duplicate) === "1";

  if (!eventId || !names.length) return { ok: false, error: "Missing data" };
  if (names.length > 5) return { ok: false, code: "too_many", error: "Too many people" };
  if (names.some((name) => !isValidFullName_(name))) {
    return { ok: false, code: "invalid_name", error: "Invalid name format" };
  }

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
  if (limit && signups.length + names.length > limit) {
    return { ok: false, code: "full", error: "Full" };
  }

  const incomingLower = names.map((name) => name.toLowerCase());
  const duplicate = signups.find((row) => incomingLower.indexOf((row.name || "").toLowerCase()) !== -1);
  if (duplicate && !allowDuplicate) {
    return { ok: false, code: "duplicate", error: "Duplicate" };
  }

  const now = new Date();
  const token = newToken_();
  names.forEach((name) => {
    signupsSheet.appendRow([
      newId_(),
      eventId,
      name,
      extra,
      token,
      now,
      now,
      "",
    ]);
  });

  const newCount = signups.length + names.length;
  if (limit && newCount >= limit) {
    notifyLimit_(event, newCount, limit);
  }

  return { ok: true, event_id: eventId, token, names_count: names.length };
}

function createSignupBatch_(params) {
  const eventId = safeParam_(params.event_id);
  const entries = parseEntriesParam_(params.entries);
  const allowDuplicate = safeParam_(params.allow_duplicate) === "1";
  if (!eventId || !entries.length) return { ok: false, error: "Missing data", errors: [] };
  if (entries.length > 5) return { ok: false, code: "too_many", error: "Too many people", errors: [] };

  const events = mapRows_(getSheet_(CONFIG.SHEET_EVENTS));
  const event = events.find((row) => safeParam_(row.id) === eventId);
  if (!event) return { ok: false, error: "Event not found", errors: [] };
  const status = event.status || "active";
  if (status !== "active") return { ok: false, code: "closed", error: "Event closed", errors: [] };

  const signupsSheet = getSheet_(CONFIG.SHEET_SIGNUPS);
  const existing = mapRows_(signupsSheet).filter((row) => safeParam_(row.event_id) === eventId && !row.deleted_at);
  const existingNames = {};
  existing.forEach((row) => {
    existingNames[safeParam_(row.name).toLowerCase()] = true;
  });

  const isExtended = (event.model || "basic") === "extended";
  const limit = toNumber_(event.limit);
  const now = new Date();
  const token = newToken_();
  const errors = [];
  let savedCount = 0;
  const batchSeen = {};

  entries.forEach((entry) => {
    const rowId = safeParam_(entry.client_row_id) || newId_();
    const name = normalizeSpaces_(entry.name);
    const extra = normalizeSpaces_(entry.extra);
    if (!name) {
      errors.push({ client_row_id: rowId, code: "required_name" });
      return;
    }
    if (!isValidFullName_(name)) {
      errors.push({ client_row_id: rowId, code: "invalid_name" });
      return;
    }
    const lower = name.toLowerCase();
    if (batchSeen[lower]) {
      errors.push({ client_row_id: rowId, code: "duplicate_batch" });
      return;
    }
    batchSeen[lower] = true;
    if (isExtended && !extra) {
      errors.push({ client_row_id: rowId, code: "missing_extra" });
      return;
    }
    if (!allowDuplicate && existingNames[lower]) {
      errors.push({ client_row_id: rowId, code: "duplicate" });
      return;
    }
    if (limit && existing.length + savedCount >= limit) {
      errors.push({ client_row_id: rowId, code: "full" });
      return;
    }

    signupsSheet.appendRow([newId_(), eventId, name, extra, token, now, now, ""]);
    savedCount += 1;
  });

  if (!savedCount) {
    return { ok: false, event_id: eventId, saved_count: 0, errors };
  }

  const newCount = existing.length + savedCount;
  if (limit && newCount >= limit) {
    notifyLimit_(event, newCount, limit);
  }
  return {
    ok: true,
    event_id: eventId,
    token,
    saved_count: savedCount,
    errors,
  };
}

function editSignup_(params) {
  const token = safeParam_(params.token);
  const names = parseNamesParam_(params.names);
  const extra = safeParam_(params.extra);
  if (!token || !names.length) return { ok: false, error: "Missing data" };
  if (names.length > 5) return { ok: false, code: "too_many", error: "Too many people" };
  if (names.some((name) => !isValidFullName_(name))) {
    return { ok: false, code: "invalid_name", error: "Invalid name format" };
  }

  const sheet = getSheet_(CONFIG.SHEET_SIGNUPS);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { ok: false, error: "Not found" };
  const eventIndex = getColumnIndex_(data, "event_id");
  const tokenIndex = getColumnIndex_(data, "token");
  const deletedAtIndex = getColumnIndex_(data, "deleted_at");
  const updatedAtIndex = getColumnIndex_(data, "updated_at");
  const eventId = (() => {
    for (let i = 1; i < data.length; i += 1) {
      if (data[i][tokenIndex] === token && !data[i][deletedAtIndex]) {
        return data[i][eventIndex];
      }
    }
    return "";
  })();
  if (!eventId) return { ok: false, error: "Not found" };

  const now = new Date();
  for (let i = 1; i < data.length; i += 1) {
    if (data[i][tokenIndex] === token && !data[i][deletedAtIndex]) {
      sheet.getRange(i + 1, deletedAtIndex + 1).setValue(now);
      if (updatedAtIndex !== -1) sheet.getRange(i + 1, updatedAtIndex + 1).setValue(now);
    }
  }
  names.forEach((name) => {
    sheet.appendRow([newId_(), eventId, name, extra, token, now, now, ""]);
  });
  return { ok: true, event_id: eventId };
}

function deleteSignup_(params) {
  const token = safeParam_(params.token);
  if (!token) return { ok: false, error: "Missing token" };

  const sheet = getSheet_(CONFIG.SHEET_SIGNUPS);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { ok: false, error: "Not found" };
  const eventIndex = getColumnIndex_(data, "event_id");
  const tokenIndex = getColumnIndex_(data, "token");
  const deletedAtIndex = getColumnIndex_(data, "deleted_at");
  const updatedAtIndex = getColumnIndex_(data, "updated_at");
  let eventId = "";
  let deleted = false;
  const now = new Date();

  for (let i = 1; i < data.length; i += 1) {
    if (data[i][tokenIndex] === token && !data[i][deletedAtIndex]) {
      if (!eventId) eventId = data[i][eventIndex];
      sheet.getRange(i + 1, deletedAtIndex + 1).setValue(now);
      if (updatedAtIndex !== -1) sheet.getRange(i + 1, updatedAtIndex + 1).setValue(now);
      deleted = true;
    }
  }
  if (!deleted) return { ok: false, error: "Not found" };
  return { ok: true, event_id: eventId };
}

function signupByToken_(token) {
  if (!token) return { ok: false, error: "Missing token" };

  const signups = mapRows_(getSheet_(CONFIG.SHEET_SIGNUPS));
  const tokenRows = signups.filter((row) => row.token === token && !row.deleted_at);
  if (!tokenRows.length) return { ok: false, error: "Not found" };
  const signup = tokenRows[0];

  const events = mapRows_(getSheet_(CONFIG.SHEET_EVENTS));
  const event = events.find((row) => row.id === signup.event_id);
  if (!event) return { ok: false, error: "Event not found" };

  return {
    ok: true,
    signup: {
      names: tokenRows.map((row) => row.name),
      extra: signup.extra,
      token: signup.token,
    },
    event: {
      id: event.id,
      title: event.title || "",
      model: event.model || "basic",
      extra_label: event.extra_label || "",
      extra_options: event.extra_options || "",
      extra_options_val: event.extra_options_val || "",
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
      extra_options: event.extra_options || "",
      extra_options_val: event.extra_options_val || "",
      extra_label_val: event.extra_label_val || "",
      event_pin: event.event_pin || "",
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
    extra_options: safeParam_(params.extra_options),
    extra_options_val: safeParam_(params.extra_options_val),
    extra_label_val: safeParam_(params.extra_label_val),
    event_pin: safeParam_(params.event_pin),
    limit: safeParam_(params.limit),
    status: safeParam_(params.status) || "active",
  };

  const sheet = getSheet_(CONFIG.SHEET_EVENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = getColumnIndex_(data, "id");
  const now = new Date();
  if (idIndex === -1) return { ok: false, error: "Missing id column" };

  for (let i = 1; i < data.length; i += 1) {
    if (safeParam_(data[i][idIndex]) === id) {
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
  const idIndex = getColumnIndex_(data, "id");
  const statusIndex = getColumnIndex_(data, "status");
  const updatedIndex = getColumnIndex_(data, "updated_at");
  if (statusIndex === -1 || idIndex === -1) return { ok: false, error: "Missing required column" };
  for (let i = 1; i < data.length; i += 1) {
    if (safeParam_(data[i][idIndex]) === id) {
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
  const idIndex = getColumnIndex_(data, "id");
  if (idIndex === -1) return { ok: false, error: "Missing id column" };
  for (let i = 1; i < data.length; i += 1) {
    if (safeParam_(data[i][idIndex]) === id) {
      sheet.deleteRow(i + 1);
      return { ok: true, id };
    }
  }
  return { ok: false, error: "Not found" };
}

function adminEventSignups_(params) {
  if (!isAdmin_(params)) return { ok: false, error: "Unauthorized" };
  const id = safeParam_(params.id);
  if (!id) return { ok: false, error: "Missing id" };

  const eventsSheet = getSheet_(CONFIG.SHEET_EVENTS);
  const eventsData = eventsSheet.getDataRange().getValues();
  if (eventsData.length < 2) return { ok: false, error: "Not found" };
  const eventHeaders = eventsData[0];
  const eventIdIndex = getColumnIndex_(eventsData, "id");
  if (eventIdIndex === -1) return { ok: false, error: "Missing id column" };
  const eventRow = eventsData.find((row, index) => index > 0 && safeParam_(row[eventIdIndex]) === id);
  if (!eventRow) return { ok: false, error: "Not found" };
  const event = {};
  eventHeaders.forEach((header, index) => {
    event[header] = eventRow[index];
  });

  const signupsSheet = getSheet_(CONFIG.SHEET_SIGNUPS);
  const signupsData = signupsSheet.getDataRange().getValues();
  const signupHeaders = signupsData[0] || [];
  const signupEventIdIndex = getColumnIndex_(signupsData, "event_id");
  const signupDeletedAtIndex = getColumnIndex_(signupsData, "deleted_at");
  const signupNameIndex = getColumnIndex_(signupsData, "name");
  const signupExtraIndex = getColumnIndex_(signupsData, "extra");
  const signupCreatedAtIndex = getColumnIndex_(signupsData, "created_at");

  const signups = signupsData
    .filter((row, index) => {
      if (index === 0) return false;
      if (signupEventIdIndex === -1) return false;
      if (safeParam_(row[signupEventIdIndex]) !== id) return false;
      if (signupDeletedAtIndex !== -1 && safeParam_(row[signupDeletedAtIndex])) return false;
      return true;
    })
    .sort((a, b) => toMillis_(signupCreatedAtIndex === -1 ? "" : a[signupCreatedAtIndex]) - toMillis_(signupCreatedAtIndex === -1 ? "" : b[signupCreatedAtIndex]))
    .map((row) => ({
      name: signupNameIndex === -1 ? "" : row[signupNameIndex] || "",
      extra: signupExtraIndex === -1 ? "" : row[signupExtraIndex] || "",
      created_at: normalizeDateTime_(signupCreatedAtIndex === -1 ? "" : row[signupCreatedAtIndex]),
    }));

  const totals = {};
  const totalsMeta = {};
  if ((event.model || "basic") === "extended") {
    const optionResolver = createExtraOptionResolver_(event);
    signups.forEach((row) => {
      const resolved = optionResolver(row.extra) || "Sin especificar";
      const groupKey = canonicalExtraGroupKey_(resolved);
      if (!totalsMeta[groupKey]) {
        totalsMeta[groupKey] = { label: resolved, count: 0 };
      }
      totalsMeta[groupKey].count += 1;
    });
    Object.keys(totalsMeta).forEach((groupKey) => {
      const item = totalsMeta[groupKey];
      totals[item.label] = item.count;
    });
  }

  return {
    ok: true,
    event: {
      id: event.id,
      title: event.title || "",
      title_val: event.title_val || "",
      date: normalizeDate_(event.date),
      time: normalizeTime_(event.time),
      place: event.place || "",
      place_val: event.place_val || "",
      model: event.model || "basic",
      extra_label: event.extra_label || "",
      extra_label_val: event.extra_label_val || "",
    },
    signups,
    extra_totals: totals,
  };
}

function parseOptionList_(value) {
  if (!value) return [];
  return value
    .toString()
    .split(/[|,]+/)
    .map((item) => normalizeSpaces_(item))
    .filter(Boolean);
}

function normalizeOptionKey_(value) {
  return normalizeSpaces_(value).toLowerCase();
}

function createExtraOptionResolver_(event) {
  const es = parseOptionList_(event.extra_options);
  const val = parseOptionList_(event.extra_options_val);
  const lookup = {};

  es.forEach((label, index) => {
    const canonical = label;
    lookup[normalizeOptionKey_(label)] = canonical;
    if (val[index]) lookup[normalizeOptionKey_(val[index])] = canonical;
  });
  val.forEach((label, index) => {
    if (!lookup[normalizeOptionKey_(label)]) {
      const fallback = es[index] || label;
      lookup[normalizeOptionKey_(label)] = fallback;
    }
  });

  return function resolve(extraValue) {
    const key = normalizeOptionKey_(extraValue);
    if (!key) return "";
    return lookup[key] || normalizeSpaces_(extraValue);
  };
}

function canonicalExtraGroupKey_(value) {
  const normalized = normalizeSpaces_(value);
  if (!normalized) return "__empty__";

  return normalized
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\banys?\b/g, "anos")
    .replace(/\bano\b/g, "anos")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function adminDuplicate_(params) {
  if (!isAdmin_(params)) return { ok: false, error: "Unauthorized" };
  const id = safeParam_(params.id);
  if (!id) return { ok: false, error: "Missing id" };

  const sheet = getSheet_(CONFIG.SHEET_EVENTS);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { ok: false, error: "Not found" };
  const headers = data[0];
  const idIndex = getColumnIndex_(data, "id");
  if (idIndex === -1) return { ok: false, error: "Missing id column" };
  const sourceRow = data.find((row, index) => index > 0 && safeParam_(row[idIndex]) === id);
  if (!sourceRow) return { ok: false, error: "Not found" };

  const source = {};
  headers.forEach((header, index) => {
    source[header] = sourceRow[index];
  });

  if ((source.status || "active") !== "closed") {
    return { ok: false, error: "Solo se pueden duplicar eventos cerrados" };
  }

  const now = new Date();
  const newId = newId_();
  const clone = { ...source };
  clone.id = newId;
  clone.status = "active";
  clone.date = "";
  clone.time = "";
  clone.created_at = now;
  clone.updated_at = now;

  const row = headers.map((header) => (clone[header] !== undefined ? clone[header] : ""));
  sheet.appendRow(row);
  return { ok: true, id: newId };
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

function ensureHeaders_(sheet, expectedHeaders) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const currentNormalized = currentHeaders.map((header) => normalizeHeaderName_(header));
  expectedHeaders.forEach((header) => {
    if (currentNormalized.indexOf(normalizeHeaderName_(header)) !== -1) return;
    sheet.insertColumnAfter(sheet.getLastColumn() || 1);
    sheet.getRange(1, sheet.getLastColumn()).setValue(header);
    currentHeaders.push(header);
    currentNormalized.push(normalizeHeaderName_(header));
  });
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

function normalizeDateTime_(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, CONFIG.TZ, "yyyy-MM-dd HH:mm:ss");
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

function toMillis_(value) {
  if (!value) return 0;
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return value.getTime();
  }
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.getTime() : 0;
}

function parseNamesParam_(raw) {
  if (!raw) return [];
  let names = [];
  try {
    const parsed = JSON.parse(raw);
    if (Object.prototype.toString.call(parsed) === "[object Array]") {
      names = parsed;
    }
  } catch (_err) {
    names = raw.split(/[\n,]+/);
  }
  return names
    .map((value) => normalizeSpaces_(value))
    .filter(Boolean);
}

function parseEntriesParam_(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Object.prototype.toString.call(parsed) !== "[object Array]") return [];
    return parsed
      .map((entry) => ({
        client_row_id: safeParam_(entry.client_row_id),
        name: safeParam_(entry.name),
        extra: safeParam_(entry.extra),
      }))
      .filter((entry) => entry.client_row_id || entry.name || entry.extra);
  } catch (_err) {
    return [];
  }
}

function isValidFullName_(name) {
  return normalizeSpaces_(name).split(" ").length >= 2;
}

function normalizeSpaces_(value) {
  return safeParam_(value).replace(/\s+/g, " ").trim();
}

function newId_() {
  return Utilities.getUuid().slice(0, 8);
}

function newToken_() {
  return Utilities.getUuid().replace(/-/g, "");
}
