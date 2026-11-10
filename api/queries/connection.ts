import { drizzle } from "drizzle-orm/d1";
import * as schema from "@db/schema";
import type { D1Like } from "../security";

let rawD1: D1Like | null = null;

export function setDb(d1: D1Like | null | undefined) {
  rawD1 = d1 ?? null;
  dbInstance = d1 ? drizzle(d1 as never, { schema }) : null;
}

export function getRawD1(): D1Like | null {
  return rawD1;
}

export function getDb() {
  if (!dbInstance) {
    throw new Error("Database not initialized. Call setDb() first.");
  }
  return dbInstance;
}
