// Stress (paliers jusqu'à 200 VU) puis spike (pic brutal à 300 VU) sur le catalogue public : cherche le point de rupture.
// Critère : aucun 5xx (server_errors < 1 %) même saturé ; les 429 sont attendus. Les p(95) sont volontairement larges.
import { check, sleep } from "k6";
import { get, thresholds } from "./lib.js";

export const options = {
  scenarios: {
    stress: {
      executor: "ramping-vus",
      exec: "browse",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 50 },
        { duration: "1m", target: 100 },
        { duration: "1m", target: 200 },
        { duration: "30s", target: 0 },
      ],
    },
    spike: {
      executor: "ramping-vus",
      exec: "browse",
      startTime: "4m",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 300 },
        { duration: "1m", target: 300 },
        { duration: "10s", target: 0 },
      ],
    },
  },
  thresholds: thresholds({ catalogue: 3000 }),
};

export function browse() {
  check(get("catalogue", "/public/courses", "public"), { "pas de 5xx": (r) => r.status < 500 });
  sleep(0.2);
}
