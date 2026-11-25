// Charge nominale : montée à ~50 VU. Catalogue public, détail, tableau de bord apprenant, listes business.
// ATTENTION : le plafond global du backend est de 100 req/min/IP (ThrottlerModule) : depuis une seule IP, la
// majorité des requêtes reçoit 429 (compté dans `rate_limited`, pas dans les échecs). Pour mesurer la capacité
// réelle, lancer sur un environnement de test où le limiteur est relevé, ou répartir la charge sur plusieurs IP.
import { check, sleep } from "k6";
import { ACCOUNTS, catalogueIds, get, loginToken, thresholds } from "./lib.js";

export const options = {
  scenarios: {
    load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 50 },
        { duration: "3m", target: 50 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "15s",
    },
  },
  thresholds: thresholds({
    catalogue: 800,
    course_detail: 800,
    learner_dashboard: 1000,
    business_courses: 1200,
    business_users: 1200,
  }),
};

export function setup() {
  return {
    ids: catalogueIds(),
    learner: loginToken("public", ACCOUNTS.learner),
    business: loginToken("business", ACCOUNTS.business),
  };
}

const okOrLimited = (r) => r.status === 200 || r.status === 429;

export default function (data) {
  const roll = Math.random();
  if (roll < 0.5) {
    check(get("catalogue", "/public/courses?page=1&pageSize=12", "public"), { "catalogue ok": okOrLimited });
  } else if (roll < 0.7 && data.ids.length) {
    const id = data.ids[Math.floor(Math.random() * data.ids.length)];
    check(get("course_detail", `/public/courses/${id}`, "public"), { "détail ok": okOrLimited });
  } else if (roll < 0.85 && data.learner) {
    check(get("learner_dashboard", "/public/enrollments/dashboard", "public", data.learner), { "dashboard ok": okOrLimited });
  } else if (data.business) {
    check(get("business_courses", "/business/courses", "business", data.business), { "cours business ok": okOrLimited });
    check(get("business_users", "/business/users", "business", data.business), { "utilisateurs business ok": okOrLimited });
  }
  sleep(Math.random() * 2 + 0.5);
}
