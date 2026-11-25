// Limiteur de débit du login (10 tentatives/min/IP côté backend) : 25 mauvaises tentatives en rafale. On vérifie
// (1) des 429 au-delà du seuil, (2) aucun 5xx, (3) des rejets 4xx (400/401) avant le seuil.
// Effet de bord : l'IP du test est limitée environ une minute (ne pas enchaîner d'autres tests aussitôt).
import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";
import { BASE_URL, HOSTS, record } from "./lib.js";

const status429 = new Counter("login_429");
const status4xx = new Counter("login_rejected_4xx");
const status5xx = new Counter("login_5xx");

export const options = {
  scenarios: { burst: { executor: "per-vu-iterations", vus: 1, iterations: 25, maxDuration: "1m" } },
  thresholds: {
    login_429: ["count>=5"],
    login_5xx: ["count==0"],
    login_rejected_4xx: ["count>=1"],
    server_errors: ["rate<0.01"],
  },
};

export default function () {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: "inexistant@example.test", password: "Mauvais-mot-de-passe-1" }),
    { headers: { Host: HOSTS.public, "Content-Type": "application/json" }, tags: { endpoint: "login_burst" } },
  );
  record("login_burst", res);
  if (res.status === 429) status429.add(1);
  else if (res.status >= 400 && res.status < 500) status4xx.add(1);
  if (res.status >= 500) status5xx.add(1);
  check(res, { "pas de 5xx": (r) => r.status < 500 });
}
