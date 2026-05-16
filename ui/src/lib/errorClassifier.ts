/**
 * errorClassifier — Map error codes to user-friendly messages.
 *
 * Pure utility, no React dependencies.
 */

export type ErrorCategory =
  | "auth"
  | "payment"
  | "rate"
  | "provider_down"
  | "timeout"
  | "network"
  | "unknown";

/**
 * Classify HTTP status into a user-friendly message.
 */
export function classifyError(status: number, message: string): string {
  switch (status) {
    case 401:
      return "Authentication failed \u2014 check your API key and n9router config";
    case 402:
      return "Payment required \u2014 your n9router account needs funds";
    case 429:
      return "Rate limited \u2014 too many requests, please wait";
    case 503:
      return "Provider unavailable \u2014 the model provider may be down";
    case 504:
      return "Request timed out \u2014 n9router took too long to respond";
    default:
      return message || `n9router error (${status})`;
  }
}

/**
 * Return a timeout-specific error message.
 */
export function classifyTimeoutError(): string {
  return "Connection timed out \u2014 check your network connection";
}

/**
 * Return a network error message.
 */
export function classifyNetworkError(): string {
  return "Network error \u2014 unable to reach server";
}

/**
 * Categorize an HTTP status code.
 */
export function classifyErrorCategory(status: number): ErrorCategory {
  switch (status) {
    case 401:
      return "auth";
    case 402:
      return "payment";
    case 429:
      return "rate";
    case 503:
      return "provider_down";
    case 504:
      return "timeout";
    default:
      return "unknown";
  }
}
