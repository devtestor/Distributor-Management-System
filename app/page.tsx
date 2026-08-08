"use client";

import {
  AlertTriangle,
  Banknote,
  Boxes,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FileBarChart,
  Gauge,
  Languages,
  PackagePlus,
  ReceiptText,
  RotateCcw,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  type LucideIcon,
  Truck,
  Users,
  X
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiAuditLog,
  ApiCustomer,
  ApiDeliveryTrip,
  ApiInvoice,
  ApiPayment,
  ApiProduct,
  ApiProductPriceHistory,
  ApiRole,
  ApiDebtReport,
  ApiEmptiesReport,
  ApiSalesReport,
  ApiStockReport,
  ApiUser,
  ApiVehicle,
  ApiWarehouseStockItem,
  changeMyPassword,
  createDeliveryTrip,
  createProduct,
  createInvoice,
  createUser,
  deleteUser,
  getProductPriceHistory,
  getCustomerBalance,
  getCustomers,
  getDeliveryTrips,
  getAuditLogs,
  getApiHealth,
  getInvoices,
  getMe,
  getOwnerDashboard,
  getPayments,
  getProducts,
  getRoles,
  getDebtReport,
  getEmptiesReport,
  getSalesReport,
  getStockReport,
  getUsers,
  getVehicles,
  getWarehouseStock,
  login,
  OwnerDashboardResponse,
  receiveStock,
  reconcileDeliveryTrip,
  resetUserPassword,
  recordPayment,
  updateProduct,
  updateUser
} from "@/lib/api";
import { dictionary, locales, TranslationKey } from "@/lib/i18n";
import { customers, deliveries, payments, products } from "@/lib/mock-data";
import { Customer, Delivery, Locale, Payment, Product } from "@/lib/types";

const MAIN_WAREHOUSE_ID = "00000000-0000-0000-0000-000000000001";
const OFFLINE_DRAFTS_KEY = "offlineDrafts";

type ActionType = "stock" | "invoice" | "delivery" | "reconcile" | "payment" | null;

type InvoiceFormItem = {
  productId: string;
  quantity: number;
  discountAmount: number;
};

type ReconcileFormItem = {
  itemId: string;
  productName: string;
  loadedQuantity: number;
  deliveredQuantity: number;
  returnedQuantity: number;
  damagedQuantity: number;
};

type DeliveryLoadFormItem = {
  productId: string;
  loadedQuantity: number;
};

type OfflineDraft = {
  id: string;
  type: "stock" | "invoice" | "payment" | "delivery" | "reconcile";
  payload: Record<string, unknown>;
  createdAt: string;
};

type NavRole = "OWNER" | "ADMIN" | "WAREHOUSE_MANAGER" | "SALESPERSON" | "DRIVER" | "ACCOUNTANT";

type ProductFormMode = "edit" | "create";
type NavSection = "dashboard" | "inventory" | "customers" | "deliveries" | "payments" | "reports" | "settings";

type NavItemConfig = {
  key: NavSection;
  labelKey: TranslationKey;
  icon: LucideIcon;
  roles: NavRole[];
};

const navItemConfig: NavItemConfig[] = [
  {
    key: "dashboard",
    labelKey: "dashboard",
    icon: Gauge,
    roles: ["OWNER", "ADMIN", "WAREHOUSE_MANAGER", "SALESPERSON", "DRIVER", "ACCOUNTANT"]
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

function money(value: number) {
  return currencyFormatter.format(value);
}

function formatToday(locale: Locale) {
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

function titleCaseEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function asNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

function getProductStatus(product: Product) {
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

function mapLiveProduct(stockItem: ApiWarehouseStockItem, product: ApiProduct | undefined): Product {
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

function mapLiveDelivery(trip: ApiDeliveryTrip): Delivery {
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

function mapLivePayment(payment: ApiPayment): Payment {
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

function emptyInvoiceItem(productId = ""): InvoiceFormItem {
  return {
    productId,
    quantity: 1,
    discountAmount: 0
  };
}

function emptyDeliveryLoadItem(productId = ""): DeliveryLoadFormItem {
  return {
    productId,
    loadedQuantity: 1
  };
}

function emptyProductForm() {
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

function downloadCsv(filename: string, rows: Array<Record<string, string | number | boolean | null | undefined>>) {
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

function buildReconcileItems(trip: ApiDeliveryTrip | undefined): ReconcileFormItem[] {
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

export default function Home() {
  const [locale, setLocale] = useState<Locale>("en");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [email, setEmail] = useState("owner@example.com");
  const [password, setPassword] = useState("ChangeMe123!");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [ownerDashboard, setOwnerDashboard] = useState<OwnerDashboardResponse | null>(null);
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const [liveCustomers, setLiveCustomers] = useState<Customer[]>([]);
  const [liveDeliveries, setLiveDeliveries] = useState<Delivery[]>([]);
  const [livePayments, setLivePayments] = useState<Payment[]>([]);
  const [apiProducts, setApiProducts] = useState<ApiProduct[]>([]);
  const [apiCustomers, setApiCustomers] = useState<ApiCustomer[]>([]);
  const [apiTrips, setApiTrips] = useState<ApiDeliveryTrip[]>([]);
  const [apiVehicles, setApiVehicles] = useState<ApiVehicle[]>([]);
  const [apiInvoices, setApiInvoices] = useState<ApiInvoice[]>([]);
  const [apiUsers, setApiUsers] = useState<ApiUser[]>([]);
  const [apiRoles, setApiRoles] = useState<ApiRole[]>([]);
  const [apiAuditLogs, setApiAuditLogs] = useState<ApiAuditLog[]>([]);
  const [salesReport, setSalesReport] = useState<ApiSalesReport | null>(null);
  const [stockReport, setStockReport] = useState<ApiStockReport | null>(null);
  const [debtReport, setDebtReport] = useState<ApiDebtReport | null>(null);
  const [emptiesReport, setEmptiesReport] = useState<ApiEmptiesReport | null>(null);
  const [productPriceHistory, setProductPriceHistory] = useState<ApiProductPriceHistory[]>([]);
  const [productFormMode, setProductFormMode] = useState<ProductFormMode>("edit");
  const [apiStatus, setApiStatus] = useState<"mock" | "connected">("mock");
  const [isLiveDataLoading, setIsLiveDataLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSection>("dashboard");
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineDrafts, setOfflineDrafts] = useState<OfflineDraft[]>([]);
  const [isSyncingDrafts, setIsSyncingDrafts] = useState(false);
  const [stockForm, setStockForm] = useState({
    productId: "",
    quantity: 1,
    note: ""
  });
  const [invoiceForm, setInvoiceForm] = useState({
    customerId: "",
    items: [emptyInvoiceItem()],
    initialPaymentMethod: "CASH" as "CASH" | "BANK" | "MOBILE_MONEY" | "CREDIT",
    initialPaymentAmount: 0,
    paymentReference: ""
  });
  const [paymentForm, setPaymentForm] = useState({
    customerId: "",
    invoiceId: "",
    method: "CASH" as "CASH" | "BANK" | "MOBILE_MONEY" | "CREDIT",
    amount: 0,
    reference: ""
  });
  const [reconcileForm, setReconcileForm] = useState({
    tripId: "",
    cashCollected: 0,
    creditIssued: 0,
    items: [] as ReconcileFormItem[]
  });
  const [deliveryForm, setDeliveryForm] = useState({
    vehicleId: "",
    driverId: "",
    route: "",
    allowNegativeStock: false,
    items: [] as DeliveryLoadFormItem[]
  });
  const [accountForm, setAccountForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "OWNER",
    preferredLocale: "en" as Locale,
    password: ""
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: ""
  });
  const [resetPasswordForm, setResetPasswordForm] = useState({
    userId: "",
    newPassword: ""
  });
  const [productForm, setProductForm] = useState(emptyProductForm);
  const t = useCallback((key: TranslationKey) => dictionary[locale][key], [locale]);
  const isAccountAdmin = user?.role === "OWNER" || user?.role === "ADMIN";
  const isAuthenticated = Boolean(user && accessToken && apiStatus === "connected");

  const saveOfflineDrafts = useCallback((drafts: OfflineDraft[]) => {
    setOfflineDrafts(drafts);
    window.localStorage.setItem(OFFLINE_DRAFTS_KEY, JSON.stringify(drafts));
  }, []);

  const enqueueOfflineDraft = useCallback(
    (type: OfflineDraft["type"], payload: Record<string, unknown>) => {
      const draft = {
        id: crypto.randomUUID(),
        type,
        payload,
        createdAt: new Date().toISOString()
      };
      saveOfflineDrafts([...offlineDrafts, draft]);
      setActionNotice(t("offlineDraftSaved"));
      setActiveAction(null);
    },
    [offlineDrafts, saveOfflineDrafts, t]
  );

  const clearLiveState = useCallback(() => {
    setOwnerDashboard(null);
    setLiveProducts([]);
    setLiveCustomers([]);
    setLiveDeliveries([]);
    setLivePayments([]);
    setApiProducts([]);
    setApiCustomers([]);
    setApiTrips([]);
    setApiVehicles([]);
    setApiInvoices([]);
    setApiUsers([]);
    setApiRoles([]);
    setApiAuditLogs([]);
    setSalesReport(null);
    setStockReport(null);
    setDebtReport(null);
    setEmptiesReport(null);
    setProductPriceHistory([]);
  }, []);

  const loadLiveData = useCallback(
    async (token: string) => {
      setIsLiveDataLoading(true);

      try {
        const profile = await getMe(token);
        const canReadOwnerDashboard = profile.role === "OWNER" || profile.role === "ADMIN" || profile.role === "ACCOUNTANT";
        const dashboard = canReadOwnerDashboard ? await getOwnerDashboard(token) : null;
        const rawProducts = await getProducts(token);
        const stockItems = await getWarehouseStock(token, MAIN_WAREHOUSE_ID);
        const rawCustomers = await getCustomers(token);
        const rawPayments = await getPayments(token);
        const rawTrips = await getDeliveryTrips(token);
        const rawVehicles = await getVehicles(token);
        const rawInvoices = await getInvoices(token);

        const canManageUsers = profile.role === "OWNER" || profile.role === "ADMIN";
        const isOwner = profile.role === "OWNER";
        const canReadReports = profile.role === "OWNER" || profile.role === "ACCOUNTANT";
        const rawUsers = canManageUsers ? await getUsers(token) : [];
        const rawRoles = canManageUsers ? await getRoles(token) : [];
        const rawAuditLogs = isOwner ? await getAuditLogs(token) : [];
        const rawSalesReport = canReadReports ? await getSalesReport(token) : null;
        const rawStockReport = canReadReports ? await getStockReport(token) : null;
        const rawDebtReport = canReadReports ? await getDebtReport(token) : null;
        const rawEmptiesReport = canReadReports ? await getEmptiesReport(token) : null;
        const balances: Customer[] = [];
        for (const customer of rawCustomers) {
          const balance = await getCustomerBalance(token, customer.id);

          balances.push({
            id: customer.id,
            name: customer.name,
            route: customer.route ?? "-",
            phone: customer.phone ?? "-",
            creditLimit: asNumber(customer.creditLimit),
            outstanding: balance.outstanding,
            emptiesBalance: balance.emptyBalance,
            lastOrder: customer.createdAt
          });
        }

        setOwnerDashboard(dashboard);
        setUser(profile);
        setApiProducts(rawProducts);
        setApiCustomers(rawCustomers);
        setApiTrips(rawTrips);
        setApiVehicles(rawVehicles);
        setApiInvoices(rawInvoices);
        setApiUsers(rawUsers);
        setApiRoles(rawRoles);
        setApiAuditLogs(rawAuditLogs);
        setSalesReport(rawSalesReport);
        setStockReport(rawStockReport);
        setDebtReport(rawDebtReport);
        setEmptiesReport(rawEmptiesReport);
        setLiveProducts(stockItems.map((item) => mapLiveProduct(item, rawProducts.find((product) => product.id === item.id))));
        setLiveCustomers(balances);
        setLivePayments(rawPayments.map(mapLivePayment));
        setLiveDeliveries(rawTrips.map(mapLiveDelivery));
        setApiStatus("connected");
        window.localStorage.setItem("user", JSON.stringify(profile));
        return profile;
      } catch (error) {
        clearLiveState();
        setApiStatus("mock");
        throw error;
      } finally {
        setIsLiveDataLoading(false);
      }
    },
    [clearLiveState]
  );

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    setIsOnline(navigator.onLine);
    const storedDrafts = window.localStorage.getItem(OFFLINE_DRAFTS_KEY);
    if (storedDrafts) {
      try {
        setOfflineDrafts(JSON.parse(storedDrafts) as OfflineDraft[]);
      } catch {
        window.localStorage.removeItem(OFFLINE_DRAFTS_KEY);
      }
    }

    const setOnline = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);
    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOffline);

    return () => {
      window.removeEventListener("online", setOnline);
      window.removeEventListener("offline", setOffline);
    };
  }, []);

  useEffect(() => {
    void getApiHealth()
      .then(() => setApiStatus("connected"))
      .catch(() => setApiStatus("mock"));

    const storedToken = window.localStorage.getItem("accessToken");
    const storedUser = window.localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as ApiUser;
        setUser(parsedUser);
        if (locales.some((entry) => entry.code === parsedUser.preferredLocale)) {
          setLocale(parsedUser.preferredLocale as Locale);
        }
      } catch {
        window.localStorage.removeItem("user");
      }
    }
    if (storedToken) {
      void loadLiveData(storedToken)
        .then(() => {
          setAccessToken(storedToken);
        })
        .catch((error) => {
          setAccessToken(null);
          setUser(null);
          window.localStorage.removeItem("accessToken");
          window.localStorage.removeItem("user");
          setAuthError(error instanceof Error ? error.message : "Login failed");
        });
    }
  }, [loadLiveData]);

  const syncOfflineDrafts = useCallback(async () => {
    if (!accessToken || !isOnline || offlineDrafts.length === 0 || isSyncingDrafts) return;

    setIsSyncingDrafts(true);
    setActionError(null);

    try {
      const remaining = [...offlineDrafts];
      for (const draft of offlineDrafts) {
        if (draft.type === "stock") {
          await receiveStock(accessToken, draft.payload as Parameters<typeof receiveStock>[1]);
        }
        if (draft.type === "invoice") {
          await createInvoice(accessToken, draft.payload as Parameters<typeof createInvoice>[1]);
        }
        if (draft.type === "payment") {
          await recordPayment(accessToken, draft.payload as Parameters<typeof recordPayment>[1]);
        }
        if (draft.type === "delivery") {
          await createDeliveryTrip(accessToken, draft.payload as Parameters<typeof createDeliveryTrip>[1]);
        }
        if (draft.type === "reconcile") {
          const payload = draft.payload as { tripId: string; data: Parameters<typeof reconcileDeliveryTrip>[2] };
          await reconcileDeliveryTrip(accessToken, payload.tripId, payload.data);
        }
        remaining.shift();
        saveOfflineDrafts(remaining);
      }

      await loadLiveData(accessToken);
      setActionNotice(t("offlineDraftsSynced"));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t("genericActionFailed"));
    } finally {
      setIsSyncingDrafts(false);
    }
  }, [accessToken, isOnline, isSyncingDrafts, loadLiveData, offlineDrafts, saveOfflineDrafts, t]);

  useEffect(() => {
    if (!isOnline || !accessToken || offlineDrafts.length === 0) return;
    void syncOfflineDrafts();
  }, [accessToken, isOnline, offlineDrafts.length, syncOfflineDrafts]);

  const displayedProducts = liveProducts.length > 0 ? liveProducts : products;
  const displayedCustomers = liveCustomers.length > 0 ? liveCustomers : customers;
  const displayedDeliveries = liveDeliveries.length > 0 ? liveDeliveries : deliveries;
  const displayedPayments = livePayments.length > 0 ? livePayments : payments;
  const canUseLiveActions = Boolean(accessToken && apiStatus === "connected");
  const assignableRoles = apiRoles.filter((role) => user?.role === "OWNER" || role.name !== "OWNER");
  const openTrips = apiTrips.filter((trip) => trip.status !== "CLOSED");
  const driverUsers = apiUsers.filter((account) => account.role === "DRIVER" && account.isActive !== false);
  const selectedTrip = apiTrips.find((trip) => trip.id === reconcileForm.tripId);
  const payableInvoices = apiInvoices.filter(
    (invoice) => invoice.customerId === paymentForm.customerId && invoice.paymentStatus !== "PAID"
  );

  const metrics = useMemo(() => {
    if (ownerDashboard) {
      return {
        stockValue: ownerDashboard.totals.stockValue,
        cashCollected: ownerDashboard.totals.payments,
        creditExposure: ownerDashboard.totals.creditExposure,
        emptyLiability: ownerDashboard.totals.emptyContainerExposure,
        activeDeliveries: ownerDashboard.totals.activeDeliveries,
        lowStock: ownerDashboard.totals.lowStockProducts
      };
    }

    const stockValue = displayedProducts.reduce((sum, product) => sum + product.stockUnits * product.unitCost, 0);
    const cashCollected = displayedDeliveries.reduce((sum, delivery) => sum + delivery.cashCollected, 0);
    const creditExposure = displayedCustomers.reduce((sum, customer) => sum + customer.outstanding, 0);
    const emptyLiability = displayedCustomers.reduce((sum, customer) => sum + customer.emptiesBalance, 0);
    const activeDeliveries = displayedDeliveries.filter((delivery) => delivery.status !== "Reconciliation").length;
    const lowStock = displayedProducts.filter((product) => product.stockUnits < product.reorderLevel).length;

    return { stockValue, cashCollected, creditExposure, emptyLiability, activeDeliveries, lowStock };
  }, [displayedCustomers, displayedDeliveries, displayedProducts, ownerDashboard]);

  const navItems = useMemo(() => {
    return navItemConfig
      .filter((item) => {
        if (!user?.role) return item.key === "dashboard";
        return item.roles.includes(user.role as NavRole);
      })
      .map((item) => ({
        ...item,
        label: dictionary[locale][item.labelKey]
      }));
  }, [locale, user?.role]);

  const activeNavItem = navItems.find((item) => item.key === activeSection) ?? navItems[0];

  const kpis = [
    { label: t("stockValue"), value: money(metrics.stockValue), icon: Boxes },
    { label: t("cashCollected"), value: money(metrics.cashCollected), icon: Banknote },
    { label: t("creditExposure"), value: money(metrics.creditExposure), icon: CreditCard },
    { label: t("emptyLiability"), value: metrics.emptyLiability.toLocaleString(), icon: RotateCcw },
    { label: t("activeDeliveries"), value: metrics.activeDeliveries.toString(), icon: Truck }
  ];

  const criticalCreditCustomers = displayedCustomers.filter((customer) => customer.outstanding / customer.creditLimit >= 0.8);
  const highEmptiesCustomers = displayedCustomers.filter((customer) => customer.emptiesBalance > 250);

  const quickActions = [
    { key: "stock" as const, label: t("receiveStock"), icon: PackagePlus, roles: ["OWNER", "ADMIN", "WAREHOUSE_MANAGER"] as NavRole[] },
    { key: "invoice" as const, label: t("createInvoice"), icon: ReceiptText, roles: ["OWNER", "ADMIN", "SALESPERSON"] as NavRole[] },
    { key: "delivery" as const, label: t("createDeliveryTrip"), icon: Truck, roles: ["OWNER", "ADMIN"] as NavRole[] },
    { key: "reconcile" as const, label: t("reconcileTruck"), icon: ClipboardCheck, roles: ["OWNER", "ADMIN", "WAREHOUSE_MANAGER", "DRIVER"] as NavRole[] },
    { key: "payment" as const, label: t("recordPayment"), icon: Banknote, roles: ["OWNER", "ADMIN", "SALESPERSON", "ACCOUNTANT"] as NavRole[] }
  ].filter((item) => !user?.role || item.roles.includes(user.role as NavRole));

  useEffect(() => {
    if (assignableRoles.length === 0) return;
    setAccountForm((current) => ({
      ...current,
      role: assignableRoles.some((role) => role.name === current.role) ? current.role : assignableRoles[0].name
    }));
  }, [assignableRoles]);

  useEffect(() => {
    if (navItems.some((item) => item.key === activeSection)) return;
    setActiveSection(navItems[0]?.key ?? "dashboard");
  }, [activeSection, navItems]);

  useEffect(() => {
    if (apiUsers.length === 0) return;
    setResetPasswordForm((current) => ({
      ...current,
      userId: apiUsers.some((entry) => entry.id === current.userId) ? current.userId : apiUsers[0].id
    }));
  }, [apiUsers]);

  useEffect(() => {
    if (productFormMode === "create") return;
    if (apiProducts.length === 0) return;
    const selected = apiProducts.find((product) => product.id === productForm.productId) ?? apiProducts[0];
    setProductForm((current) => ({
      ...current,
      productId: selected.id,
      sku: selected.sku,
      name: selected.name,
      brand: selected.brand,
      category: selected.category,
      packageType: selected.packageType,
      unitSize: selected.unitSize,
      unitCost: asNumber(selected.unitCost),
      unitPrice: asNumber(selected.unitPrice),
      reorderLevel: selected.reorderLevel,
      tracksEmpties: selected.tracksEmpties,
      priceChangeReason: ""
    }));
  }, [apiProducts, productForm.productId, productFormMode]);

  useEffect(() => {
    if (!accessToken || !productForm.productId || !isAccountAdmin || productFormMode === "create") {
      setProductPriceHistory([]);
      return;
    }
    void getProductPriceHistory(accessToken, productForm.productId)
      .then(setProductPriceHistory)
      .catch(() => setProductPriceHistory([]));
  }, [accessToken, isAccountAdmin, productForm.productId, productFormMode]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoggingIn(true);
    setAuthError(null);

    try {
      const response = await login(email, password);
      window.localStorage.setItem("accessToken", response.accessToken);
      await loadLiveData(response.accessToken);
      setAccessToken(response.accessToken);
      if (locales.some((entry) => entry.code === response.user.preferredLocale)) {
        setLocale(response.user.preferredLocale as Locale);
      }
    } catch (error) {
      setAccessToken(null);
      setUser(null);
      window.localStorage.removeItem("accessToken");
      window.localStorage.removeItem("user");
      setAuthError(error instanceof Error ? error.message : t("loginFailed"));
    } finally {
      setIsLoggingIn(false);
    }
  }

  function handleLogout() {
    setAccessToken(null);
    setUser(null);
    setApiStatus("mock");
    clearLiveState();
    setActiveAction(null);
    window.localStorage.removeItem("accessToken");
    window.localStorage.removeItem("user");
  }

  function closeActionModal() {
    setActiveAction(null);
    setActionError(null);
  }

  function openActionModal(action: Exclude<ActionType, null>) {
    if (!canUseLiveActions) {
      setActionNotice(t("signInLiveApi"));
      return;
    }

    setActionNotice(null);
    setActionError(null);
    setActiveAction(action);

    if (action === "stock") {
      setStockForm({
        productId: apiProducts[0]?.id ?? "",
        quantity: 1,
        note: ""
      });
    }

    if (action === "invoice") {
      setInvoiceForm({
        customerId: apiCustomers[0]?.id ?? "",
        items: [emptyInvoiceItem(apiProducts[0]?.id ?? "")],
        initialPaymentMethod: "CASH",
        initialPaymentAmount: 0,
        paymentReference: ""
      });
    }

    if (action === "payment") {
      const firstCustomerId = apiCustomers[0]?.id ?? "";
      setPaymentForm({
        customerId: firstCustomerId,
        invoiceId: "",
        method: "CASH",
        amount: 0,
        reference: ""
      });
    }

    if (action === "delivery") {
      setDeliveryForm({
        vehicleId: apiVehicles[0]?.id ?? "",
        driverId: driverUsers[0]?.id ?? "",
        route: apiVehicles[0]?.driver?.fullName ?? "",
        allowNegativeStock: false,
        items: [emptyDeliveryLoadItem(apiProducts[0]?.id ?? "")]
      });
    }

    if (action === "reconcile") {
      const firstTrip = openTrips[0];
      setReconcileForm({
        tripId: firstTrip?.id ?? "",
        cashCollected: firstTrip ? asNumber(firstTrip.cashCollected) : 0,
        creditIssued: firstTrip ? asNumber(firstTrip.creditIssued) : 0,
        items: buildReconcileItems(firstTrip)
      });
    }
  }

  async function runAction(task: () => Promise<void>, successMessage: string) {
    if (!accessToken) return;

    setIsActionSubmitting(true);
    setActionError(null);

    try {
      await task();
      await loadLiveData(accessToken);
      setActionNotice(successMessage);
      setActiveAction(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t("genericActionFailed"));
    } finally {
      setIsActionSubmitting(false);
    }
  }

  async function submitStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    const payload = {
      productId: stockForm.productId,
      warehouseId: MAIN_WAREHOUSE_ID,
      movementType: "PURCHASE_RECEIPT" as const,
      quantity: stockForm.quantity,
      note: stockForm.note || undefined
    };

    if (!isOnline) {
      enqueueOfflineDraft("stock", payload);
      return;
    }

    await runAction(
      async () => {
        await receiveStock(accessToken, payload);
      },
      t("receiveStock")
    );
  }

  async function submitInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    const payload = {
      customerId: invoiceForm.customerId,
      items: invoiceForm.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        discountAmount: item.discountAmount || undefined
      })),
      initialPaymentMethod: invoiceForm.initialPaymentAmount > 0 ? invoiceForm.initialPaymentMethod : undefined,
      initialPaymentAmount: invoiceForm.initialPaymentAmount > 0 ? invoiceForm.initialPaymentAmount : undefined,
      paymentReference: invoiceForm.paymentReference || undefined
    };

    if (!isOnline) {
      enqueueOfflineDraft("invoice", payload);
      return;
    }

    await runAction(
      async () => {
        await createInvoice(accessToken, payload);
      },
      t("createInvoice")
    );
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    const payload = {
      customerId: paymentForm.customerId,
      invoiceId: paymentForm.invoiceId || undefined,
      method: paymentForm.method,
      amount: paymentForm.amount,
      reference: paymentForm.reference || undefined
    };

    if (!isOnline) {
      enqueueOfflineDraft("payment", payload);
      return;
    }

    await runAction(
      async () => {
        await recordPayment(accessToken, payload);
      },
      t("recordPayment")
    );
  }

  async function submitReconciliation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !reconcileForm.tripId) return;
    const payload = {
      cashCollected: reconcileForm.cashCollected,
      creditIssued: reconcileForm.creditIssued,
      items: reconcileForm.items.map((item) => ({
        itemId: item.itemId,
        deliveredQuantity: item.deliveredQuantity,
        returnedQuantity: item.returnedQuantity,
        damagedQuantity: item.damagedQuantity
      }))
    };

    if (!isOnline) {
      enqueueOfflineDraft("reconcile", {
        tripId: reconcileForm.tripId,
        data: payload
      });
      return;
    }

    await runAction(
      async () => {
        await reconcileDeliveryTrip(accessToken, reconcileForm.tripId, payload);
      },
      t("reconcileTruck")
    );
  }

  async function submitDeliveryTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    const payload = {
      warehouseId: MAIN_WAREHOUSE_ID,
      vehicleId: deliveryForm.vehicleId,
      driverId: deliveryForm.driverId,
      route: deliveryForm.route,
      allowNegativeStock: deliveryForm.allowNegativeStock || undefined,
      items: deliveryForm.items.map((item) => ({
        productId: item.productId,
        loadedQuantity: item.loadedQuantity
      }))
    };

    if (!isOnline) {
      enqueueOfflineDraft("delivery", payload);
      return;
    }

    await runAction(
      async () => {
        await createDeliveryTrip(accessToken, payload);
      },
      t("deliveryTripCreated")
    );
  }

  async function submitCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;

    await runAction(
      async () => {
        await createUser(accessToken, {
          fullName: accountForm.fullName,
          email: accountForm.email,
          phone: accountForm.phone || undefined,
          role: accountForm.role,
          preferredLocale: accountForm.preferredLocale,
          password: accountForm.password
        });
        setAccountForm({
          fullName: "",
          email: "",
          phone: "",
          role: assignableRoles[0]?.name ?? "OWNER",
          preferredLocale: "en",
          password: ""
        });
      },
      t("userAccountCreated")
    );
  }

  async function submitChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;

    await runAction(
      async () => {
        await changeMyPassword(accessToken, passwordForm);
        setPasswordForm({
          currentPassword: "",
          newPassword: ""
        });
      },
      t("myPasswordUpdated")
    );
  }

  async function submitResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;

    await runAction(
      async () => {
        await resetUserPassword(accessToken, resetPasswordForm.userId, resetPasswordForm.newPassword);
        setResetPasswordForm((current) => ({
          ...current,
          newPassword: ""
        }));
      },
      t("userPasswordReset")
    );
  }

  async function submitCreateProduct(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!accessToken) return;

    await runAction(
      async () => {
        const product = await createProduct(accessToken, {
          sku: productForm.sku,
          name: productForm.name,
          brand: productForm.brand,
          category: productForm.category,
          packageType: productForm.packageType,
          unitSize: productForm.unitSize,
          unitCost: productForm.unitCost,
          unitPrice: productForm.unitPrice,
          reorderLevel: productForm.reorderLevel,
          tracksEmpties: productForm.tracksEmpties
        });
        setProductForm((current) => ({
          ...current,
          productId: product.id,
          priceChangeReason: ""
        }));
        setProductFormMode("edit");
      },
      t("productCreated")
    );
  }

  async function submitUpdateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !productForm.productId) return;

    await runAction(
      async () => {
        await updateProduct(accessToken, productForm.productId, {
          sku: productForm.sku,
          name: productForm.name,
          brand: productForm.brand,
          category: productForm.category,
          packageType: productForm.packageType,
          unitSize: productForm.unitSize,
          unitCost: productForm.unitCost,
          unitPrice: productForm.unitPrice,
          reorderLevel: productForm.reorderLevel,
          tracksEmpties: productForm.tracksEmpties,
          priceChangeReason: productForm.priceChangeReason || undefined
        });
      },
      t("productUpdated")
    );
  }

  async function submitProductForm(event: FormEvent<HTMLFormElement>) {
    if (productFormMode === "create") {
      await submitCreateProduct(event);
      return;
    }

    await submitUpdateProduct(event);
  }

  function startCreateProduct() {
    setProductFormMode("create");
    setProductPriceHistory([]);
    setProductForm(emptyProductForm());
  }

  async function toggleUserStatus(target: ApiUser) {
    if (!accessToken) return;

    await runAction(
      async () => {
        await updateUser(accessToken, target.id, {
          isActive: !target.isActive
        });
      },
      target.isActive ? t("accountDeactivated") : t("accountReactivated")
    );
  }

  async function removeUserAccount(target: ApiUser) {
    if (!accessToken) return;
    if (!window.confirm(t("deleteAccountConfirm"))) return;

    await runAction(
      async () => {
        await deleteUser(accessToken, target.id);
      },
      t("accountDeleted")
    );
  }

  async function toggleProductStatus(target: ApiProduct) {
    if (!accessToken) return;

    await runAction(
      async () => {
        await updateProduct(accessToken, target.id, {
          isActive: !target.isActive
        });
      },
      target.isActive ? t("productDeactivated") : t("productReactivated")
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">DC</div>
          <div>
            <h1>{t("appName")}</h1>
            <p>{t("business")}</p>
          </div>
        </div>

        <nav className="nav" aria-label="Primary">
          {navItems.map((item) => (
            <button
              className={`nav-button ${activeSection === item.key ? "active" : ""}`}
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              type="button"
            >
              <item.icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <p className="sidebar-note">{t("systemScope")}</p>
      </aside>

      <section className="main">
        <header className="topbar">
          <label className="search">
            <Search size={18} aria-hidden="true" />
            <input aria-label="Search" placeholder={t("searchPlaceholder")} />
          </label>

          <div aria-label={t("language")} className="language-switcher" title={t("language")}>
            {locales.map((item) => (
              <button
                className={locale === item.code ? "active" : ""}
                key={item.code}
                onClick={() => setLocale(item.code)}
                title={item.label}
                type="button"
              >
                {item.short}
              </button>
            ))}
          </div>
        </header>

        <div className="content">
          <section className="auth-band" aria-label="Authentication">
            <div>
              <span className={`badge ${apiStatus === "connected" ? "good" : "warn"}`}>
                {apiStatus === "connected" ? t("apiConnected") : t("demoMode")}
              </span>
              <p>
                {isLiveDataLoading
                  ? t("loadingData")
                  : apiStatus === "connected" && user
                    ? `${t("signedInAs")} ${user.fullName}. ${t("liveDataNote")}`
                    : apiStatus === "connected"
                      ? t("signInLiveApi")
                      : t("fallbackDataNote")}
              </p>
            </div>

            {user ? (
              <button className="primary-button" onClick={handleLogout} type="button">
                {t("logout")}
              </button>
            ) : (
              <form className="login-form" onSubmit={handleLogin}>
                <label>
                  <span>{t("email")}</span>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
                </label>
                <label>
                  <span>{t("password")}</span>
                  <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
                </label>
                <button className="primary-button" disabled={isLoggingIn} type="submit">
                  {isLoggingIn ? "..." : t("login")}
                </button>
                <small>{authError ?? t("seedCredentials")}</small>
              </form>
            )}
          </section>

          {actionNotice ? <section className="status-banner success">{actionNotice}</section> : null}
          {actionError ? <section className="status-banner danger">{actionError}</section> : null}

          {isAuthenticated ? (
            <section className={`sync-banner ${isOnline ? "online" : "offline"}`}>
              <div>
                <strong>{isOnline ? t("online") : t("offline")}</strong>
                <span>
                  {offlineDrafts.length > 0
                    ? `${offlineDrafts.length} ${t("pendingDrafts")}`
                    : t("noPendingDrafts")}
                </span>
              </div>
              <button
                className="ghost-button"
                disabled={!isOnline || offlineDrafts.length === 0 || isSyncingDrafts}
                onClick={() => void syncOfflineDrafts()}
                type="button"
              >
                {isSyncingDrafts ? t("syncing") : t("syncNow")}
              </button>
            </section>
          ) : null}

          {!isAuthenticated ? (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>{t("login")}</h3>
                  <span>{t("signInLiveApi")}</span>
                </div>
                <ShieldCheck size={18} color="var(--brand)" aria-hidden="true" />
              </div>
              <div className="panel-body">
                <p className="table-state">{t("loginRequired")}</p>
              </div>
            </section>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <h2>{activeSection === "dashboard" ? t("ownerCommand") : activeNavItem?.label}</h2>
                  <p>
                    {t("overview")}. {t("systemScope")}
                  </p>
                </div>
                <div className="date-pill">
                  <CalendarDays size={17} aria-hidden="true" />
                  <span>
                    {t("today")}: {formatToday(locale)}
                  </span>
                </div>
              </div>

              {activeSection === "dashboard" || activeSection === "reports" ? (
                <section className="kpi-grid" aria-label="Business metrics">
                  {kpis.map((kpi) => (
                    <article className="kpi-card" key={kpi.label}>
                      <div className="icon">
                        <kpi.icon size={19} aria-hidden="true" />
                      </div>
                      <div>
                        <p>{kpi.label}</p>
                        <strong>{kpi.value}</strong>
                      </div>
                    </article>
                  ))}
                </section>
              ) : null}

              {activeSection === "dashboard" || activeSection === "inventory" ? (
              <section className="section-grid">
                <article className="panel">
                  <div className="panel-header">
                    <div>
                      <h3>{t("inventory")}</h3>
                      <span>
                        {metrics.lowStock} {t("lowStock").toLowerCase()}
                      </span>
                    </div>
                    <span className="badge warn">{t("reorderNow")}</span>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{t("product")}</th>
                          <th>{t("package")}</th>
                          <th>{t("stock")}</th>
                          <th>{t("reorder")}</th>
                          <th>{t("margin")}</th>
                          <th>{t("empties")}</th>
                          <th>{t("status")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedProducts.map((product) => {
                          const status = getProductStatus(product);
                          return (
                            <tr key={product.id}>
                              <td>
                                <strong>{product.name}</strong>
                                <small>{product.sku}</small>
                              </td>
                              <td>{product.unitSize}</td>
                              <td>{product.stockUnits.toLocaleString()}</td>
                              <td>{product.reorderLevel.toLocaleString()}</td>
                              <td>{money(product.unitPrice - product.unitCost)}</td>
                              <td>{product.emptiesOwed.toLocaleString()}</td>
                              <td>
                                <span className={`badge ${status}`}>
                                  {status === "good" ? t("healthy") : status === "warn" ? t("watch") : t("reorderNow")}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {displayedProducts.length === 0 ? (
                          <tr>
                            <td className="table-state" colSpan={7}>
                              {isLiveDataLoading ? t("loadingData") : t("noRecords")}
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </article>

                <aside className="side-stack">
                  <article className="panel">
                    <div className="panel-header">
                      <h3>{t("alerts")}</h3>
                      <AlertTriangle size={18} color="var(--amber)" aria-hidden="true" />
                    </div>
                    <ul className="alert-list">
                      <li>
                        <span className="alert-icon">
                          <Boxes size={18} aria-hidden="true" />
                        </span>
                        <div>
                          <strong>{metrics.lowStock}</strong>
                          <span>{t("alertLowStock")}</span>
                        </div>
                      </li>
                      <li>
                        <span className="alert-icon">
                          <CreditCard size={18} aria-hidden="true" />
                        </span>
                        <div>
                          <strong>{criticalCreditCustomers.length}</strong>
                          <span>{t("alertCredit")}</span>
                        </div>
                      </li>
                      <li>
                        <span className="alert-icon">
                          <RotateCcw size={18} aria-hidden="true" />
                        </span>
                        <div>
                          <strong>{highEmptiesCustomers.length}</strong>
                          <span>{t("alertEmpties")}</span>
                        </div>
                      </li>
                    </ul>
                  </article>

                  <article className="panel">
                    <div className="panel-header">
                      <h3>{t("quickActions")}</h3>
                      <Languages size={18} color="var(--brand)" aria-hidden="true" />
                    </div>
                    <div className="action-list">
                      {quickActions.map((action) => (
                        <button
                          className="action-card"
                          disabled={!canUseLiveActions}
                          key={action.key}
                          onClick={() => openActionModal(action.key)}
                          type="button"
                        >
                          <action.icon size={19} aria-hidden="true" />
                          <span>
                            <strong>{action.label}</strong>
                            <span>{canUseLiveActions ? t("liveEntry") : t("loginRequired")}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </article>
                </aside>
              </section>
              ) : null}

              {activeSection === "inventory" && isAccountAdmin ? (
                <article className="panel">
                  <div className="panel-header">
                    <div>
                      <h3>{t("productManagement")}</h3>
                      <span>{t("productSetupNote")}</span>
                    </div>
                    <Boxes size={18} color="var(--brand)" aria-hidden="true" />
                  </div>
                  <div className="panel-body">
                    <form className="entry-form tight-form" onSubmit={submitProductForm}>
                      <div className="form-grid">
                        <label>
                          <span>{t("selectedProduct")}</span>
                          <select
                            disabled={productFormMode === "create"}
                            value={productForm.productId}
                            onChange={(event) => {
                              setProductFormMode("edit");
                              setProductForm((current) => ({ ...current, productId: event.target.value }));
                            }}
                          >
                            {productFormMode === "create" ? <option value="">{t("createProduct")}</option> : null}
                            {apiProducts.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} ({product.sku})
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>{t("sku")}</span>
                          <input
                            required
                            value={productForm.sku}
                            onChange={(event) => setProductForm((current) => ({ ...current, sku: event.target.value }))}
                          />
                        </label>
                        <label>
                          <span>{t("product")}</span>
                          <input
                            required
                            value={productForm.name}
                            onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
                          />
                        </label>
                      </div>
                      <div className="form-grid">
                        <label>
                          <span>{t("brand")}</span>
                          <input
                            required
                            value={productForm.brand}
                            onChange={(event) => setProductForm((current) => ({ ...current, brand: event.target.value }))}
                          />
                        </label>
                        <label>
                          <span>{t("category")}</span>
                          <select
                            value={productForm.category}
                            onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))}
                          >
                            <option value="BEER">BEER</option>
                            <option value="SOFT_DRINK">SOFT_DRINK</option>
                            <option value="WATER">WATER</option>
                            <option value="OTHER">OTHER</option>
                          </select>
                        </label>
                        <label>
                          <span>{t("package")}</span>
                          <select
                            value={productForm.packageType}
                            onChange={(event) => setProductForm((current) => ({ ...current, packageType: event.target.value }))}
                          >
                            <option value="BOTTLE_CRATE">BOTTLE_CRATE</option>
                            <option value="CAN_TRAY">CAN_TRAY</option>
                            <option value="PET_PACK">PET_PACK</option>
                            <option value="SINGLE_UNIT">SINGLE_UNIT</option>
                          </select>
                        </label>
                      </div>
                      <div className="form-grid">
                        <label>
                          <span>{t("unitSize")}</span>
                          <input
                            required
                            value={productForm.unitSize}
                            onChange={(event) => setProductForm((current) => ({ ...current, unitSize: event.target.value }))}
                          />
                        </label>
                        <label>
                          <span>{t("unitCost")}</span>
                          <input
                            min={0}
                            required
                            type="number"
                            value={productForm.unitCost}
                            onChange={(event) =>
                              setProductForm((current) => ({ ...current, unitCost: Number(event.target.value) || 0 }))
                            }
                          />
                        </label>
                        <label>
                          <span>{t("unitPrice")}</span>
                          <input
                            min={0}
                            required
                            type="number"
                            value={productForm.unitPrice}
                            onChange={(event) =>
                              setProductForm((current) => ({ ...current, unitPrice: Number(event.target.value) || 0 }))
                            }
                          />
                        </label>
                      </div>
                      <div className="form-grid">
                        <label>
                          <span>{t("reorder")}</span>
                          <input
                            min={0}
                            required
                            type="number"
                            value={productForm.reorderLevel}
                            onChange={(event) =>
                              setProductForm((current) => ({ ...current, reorderLevel: Number(event.target.value) || 0 }))
                            }
                          />
                        </label>
                        <label className="checkbox-label">
                          <input
                            checked={productForm.tracksEmpties}
                            onChange={(event) => setProductForm((current) => ({ ...current, tracksEmpties: event.target.checked }))}
                            type="checkbox"
                          />
                          <span>{t("tracksEmpties")}</span>
                        </label>
                        <label>
                          <span>{t("priceChangeReason")}</span>
                          <input
                            value={productForm.priceChangeReason}
                            onChange={(event) => setProductForm((current) => ({ ...current, priceChangeReason: event.target.value }))}
                          />
                        </label>
                      </div>
                      <div className="modal-actions">
                        <button className="primary-button" disabled={isActionSubmitting} type="submit">
                          {isActionSubmitting ? t("saving") : productFormMode === "create" ? t("createProduct") : t("updateProduct")}
                        </button>
                        <button
                          className="ghost-button"
                          disabled={isActionSubmitting}
                          onClick={startCreateProduct}
                          type="button"
                        >
                          {t("createProduct")}
                        </button>
                        {productFormMode === "edit" && apiProducts.find((product) => product.id === productForm.productId) ? (
                          <button
                            className="ghost-button"
                            disabled={isActionSubmitting}
                            onClick={() => {
                              const selected = apiProducts.find((product) => product.id === productForm.productId);
                              if (selected) void toggleProductStatus(selected);
                            }}
                            type="button"
                          >
                            {apiProducts.find((product) => product.id === productForm.productId)?.isActive
                              ? t("deactivate")
                              : t("reactivate")}
                          </button>
                        ) : null}
                      </div>
                    </form>

                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>{t("sku")}</th>
                            <th>{t("product")}</th>
                            <th>{t("unitCost")}</th>
                            <th>{t("unitPrice")}</th>
                            <th>{t("reorder")}</th>
                            <th>{t("status")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {apiProducts.map((product) => (
                            <tr key={product.id}>
                              <td>{product.sku}</td>
                              <td>
                                <strong>{product.name}</strong>
                                <small>{product.brand}</small>
                              </td>
                              <td>{money(asNumber(product.unitCost))}</td>
                              <td>{money(asNumber(product.unitPrice))}</td>
                              <td>{product.reorderLevel.toLocaleString()}</td>
                              <td>
                                <span className={`badge ${product.isActive ? "good" : "danger"}`}>
                                  {product.isActive ? t("active") : t("inactive")}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>{t("previousPrice")}</th>
                            <th>{t("newPrice")}</th>
                            <th>{t("changedBy")}</th>
                            <th>{t("time")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productPriceHistory.map((entry) => (
                            <tr key={entry.id}>
                              <td>{entry.previousPrice === null ? "-" : money(asNumber(entry.previousPrice))}</td>
                              <td>
                                <strong>{money(asNumber(entry.newPrice))}</strong>
                                <small>{entry.changeReason ?? "-"}</small>
                              </td>
                              <td>
                                <strong>{entry.changedBy?.fullName ?? "-"}</strong>
                                <small>{entry.changedBy?.role.name ?? "-"}</small>
                              </td>
                              <td>{new Date(entry.createdAt).toLocaleString("en-RW")}</td>
                            </tr>
                          ))}
                          {productPriceHistory.length === 0 ? (
                            <tr>
                              <td className="table-state" colSpan={4}>
                                {t("noRecords")}
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </article>
              ) : null}

              {activeSection === "dashboard" || activeSection === "customers" || activeSection === "deliveries" ? (
              <section className="two-column">
                {activeSection === "dashboard" || activeSection === "customers" ? (
                <article className="panel">
                  <div className="panel-header">
                    <h3>{t("customers")}</h3>
                    <Users size={18} color="var(--brand)" aria-hidden="true" />
                  </div>
                  <div className="table-wrap">
                    <table>
                  <thead>
                    <tr>
                      <th>{t("customer")}</th>
                      <th>{t("route")}</th>
                      <th>{t("creditLimit")}</th>
                      <th>{t("outstanding")}</th>
                      <th>{t("empties")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedCustomers.map((customer) => (
                      <tr key={customer.id}>
                        <td>
                          <strong>{customer.name}</strong>
                          <small>{customer.phone}</small>
                        </td>
                        <td>{customer.route}</td>
                        <td>{money(customer.creditLimit)}</td>
                        <td>{money(customer.outstanding)}</td>
                        <td>{customer.emptiesBalance.toLocaleString()}</td>
                      </tr>
                    ))}
                    {displayedCustomers.length === 0 ? (
                      <tr>
                        <td className="table-state" colSpan={5}>
                          {isLiveDataLoading ? t("loadingData") : t("noRecords")}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                    </table>
                  </div>
                </article>
                ) : null}

                {activeSection === "dashboard" || activeSection === "deliveries" ? (
                <article className="panel">
                  <div className="panel-header">
                    <h3>{t("deliveries")}</h3>
                    <Route size={18} color="var(--brand)" aria-hidden="true" />
                  </div>
                  <div className="table-wrap">
                    <table>
                  <thead>
                    <tr>
                      <th>{t("driver")}</th>
                      <th>{t("truck")}</th>
                      <th>{t("delivered")}</th>
                      <th>{t("cashCollected")}</th>
                      <th>{t("status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedDeliveries.map((delivery) => (
                      <tr key={delivery.id}>
                        <td>
                          <strong>{delivery.driver}</strong>
                          <small>{delivery.route}</small>
                        </td>
                        <td>{delivery.truck}</td>
                        <td>{money(delivery.deliveredValue)}</td>
                        <td>{money(delivery.cashCollected)}</td>
                        <td>
                          <span className="badge">{delivery.status}</span>
                        </td>
                      </tr>
                    ))}
                    {displayedDeliveries.length === 0 ? (
                      <tr>
                        <td className="table-state" colSpan={5}>
                          {isLiveDataLoading ? t("loadingData") : t("noRecords")}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                    </table>
                  </div>
                </article>
                ) : null}
              </section>
              ) : null}

              {activeSection === "dashboard" || activeSection === "payments" ? (
              <article className="panel">
                <div className="panel-header">
                  <h3>{t("payments")}</h3>
                  <ShieldCheck size={18} color="var(--brand)" aria-hidden="true" />
                </div>
                <div className="table-wrap">
                  <table>
                <thead>
                  <tr>
                    <th>{t("customer")}</th>
                    <th>{t("method")}</th>
                    <th>{t("amount")}</th>
                    <th>{t("reference")}</th>
                    <th>{t("recorded")}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.customer}</td>
                      <td>{payment.method}</td>
                      <td>{money(payment.amount)}</td>
                      <td>{payment.reference}</td>
                      <td>{payment.recordedAt}</td>
                    </tr>
                  ))}
                  {displayedPayments.length === 0 ? (
                    <tr>
                      <td className="table-state" colSpan={5}>
                        {isLiveDataLoading ? t("loadingData") : t("noRecords")}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
                  </table>
                </div>
              </article>
              ) : null}

              {activeSection === "settings" ? (
              <section className="two-column">
                {isAccountAdmin ? (
                  <article className="panel">
                <div className="panel-header">
                  <div>
                    <h3>{t("teamAccess")}</h3>
                    <span>{t("accessSetupNote")}</span>
                  </div>
                  <Users size={18} color="var(--brand)" aria-hidden="true" />
                </div>
                <div className="panel-body">
                  <form className="entry-form tight-form" onSubmit={submitCreateUser}>
                    <div className="form-grid">
                      <label>
                        <span>{t("fullName")}</span>
                        <input
                          required
                          value={accountForm.fullName}
                          onChange={(event) => setAccountForm((current) => ({ ...current, fullName: event.target.value }))}
                        />
                      </label>
                      <label>
                        <span>{t("email")}</span>
                        <input
                          required
                          type="email"
                          value={accountForm.email}
                          onChange={(event) => setAccountForm((current) => ({ ...current, email: event.target.value }))}
                        />
                      </label>
                      <label>
                        <span>{t("phone")}</span>
                        <input
                          value={accountForm.phone}
                          onChange={(event) => setAccountForm((current) => ({ ...current, phone: event.target.value }))}
                        />
                      </label>
                    </div>
                    <div className="form-grid">
                      <label>
                        <span>{t("role")}</span>
                        <select
                          value={accountForm.role}
                          onChange={(event) => setAccountForm((current) => ({ ...current, role: event.target.value }))}
                        >
                          {assignableRoles.map((role) => (
                            <option key={role.id} value={role.name}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>{t("locale")}</span>
                        <select
                          value={accountForm.preferredLocale}
                          onChange={(event) =>
                            setAccountForm((current) => ({ ...current, preferredLocale: event.target.value as Locale }))
                          }
                        >
                          {locales.map((entry) => (
                            <option key={entry.code} value={entry.code}>
                              {entry.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>{t("temporaryPassword")}</span>
                        <input
                          required
                          minLength={8}
                          type="password"
                          value={accountForm.password}
                          onChange={(event) => setAccountForm((current) => ({ ...current, password: event.target.value }))}
                        />
                      </label>
                    </div>
                    <div className="modal-actions">
                      <button className="primary-button" disabled={isActionSubmitting} type="submit">
                        {isActionSubmitting ? t("saving") : t("createAccount")}
                      </button>
                    </div>
                  </form>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{t("userLabel")}</th>
                          <th>{t("role")}</th>
                          <th>{t("locale")}</th>
                          <th>{t("status")}</th>
                          <th>{t("action")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiUsers.map((account) => (
                          <tr key={account.id}>
                            <td>
                              <strong>{account.fullName}</strong>
                              <small>{account.email ?? "-"}</small>
                            </td>
                            <td>{account.role}</td>
                            <td>{String(account.preferredLocale).toUpperCase()}</td>
                            <td>
                              <span className={`badge ${account.isActive ? "good" : "danger"}`}>
                                {account.isActive ? t("active") : t("inactive")}
                              </span>
                            </td>
                            <td>
                              <button
                                className="ghost-button inline-button"
                                disabled={isActionSubmitting || account.id === user?.id}
                                onClick={() => void toggleUserStatus(account)}
                                type="button"
                              >
                                {account.isActive ? t("deactivate") : t("reactivate")}
                              </button>
                              <button
                                aria-label={t("deleteAccount")}
                                className="ghost-button danger-button inline-button"
                                disabled={isActionSubmitting || account.id === user?.id}
                                onClick={() => void removeUserAccount(account)}
                                title={t("deleteAccount")}
                                type="button"
                              >
                                <Trash2 size={14} aria-hidden="true" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {apiUsers.length === 0 ? (
                          <tr>
                            <td className="table-state" colSpan={5}>
                              {isLiveDataLoading ? t("loadingData") : t("noRecords")}
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
                  </article>
                ) : null}

                <article className="panel">
                  <div className="panel-header">
                    <div>
                      <h3>{t("accountSecurity")}</h3>
                      <span>{t("passwordRotationNote")}</span>
                    </div>
                    <Settings size={18} color="var(--brand)" aria-hidden="true" />
                  </div>
                  <div className="panel-body">
                    <form className="entry-form tight-form" onSubmit={submitChangePassword}>
                  <div className="form-grid">
                    <label>
                      <span>{t("currentPassword")}</span>
                      <input
                        required
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span>{t("newPassword")}</span>
                      <input
                        required
                        minLength={8}
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                      />
                    </label>
                  </div>
                  <div className="modal-actions">
                    <button className="primary-button" disabled={isActionSubmitting} type="submit">
                      {isActionSubmitting ? t("saving") : t("changeMyPassword")}
                    </button>
                  </div>
                    </form>

                    {isAccountAdmin ? (
                      <form className="entry-form tight-form split-form" onSubmit={submitResetPassword}>
                    <div className="form-grid">
                      <label>
                        <span>{t("resetAnotherUser")}</span>
                        <select
                          value={resetPasswordForm.userId}
                          onChange={(event) =>
                            setResetPasswordForm((current) => ({ ...current, userId: event.target.value }))
                          }
                        >
                          {apiUsers.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.fullName} ({account.role})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>{t("temporaryPassword")}</span>
                        <input
                          required
                          minLength={8}
                          type="password"
                          value={resetPasswordForm.newPassword}
                          onChange={(event) =>
                            setResetPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
                          }
                        />
                      </label>
                    </div>
                    <div className="modal-actions">
                      <button className="ghost-button" disabled={isActionSubmitting} type="submit">
                        {isActionSubmitting ? t("saving") : t("resetSelectedUser")}
                      </button>
                    </div>
                      </form>
                    ) : null}
                  </div>
                </article>
              </section>
              ) : null}

              {activeSection === "reports" ? (
                <section className="report-grid">
                  <article className="panel">
                    <div className="panel-header">
                      <div>
                        <h3>{t("salesReport")}</h3>
                        <span>{salesReport ? money(salesReport.totals.sales) : t("loadingData")}</span>
                      </div>
                      <button
                        className="ghost-button"
                        disabled={!salesReport?.invoices.length}
                        onClick={() =>
                          downloadCsv(
                            "sales-report.csv",
                            salesReport?.invoices.map((invoice) => ({
                              invoiceNumber: invoice.invoiceNumber,
                              customer: invoice.customer,
                              totalAmount: invoice.totalAmount,
                              paidAmount: invoice.paidAmount,
                              paymentStatus: invoice.paymentStatus,
                              createdAt: invoice.createdAt
                            })) ?? []
                          )
                        }
                        type="button"
                      >
                        {t("exportCsv")}
                      </button>
                    </div>
                    <div className="report-kpis">
                      <span>{t("collected")}: {money(salesReport?.totals.collected ?? 0)}</span>
                      <span>{t("credit")}: {money(salesReport?.totals.credit ?? 0)}</span>
                      <span>{t("grossMargin")}: {money(salesReport?.totals.grossMargin ?? 0)}</span>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>{t("product")}</th>
                            <th>{t("quantity")}</th>
                            <th>{t("amount")}</th>
                            <th>{t("grossMargin")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {salesReport?.products.map((product) => (
                            <tr key={product.productId}>
                              <td>
                                <strong>{product.name}</strong>
                                <small>{product.sku}</small>
                              </td>
                              <td>{product.quantity}</td>
                              <td>{money(product.revenue)}</td>
                              <td>{money(product.grossMargin)}</td>
                            </tr>
                          ))}
                          {!salesReport?.products.length ? (
                            <tr>
                              <td className="table-state" colSpan={4}>
                                {isLiveDataLoading ? t("loadingData") : t("noRecords")}
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </article>

                  <article className="panel">
                    <div className="panel-header">
                      <div>
                        <h3>{t("stockValuationReport")}</h3>
                        <span>{money(stockReport?.totals.stockValue ?? 0)}</span>
                      </div>
                      <button
                        className="ghost-button"
                        disabled={!stockReport?.rows.length}
                        onClick={() => downloadCsv("stock-report.csv", stockReport?.rows ?? [])}
                        type="button"
                      >
                        {t("exportCsv")}
                      </button>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>{t("product")}</th>
                            <th>{t("stock")}</th>
                            <th>{t("stockValue")}</th>
                            <th>{t("status")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockReport?.rows.slice(0, 8).map((row) => (
                            <tr key={row.productId}>
                              <td>
                                <strong>{row.name}</strong>
                                <small>{row.sku}</small>
                              </td>
                              <td>{row.quantity}</td>
                              <td>{money(row.stockValue)}</td>
                              <td>
                                <span className={`badge ${row.needsReorder ? "danger" : "good"}`}>
                                  {row.needsReorder ? t("reorderNow") : t("healthy")}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {!stockReport?.rows.length ? (
                            <tr>
                              <td className="table-state" colSpan={4}>
                                {isLiveDataLoading ? t("loadingData") : t("noRecords")}
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </article>

                  <article className="panel">
                    <div className="panel-header">
                      <div>
                        <h3>{t("customerDebtReport")}</h3>
                        <span>{money(debtReport?.totals.outstanding ?? 0)}</span>
                      </div>
                      <button
                        className="ghost-button"
                        disabled={!debtReport?.rows.length}
                        onClick={() => downloadCsv("debt-report.csv", debtReport?.rows ?? [])}
                        type="button"
                      >
                        {t("exportCsv")}
                      </button>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>{t("customer")}</th>
                            <th>{t("outstanding")}</th>
                            <th>{t("age")}</th>
                            <th>{t("status")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {debtReport?.rows.slice(0, 8).map((row) => (
                            <tr key={row.invoiceId}>
                              <td>
                                <strong>{row.customer}</strong>
                                <small>{row.invoiceNumber}</small>
                              </td>
                              <td>{money(row.outstanding)}</td>
                              <td>{row.ageDays}</td>
                              <td>{row.bucket}</td>
                            </tr>
                          ))}
                          {!debtReport?.rows.length ? (
                            <tr>
                              <td className="table-state" colSpan={4}>
                                {isLiveDataLoading ? t("loadingData") : t("noRecords")}
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </article>

                  <article className="panel">
                    <div className="panel-header">
                      <div>
                        <h3>{t("emptyContainerReport")}</h3>
                        <span>{(emptiesReport?.totals.exposure ?? 0).toLocaleString()}</span>
                      </div>
                      <button
                        className="ghost-button"
                        disabled={!emptiesReport?.rows.length}
                        onClick={() => downloadCsv("empties-report.csv", emptiesReport?.rows ?? [])}
                        type="button"
                      >
                        {t("exportCsv")}
                      </button>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>{t("customer")}</th>
                            <th>{t("route")}</th>
                            <th>{t("empties")}</th>
                            <th>{t("movements")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {emptiesReport?.rows.slice(0, 8).map((row) => (
                            <tr key={row.customerId}>
                              <td>{row.customer}</td>
                              <td>{row.route ?? "-"}</td>
                              <td>{row.balance}</td>
                              <td>{row.movements}</td>
                            </tr>
                          ))}
                          {!emptiesReport?.rows.length ? (
                            <tr>
                              <td className="table-state" colSpan={4}>
                                {isLiveDataLoading ? t("loadingData") : t("noRecords")}
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </article>

                  {user?.role === "OWNER" ? (
                    <article className="panel">
                      <div className="panel-header">
                        <div>
                          <h3>{t("auditTrail")}</h3>
                          <span>{t("recentSecurityActivity")}</span>
                        </div>
                        <ShieldCheck size={18} color="var(--brand)" aria-hidden="true" />
                      </div>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>{t("action")}</th>
                              <th>{t("actor")}</th>
                              <th>{t("time")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {apiAuditLogs.map((entry) => (
                              <tr key={entry.id}>
                                <td>{titleCaseEnum(entry.action)}</td>
                                <td>
                                  <strong>{entry.user?.fullName ?? "-"}</strong>
                                  <small>{entry.user?.role.name ?? "-"}</small>
                                </td>
                                <td>{new Date(entry.createdAt).toLocaleString("en-RW")}</td>
                              </tr>
                            ))}
                            {apiAuditLogs.length === 0 ? (
                              <tr>
                                <td className="table-state" colSpan={3}>
                                  {isLiveDataLoading ? t("loadingData") : t("noRecords")}
                                </td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  ) : null}
                </section>
              ) : null}
            </>
          )}
        </div>
      </section>

      {activeAction ? (
        <div className="modal-overlay" role="presentation">
          <section aria-modal="true" className="modal-card" role="dialog">
            <div className="modal-header">
              <h3>
                {activeAction === "stock"
                  ? t("receiveStock")
                  : activeAction === "invoice"
                    ? t("createInvoice")
                    : activeAction === "delivery"
                      ? t("createDeliveryTrip")
                      : activeAction === "reconcile"
                        ? t("reconcileTruck")
                        : t("recordPayment")}
              </h3>
              <button className="icon-button" onClick={closeActionModal} type="button">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {actionError ? <p className="form-error">{actionError}</p> : null}

            {activeAction === "stock" ? (
              <form className="entry-form" onSubmit={submitStock}>
                <label>
                  <span>{t("product")}</span>
                  <select
                    value={stockForm.productId}
                    onChange={(event) => setStockForm((current) => ({ ...current, productId: event.target.value }))}
                  >
                    {apiProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Quantity</span>
                  <input
                    min={1}
                    type="number"
                    value={stockForm.quantity}
                    onChange={(event) =>
                      setStockForm((current) => ({ ...current, quantity: Number(event.target.value) || 0 }))
                    }
                  />
                </label>
                <label>
                  <span>Note</span>
                  <textarea
                    rows={3}
                    value={stockForm.note}
                    onChange={(event) => setStockForm((current) => ({ ...current, note: event.target.value }))}
                  />
                </label>
                <div className="modal-actions">
                  <button className="ghost-button" onClick={closeActionModal} type="button">
                    Close
                  </button>
                  <button className="primary-button" disabled={isActionSubmitting} type="submit">
                    {isActionSubmitting ? "Saving..." : "Record receipt"}
                  </button>
                </div>
              </form>
            ) : null}

            {activeAction === "invoice" ? (
              <form className="entry-form" onSubmit={submitInvoice}>
                <label>
                  <span>{t("customer")}</span>
                  <select
                    value={invoiceForm.customerId}
                    onChange={(event) => setInvoiceForm((current) => ({ ...current, customerId: event.target.value }))}
                  >
                    {apiCustomers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="form-section">
                  <div className="form-section-header">
                    <strong>Items</strong>
                    <button
                      className="ghost-button"
                      onClick={() =>
                        setInvoiceForm((current) => ({
                          ...current,
                          items: [...current.items, emptyInvoiceItem(apiProducts[0]?.id ?? "")]
                        }))
                      }
                      type="button"
                    >
                      Add item
                    </button>
                  </div>
                  {invoiceForm.items.map((item, index) => (
                    <div className="form-grid compact" key={`${item.productId}-${index}`}>
                      <label>
                        <span>{t("product")}</span>
                        <select
                          value={item.productId}
                          onChange={(event) =>
                            setInvoiceForm((current) => ({
                              ...current,
                              items: current.items.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, productId: event.target.value } : entry
                              )
                            }))
                          }
                        >
                          {apiProducts.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Quantity</span>
                        <input
                          min={1}
                          type="number"
                          value={item.quantity}
                          onChange={(event) =>
                            setInvoiceForm((current) => ({
                              ...current,
                              items: current.items.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, quantity: Number(event.target.value) || 0 } : entry
                              )
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>Discount</span>
                        <input
                          min={0}
                          type="number"
                          value={item.discountAmount}
                          onChange={(event) =>
                            setInvoiceForm((current) => ({
                              ...current,
                              items: current.items.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? { ...entry, discountAmount: Number(event.target.value) || 0 }
                                  : entry
                              )
                            }))
                          }
                        />
                      </label>
                      <button
                        className="ghost-button remove-button"
                        disabled={invoiceForm.items.length === 1}
                        onClick={() =>
                          setInvoiceForm((current) => ({
                            ...current,
                            items: current.items.filter((_, entryIndex) => entryIndex !== index)
                          }))
                        }
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="form-grid">
                  <label>
                    <span>Initial payment method</span>
                    <select
                      value={invoiceForm.initialPaymentMethod}
                      onChange={(event) =>
                        setInvoiceForm((current) => ({
                          ...current,
                          initialPaymentMethod: event.target.value as "CASH" | "BANK" | "MOBILE_MONEY" | "CREDIT"
                        }))
                      }
                    >
                      <option value="CASH">Cash</option>
                      <option value="BANK">Bank</option>
                      <option value="MOBILE_MONEY">Mobile Money</option>
                      <option value="CREDIT">Credit</option>
                    </select>
                  </label>
                  <label>
                    <span>Initial payment amount</span>
                    <input
                      min={0}
                      type="number"
                      value={invoiceForm.initialPaymentAmount}
                      onChange={(event) =>
                        setInvoiceForm((current) => ({
                          ...current,
                          initialPaymentAmount: Number(event.target.value) || 0
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>{t("reference")}</span>
                    <input
                      value={invoiceForm.paymentReference}
                      onChange={(event) =>
                        setInvoiceForm((current) => ({ ...current, paymentReference: event.target.value }))
                      }
                    />
                  </label>
                </div>

                <div className="modal-actions">
                  <button className="ghost-button" onClick={closeActionModal} type="button">
                    Close
                  </button>
                  <button className="primary-button" disabled={isActionSubmitting} type="submit">
                    {isActionSubmitting ? "Saving..." : "Create invoice"}
                  </button>
                </div>
              </form>
            ) : null}

            {activeAction === "payment" ? (
              <form className="entry-form" onSubmit={submitPayment}>
                <label>
                  <span>{t("customer")}</span>
                  <select
                    value={paymentForm.customerId}
                    onChange={(event) =>
                      setPaymentForm((current) => ({
                        ...current,
                        customerId: event.target.value,
                        invoiceId: ""
                      }))
                    }
                  >
                    {apiCustomers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Invoice</span>
                  <select
                    value={paymentForm.invoiceId}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, invoiceId: event.target.value }))}
                  >
                    <option value="">Apply to customer balance</option>
                    {payableInvoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNumber} - {money(asNumber(invoice.totalAmount))}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-grid">
                  <label>
                    <span>{t("method")}</span>
                    <select
                      value={paymentForm.method}
                      onChange={(event) =>
                        setPaymentForm((current) => ({
                          ...current,
                          method: event.target.value as "CASH" | "BANK" | "MOBILE_MONEY" | "CREDIT"
                        }))
                      }
                    >
                      <option value="CASH">Cash</option>
                      <option value="BANK">Bank</option>
                      <option value="MOBILE_MONEY">Mobile Money</option>
                      <option value="CREDIT">Credit</option>
                    </select>
                  </label>
                  <label>
                    <span>{t("amount")}</span>
                    <input
                      min={1}
                      type="number"
                      value={paymentForm.amount}
                      onChange={(event) =>
                        setPaymentForm((current) => ({ ...current, amount: Number(event.target.value) || 0 }))
                      }
                    />
                  </label>
                  <label>
                    <span>{t("reference")}</span>
                    <input
                      value={paymentForm.reference}
                      onChange={(event) => setPaymentForm((current) => ({ ...current, reference: event.target.value }))}
                    />
                  </label>
                </div>

                <div className="modal-actions">
                  <button className="ghost-button" onClick={closeActionModal} type="button">
                    Close
                  </button>
                  <button className="primary-button" disabled={isActionSubmitting} type="submit">
                    {isActionSubmitting ? "Saving..." : "Record payment"}
                  </button>
                </div>
              </form>
            ) : null}

            {activeAction === "delivery" ? (
              <form className="entry-form" onSubmit={submitDeliveryTrip}>
                <div className="form-grid">
                  <label>
                    <span>{t("truck")}</span>
                    <select
                      required
                      value={deliveryForm.vehicleId}
                      onChange={(event) => setDeliveryForm((current) => ({ ...current, vehicleId: event.target.value }))}
                    >
                      {apiVehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.plateNumber}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{t("driver")}</span>
                    <select
                      required
                      value={deliveryForm.driverId}
                      onChange={(event) => setDeliveryForm((current) => ({ ...current, driverId: event.target.value }))}
                    >
                      {driverUsers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{t("route")}</span>
                    <input
                      required
                      value={deliveryForm.route}
                      onChange={(event) => setDeliveryForm((current) => ({ ...current, route: event.target.value }))}
                    />
                  </label>
                </div>

                <div className="form-section">
                  <div className="form-section-header">
                    <strong>{t("loadedItems")}</strong>
                    <button
                      className="ghost-button"
                      onClick={() =>
                        setDeliveryForm((current) => ({
                          ...current,
                          items: [...current.items, emptyDeliveryLoadItem(apiProducts[0]?.id ?? "")]
                        }))
                      }
                      type="button"
                    >
                      {t("addItem")}
                    </button>
                  </div>
                  {deliveryForm.items.map((item, index) => (
                    <div className="form-grid compact" key={`${item.productId}-${index}`}>
                      <label>
                        <span>{t("product")}</span>
                        <select
                          value={item.productId}
                          onChange={(event) =>
                            setDeliveryForm((current) => ({
                              ...current,
                              items: current.items.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, productId: event.target.value } : entry
                              )
                            }))
                          }
                        >
                          {apiProducts.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>{t("quantity")}</span>
                        <input
                          min={1}
                          type="number"
                          value={item.loadedQuantity}
                          onChange={(event) =>
                            setDeliveryForm((current) => ({
                              ...current,
                              items: current.items.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? { ...entry, loadedQuantity: Number(event.target.value) || 0 }
                                  : entry
                              )
                            }))
                          }
                        />
                      </label>
                      <button
                        className="ghost-button remove-button"
                        disabled={deliveryForm.items.length === 1}
                        onClick={() =>
                          setDeliveryForm((current) => ({
                            ...current,
                            items: current.items.filter((_, entryIndex) => entryIndex !== index)
                          }))
                        }
                        type="button"
                      >
                        {t("remove")}
                      </button>
                    </div>
                  ))}
                </div>

                <label className="checkbox-label">
                  <input
                    checked={deliveryForm.allowNegativeStock}
                    type="checkbox"
                    onChange={(event) =>
                      setDeliveryForm((current) => ({ ...current, allowNegativeStock: event.target.checked }))
                    }
                  />
                  <span>{t("allowNegativeStock")}</span>
                </label>

                <div className="modal-actions">
                  <button className="ghost-button" onClick={closeActionModal} type="button">
                    {t("close")}
                  </button>
                  <button className="primary-button" disabled={isActionSubmitting} type="submit">
                    {isActionSubmitting ? t("saving") : t("createDeliveryTrip")}
                  </button>
                </div>
              </form>
            ) : null}

            {activeAction === "reconcile" ? (
              <form className="entry-form" onSubmit={submitReconciliation}>
                <label>
                  <span>{t("truck")}</span>
                  <select
                    value={reconcileForm.tripId}
                    onChange={(event) => {
                      const trip = apiTrips.find((entry) => entry.id === event.target.value);
                      setReconcileForm({
                        tripId: event.target.value,
                        cashCollected: trip ? asNumber(trip.cashCollected) : 0,
                        creditIssued: trip ? asNumber(trip.creditIssued) : 0,
                        items: buildReconcileItems(trip)
                      });
                    }}
                  >
                    {openTrips.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.vehicle.plateNumber} - {trip.route}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedTrip ? (
                  <div className="trip-summary">
                    <span>{selectedTrip.driver.fullName}</span>
                    <span>{selectedTrip.route}</span>
                  </div>
                ) : null}

                <div className="form-grid">
                  <label>
                    <span>{t("cashCollected")}</span>
                    <input
                      min={0}
                      type="number"
                      value={reconcileForm.cashCollected}
                      onChange={(event) =>
                        setReconcileForm((current) => ({
                          ...current,
                          cashCollected: Number(event.target.value) || 0
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>{t("creditIssued")}</span>
                    <input
                      min={0}
                      type="number"
                      value={reconcileForm.creditIssued}
                      onChange={(event) =>
                        setReconcileForm((current) => ({
                          ...current,
                          creditIssued: Number(event.target.value) || 0
                        }))
                      }
                    />
                  </label>
                </div>

                <div className="form-section">
                  <div className="form-section-header">
                    <strong>Loaded items</strong>
                  </div>
                  {reconcileForm.items.map((item, index) => (
                    <div className="reconcile-row" key={item.itemId}>
                      <div>
                        <strong>{item.productName}</strong>
                        <span>Loaded: {item.loadedQuantity}</span>
                      </div>
                      <label>
                        <span>Delivered</span>
                        <input
                          min={0}
                          type="number"
                          value={item.deliveredQuantity}
                          onChange={(event) =>
                            setReconcileForm((current) => ({
                              ...current,
                              items: current.items.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? { ...entry, deliveredQuantity: Number(event.target.value) || 0 }
                                  : entry
                              )
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>Returned</span>
                        <input
                          min={0}
                          type="number"
                          value={item.returnedQuantity}
                          onChange={(event) =>
                            setReconcileForm((current) => ({
                              ...current,
                              items: current.items.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? { ...entry, returnedQuantity: Number(event.target.value) || 0 }
                                  : entry
                              )
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>Damaged</span>
                        <input
                          min={0}
                          type="number"
                          value={item.damagedQuantity}
                          onChange={(event) =>
                            setReconcileForm((current) => ({
                              ...current,
                              items: current.items.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? { ...entry, damagedQuantity: Number(event.target.value) || 0 }
                                  : entry
                              )
                            }))
                          }
                        />
                      </label>
                    </div>
                  ))}
                </div>

                <div className="modal-actions">
                  <button className="ghost-button" onClick={closeActionModal} type="button">
                    Close
                  </button>
                  <button className="primary-button" disabled={isActionSubmitting} type="submit">
                    {isActionSubmitting ? "Saving..." : "Complete reconciliation"}
                  </button>
                </div>
              </form>
            ) : null}
          </section>
        </div>
      ) : null}
    </main>
  );
}
