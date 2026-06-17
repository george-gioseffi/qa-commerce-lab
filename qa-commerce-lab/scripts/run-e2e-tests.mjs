import { canReachPort, dockerAvailable, run } from "./shared.mjs";

const useDocker = process.argv.includes("--docker");

const localBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:55432/qa_commerce_lab_test?schema=public";

if (useDocker) {
  if (!dockerAvailable()) {
    console.error("Docker daemon is not available. Open Docker Desktop and rerun `npm run test:e2e:docker`.");
    process.exit(1);
  }

  try {
    run("docker", ["compose", "up", "--build", "-d"]);
    run("docker", ["compose", "--profile", "e2e", "run", "--rm", "e2e"]);
  } finally {
    run("docker", ["compose", "--profile", "e2e", "down", "-v"]);
  }
} else {
  const databaseReady = await canReachPort("127.0.0.1", 55432, 500);
  if (!databaseReady) {
    console.error(
      "Test PostgreSQL is not reachable on 127.0.0.1:55432. Run `npm run test:api:docker` first or start the test database before `npm run test:e2e`."
    );
    process.exit(1);
  }

  const env = {
    ...process.env,
    PLAYWRIGHT_BASE_URL: localBaseUrl,
    DATABASE_URL: testDatabaseUrl,
    JWT_SECRET: process.env.TEST_JWT_SECRET ?? "super-secret-key",
    FRONTEND_URL: process.env.TEST_FRONTEND_URL ?? "http://127.0.0.1:4173",
    VITE_PROXY_TARGET: "http://127.0.0.1:3333",
  };

  try {
    run("npx", ["playwright", "install", "--with-deps", "chromium"], {
      cwd: "tests/e2e",
      env,
    });
  } catch {
    console.error(
      "Playwright browsers are not installed. Run `npx playwright install --with-deps chromium` and try again."
    );
    process.exit(1);
  }

  run("npm", ["run", "test:e2e:local"], { env });
}
