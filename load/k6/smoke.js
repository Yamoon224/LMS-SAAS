// Smoke : 1 VU, parcours santé + catalogue public + login. Valide routes, en-têtes et auth avant toute charge.
import http from "k6/http";
import { check, sleep } from "k6";
import { ACCOUNTS, BASE_URL, HOSTS, catalogueIds, get, loginToken, record, thresholds } from "./lib.js";

export const options = {
  scenarios: { smoke: { executor: "constant-vus", vus: 1, duration: "30s" } },
  thresholds: thresholds({ health: 300, catalogue: 1000, course_detail: 1000, learner_dashboard: 1500 }),
};

export function setup() {
  return { token: loginToken("public", ACCOUNTS.learner), ids: catalogueIds() };
}

export default function (data) {
  const health = http.get(`${BASE_URL}/health`, { headers: { Host: HOSTS.public }, tags: { endpoint: "health" } });
  record("health", health);
  check(health, { "health 200": (r) => r.status === 200 });

  check(get("catalogue", "/public/courses", "public"), { "catalogue 200": (r) => r.status === 200 });
  if (data.ids.length) {
    check(get("course_detail", `/public/courses/${data.ids[0]}`, "public"), { "détail 200": (r) => r.status === 200 });
  }
  if (data.token) {
    check(get("learner_dashboard", "/public/enrollments/dashboard", "public", data.token), {
      "dashboard 200": (r) => r.status === 200,
    });
  }
  sleep(1);
}
