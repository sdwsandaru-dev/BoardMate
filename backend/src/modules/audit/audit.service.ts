import { prisma } from "../../config/database";
import { Prisma } from "../../generated/prisma/client";

export class AuditError extends Error {
constructor(
message: string,
public statusCode: number,
) {
super(message);
this.name = "AuditError";
}
}

export interface CreateAuditLogInput {
actorId: string;
action: string;
resourceType: string;
resourceId: string;
description: string;
metadata?: Prisma.InputJsonValue;
}

/**

* Record an administrative action.
*
* Call this after the associated operation succeeds, or use the same
* Prisma transaction when the audit record must be atomic with the change.
  */
  export async function createAuditLog(
  input: CreateAuditLogInput,
  tx: Prisma.TransactionClient = prisma,
  ) {
  return tx.auditLog.create({
  data: {
  actorId: input.actorId,
  action: input.action,
  resourceType: input.resourceType,
  resourceId: input.resourceId,
  description: input.description,
  ...(input.metadata !== undefined
  ? { metadata: input.metadata }
  : {}),
  },
  });
  }

export interface AuditQuery {
page: number;
limit: number;
action?: string;
resourceType?: string;
actorId?: string;
resourceId?: string;
from?: Date;
to?: Date;
}

/**

* Retrieve paginated audit history.
  */
  export async function listAuditLogs(filters: AuditQuery) {
  const {
  page,
  limit,
  action,
  resourceType,
  actorId,
  resourceId,
  from,
  to,
  } = filters;

const where: Prisma.AuditLogWhereInput = {
...(action ? { action } : {}),
...(resourceType ? { resourceType } : {}),
...(actorId ? { actorId } : {}),
...(resourceId ? { resourceId } : {}),
...(from || to
? {
createdAt: {
...(from ? { gte: from } : {}),
...(to ? { lte: to } : {}),
},
}
: {}),
};

const [logs, total] = await prisma.$transaction([
prisma.auditLog.findMany({
where,
skip: (page - 1) * limit,
take: limit,
orderBy: { createdAt: "desc" },
}),
prisma.auditLog.count({ where }),
]);

return {
logs,
pagination: {
page,
limit,
total,
totalPages: Math.ceil(total / limit),
},
};
}
