/**
 * Application configuration from environment variables
 */

/**
 * Check if signup is enabled via ENABLE_SIGNUP env variable
 * Defaults to false (disabled) - must be explicitly set to "true" to enable
 */
export function isSignupEnabled(): boolean {
  return process.env.ENABLE_SIGNUP === "true";
}
