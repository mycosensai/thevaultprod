import { and, eq, ne } from "drizzle-orm";
import { listings } from "@db/schema";

/**
 * Atomically mark a listing sold with a single conditional UPDATE
 * (WHERE id = ? AND status != 'sold'). Returns true if this caller
 * won the row (inventory lock acquired), false if it was already sold.
 */
export async function markListingSold(
  db: any,
  listingId: number,
): Promise<boolean> {
  const result = await db
    .update(listings)
    .set({ status: "sold" })
    .where(and(eq(listings.id, listingId), ne(listings.status, "sold")))
    .run();

  const changes = Number(result?.meta?.changes ?? 0);
  return changes > 0;
}
