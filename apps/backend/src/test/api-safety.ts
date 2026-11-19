import { validateTestReset } from "../../prisma/seed-policy.js";

// API tests mutate database rows and may install test fixtures. Refuse to run
// before importing the application unless the target is explicitly confirmed.
validateTestReset(process.env.DATABASE_URL, process.env.QA_CONFIRM_TEST_DB);
