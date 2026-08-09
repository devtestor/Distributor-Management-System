import {
  Banknote,
  Boxes,
  FileBarChart,
  Gauge,
  Settings,
  type LucideIcon,
  Truck,
  Users
} from "lucide-react";
import type { ApiDeliveryTrip, ApiPayment, ApiProduct, ApiWarehouseStockItem } from "@/lib/api";
import type { TranslationKey } from "@/lib/i18n";
import type { Delivery, Locale, Payment, Product } from "@/lib/types";

export const MAIN_WAREHOUSE_ID = "00000000-0000-0000-0000-000000000001";
export const OFFLINE_DRAFTS_KEY = "offlineDrafts";

export type ActionType = "stock" | "invoice" | "delivery" | "reconcile" | "payment" | "customer" | null;

export type InvoiceFormItem = {
  productId: string;
  quantity: number;
  discountAmount: number;
};

export type ReconcileFormItem = {
  itemId: string;
  productName: string;
  loadedQuantity: number;
  deliveredQuantity: number;
  returnedQuantity: number;
  damagedQuantity: number;
};

export type DeliveryLoadFormItem = {
  productId: string;
  loadedQuantity: number;
};

export type OfflineDraft = {
  id: string;
  type: "stock" | "invoice" | "payment" | "delivery" | "reconcile";
  payload: Record<string, unknown>;
  createdAt: string;
};

export type NavRole = "OWNER" | "ADMIN" | "WAREHOUSE_MANAGER" | "SALESPERSON" | "DRIVER" | "ACCOUNTANT";
export type ProductFormMode = "edit" | "create";
export type NavSection = "dashboard" | "inventory" | "customers" | "deliveries" | "payments" | "reports" | "settings";

type NavItemConfig = {
  key: NavSection;
  labelKey: TranslationKey;
  icon: LucideIcon;
  roles: NavRole[];
};

export const navItemConfig: NavItemConfig[] = [
  {
    key: "dashboard",
    labelKey: "dashboard",
    icon: Gauge,
    roles: ["OWNER", "ADMIN", "WAREHOUSE_MANAGER", "SALESPERSON", "ACCOUNTANT"]
  },
  { key: "inventory", labelKey: "inventory", icon: Boxes, roles: ["OWNER", "ADMIN", "WAREHOUSE_MANAGER"] },
  { key: "customers", labelKey: "customers", icon: Users, roles: ["OWNER", "ADMIN", "SALESPERSON", "ACCOUNTANT"] },
  { key: "deliveries", labelKey: "deliveries", icon: Truck, roles: ["OWNER", "ADMIN", "WAREHOUSE_MANAGER", "DRIVER"] },
  { key: "payments", labelKey: "payments", icon: Banknote, roles: ["OWNER", "ADMIN", "SALESPERSON", "ACCOUNTANT"] },
  { key: "reports", labelKey: "reports", icon: FileBarChart, roles: ["OWNER", "ACCOUNTANT"] },
  { key: "settings", labelKey: "settings", icon: Settings, roles: ["OWNER", "ADMIN"] }
];

const currencyFormatter = new Intl.NumberFormat("en-RW", {
  style: "currency",
  currency: "RWF",
  maximumFractionDigits: 0
});

export function money(value: number) {
  return currencyFormatter.format(value);
}

export async function optionalLiveData<T>(request: Promise<T>, fallback: T) {
  try {
    return await request;
  } catch {
    return fallback;
  }
}

export function formatToday(locale: Locale) {
  const localeMap: Record<Locale, string> = {
    en: "en-RW",
    fr: "fr-RW",
    rw: "rw-RW",
    sw: "sw-RW"
  };

  return new Intl.DateTimeFormat(localeMap[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date());
}

export function titleCaseEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function asNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

export function getProductStatus(product: Product) {
  if (product.stockUnits < product.reorderLevel) return "danger";
  if (product.stockUnits < product.reorderLevel * 1.25) return "warn";
  return "good";
}

function normalizeCategory(category: string): Product["category"] {
  const label = titleCaseEnum(category);
  if (label === "Beer" || label === "Water") return label;
  return "Soft drink";
}

function normalizePackageType(packageType: string): Product["packageType"] {
  const label = titleCaseEnum(packageType);
  if (label === "Bottle Crate") return "Bottle crate";
  if (label === "Can Tray") return "Can tray";
  return "PET pack";
}

function normalizeDeliveryStatus(status: string): Delivery["status"] {
  if (status === "LOADING") return "Loading";
  if (status === "ON_ROUTE") return "On route";
  return "Reconciliation";
}

function normalizePaymentMethod(method: string): Payment["method"] {
  if (method === "MOBILE_MONEY") return "Mobile Money";
  if (method === "BANK") return "Bank";
  if (method === "CREDIT") return "Credit";
  return "Cash";
}

export function mapLiveProduct(stockItem: ApiWarehouseStockItem, product: ApiProduct | undefined): Product {
  return {
    id: stockItem.id,
    sku: stockItem.sku,
    name: stockItem.name,
    brand: stockItem.brand,
    category: normalizeCategory(product?.category ?? "SOFT_DRINK"),
    packageType: normalizePackageType(product?.packageType ?? "PET_PACK"),
    unitSize: stockItem.unitSize,
    stockUnits: stockItem.quantity,
    reorderLevel: stockItem.reorderLevel,
    unitCost: asNumber(stockItem.unitCost),
    unitPrice: asNumber(stockItem.unitPrice),
    emptiesOwed: product?.tracksEmpties ? stockItem.quantity : 0
  };
}

export function mapLiveDelivery(trip: ApiDeliveryTrip): Delivery {
  const loadedValue = trip.items.reduce((sum, item) => sum + item.loadedQuantity * asNumber(item.product.unitPrice), 0);
  const deliveredValue = trip.items.reduce(
    (sum, item) => sum + item.deliveredQuantity * asNumber(item.product.unitPrice),
    0
  );
  const returnedCount = trip.items.reduce((sum, item) => sum + item.returnedQuantity, 0);

  return {
    id: trip.id,
    driver: trip.driver.fullName,
    route: trip.route,
    truck: trip.vehicle.plateNumber,
    loadedValue,
    deliveredValue,
    cashCollected: asNumber(trip.cashCollected),
    creditIssued: asNumber(trip.creditIssued),
    emptiesReturned: returnedCount,
    status: normalizeDeliveryStatus(trip.status)
  };
}

export function mapLivePayment(payment: ApiPayment): Payment {
  return {
    id: payment.id,
    customer: payment.customer.name,
    method: normalizePaymentMethod(payment.method),
    amount: asNumber(payment.amount),
    reference: payment.reference ?? "-",
    recordedAt: new Date(payment.receivedAt).toLocaleTimeString("en-RW", {
      hour: "2-digit",
      minute: "2-digit"
    })
  };
}

export function emptyInvoiceItem(productId = ""): InvoiceFormItem {
  return {
    productId,
    quantity: 1,
    discountAmount: 0
  };
}

export function emptyDeliveryLoadItem(productId = ""): DeliveryLoadFormItem {
  return {
    productId,
    loadedQuantity: 1
  };
}

export function emptyProductForm() {
  return {
    productId: "",
    sku: "",
    name: "",
    brand: "BRALIRWA",
    category: "BEER",
    packageType: "BOTTLE_CRATE",
    unitSize: "",
    unitCost: 0,
    unitPrice: 0,
    reorderLevel: 0,
    tracksEmpties: true,
    priceChangeReason: ""
  };
}

function csvEscape(value: string | number | boolean | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function downloadCsv(filename: string, rows: Array<Record<string, string | number | boolean | null | undefined>>) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.map(csvEscape).join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join(
    "\n"
  );
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function buildReconcileItems(trip: ApiDeliveryTrip | undefined): ReconcileFormItem[] {
  if (!trip) return [];

  return trip.items.map((item) => ({
    itemId: item.id,
    productName: item.product.name,
    loadedQuantity: item.loadedQuantity,
    deliveredQuantity: item.deliveredQuantity,
    returnedQuantity: item.returnedQuantity,
    damagedQuantity: item.damagedQuantity
  }));
}
