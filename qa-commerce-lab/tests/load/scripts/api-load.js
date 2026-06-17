import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<700"],
  },
  scenarios: {
    smoke_load: {
      executor: "constant-vus",
      vus: 5,
      duration: "20s",
    },
  },
};

const baseUrl = __ENV.K6_BASE_URL || "http://localhost:3333";

export default function () {
  const products = http.get(`${baseUrl}/api/products`);
  check(products, { "GET /products status is 200": (response) => response.status === 200 });

  const login = http.post(
    `${baseUrl}/api/auth/login`,
    JSON.stringify({
      email: "qa.customer@example.com",
      password: "Password123!",
    }),
    { headers: { "Content-Type": "application/json" } }
  );

  check(login, { "POST /auth/login status is 200": (response) => response.status === 200 });

  if (login.status === 200) {
    const token = login.json("token");
    const checkout = http.post(`${baseUrl}/api/checkout`, null, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    check(checkout, {
      "POST /checkout is stable": (response) => [201, 400].includes(response.status),
    });
  }

  sleep(1);
}
