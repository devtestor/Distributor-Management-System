import "dotenv/config";
import {
  DebtCollectionActionType,
  DebtCollectionStatus,
  DeliveryStatus,
  EmptyMovementType,
  InvoiceStatus,
  PackageType,
  PaymentMethod,
  PaymentReconciliationStatus,
  PaymentStatus,
  PrismaClient,
  ProductCategory,
  StockMovementType
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { code: "BRALIRWA-DEMO" },
    update: {
      name: "BRALIRWA Distributor",
      industry: "Beverage distribution",
      primaryColor: "#0b6b50",
      secondaryColor: "#f4c542",
      currency: "RWF",
      defaultLocale: "en",
      featureFlags: {
        emptiesTracking: true,
        creditManagement: true,
        deliveryRoutes: true,
        invoicePayments: true
      }
    },
    create: {
      id: "00000000-0000-0000-0000-000000000010",
      name: "BRALIRWA Distributor",
      code: "BRALIRWA-DEMO",
      industry: "Beverage distribution",
      primaryColor: "#0b6b50",
      secondaryColor: "#f4c542",
      currency: "RWF",
      defaultLocale: "en",
      featureFlags: {
        emptiesTracking: true,
        creditManagement: true,
        deliveryRoutes: true,
        invoicePayments: true
      }
    }
  });

  const roles = await Promise.all(
    [
      ["OWNER", "Full business control"],
      ["ADMIN", "System and master data management"],
      ["WAREHOUSE_MANAGER", "Warehouse stock operations"],
      ["SALESPERSON", "Customer orders and collections"],
      ["DRIVER", "Delivery confirmation and truck return recording"],
      ["ACCOUNTANT", "Payments, expenses, and reports"]
    ].map(([name, description]) =>
      prisma.role.upsert({
        where: { name },
        update: { description },
        create: { name, description }
      })
    )
  );

  const ownerRole = roles.find((role) => role.name === "OWNER");
  if (!ownerRole) throw new Error("Owner role was not created");

  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);

  const owner = await prisma.user.upsert({
    where: { email: "owner@example.com" },
    update: { companyId: company.id, roleId: ownerRole.id, fullName: "Aline Uwase", phone: "+250 788 000 001", passwordHash },
    create: {
      companyId: company.id,
      roleId: ownerRole.id,
      fullName: "Aline Uwase",
      email: "owner@example.com",
      phone: "+250 788 000 001",
      passwordHash,
      preferredLocale: "en"
    }
  });

  const roleByName = new Map(roles.map((role) => [role.name, role]));
  const driver = await prisma.user.upsert({
    where: { email: "driver@example.com" },
    update: { companyId: company.id, roleId: roleByName.get("DRIVER")?.id, fullName: "Patrick Niyonzima", phone: "+250 788 000 205" },
    create: {
      companyId: company.id,
      roleId: roleByName.get("DRIVER")?.id ?? ownerRole.id,
      fullName: "Patrick Niyonzima",
      email: "driver@example.com",
      phone: "+250 788 000 205",
      passwordHash,
      preferredLocale: "en"
    }
  });

  const salesperson = await prisma.user.upsert({
    where: { email: "sales@example.com" },
    update: { companyId: company.id, roleId: roleByName.get("SALESPERSON")?.id, fullName: "Grace Mukamana", phone: "+250 788 000 306" },
    create: {
      companyId: company.id,
      roleId: roleByName.get("SALESPERSON")?.id ?? ownerRole.id,
      fullName: "Grace Mukamana",
      email: "sales@example.com",
      phone: "+250 788 000 306",
      passwordHash,
      preferredLocale: "en"
    }
  });

  const warehouse = await prisma.warehouse.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: { companyId: company.id },
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      companyId: company.id,
      name: "Main Warehouse",
      location: "Kigali"
    }
  });

  const products = [
    {
      sku: "PRI-72-BTL",
      name: "Primus",
      brand: "BRALIRWA",
      category: ProductCategory.BEER,
      packageType: PackageType.BOTTLE_CRATE,
      unitSize: "72cl x 12",
      unitCost: "9800",
      unitPrice: "11200",
      reorderLevel: 350,
      tracksEmpties: true,
      openingStock: 428
    },
    {
      sku: "MUT-65-BTL",
      name: "Mutzig",
      brand: "BRALIRWA",
      category: ProductCategory.BEER,
      packageType: PackageType.BOTTLE_CRATE,
      unitSize: "65cl x 12",
      unitCost: "11800",
      unitPrice: "13400",
      reorderLevel: 180,
      tracksEmpties: true,
      openingStock: 116
    },
    {
      sku: "COC-30-PET",
      name: "Coca-Cola",
      brand: "Coca-Cola",
      category: ProductCategory.SOFT_DRINK,
      packageType: PackageType.PET_PACK,
      unitSize: "30cl x 24",
      unitCost: "7200",
      unitPrice: "8200",
      reorderLevel: 400,
      tracksEmpties: false,
      openingStock: 540
    },
    {
      sku: "FAN-30-PET",
      name: "Fanta Orange",
      brand: "Coca-Cola",
      category: ProductCategory.SOFT_DRINK,
      packageType: PackageType.PET_PACK,
      unitSize: "30cl x 24",
      unitCost: "7000",
      unitPrice: "8200",
      reorderLevel: 260,
      tracksEmpties: false,
      openingStock: 380
    }
  ];

  for (const item of products) {
    const product = await prisma.product.upsert({
      where: { companyId_sku: { companyId: company.id, sku: item.sku } },
      update: {
        companyId: company.id,
        name: item.name,
        brand: item.brand,
        category: item.category,
        packageType: item.packageType,
        unitSize: item.unitSize,
        unitCost: item.unitCost,
        unitPrice: item.unitPrice,
        reorderLevel: item.reorderLevel,
        tracksEmpties: item.tracksEmpties
      },
      create: {
        companyId: company.id,
        sku: item.sku,
        name: item.name,
        brand: item.brand,
        category: item.category,
        packageType: item.packageType,
        unitSize: item.unitSize,
        unitCost: item.unitCost,
        unitPrice: item.unitPrice,
        reorderLevel: item.reorderLevel,
        tracksEmpties: item.tracksEmpties
      }
    });

    const existingOpening = await prisma.stockMovement.findFirst({
      where: {
        productId: product.id,
        companyId: company.id,
        warehouseId: warehouse.id,
        movementType: StockMovementType.PURCHASE_RECEIPT,
        referenceType: "SEED_OPENING_STOCK"
      }
    });

    if (!existingOpening) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          companyId: company.id,
          warehouseId: warehouse.id,
          movementType: StockMovementType.PURCHASE_RECEIPT,
          quantity: item.openingStock,
          unitCost: item.unitCost,
          referenceType: "SEED_OPENING_STOCK",
          note: "Opening stock for local development",
          createdById: owner.id
        }
      });
    }
  }

  const customers = [
    ["00000000-0000-0000-0000-000000000101", "Kimironko Mini Market", "+250 788 000 114", "Kigali East", "Kimironko", "600000"],
    ["00000000-0000-0000-0000-000000000102", "Nyabugogo Wholesale Point", "+250 788 000 229", "Kigali Central", "Nyabugogo", "1200000"],
    ["00000000-0000-0000-0000-000000000103", "Musanze Bar & Grill", "+250 788 000 336", "Northern Area", "Musanze", "850000"],
    ["00000000-0000-0000-0000-000000000104", "Rubavu Lakeside Depot", "+250 788 000 441", "Western Area", "Rubavu", "1400000"]
  ];

  for (const [id, name, phone, route, location, creditLimit] of customers) {
    await prisma.customer.upsert({
      where: { id },
      update: { companyId: company.id, name, phone, route, location, creditLimit },
      create: { id, companyId: company.id, name, phone, route, location, creditLimit }
    });
  }

  const vehicle = await prisma.vehicle.upsert({
    where: { companyId_plateNumber: { companyId: company.id, plateNumber: "RAB 334D" } },
    update: { companyId: company.id, driverId: driver.id },
    create: {
      companyId: company.id,
      plateNumber: "RAB 334D",
      driverId: driver.id
    }
  });

  const productBySku = new Map((await prisma.product.findMany({ where: { companyId: company.id } })).map((product) => [product.sku, product]));
  const customerRecords = await prisma.customer.findMany({ where: { companyId: company.id } });
  const customerByName = new Map(customerRecords.map((customer) => [customer.name, customer]));

  const invoiceSeeds = [
    {
      number: "INV-DEMO-001",
      customer: "Kimironko Mini Market",
      status: PaymentStatus.PARTIAL,
      items: [
        ["PRI-72-BTL", 20],
        ["MUT-65-BTL", 12]
      ],
      payment: { method: PaymentMethod.MOBILE_MONEY, amount: 275000, reference: "MOMO-DEMO-8402", status: PaymentReconciliationStatus.MATCHED }
    },
    {
      number: "INV-DEMO-002",
      customer: "Nyabugogo Wholesale Point",
      status: PaymentStatus.PARTIAL,
      items: [
        ["COC-30-PET", 40],
        ["FAN-30-PET", 30]
      ],
      payment: { method: PaymentMethod.BANK, amount: 650000, reference: "BK-DEMO-10394", status: PaymentReconciliationStatus.PENDING }
    },
    {
      number: "INV-DEMO-003",
      customer: "Musanze Bar & Grill",
      status: PaymentStatus.UNPAID,
      items: [
        ["PRI-72-BTL", 14],
        ["FAN-30-PET", 18]
      ]
    }
  ];

  for (const seed of invoiceSeeds) {
    const customer = customerByName.get(seed.customer);
    if (!customer) continue;
    const items = seed.items.map(([sku, quantity]) => {
      const product = productBySku.get(String(sku));
      if (!product) throw new Error(`Missing seeded product ${sku}`);
      const count = Number(quantity);
      const lineTotal = Number(product.unitPrice) * count;
      return { product, count, lineTotal };
    });
    const totalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const taxAmount = Math.round((totalAmount - totalAmount / 1.18) * 100) / 100;

    const invoice = await prisma.invoice.upsert({
      where: { companyId_invoiceNumber: { companyId: company.id, invoiceNumber: seed.number } },
      update: { customerId: customer.id, totalAmount, taxAmount, paymentStatus: seed.status },
      create: {
        companyId: company.id,
        customerId: customer.id,
        invoiceNumber: seed.number,
        status: InvoiceStatus.ISSUED,
        paymentStatus: seed.status,
        totalAmount,
        taxRate: 18,
        taxAmount,
        createdById: salesperson.id,
        items: {
          create: items.map((item) => ({
            productId: item.product.id,
            quantity: item.count,
            unitPrice: item.product.unitPrice,
            discountAmount: 0,
            lineTotal: item.lineTotal
          }))
        }
      }
    });

    if (seed.payment) {
      const existingPayment = await prisma.payment.findFirst({ where: { companyId: company.id, reference: seed.payment.reference } });
      if (!existingPayment) {
        await prisma.payment.create({
          data: {
            companyId: company.id,
            customerId: customer.id,
            invoiceId: invoice.id,
            method: seed.payment.method,
            amount: seed.payment.amount,
            reference: seed.payment.reference,
            reconciliationStatus: seed.payment.status,
            reconciledAt: seed.payment.status === PaymentReconciliationStatus.MATCHED ? new Date() : undefined,
            reconciledById: seed.payment.status === PaymentReconciliationStatus.MATCHED ? owner.id : undefined,
            receivedById: salesperson.id
          }
        });
      }
    }
  }

  const primus = productBySku.get("PRI-72-BTL");
  const mutzig = productBySku.get("MUT-65-BTL");
  const kimironko = customerByName.get("Kimironko Mini Market");
  const nyabugogo = customerByName.get("Nyabugogo Wholesale Point");
  if (primus && mutzig && kimironko && nyabugogo) {
    for (const movement of [
      { customerId: kimironko.id, productId: primus.id, movementType: EmptyMovementType.ISSUED_TO_CUSTOMER, quantity: 142 },
      { customerId: nyabugogo.id, productId: mutzig.id, movementType: EmptyMovementType.ISSUED_TO_CUSTOMER, quantity: 310 },
      { customerId: kimironko.id, productId: primus.id, movementType: EmptyMovementType.RETURNED_BY_CUSTOMER, quantity: 36 }
    ]) {
      const existing = await prisma.emptyContainerMovement.findFirst({
        where: { companyId: company.id, customerId: movement.customerId, productId: movement.productId, movementType: movement.movementType, referenceType: "SEED_DEMO" }
      });
      if (!existing) {
        await prisma.emptyContainerMovement.create({
          data: { ...movement, companyId: company.id, referenceType: "SEED_DEMO", createdById: salesperson.id }
        });
      }
    }
  }

  const existingTrip = await prisma.deliveryTrip.findFirst({
    where: { companyId: company.id, route: "Kigali East", driverId: driver.id },
    include: { proofs: true }
  });
  const trip =
    existingTrip ??
    (await prisma.deliveryTrip.create({
      data: {
        companyId: company.id,
        vehicleId: vehicle.id,
        driverId: driver.id,
        route: "Kigali East",
        status: DeliveryStatus.CLOSED,
        cashCollected: 275000,
        creditIssued: 240000,
        loadedAt: new Date(),
        returnedAt: new Date(),
        items: {
          create: [
            primus ? { productId: primus.id, loadedQuantity: 24, deliveredQuantity: 20, returnedQuantity: 4, damagedQuantity: 0 } : undefined,
            mutzig ? { productId: mutzig.id, loadedQuantity: 12, deliveredQuantity: 10, returnedQuantity: 1, damagedQuantity: 1 } : undefined
          ].filter(Boolean) as Array<{ productId: string; loadedQuantity: number; deliveredQuantity: number; returnedQuantity: number; damagedQuantity: number }>
        }
      },
      include: { proofs: true }
    }));

  if (kimironko && trip.proofs.length === 0) {
    await prisma.deliveryProof.create({
      data: {
        companyId: company.id,
        tripId: trip.id,
        customerId: kimironko.id,
        receiverName: "Jean Claude",
        receiverPhone: "+250 788 220 114",
        latitude: -1.9441,
        longitude: 30.1056,
        note: "Client received stock and confirmed empty crate balance.",
        createdById: driver.id
      }
    });
  }

  const debtCustomer = customerByName.get("Musanze Bar & Grill");
  if (debtCustomer) {
    const existingActivity = await prisma.debtCollectionActivity.findFirst({
      where: { companyId: company.id, customerId: debtCustomer.id, actionType: DebtCollectionActionType.PROMISE_TO_PAY }
    });
    if (!existingActivity) {
      await prisma.debtCollectionActivity.create({
        data: {
          companyId: company.id,
          customerId: debtCustomer.id,
          actionType: DebtCollectionActionType.PROMISE_TO_PAY,
          status: DebtCollectionStatus.OPEN,
          note: "Manager promised to clear the balance after weekend sales.",
          promisedAmount: 300000,
          promisedDate: new Date(Date.now() + 3 * 86_400_000),
          nextFollowUpAt: new Date(Date.now() + 2 * 86_400_000),
          createdById: salesperson.id
        }
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
