/**
 * Sanitizes logs, error messages, and stack traces before storing or sending to any AI adapter.
 * Ensures credentials, JWTs, database passwords, and tokens are never leaked.
 */
export function sanitizeText(input) {
  if (!input || typeof input !== "string") {
    return "";
  }

  return (
    input
      // Bearer / JWT tokens
      .replace(/Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/gi, "Bearer [REDACTED_JWT]")
      .replace(/\beyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\b/g, "[REDACTED_JWT]")
      // Connection strings with credentials
      .replace(/(postgres(?:ql)?:\/\/[^:\s]+:)[^@\s]+(@)/gi, "$1[REDACTED_PASSWORD]$2")
      // Common API key / token formats
      .replace(/\b(gho|ghp|sk|AIza)[A-Za-z0-9_\-]{8,}\b/g, "[REDACTED_KEY]")
      // JSON password / token fields
      .replace(/("(?:password|token|jwt|secret|apiKey)"\s*:\s*")[^"]+(")/gi, "$1[REDACTED]$2")
  );
}
