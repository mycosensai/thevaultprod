/** Session payloads must not include the password hash. */
export function toPublicUser<T extends object>(user: T): Omit<T, "password"> {
  const record = user as T & { password?: unknown };
  const { password: _password, ...safe } = record;
  return safe;
}
