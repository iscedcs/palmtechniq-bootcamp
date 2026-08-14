import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * PRD §6 — every offline payment, comp, refund, track transfer and certificate
 * revocation writes an audit row. Non-optional.
 *
 * Deliberately takes a transaction client so the log and the change it
 * describes commit together. An audit trail that can disagree with the data is
 * worse than none, because it will be trusted.
 */
export async function writeAudit(
  tx: Prisma.TransactionClient,
  entry: {
    actorId: string;
    actorEmail: string | null;
    action: string;
    entityType: string;
    entityId: string;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
  },
) {
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId,
      actorEmail: entry.actorEmail,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before,
      after: entry.after,
    },
  });
}
