/**
 * Sanitizes logs, error messages, and stack traces before storing or sending to any AI adapter.
 * Redacts common secret formats on a best-effort basis. Unknown formats and
 * personal data can still be present, so review reports before sharing them.
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
      .replace(/\b(Bearer|Basic)\s+(?!\[REDACTED)[^\s,;]+/gi, "$1 [REDACTED]")
      .replace(/\b(cookie|set-cookie)\s*:\s*[^\r\n]+/gi, "$1: [REDACTED]")
      // Connection strings with credentials
      .replace(/(postgres(?:ql)?:\/\/[^:\s]+:)[^@\s]+(@)/gi, "$1[REDACTED_PASSWORD]$2")
      // Common API key / token formats
      .replace(/\b(gho|ghp|sk|AIza)[A-Za-z0-9_\-]{8,}\b/g, "[REDACTED_KEY]")
      // Query-string and plain key-value secrets (excluding whitespace-delimited logs)
      .replace(/\b(password|passwd|token|secret|api[_-]?key)\s*=\s*[^\s&#,;]+/gi, "$1=[REDACTED]")
      // JSON password / token fields
      .replace(/("(?:password|token|jwt|secret|apiKey)"\s*:\s*")[^"]+(")/gi, "$1[REDACTED]$2")
  );
}
