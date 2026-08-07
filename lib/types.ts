export type Locale = "en" | "fr" | "rw" | "sw";

export type Product = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: "Beer" | "Soft drink" | "Water";
  packageType: "Bottle crate" | "Can tray" | "PET pack";
  unitSize: string;
  stockUnits: number;
  reorderLevel: number;
  unitCost: number;
  unitPrice: number;
  emptiesOwed: number;
};

export type Customer = {
  id: string;
  name: string;
  route: string;
  phone: string;
  creditLimit: number;
  outstanding: number;
  emptiesBalance: number;
  lastOrder: string;
};

export type Delivery = {
  id: string;
  driver: string;
  route: string;
  truck: string;
  loadedValue: number;
  deliveredValue: number;
  cashCollected: number;
  creditIssued: number;
  emptiesReturned: number;
  status: "Loading" | "On route" | "Reconciliation";
};

export type Payment = {
  id: string;
  customer: string;
  method: "Cash" | "Mobile Money" | "Bank" | "Credit";
  amount: number;
  reference: string;
  recordedAt: string;
};
