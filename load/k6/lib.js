// Utilitaires partagés des scripts k6 (ESM k6). Aucune dépendance externe.
import http from "k6/http";
import { check } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// --- Configuration par variables d'environnement ---------------------------------------------------
// K6_BASE_URL    : URL de l'API (défaut http://localhost:3001/v1). NE JAMAIS pointer vers la production.
// K6_BASE_DOMAIN : domaine de base des fronts (défaut localhost) ; K6_TENANT : sous-domaine du tenant (défaut demo).
export const BASE_URL = (__ENV.K6_BASE_URL || "http://localhost:3001/v1").replace(/\/$/, "");
export const BASE_DOMAIN = __ENV.K6_BASE_DOMAIN || "localhost";
export const TENANT = __ENV.K6_TENANT || "demo";
export const PASSWORD = __ENV.K6_PASSWORD || "ChangeMe123!"; // mot de passe de démo documenté (seed de dev)

// Le backend résout surface et tenant depuis l'en-tête Host (ou X-Forwarded-Host).
export const HOSTS = {
  public: `${TENANT}.${BASE_DOMAIN}`,
  business: `${TENANT}-backoffice.${BASE_DOMAIN}`,
  admin: `admin.${BASE_DOMAIN}`,
};
export const ACCOUNTS = {
  learner: __ENV.K6_LEARNER_EMAIL || "learner@votredomaine.local",
  business: __ENV.K6_BUSINESS_EMAIL || "business@votredomaine.local",
  admin: __ENV.K6_ADMIN_EMAIL || "admin@votredomaine.local",
};

// Garde-fou : refuse une cible qui ressemble à la production.
const forbidden = /(^|[.\/-])(prod|production)([.\/:-]|$)/i;
if (forbidden.test(BASE_URL) || forbidden.test(BASE_DOMAIN)) {
  throw new Error("Cible interdite : ces scripts ne doivent jamais viser la production.");
}

// 429 = limiteur de débit (comportement attendu, compté à part) ; seuls 5xx et autres 4xx sont des échecs.
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 399 }, 429));

export const rateLimited = new Rate("rate_limited");
export const serverErrors = new Rate("server_errors"); // statut >= 500
export const okCount = new Counter("ok_responses");
const trends = {};
export function trend(name) {
  if (!trends[name]) trends[name] = new Trend(`lat_${name}`, true);
  return trends[name];
}

/** GET avec Host de surface et jeton optionnel ; la latence n'est enregistrée que pour les réponses 2xx. */
export function get(endpoint, path, surface, token) {
  const headers = { Host: HOSTS[surface], Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = http.get(`${BASE_URL}${path}`, { headers, tags: { endpoint } });
  record(endpoint, res);
  return res;
}

export function record(endpoint, res) {
  rateLimited.add(res.status === 429);
  serverErrors.add(res.status >= 500);
  if (res.status >= 200 && res.status < 300) {
    trend(endpoint).add(res.timings.duration);
    okCount.add(1);
  }
}

export function login(surface, email, password) {
  const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({ email, password: password || PASSWORD }), {
    headers: { Host: HOSTS[surface], "Content-Type": "application/json" },
    tags: { endpoint: "login" },
  });
  record("login", res);
  return res;
}

/** Connexion unique (setup k6) : le login est limité à 10 tentatives/min/IP, ne jamais le mettre dans la boucle de charge. */
export function loginToken(surface, email) {
  const res = login(surface, email);
  const ok = check(res, { [`login ${surface} 200`]: (r) => r.status === 200 });
  if (!ok) return null;
  try {
    return res.json().accessToken || null; // 2FA activée : pas de jeton direct, les routes authentifiées seront ignorées
  } catch (e) {
    return null;
  }
}

/** Liste des identifiants de formations du catalogue public (premier appel du setup). */
export function catalogueIds() {
  const res = get("catalogue_setup", "/public/courses", "public");
  try {
    const body = res.json();
    const items = Array.isArray(body) ? body : body.items || body.data || [];
    return items.map((c) => c.id);
  } catch (e) {
    return [];
  }
}

/** Seuils communs : taux d'échec et 5xx < 1 %, plus p(95) par endpoint (ms). */
export function thresholds(p95ByEndpoint) {
  const t = { http_req_failed: ["rate<0.01"], server_errors: ["rate<0.01"] };
  for (const [endpoint, p95] of Object.entries(p95ByEndpoint)) {
    t[`lat_${endpoint}`] = [`p(95)<${p95}`];
  }
  return t;
}
