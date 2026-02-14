const ROUTES = [
  { name: "home", pattern: /^\/$/ },
  { name: "calendar", pattern: /^\/calendario$/ },
  { name: "events", pattern: /^\/eventos$/ },
  { name: "event-detail", pattern: /^\/eventos\/([^/]+)$/ },
  { name: "signup-token", pattern: /^\/inscripcion\/([^/]+)$/ },
  { name: "manual", pattern: /^\/manual$/ },
  { name: "admin", pattern: /^\/admin$/ },
];

export function buildHashPath(path) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `#${normalized}`;
}

export function parseHashRoute(hashValue) {
  const hash = hashValue || "#/";
  if (!hash.startsWith("#/")) {
    return { name: "home", params: {} };
  }

  const value = hash.replace(/^#/, "") || "/";
  for (const route of ROUTES) {
    const match = value.match(route.pattern);
    if (!match) continue;
    if (route.name === "event-detail") {
      return { name: route.name, params: { id: decodeURIComponent(match[1]) } };
    }
    if (route.name === "signup-token") {
      return { name: route.name, params: { token: decodeURIComponent(match[1]) } };
    }
    return { name: route.name, params: {} };
  }

  return { name: "home", params: {} };
}

export function nextVisibleCount(current, batch, total) {
  return Math.min(current + batch, total);
}
