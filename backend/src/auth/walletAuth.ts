export function isAuthorizedWallet(address: unknown) {
  if (!address || typeof address !== "string") return false
  // Placeholder: extend with signature or allowlist checks
  return Boolean(address.trim())
}
