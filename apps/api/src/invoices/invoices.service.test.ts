import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
import { InvoiceStatus, PaymentStatus, StockMovementType } from "@prisma/client";
import { InvoicesService } from "./invoices.service";

function createPrismaMock(input: { payments?: Array<{ id: string }>; saleMovements?: Array<{ productId: string; warehouseId: string; quantity: number; unitCost: number }> }) {
  const calls: string[] = [];
  const invoice = {
    id: "invoice-1",
    invoiceNumber: "INV-000001",
    companyId: "company-1",
    status: InvoiceStatus.ISSUED,
    paymentStatus: PaymentStatus.UNPAID,
    totalAmount: 100,
    payments: input.payments ?? [],
    items: []
  };
  const saleMovements = input.saleMovements ?? [
    {
      productId: "product-1",
      warehouseId: "warehouse-1",
      quantity: 2,
      unitCost: 50
    }
  ];
  const tx = {
    invoice: {
      update: async () => {
        calls.push("invoice.update:CANCELLED");
        return { ...invoice, status: InvoiceStatus.CANCELLED };
      }
    },
    stockMovement: {
      createMany: async ({ data }: { data: Array<{ movementType: StockMovementType; quantity: number }> }) => {
        calls.push(`stockMovement.createMany:${data.length}:${data[0]?.movementType}:${data[0]?.quantity}`);
        return { count: data.length };
      }
    },
    auditLog: {
      create: async () => {
        calls.push("auditLog.create");
        return { id: "audit-1" };
      }
    }
  };

  return {
    calls,
    prisma: {
      invoice: {
        findUnique: async () => invoice
      },
      stockMovement: {
        findMany: async () => saleMovements
      },
      $transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)
    }
  };
}

describe("InvoicesService", () => {
  it("cancels an unpaid invoice and reverses issued stock", async () => {
    const { calls, prisma } = createPrismaMock({});
    const service = new InvoicesService(prisma as never);

    await service.cancel("invoice-1", { note: "Wrong customer" }, "user-1", "company-1");

    assert.deepEqual(calls, ["invoice.update:CANCELLED", "stockMovement.createMany:1:COUNT_ADJUSTMENT:2", "auditLog.create"]);
  });

  it("rejects cancellation when the invoice has payments", async () => {
    const { calls, prisma } = createPrismaMock({ payments: [{ id: "payment-1" }] });
    const service = new InvoicesService(prisma as never);

    await assert.rejects(service.cancel("invoice-1", {}, "user-1", "company-1"), BadRequestException);
    assert.deepEqual(calls, []);
  });
});
