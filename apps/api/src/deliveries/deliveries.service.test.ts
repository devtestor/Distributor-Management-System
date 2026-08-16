import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DeliveriesService } from "./deliveries.service";

function createPrismaMock() {
  const calls: unknown[] = [];
  return {
    calls,
    prisma: {
      deliveryTrip: {
        findMany: async (args: unknown) => {
          calls.push(args);
          return [];
        }
      }
    }
  };
}

describe("DeliveriesService", () => {
  it("scopes driver trip lists to their own company and user", async () => {
    const { calls, prisma } = createPrismaMock();
    const service = new DeliveriesService(prisma as never);

    await service.list("driver-1", "DRIVER", "company-1", { page: "2", limit: "10" });

    assert.deepEqual(calls[0], {
      where: { companyId: "company-1", driverId: "driver-1" },
      include: { driver: true, vehicle: true, items: { include: { product: true } }, proofs: { include: { customer: true, createdBy: true } } },
      orderBy: { createdAt: "desc" },
      skip: 10,
      take: 10
    });
  });

  it("scopes non-driver trip lists to company only", async () => {
    const { calls, prisma } = createPrismaMock();
    const service = new DeliveriesService(prisma as never);

    await service.list("owner-1", "OWNER", "company-1");

    assert.deepEqual(calls[0], {
      where: { companyId: "company-1" },
      include: { driver: true, vehicle: true, items: { include: { product: true } }, proofs: { include: { customer: true, createdBy: true } } },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 100
    });
  });
});
