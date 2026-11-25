// Exécuteur de repli (k6 absent) : fetch + concurrence configurable, rapports p50/p95/erreurs par endpoint.
// Rejoue les mêmes routes/en-têtes/auth que load/k6/*.js pour les valider. Plafonné : 20 requêtes concurrentes, 30 s.
//
// Usage : node load/node-smoke.mjs [--scenario=smoke|load|login] [--concurrency=5] [--duration=10] [--delay=0]
// Env   : K6_BASE_URL, K6_BASE_DOMAIN, K6_TENANT, K6_PASSWORD, K6_LEARNER_EMAIL, K6_BUSINESS_EMAIL
// Ne jamais viser la production.

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
const scenario = args.scenario ?? "smoke";
const concurrency = Math.min(Math.max(Number(args.concurrency ?? (scenario === "smoke" ? 1 : 5)), 1), 20);
const duration = Math.min(Math.max(Number(args.duration ?? (scenario === "smoke" ? 8 : 10)), 1), 30);
const delay = Number(args.delay ?? 0); // ms de pause entre deux requêtes d'un même worker

const BASE_URL = (process.env.K6_BASE_URL ?? "http://localhost:3001/v1").replace(/\/$/, "");
const BASE_DOMAIN = process.env.K6_BASE_DOMAIN ?? "localhost";
const TENANT = process.env.K6_TENANT ?? "demo";
const PASSWORD = process.env.K6_PASSWORD ?? "ChangeMe123!"; // identifiant de démo documenté
const HOSTS = { public: `${TENANT}.${BASE_DOMAIN}`, business: `${TENANT}-backoffice.${BASE_DOMAIN}` };
const ACCOUNTS = {
  learner: process.env.K6_LEARNER_EMAIL ?? "learner@votredomaine.local",
  business: process.env.K6_BUSINESS_EMAIL ?? "business@votredomaine.local",
};
if (/(^|[./-])(prod|production)([./:-]|$)/i.test(BASE_URL + BASE_DOMAIN)) {
  console.error("Cible interdite : ne jamais viser la production.");
  process.exit(2);
}

/** @type {Record<string, {lat:number[], status:Record<string, number>}>} */
const stats = {};
function record(endpoint, status, ms) {
  const s = (stats[endpoint] ??= { lat: [], status: {} });
  const key = status === 0 ? "erreur-réseau" : String(status);
  s.status[key] = (s.status[key] ?? 0) + 1;
  if (status >= 200 && status < 300) s.lat.push(ms);
}

async function call(endpoint, method, path, surface, { token, body } = {}) {
  const headers = { Host: HOSTS[surface], Accept: "application/json" };
  // fetch (undici) interdit de surcharger Host : on le passe par X-Forwarded-Host, que le backend accepte aussi.
  delete headers.Host;
  headers["X-Forwarded-Host"] = HOSTS[surface];
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";
  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    record(endpoint, res.status, performance.now() - t0);
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* corps non JSON */
    }
    return { status: res.status, json };
  } catch {
    record(endpoint, 0, performance.now() - t0);
    return { status: 0, json: null };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (arr, p) => (arr.length ? [...arr].sort((a, b) => a - b)[Math.min(arr.length - 1, Math.ceil((p / 100) * arr.length) - 1)] : NaN);

async function loginToken(surface, email) {
  const r = await call("login", "POST", "/auth/login", surface, { body: { email, password: PASSWORD } });
  return r.json?.accessToken ?? null;
}

async function main() {
  console.log(`scénario=${scenario} concurrence=${concurrency} durée=${duration}s cible=${BASE_URL} hôte=${HOSTS.public}`);
  const started = performance.now();

  if (scenario === "login") {
    // Rafale de mauvaises tentatives : doit produire des 429 au-delà du seuil, jamais de 5xx.
    for (let i = 0; i < 25; i++) {
      await call("login_burst", "POST", "/auth/login", "public", { body: { email: "inexistant@example.test", password: "Mauvais-mot-de-passe-1" } });
    }
  } else {
    const learner = await loginToken("public", ACCOUNTS.learner);
    const business = scenario === "load" ? await loginToken("business", ACCOUNTS.business) : null;
    const cat = await call("catalogue_setup", "GET", "/public/courses", "public");
    const items = Array.isArray(cat.json) ? cat.json : (cat.json?.items ?? cat.json?.data ?? []);
    const ids = items.map((c) => c.id);
    console.log(`jetons : apprenant=${learner ? "oui" : "NON"} business=${business ? "oui" : scenario === "load" ? "NON" : "n/a"}, formations=${ids.length}`);

    const end = performance.now() + duration * 1000;
    let n = 0;
    const worker = async () => {
      while (performance.now() < end) {
        n++;
        if (scenario === "smoke") {
          await call("health", "GET", "/health", "public");
          await call("catalogue", "GET", "/public/courses", "public");
          if (ids[0]) await call("course_detail", "GET", `/public/courses/${ids[0]}`, "public");
          if (learner) await call("learner_dashboard", "GET", "/public/enrollments/dashboard", "public", { token: learner });
        } else {
          const roll = Math.random();
          if (roll < 0.5) await call("catalogue", "GET", "/public/courses?page=1&pageSize=12", "public");
          else if (roll < 0.7 && ids.length) await call("course_detail", "GET", `/public/courses/${ids[n % ids.length]}`, "public");
          else if (roll < 0.85 && learner) await call("learner_dashboard", "GET", "/public/enrollments/dashboard", "public", { token: learner });
          else if (business) {
            await call("business_courses", "GET", "/business/courses", "business", { token: business });
            await call("business_users", "GET", "/business/users", "business", { token: business });
          }
        }
        if (delay) await sleep(delay);
      }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
  }

  const elapsed = (performance.now() - started) / 1000;
  let total = 0;
  let r5xx = 0;
  let r429 = 0;
  let other4xx = 0;
  console.log(`\n${"endpoint".padEnd(20)} ${"n".padStart(5)} ${"2xx".padStart(5)} ${"p50ms".padStart(8)} ${"p95ms".padStart(8)}  statuts`);
  for (const [endpoint, s] of Object.entries(stats)) {
    const n = Object.values(s.status).reduce((a, b) => a + b, 0);
    total += n;
    for (const [code, c] of Object.entries(s.status)) {
      if (code === "429") r429 += c;
      else if (code === "erreur-réseau" || Number(code) >= 500) r5xx += c;
      else if (Number(code) >= 400) other4xx += c;
    }
    console.log(
      `${endpoint.padEnd(20)} ${String(n).padStart(5)} ${String(s.lat.length).padStart(5)} ${pct(s.lat, 50).toFixed(0).padStart(8)} ${pct(s.lat, 95).toFixed(0).padStart(8)}  ${JSON.stringify(s.status)}`,
    );
  }
  console.log(`\ntotal=${total} requêtes en ${elapsed.toFixed(1)} s (${(total / elapsed).toFixed(1)} req/s) ; 5xx/réseau=${r5xx} ; 429=${r429} ; autres 4xx=${other4xx}`);
  const bad = r5xx > 0;
  if (scenario === "login" && r429 === 0) {
    console.log("ÉCHEC : aucun 429 observé sur la rafale de login.");
    process.exit(1);
  }
  if (bad) {
    console.log("ÉCHEC : erreurs serveur/réseau détectées.");
    process.exit(1);
  }
  console.log("OK (pas de 5xx). Les 429 sont le limiteur de débit (100 req/min/IP global, 10/min sur le login).");
}

await main();
