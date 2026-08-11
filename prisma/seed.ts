import "dotenv/config";
import { PrismaClient, ProductCategory, PackageType, StockMovementType } from "@prisma/client";
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
    update: { companyId: company.id, roleId: ownerRole.id, passwordHash },
    create: {
      companyId: company.id,
      roleId: ownerRole.id,
      fullName: "Demo Owner",
      email: "owner@example.com",
      phone: "+250 788 000 001",
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

  await prisma.customer.upsert({
    where: { id: "00000000-0000-0000-0000-000000000101" },
    update: { companyId: company.id },
    create: {
      id: "00000000-0000-0000-0000-000000000101",
      companyId: company.id,
      name: "Kimironko Mini Market",
      phone: "+250 788 000 114",
      route: "Kigali East",
      location: "Kimironko",
      creditLimit: "600000"
    }
  });

  await prisma.vehicle.upsert({
    where: { companyId_plateNumber: { companyId: company.id, plateNumber: "RAB 334D" } },
    update: { companyId: company.id },
    create: {
      companyId: company.id,
      plateNumber: "RAB 334D"
    }
  });
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
