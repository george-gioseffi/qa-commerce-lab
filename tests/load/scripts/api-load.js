import http from "k6/http";
import { check, sleep } from "k6";

// Never aim a load test at an external service through this script.
const baseUrl = __ENV.K6_BASE_URL || "http://127.0.0.1:3333";
if (!/^http:\/\/127\.0\.0\.1(:\d{1,5})?$/.test(baseUrl)) {
  throw new Error("K6_BASE_URL must be a loopback HTTP origin (127.0.0.1).");
}

export const options = {
  // A permissive smoke guard, not a production SLA: chosen after a local baseline.
  thresholds: { http_req_failed: ["rate==0"], checks: ["rate==1"], http_req_duration: ["p(95)<250"] },
  scenarios: {
    smoke: { executor: "constant-vus", vus: 1, duration: "5s", startTime: "0s" },
    steady: { executor: "constant-vus", vus: 2, duration: "10s", startTime: "5s" },
    small_spike: { executor: "constant-vus", vus: 4, duration: "5s", startTime: "15s" },
  },
};

export default function () {
  const params = { redirects: 0, timeout: "5s" };
  const health = http.get(`${baseUrl}/health`, params);
  check(health, { "health returns 200": (response) => response.status === 200 });
  const products = http.get(`${baseUrl}/api/products`, params);
  check(products, { "catalog returns 200": (response) => response.status === 200 });
  sleep(1);
}
