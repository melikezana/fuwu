export function isSupabaseSessionCookie(name: string) {
  return /^sb-.+-auth-token(?:\.\d+|-code-verifier)?$/.test(name);
}
