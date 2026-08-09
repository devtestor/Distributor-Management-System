import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { PaymentsService } from "./payments.service";

function createPrismaMock(invoicePayments: Array<{ amount: number }>, totalAmount = 100) {
  const calls: string[] = [];
  const payments = [...invoicePayments];
  const tx = {
    customer: {
      findUnique: async () => ({ id: "customer-1" })
    },
    invoice: {
      findUnique: async () => ({
        id: "invoice-1",
        customerId: "customer-1",
        totalAmount,
        payments
      }),
      update: async ({ data }: { data: { paymentStatus: PaymentStatus } }) => {
        calls.push(`invoice.update:${data.paymentStatus}`);
        return { id: "invoice-1" };
      }
    },
    payment: {
      create: async ({ data }: { data: { amount: number } }) => {
        calls.push("payment.create");
        payments.push({ amount: data.amount });
        return { id: "payment-1" };
      },
      findUnique: async () => ({ id: "payment-1" })
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
      $transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)
    }
  };
}

describe("PaymentsService", () => {
  it("creates payment, refreshes invoice status, and audits in one transaction", async () => {
    const { calls, prisma } = createPrismaMock([{ amount: 50 }]);
    const service = new PaymentsService(prisma as never);

    await service.create(
      {
        customerId: "customer-1",
        invoiceId: "invoice-1",
        method: PaymentMethod.CASH,
        amount: 50
      },
      "user-1",
      "company-1"
    );

    assert.deepEqual(calls, ["payment.create", "invoice.update:PAID", "auditLog.create"]);
  });

  it("rejects payments that exceed the invoice balance before writing", async () => {
    const { calls, prisma } = createPrismaMock([{ amount: 90 }]);
    const service = new PaymentsService(prisma as never);

    await assert.rejects(
      service.create(
        {
          customerId: "customer-1",
          invoiceId: "invoice-1",
          method: PaymentMethod.CASH,
          amount: 20
        },
        "user-1",
        "company-1"
      ),
      BadRequestException
    );

    assert.deepEqual(calls, []);
  });
});
