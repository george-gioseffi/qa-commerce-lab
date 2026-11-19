/** Reset is permitted only for an explicitly confirmed, local test database. */
export function validateTestReset(databaseUrl: string | undefined, confirmation: string | undefined): void {
  let url: URL;
  try {
    url = new URL(databaseUrl ?? "");
  } catch {
    throw new Error("Test reset refused: DATABASE_URL is invalid.");
  }
  const name = decodeURIComponent(url.pathname.slice(1));
  const allowedHost = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !allowedHost ||
      !/^[a-zA-Z0-9_]+_test$/.test(name) || confirmation !== name) {
    throw new Error("Test reset refused: use a local *_test database and set QA_CONFIRM_TEST_DB to its exact name.");
  }
}
