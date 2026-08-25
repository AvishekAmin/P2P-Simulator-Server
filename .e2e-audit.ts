import "./src/config/env.js";
import { prisma } from "./src/config/prisma.js";
async function main() {
  const rows = await prisma.auditLog.findMany({
    where: { entityId: process.argv[2], action: { in: ["PAYMENT_COMPLETED", "PAYMENT_APPROVED"] } },
    select: { action: true, actorType: true, actorId: true, metadata: true },
    orderBy: { createdAt: "asc" },
  });
  for (const r of rows) console.log(` ${r.action} (${r.actorType}${r.actorId ? "/" + r.actorId : ""}):`, JSON.stringify(r.metadata));
  await prisma.$disconnect();
}
main();
