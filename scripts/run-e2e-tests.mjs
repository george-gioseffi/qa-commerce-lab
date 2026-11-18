import {
  canReachPort,
  assertSafeTestDb,
  DEFAULT_TEST_DATABASE_URL,
  dockerAvailable,
  parseDatabaseHostPort,
  run,
} from "./shared.mjs";
import { isolatedComposeArgs } from "./compose-isolation.mjs";

const useDocker = process.argv.includes("--docker");

const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
const { host: dbHost, port: dbPort } = parseDatabaseHostPort(testDatabaseUrl);

if (useDocker) {
  if (!dockerAvailable()) {
    console.error("Docker daemon is not available. Open Docker Desktop and rerun `npm run test:e2e:docker`.");
    process.exit(1);
  }

  const compose = isolatedComposeArgs("docker-compose.yml");
  try {
    run("docker", [...compose, "up", "--build", "-d"]);
    run("docker", [...compose, "--profile", "e2e", "run", "--rm", "e2e"]);
  } finally {
    run("docker", [...compose, "--profile", "e2e", "down", "-v"]);
  }
} else {
  assertSafeTestDb(testDatabaseUrl, process.env.QA_CONFIRM_TEST_DB);
  const databaseReady = await canReachPort(dbHost, dbPort, 500);
  if (!databaseReady) {
    console.error(
      `Test PostgreSQL is not reachable on ${dbHost}:${dbPort}. Run \`npm run test:api:docker\` first or start the test database before \`npm run test:e2e\`.`
    );
    process.exit(1);
  }

  const env = {
    ...process.env,
    DATABASE_URL: testDatabaseUrl,
    JWT_SECRET: process.env.TEST_JWT_SECRET ?? "super-secret-key",
    FRONTEND_URL: process.env.TEST_FRONTEND_URL ?? "http://127.0.0.1:4173",
    VITE_PROXY_TARGET: "http://127.0.0.1:3333",
  };

  run("npm", ["run", "db:test:push"], { env });
  run("npm", ["run", "db:test:seed"], { env });
  run("npm", ["run", "test:e2e:local"], { env });
}
