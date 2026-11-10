export type TokenizationCode =
  | "BAD_REQUEST"
  | "FORBIDDEN"
  | "CONFLICT"
  | "NOT_FOUND"
  | "PRECONDITION_FAILED"
  | "UNAUTHORIZED";

export class TokenizationError extends Error {
  readonly code: TokenizationCode;

  constructor(code: TokenizationCode, message: string) {
    super(message);
    this.name = "TokenizationError";
    this.code = code;
  }
}
