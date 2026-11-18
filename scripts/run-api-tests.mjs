import { DEFAULT_TEST_DATABASE_URL, dockerAvailable, parseDatabaseHostPort, run, waitForPort } from "./shared.mjs";

const useDocker = process.argv.includes("--docker");
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
const { host: dbHost, port: dbPort } = parseDatabaseHostPort(testDatabaseUrl);

const testEnv = {
  ...process.env,
  DATABASE_URL: testDatabaseUrl,
  JWT_SECRET: process.env.TEST_JWT_SECRET ?? "super-secret-key",
  FRONTEND_URL: process.env.TEST_FRONTEND_URL ?? "http://127.0.0.1:4173",
};

async function runAgainstAvailableDatabase() {
  await waitForPort(dbHost, dbPort, "Test PostgreSQL", 2, 500).catch(() => {
    throw new Error(
      `Test PostgreSQL is not reachable on ${dbHost}:${dbPort}. Run \`npm run test:api:docker\` or start the test database first.`
    );
  });

  run("npm", ["run", "db:test:push"], { env: testEnv });
  run("npm", ["run", "db:test:seed"], { env: testEnv });
  run("npm", ["run", "test:api:local"], { env: testEnv });
}

async function runWithDocker() {
  if (!dockerAvailable()) {
    throw new Error(
      "Docker daemon is not available. Open Docker Desktop and rerun `npm run test:api:docker`."
    );
  }

  try {
    run("docker", ["compose", "-f", "docker-compose.test.yml", "up", "-d", "postgres-test"]);
    await waitForPort("127.0.0.1", 55432, "Test PostgreSQL", 30, 1000);
    await runAgainstAvailableDatabase();
  } finally {
    run("docker", ["compose", "-f", "docker-compose.test.yml", "down", "-v"]);
  }
}

try {
  if (useDocker) {
    await runWithDocker();
  } else {
    await runAgainstAvailableDatabase();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
