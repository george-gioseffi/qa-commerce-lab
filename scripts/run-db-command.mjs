import { assertSafeTestDb, run } from "./shared.mjs";

const command = process.argv[2];

if (!["push", "seed"].includes(command)) {
  console.error("Use: node scripts/run-db-command.mjs <push|seed>");
  process.exit(1);
}

const testEnv = {
  ...process.env,
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:55432/qa_commerce_lab_test?schema=public",
  JWT_SECRET: process.env.TEST_JWT_SECRET ?? "super-secret-key",
  FRONTEND_URL: process.env.TEST_FRONTEND_URL ?? "http://127.0.0.1:4173",
};

assertSafeTestDb(testEnv.DATABASE_URL, testEnv.QA_CONFIRM_TEST_DB);

if (command === "push") {
  run("npm", ["run", "db:push", "--workspace", "@qa-commerce-lab/backend"], { env: testEnv });
} else {
  run("npm", ["run", "db:seed:test", "--workspace", "@qa-commerce-lab/backend"], { env: testEnv });
}
