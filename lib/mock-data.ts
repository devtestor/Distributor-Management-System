import { Customer, Delivery, Payment, Product } from "./types";

export const products: Product[] = [
  {
    id: "p1",
    sku: "PRI-72-BTL",
    name: "Primus",
    brand: "BRALIRWA",
    category: "Beer",
    packageType: "Bottle crate",
    unitSize: "72cl x 12",
    stockUnits: 428,
    reorderLevel: 350,
    unitCost: 9800,
    unitPrice: 11200,
    emptiesOwed: 816
  },
  {
    id: "p2",
    sku: "MUT-65-BTL",
    name: "Mutzig",
    brand: "BRALIRWA",
    category: "Beer",
    packageType: "Bottle crate",
    unitSize: "65cl x 12",
    stockUnits: 116,
    reorderLevel: 180,
    unitCost: 11800,
    unitPrice: 13400,
    emptiesOwed: 252
  },
  {
    id: "p3",
    sku: "HEI-33-BTL",
    name: "Heineken",
    brand: "BRALIRWA",
    category: "Beer",
    packageType: "Bottle crate",
    unitSize: "33cl x 24",
    stockUnits: 72,
    reorderLevel: 90,
    unitCost: 20500,
    unitPrice: 23500,
    emptiesOwed: 96
  },
  {
    id: "p4",
    sku: "COC-30-PET",
    name: "Coca-Cola",
    brand: "Coca-Cola",
    category: "Soft drink",
    packageType: "PET pack",
    unitSize: "30cl x 24",
    stockUnits: 540,
    reorderLevel: 400,
    unitCost: 7200,
    unitPrice: 8200,
    emptiesOwed: 0
  },
  {
    id: "p5",
    sku: "FAN-30-PET",
    name: "Fanta Orange",
    brand: "Coca-Cola",
    category: "Soft drink",
    packageType: "PET pack",
    unitSize: "30cl x 24",
    stockUnits: 286,
    reorderLevel: 330,
    unitCost: 7200,
    unitPrice: 8200,
    emptiesOwed: 0
  }
];

export const customers: Customer[] = [
  {
    id: "c1",
    name: "Kimironko Mini Market",
    route: "Kigali East",
    phone: "+250 788 000 114",
    creditLimit: 600000,
    outstanding: 385000,
    emptiesBalance: 142,
    lastOrder: "2026-08-04"
  },
  {
    id: "c2",
    name: "Nyabugogo Wholesale Point",
    route: "Kigali Central",
    phone: "+250 788 000 229",
    creditLimit: 1200000,
    outstanding: 740000,
    emptiesBalance: 310,
    lastOrder: "2026-08-04"
  },
  {
    id: "c3",
    name: "Musanze Bar & Grill",
    route: "Northern Area",
    phone: "+250 788 000 336",
    creditLimit: 850000,
    outstanding: 95000,
    emptiesBalance: 58,
    lastOrder: "2026-08-03"
  },
  {
    id: "c4",
    name: "Rubavu Lakeside Depot",
    route: "Western Area",
    phone: "+250 788 000 441",
    creditLimit: 1400000,
    outstanding: 1165000,
    emptiesBalance: 488,
    lastOrder: "2026-08-02"
  }
];

export const deliveries: Delivery[] = [
  {
    id: "d1",
    driver: "Eric N.",
    route: "Kigali East",
    truck: "RAB 334D",
    loadedValue: 2460000,
    deliveredValue: 1885000,
    cashCollected: 1260000,
    creditIssued: 625000,
    emptiesReturned: 192,
    status: "Out for delivery"
  },
  {
    id: "d2",
    driver: "Alice U.",
    route: "Kigali Central",
    truck: "RAD 071P",
    loadedValue: 3185000,
    deliveredValue: 3185000,
    cashCollected: 2445000,
    creditIssued: 740000,
    emptiesReturned: 438,
    status: "Awaiting truck return"
  },
  {
    id: "d3",
    driver: "Jean P.",
    route: "Northern Area",
    truck: "RAC 802L",
    loadedValue: 1540000,
    deliveredValue: 0,
    cashCollected: 0,
    creditIssued: 0,
    emptiesReturned: 0,
    status: "Preparing"
  }
];

export const payments: Payment[] = [
  {
    id: "pay1",
    customer: "Kimironko Mini Market",
    method: "Mobile Money",
    amount: 275000,
    reference: "MOMO-8402",
    recordedAt: "09:15"
  },
  {
    id: "pay2",
    customer: "Nyabugogo Wholesale Point",
    method: "Bank",
    amount: 650000,
    reference: "BK-10394",
    recordedAt: "10:40"
  },
  {
    id: "pay3",
    customer: "Musanze Bar & Grill",
    method: "Cash",
    amount: 185000,
    reference: "RCPT-2231",
    recordedAt: "12:05"
  }
];
