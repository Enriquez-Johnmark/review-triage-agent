/** In a cloud session the owner's key is kept under this name: Claude Code itself
 *  reads ANTHROPIC_API_KEY, and the owner's key must pay for this app only. */
export const CLOUD_KEY = "OWNER_ANTHROPIC_API_KEY"

/** Without ANTHROPIC_API_KEY (from `.env` or the environment), uses the owner's
 *  key under its cloud name, for this process only. */
export function useOwnerKey(env: NodeJS.ProcessEnv): void {
  const ownerKey = env[CLOUD_KEY]
  if (!env.ANTHROPIC_API_KEY && ownerKey) env.ANTHROPIC_API_KEY = ownerKey
}
