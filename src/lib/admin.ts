export function checkAdminPassword(headerValue: string | null): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return headerValue === expected
}
