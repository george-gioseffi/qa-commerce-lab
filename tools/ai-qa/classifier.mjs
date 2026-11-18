import { sanitizeText } from "./sanitizer.mjs";

export const FAILURE_CATEGORIES = {
  SELECTOR_DRIFT: "SELECTOR_DRIFT",
  AUTH_FAILURE: "AUTH_FAILURE",
  STOCK_OR_BUSINESS_CONFLICT: "STOCK_OR_BUSINESS_CONFLICT",
  NETWORK_OR_API_ERROR: "NETWORK_OR_API_ERROR",
  TIMEOUT_OR_SYNC: "TIMEOUT_OR_SYNC",
  DB_OR_ENV_ERROR: "DB_OR_ENV_ERROR",
  ASSERTION_MISMATCH: "ASSERTION_MISMATCH",
  UNCLASSIFIED: "UNCLASSIFIED",
};

const RULES = [
  {
    category: FAILURE_CATEGORIES.AUTH_FAILURE,
    confidence: "high",
    patterns: [/401\b/i, /invalid credentials/i, /unauthorized/i, /jwt/i, /session expired/i, /login is required/i],
    hypothesis: "Authentication token is missing, expired, or rejected by backend auth middleware.",
    recommendation: "Verify user registration/login fixture, JWT_SECRET consistency, and localStorage session handling.",
  },
  {
    category: FAILURE_CATEGORIES.STOCK_OR_BUSINESS_CONFLICT,
    confidence: "high",
    patterns: [/409\b/i, /insufficient stock/i, /exceeds available stock/i, /cart is empty/i],
    hypothesis: "Business rule validation or optimistic stock concurrency check rejected the operation.",
    recommendation: "Check test isolation for shared product stock or verify expected negative-path assertion.",
  },
  {
    category: FAILURE_CATEGORIES.DB_OR_ENV_ERROR,
    confidence: "high",
    patterns: [/ECONNREFUSED/i, /P1001/i, /P2025/i, /prisma/i, /database/i, /connect.*5432/i, /55432/i],
    hypothesis: "Database service is unreachable, schema is out of sync, or seed baseline is missing.",
    recommendation: "Confirm PostgreSQL is running, run db:push and db:seed against TEST_DATABASE_URL.",
  },
  {
    category: FAILURE_CATEGORIES.SELECTOR_DRIFT,
    confidence: "medium",
    patterns: [/strict mode violation/i, /waiting for locator to be (?:visible|attached)/i, /resolved to \d+ elements/i],
    hypothesis: "The locator did not reach the expected state or matched multiple elements; selector drift is one possible cause.",
    recommendation: "Inspect DOM snapshot/trace and align Page Object locator with accessible role or data-testid.",
  },
  {
    category: FAILURE_CATEGORIES.NETWORK_OR_API_ERROR,
    confidence: "medium",
    patterns: [/500\b/i, /502\b/i, /503\b/i, /internal server error/i, /fetch failed/i, /net::ERR_/i],
    hypothesis: "Backend endpoint returned an unexpected 5xx error or network request failed.",
    recommendation: "Inspect backend logs for unhandled exceptions and verify Vite proxy / CORS configuration.",
  },
  {
    category: FAILURE_CATEGORIES.TIMEOUT_OR_SYNC,
    confidence: "medium",
    patterns: [/timeout.*exceeded/i, /timed out/i, /Test timeout of/i],
    hypothesis: "Async operation or UI state transition did not settle within the configured timeout.",
    recommendation: "Check Playwright trace timeline for slow network calls or missing web-first assertion.",
  },
  {
    category: FAILURE_CATEGORIES.ASSERTION_MISMATCH,
    confidence: "medium",
    patterns: [/expect\(/i, /toBe\(/i, /toHaveText/i, /toContainText/i, /toHaveCount/i, /Received:/i],
    hypothesis: "Observed application state or response diverged from expected contract.",
    recommendation: "Compare Expected vs Received in the test output and verify recent changes to business logic.",
  },
];

export function classifyFailureDeterministic(failure) {
  const sanitizedError = sanitizeText(failure.error || "");
  const sanitizedFile = sanitizeText(failure.file || "");
  const sanitizedName = sanitizeText(failure.name || "");
  const attachments = Array.isArray(failure.attachments) ? failure.attachments.map((item) => ({
    name: sanitizeText(item?.name || ""),
    contentType: sanitizeText(item?.contentType || ""),
    path: sanitizeText(item?.path || ""),
  })) : [];
  const recentChangedFiles = Array.isArray(failure.recentChangedFiles)
    ? failure.recentChangedFiles.map((file) => sanitizeText(file)) : [];

  for (const rule of RULES) {
    if (rule.patterns.some((regex) => regex.test(sanitizedError))) {
      return {
        testName: sanitizedName,
        file: sanitizedFile,
        durationMs: failure.durationMs ?? 0,
        category: rule.category,
        confidence: rule.confidence,
        evidence: {
          sanitizedError: sanitizedError.slice(0, 600),
          attachments,
          recentChangedFiles,
        },
        hypothesis: rule.hypothesis,
        recommendation: rule.recommendation,
        verifiedAfterFix: false,
        adapter: "deterministic-heuristic-v1",
      };
    }
  }

  return {
    testName: sanitizedName,
    file: sanitizedFile,
    durationMs: failure.durationMs ?? 0,
    category: FAILURE_CATEGORIES.UNCLASSIFIED,
    confidence: "low",
    evidence: {
      sanitizedError: sanitizedError.slice(0, 600),
      attachments,
      recentChangedFiles,
    },
    hypothesis: "No deterministic rule matched this failure signature.",
    recommendation: "Inspect full trace and backend logs manually.",
    verifiedAfterFix: false,
    adapter: "deterministic-heuristic-v1",
  };
}

/**
 * Optional decoupled LLM adapter. Only used if AI_QA_API_KEY and AI_QA_ENDPOINT are explicitly set.
 * Falls back cleanly to deterministic classification on any error or missing config.
 */
export async function analyzeFailure(failure) {
  const baseAnalysis = classifyFailureDeterministic(failure);
  const apiKey = process.env.AI_QA_API_KEY;
  const endpoint = process.env.AI_QA_ENDPOINT;

  if (!apiKey || !endpoint) {
    return baseAnalysis;
  }

  let timer;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.username || url.password) return baseAnalysis;
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, {
      method: "POST",
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        max_tokens: 300,
        // Never send free-form logs, titles, file paths or attachments. Redaction
        // is best effort and cannot guarantee arbitrary private data is removed.
        prompt: `Suggest a QA investigation for category ${baseAnalysis.category} with confidence ${baseAnalysis.confidence}.`,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return baseAnalysis;
    }

    const data = await response.json();
    return {
      ...baseAnalysis,
      hypothesis: data.hypothesis ? sanitizeText(String(data.hypothesis)) : baseAnalysis.hypothesis,
      adapter: "external-llm-with-deterministic-fallback",
    };
  } catch {
    return baseAnalysis;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
