"use client";

import {
  Banknote,
  Boxes,
  ClipboardCheck,
  CreditCard,
  PackagePlus,
  Pencil,
  ReceiptText,
  RotateCcw,
  Route,
  Settings,
  ShieldCheck,
  Trash2,
  Truck,
  Users,
  X
} from "lucide-react";
import { CSSProperties, FocusEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { DashboardOverview } from "@/components/dashboard/overview";
import {
  AuthBand,
  DashboardSidebar,
  DashboardTopbar,
  KpiGrid,
  LoginRequiredPanel,
  PageHeading,
  StatusBanners,
  SyncBanner
} from "@/components/dashboard/shell";
import {
  ApiAuditLog,
  ApiCompanyProfile,
  ApiCustomer,
  ApiDebtCollectionActivity,
  ApiDeliveryTrip,
  ApiDriverAccountabilityReport,
  ApiEmptyContainerMovement,
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
  ApiWarehouse,
  cancelInvoice,
  changeMyPassword,
  createDeliveryTrip,
  createDeliveryProof,
  createCustomer,
  createDebtCollectionActivity,
  createProduct,
  createInvoice,
  createUser,
  createVehicle,
  createWarehouse,
  deleteCustomer,
  deletePayment,
  deleteProduct,
  deleteUser,
  deleteVehicle,
  deleteWarehouse,
  getProductPriceHistory,
  getCustomers,
  getDeliveryTrips,
  getEmptyContainerMovements,
  getAuditLogs,
  getApiHealth,
  getCompanyProfile,
  getInvoices,
  getMe,
  getOwnerDashboard,
  getPayments,
  getProducts,
  getRoles,
  getDebtReport,
  getDebtCollectionActivities,
  getEmptiesReport,
  getDriverAccountabilityReport,
  getSalesReport,
  getStockReport,
  getUsers,
  getVehicles,
  getWarehouses,
  getWarehouseStock,
  login,
  OwnerDashboardResponse,
  receiveStock,
  reconcileDeliveryTrip,
  reconcilePayment,
  resetUserPassword,
  recordEmptyContainerMovement,
  recordPayment,
  updateCompanyProfile,
  updateCustomer,
  updateDebtCollectionActivity,
  updateInvoiceEbmStatus,
  updateProduct,
  updateUser,
  updateVehicle,
  updateWarehouse
} from "@/lib/api";
import {
  ActionType,
  asNumber,
  buildReconcileItems,
  DeliveryLoadFormItem,
  downloadCsv,
  emptyDeliveryLoadItem,
  emptyInvoiceItem,
  emptyProductForm,
  formatDeliveryArea,
  formatToday,
  MAIN_WAREHOUSE_ID,
  mapLiveDelivery,
  mapLivePayment,
  mapLiveProduct,
  money,
  NavRole,
  NavSection,
  navItemConfig,
  OFFLINE_DRAFTS_KEY,
  OfflineDraft,
  optionalLiveData,
  ProductFormMode,
  ReconcileFormItem,
  titleCaseEnum
} from "@/lib/dashboard-helpers";
import { dictionary, locales, TranslationKey } from "@/lib/i18n";
import { customers, deliveries, payments, products } from "@/lib/mock-data";
import { Customer, Delivery, Locale, Payment, Product } from "@/lib/types";

const defaultCompanyProfile: ApiCompanyProfile = {
  id: "",
  name: "BRALIRWA Distributor",
  code: "BRALIRWA-DEMO",
  industry: "Beverage distribution",
  logoUrl: null,
  primaryColor: "#0b6b50",
  secondaryColor: "#f4c542",
  currency: "RWF",
  defaultLocale: "en",
  featureFlags: {
    emptiesTracking: true,
    creditManagement: true,
    deliveryRoutes: true,
    invoicePayments: true
  },
  createdAt: ""
};

export default function Home() {
  const [locale, setLocale] = useState<Locale>("en");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [email, setEmail] = useState("owner@example.com");
  const [password, setPassword] = useState("ChangeMe123!");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [ownerDashboard, setOwnerDashboard] = useState<OwnerDashboardResponse | null>(null);
  const [companyProfile, setCompanyProfile] = useState<ApiCompanyProfile>(defaultCompanyProfile);
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const [liveCustomers, setLiveCustomers] = useState<Customer[]>([]);
  const [liveDeliveries, setLiveDeliveries] = useState<Delivery[]>([]);
  const [livePayments, setLivePayments] = useState<Payment[]>([]);
  const [apiProducts, setApiProducts] = useState<ApiProduct[]>([]);
  const [apiCustomers, setApiCustomers] = useState<ApiCustomer[]>([]);
  const [apiTrips, setApiTrips] = useState<ApiDeliveryTrip[]>([]);
  const [apiPayments, setApiPayments] = useState<ApiPayment[]>([]);
  const [apiVehicles, setApiVehicles] = useState<ApiVehicle[]>([]);
  const [apiWarehouses, setApiWarehouses] = useState<ApiWarehouse[]>([]);
  const [apiInvoices, setApiInvoices] = useState<ApiInvoice[]>([]);
  const [apiEmptyMovements, setApiEmptyMovements] = useState<ApiEmptyContainerMovement[]>([]);
  const [apiDebtCollections, setApiDebtCollections] = useState<ApiDebtCollectionActivity[]>([]);
  const [apiUsers, setApiUsers] = useState<ApiUser[]>([]);
  const [apiRoles, setApiRoles] = useState<ApiRole[]>([]);
  const [apiAuditLogs, setApiAuditLogs] = useState<ApiAuditLog[]>([]);
  const [salesReport, setSalesReport] = useState<ApiSalesReport | null>(null);
  const [stockReport, setStockReport] = useState<ApiStockReport | null>(null);
  const [debtReport, setDebtReport] = useState<ApiDebtReport | null>(null);
  const [emptiesReport, setEmptiesReport] = useState<ApiEmptiesReport | null>(null);
  const [driverAccountabilityReport, setDriverAccountabilityReport] = useState<ApiDriverAccountabilityReport | null>(null);
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
  const [customerForm, setCustomerForm] = useState({
    customerId: "",
    name: "",
    phone: "",
    route: "",
    location: "",
    creditLimit: 0
  });
  const [emptyReturnForm, setEmptyReturnForm] = useState({
    customerId: "",
    productId: "",
    movementType: "RETURNED_BY_CUSTOMER" as "ISSUED_TO_CUSTOMER" | "RETURNED_BY_CUSTOMER" | "ADJUSTMENT" | "LOST",
    quantity: 1,
    referenceType: ""
  });
  const [proofForm, setProofForm] = useState({
    tripId: "",
    customerId: "",
    receiverName: "",
    receiverPhone: "",
    signatureDataUrl: "",
    photoUrl: "",
    latitude: "",
    longitude: "",
    note: ""
  });
  const [collectionForm, setCollectionForm] = useState({
    customerId: "",
    invoiceId: "",
    actionType: "CALL" as ApiDebtCollectionActivity["actionType"],
    note: "",
    promisedAmount: 0,
    promisedDate: "",
    nextFollowUpAt: ""
  });
  const [customerFormMode, setCustomerFormMode] = useState<"create" | "edit">("create");
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
  const [companyForm, setCompanyForm] = useState({
    name: defaultCompanyProfile.name,
    industry: defaultCompanyProfile.industry,
    logoUrl: "",
    primaryColor: defaultCompanyProfile.primaryColor,
    secondaryColor: defaultCompanyProfile.secondaryColor,
    currency: defaultCompanyProfile.currency,
    defaultLocale: defaultCompanyProfile.defaultLocale
  });
  const [warehouseForm, setWarehouseForm] = useState({
    warehouseId: "",
    name: "",
    location: ""
  });
  const [vehicleForm, setVehicleForm] = useState({
    vehicleId: "",
    plateNumber: "",
    driverId: ""
  });
  const [cancelInvoiceForm, setCancelInvoiceForm] = useState({
    invoiceId: "",
    note: ""
  });
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [colorMode, setColorMode] = useState<"light" | "dark">("light");
  const t = useCallback((key: TranslationKey) => dictionary[locale][key], [locale]);
  const isAccountAdmin = user?.role === "OWNER" || user?.role === "ADMIN";
  const isAuthenticated = Boolean(user && accessToken && apiStatus === "connected");
  const brandInitials = useMemo(() => {
    const words = companyProfile.name.replace(/[^a-zA-Z0-9 ]/g, " ").trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "DC";
    return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  }, [companyProfile.name]);
  const tenantTheme = useMemo(
    () =>
      ({
        "--brand": companyProfile.primaryColor,
        "--brand-strong": companyProfile.primaryColor,
        "--tenant-accent": companyProfile.secondaryColor
      }) as CSSProperties,
    [companyProfile.primaryColor, companyProfile.secondaryColor]
  );

  function toggleColorMode() {
    setColorMode((current) => {
      const next = current === "dark" ? "light" : "dark";
      window.localStorage.setItem("colorMode", next);
      return next;
    });
  }

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
    setCompanyProfile(defaultCompanyProfile);
    setCompanyForm({
      name: defaultCompanyProfile.name,
      industry: defaultCompanyProfile.industry,
      logoUrl: "",
      primaryColor: defaultCompanyProfile.primaryColor,
      secondaryColor: defaultCompanyProfile.secondaryColor,
      currency: defaultCompanyProfile.currency,
      defaultLocale: defaultCompanyProfile.defaultLocale
    });
    setLiveProducts([]);
    setLiveCustomers([]);
    setLiveDeliveries([]);
    setLivePayments([]);
    setApiProducts([]);
    setApiCustomers([]);
    setApiTrips([]);
    setApiPayments([]);
    setApiVehicles([]);
    setApiWarehouses([]);
    setApiInvoices([]);
    setApiEmptyMovements([]);
    setApiDebtCollections([]);
    setApiUsers([]);
    setApiRoles([]);
    setApiAuditLogs([]);
    setSalesReport(null);
    setStockReport(null);
    setDebtReport(null);
    setEmptiesReport(null);
    setDriverAccountabilityReport(null);
    setProductPriceHistory([]);
  }, []);

  const loadLiveData = useCallback(
    async (token: string) => {
      setIsLiveDataLoading(true);

      try {
        const profile = await getMe(token);
        const canReadOwnerDashboard = profile.role === "OWNER" || profile.role === "ADMIN";
        const canReadInventory = profile.role === "OWNER" || profile.role === "ADMIN" || profile.role === "WAREHOUSE_MANAGER";
        const canReadProducts =
          profile.role === "OWNER" ||
          profile.role === "ADMIN" ||
          profile.role === "WAREHOUSE_MANAGER" ||
          profile.role === "SALESPERSON";
        const canReadCustomers =
          profile.role === "OWNER" || profile.role === "ADMIN" || profile.role === "ACCOUNTANT" || profile.role === "SALESPERSON";
        const canReadFinancialRecords =
          profile.role === "OWNER" || profile.role === "ADMIN" || profile.role === "ACCOUNTANT" || profile.role === "SALESPERSON";
        const canReadDeliveryRecords =
          profile.role === "OWNER" || profile.role === "ADMIN" || profile.role === "WAREHOUSE_MANAGER" || profile.role === "DRIVER";
        const canReadVehicles = profile.role === "OWNER" || profile.role === "ADMIN" || profile.role === "WAREHOUSE_MANAGER";
        const canReadEmptyReturns =
          profile.role === "OWNER" ||
          profile.role === "ADMIN" ||
          profile.role === "WAREHOUSE_MANAGER" ||
          profile.role === "SALESPERSON" ||
          profile.role === "ACCOUNTANT";
        const [
          company,
          dashboard,
          rawProducts,
          stockItems,
          rawCustomers,
          rawPayments,
          rawTrips,
          rawVehicles,
          rawWarehouses,
          rawInvoices,
          rawEmptyMovements,
          rawDebtCollections
        ] = await Promise.all([
          optionalLiveData(getCompanyProfile(token), defaultCompanyProfile),
          canReadOwnerDashboard ? optionalLiveData(getOwnerDashboard(token), null) : Promise.resolve(null),
          canReadProducts ? optionalLiveData(getProducts(token), []) : Promise.resolve([]),
          canReadInventory ? optionalLiveData(getWarehouseStock(token, MAIN_WAREHOUSE_ID), []) : Promise.resolve([]),
          canReadCustomers ? optionalLiveData(getCustomers(token), []) : Promise.resolve([]),
          canReadFinancialRecords ? optionalLiveData(getPayments(token), []) : Promise.resolve([]),
          canReadDeliveryRecords ? optionalLiveData(getDeliveryTrips(token), []) : Promise.resolve([]),
          canReadVehicles ? optionalLiveData(getVehicles(token), []) : Promise.resolve([]),
          canReadInventory ? optionalLiveData(getWarehouses(token), []) : Promise.resolve([]),
          canReadFinancialRecords ? optionalLiveData(getInvoices(token), []) : Promise.resolve([]),
          canReadEmptyReturns ? optionalLiveData(getEmptyContainerMovements(token), []) : Promise.resolve([]),
          canReadFinancialRecords ? optionalLiveData(getDebtCollectionActivities(token), []) : Promise.resolve([])
        ]);

        const canManageUsers = profile.role === "OWNER" || profile.role === "ADMIN";
        const isOwner = profile.role === "OWNER";
        const canReadReports = profile.role === "OWNER" || profile.role === "ADMIN" || profile.role === "ACCOUNTANT";
        const [rawUsers, rawRoles, rawAuditLogs, rawSalesReport, rawStockReport, rawDebtReport, rawEmptiesReport, rawDriverReport] = await Promise.all([
          canManageUsers ? optionalLiveData(getUsers(token), []) : Promise.resolve([]),
          canManageUsers ? optionalLiveData(getRoles(token), []) : Promise.resolve([]),
          isOwner ? optionalLiveData(getAuditLogs(token), []) : Promise.resolve([]),
          canReadReports ? optionalLiveData(getSalesReport(token), null) : Promise.resolve(null),
          canReadReports ? optionalLiveData(getStockReport(token), null) : Promise.resolve(null),
          canReadReports ? optionalLiveData(getDebtReport(token), null) : Promise.resolve(null),
          canReadReports ? optionalLiveData(getEmptiesReport(token), null) : Promise.resolve(null),
          canReadReports ? optionalLiveData(getDriverAccountabilityReport(token), null) : Promise.resolve(null)
        ]);
        const balances: Customer[] = rawCustomers.map((customer) => ({
          id: customer.id,
          name: customer.name,
          route: formatDeliveryArea(customer.route),
          phone: customer.phone ?? "-",
          creditLimit: asNumber(customer.creditLimit),
          outstanding: customer.outstanding ?? 0,
          emptiesBalance: customer.emptyBalance ?? 0,
          lastOrder: customer.createdAt
        }));

        setOwnerDashboard(dashboard);
        setCompanyProfile(company);
        setCompanyForm({
          name: company.name,
          industry: company.industry,
          logoUrl: company.logoUrl ?? "",
          primaryColor: company.primaryColor,
          secondaryColor: company.secondaryColor,
          currency: company.currency,
          defaultLocale: company.defaultLocale
        });
        setUser(profile);
        setApiProducts(rawProducts);
        setApiCustomers(rawCustomers);
        setApiTrips(rawTrips);
        setApiPayments(rawPayments);
        setApiVehicles(rawVehicles);
        setApiWarehouses(rawWarehouses);
        setApiInvoices(rawInvoices);
        setApiEmptyMovements(rawEmptyMovements);
        setApiDebtCollections(rawDebtCollections);
        setApiUsers(rawUsers);
        setApiRoles(rawRoles);
        setApiAuditLogs(rawAuditLogs);
        setSalesReport(rawSalesReport);
        setStockReport(rawStockReport);
        setDebtReport(rawDebtReport);
        setEmptiesReport(rawEmptiesReport);
        setDriverAccountabilityReport(rawDriverReport);
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

    const storedColorMode = window.localStorage.getItem("colorMode");
    if (storedColorMode === "dark" || storedColorMode === "light") {
      setColorMode(storedColorMode);
    } else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      setColorMode("dark");
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
        if (draft.type === "empties") {
          await recordEmptyContainerMovement(accessToken, draft.payload as Parameters<typeof recordEmptyContainerMovement>[1]);
        }
        if (draft.type === "proof") {
          const payload = draft.payload as { tripId: string; data: Parameters<typeof createDeliveryProof>[2] };
          await createDeliveryProof(accessToken, payload.tripId, payload.data);
        }
        if (draft.type === "collection") {
          await createDebtCollectionActivity(accessToken, draft.payload as Parameters<typeof createDebtCollectionActivity>[1]);
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

  const displayedProducts = isAuthenticated ? liveProducts : products;
  const displayedCustomers = isAuthenticated ? liveCustomers : customers;
  const displayedDeliveries = isAuthenticated ? liveDeliveries : deliveries;
  const displayedPayments = isAuthenticated ? livePayments : payments;
  const canUseLiveActions = Boolean(accessToken && apiStatus === "connected");
  const canCreateCustomers = Boolean(user?.role && ["OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON"].includes(user.role));
  const canManageCustomers = Boolean(user?.role && ["OWNER", "ADMIN"].includes(user.role));
  const canCreateDeliveries = Boolean(user?.role && ["OWNER", "ADMIN", "WAREHOUSE_MANAGER"].includes(user.role));
  const canReconcileDeliveries = Boolean(user?.role && ["OWNER", "ADMIN", "WAREHOUSE_MANAGER", "DRIVER"].includes(user.role));
  const canRecordDeliveryProof = Boolean(user?.role && ["OWNER", "ADMIN", "WAREHOUSE_MANAGER", "DRIVER", "SALESPERSON"].includes(user.role));
  const canRecordEmptyReturns = Boolean(
    user?.role && ["OWNER", "ADMIN", "WAREHOUSE_MANAGER", "SALESPERSON"].includes(user.role)
  );
  const canRecordPayments = Boolean(user?.role && ["OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON"].includes(user.role));
  const canReconcilePayments = Boolean(user?.role && ["OWNER", "ADMIN"].includes(user.role));
  const canRecordCollections = Boolean(user?.role && ["OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON"].includes(user.role));
  const assignableRoles = apiRoles.filter((role) => user?.role === "OWNER" || role.name !== "OWNER");
  const openTrips = apiTrips.filter((trip) => trip.status !== "CLOSED");
  const driverUsers = apiUsers.filter((account) => account.role === "DRIVER" && account.isActive !== false);
  const selectedTrip = apiTrips.find((trip) => trip.id === reconcileForm.tripId);
  const payableInvoices = apiInvoices.filter(
    (invoice) => invoice.customerId === paymentForm.customerId && invoice.paymentStatus !== "PAID"
  );
  const activeVehicles = apiVehicles.filter((vehicle) => vehicle.isActive);

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
    const activeDeliveries = displayedDeliveries.filter(
      (delivery) => delivery.status !== "Awaiting truck return" && delivery.status !== "Closed" && delivery.status !== "Cancelled"
    ).length;
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
    { label: t("emptyLiability"), value: metrics.emptyLiability.toLocaleString(), icon: RotateCcw },
    { label: t("stockValue"), value: money(metrics.stockValue), icon: Boxes },
    { label: t("cashCollected"), value: money(metrics.cashCollected), icon: Banknote },
    { label: t("creditExposure"), value: money(metrics.creditExposure), icon: CreditCard },
    { label: t("activeDeliveries"), value: metrics.activeDeliveries.toString(), icon: Truck }
  ];

  const criticalCreditCustomers = displayedCustomers.filter((customer) => customer.outstanding / customer.creditLimit >= 0.8);
  const highEmptiesCustomers = displayedCustomers
    .filter((customer) => customer.emptiesBalance > 0)
    .sort((left, right) => right.emptiesBalance - left.emptiesBalance);

  const quickActions = [
    { key: "stock" as const, label: t("receiveStock"), icon: PackagePlus, roles: ["OWNER", "ADMIN", "WAREHOUSE_MANAGER"] as NavRole[] },
    { key: "invoice" as const, label: t("createInvoice"), icon: ReceiptText, roles: ["OWNER", "ADMIN", "SALESPERSON"] as NavRole[] },
    { key: "delivery" as const, label: t("createDeliveryTrip"), icon: Truck, roles: ["OWNER", "ADMIN", "WAREHOUSE_MANAGER"] as NavRole[] },
    { key: "reconcile" as const, label: t("reconcileTruck"), icon: ClipboardCheck, roles: ["OWNER", "ADMIN", "WAREHOUSE_MANAGER", "DRIVER"] as NavRole[] },
    {
      key: "empties" as const,
      label: t("recordEmptyReturn"),
      icon: RotateCcw,
      roles: ["OWNER", "ADMIN", "WAREHOUSE_MANAGER", "SALESPERSON"] as NavRole[]
    },
    { key: "payment" as const, label: t("recordPayment"), icon: Banknote, roles: ["OWNER", "ADMIN", "SALESPERSON", "ACCOUNTANT"] as NavRole[] },
    { key: "customer" as const, label: t("createCustomer"), icon: Users, roles: ["OWNER", "ADMIN", "SALESPERSON", "ACCOUNTANT"] as NavRole[] }
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
    if (apiWarehouses.length === 0 || warehouseForm.warehouseId) return;
    const warehouse = apiWarehouses[0];
    setWarehouseForm({
      warehouseId: warehouse.id,
      name: warehouse.name,
      location: warehouse.location ?? ""
    });
  }, [apiWarehouses, warehouseForm.warehouseId]);

  useEffect(() => {
    if (apiVehicles.length === 0 || vehicleForm.vehicleId) return;
    const vehicle = apiVehicles[0];
    setVehicleForm({
      vehicleId: vehicle.id,
      plateNumber: vehicle.plateNumber,
      driverId: vehicle.driverId ?? ""
    });
  }, [apiVehicles, vehicleForm.vehicleId]);

  useEffect(() => {
    if (apiInvoices.length === 0 || cancelInvoiceForm.invoiceId) return;
    const invoice = apiInvoices.find((entry) => entry.status !== "CANCELLED" && entry.payments.length === 0) ?? apiInvoices[0];
    setCancelInvoiceForm((current) => ({ ...current, invoiceId: invoice.id }));
  }, [apiInvoices, cancelInvoiceForm.invoiceId]);

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
      window.localStorage.setItem("user", JSON.stringify(response.user));
      setAccessToken(response.accessToken);
      setUser(response.user);
      setApiStatus("connected");
      if (locales.some((entry) => entry.code === response.user.preferredLocale)) {
        setLocale(response.user.preferredLocale as Locale);
      }
      void loadLiveData(response.accessToken).catch((error) => {
        setActionError(error instanceof Error ? error.message : t("genericActionFailed"));
      });
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

  function selectNumberInput(event: FocusEvent<HTMLInputElement>) {
    event.currentTarget.select();
  }

  function parseNumericInput(value: string) {
    const normalized = value.replace(/[^\d.]/g, "").replace(/^0+(?=\d)/, "");
    return normalized === "" ? 0 : Number(normalized) || 0;
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

    if (action === "customer") {
      setCustomerFormMode("create");
      setCustomerForm({
        customerId: "",
        name: "",
        phone: "",
        route: "",
        location: "",
        creditLimit: 0
      });
    }

    if (action === "empties") {
      setEmptyReturnForm({
        customerId: apiCustomers[0]?.id ?? "",
        productId: apiProducts.find((product) => product.tracksEmpties)?.id ?? "",
        movementType: "RETURNED_BY_CUSTOMER",
        quantity: 1,
        referenceType: "manual-entry"
      });
    }

    if (action === "delivery") {
      setDeliveryForm({
        vehicleId: activeVehicles[0]?.id ?? "",
        driverId: driverUsers[0]?.id ?? "",
        route: activeVehicles[0]?.driver?.fullName ?? "",
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

    if (action === "proof") {
      const firstTrip = openTrips[0] ?? apiTrips[0];
      setProofForm({
        tripId: firstTrip?.id ?? "",
        customerId: apiCustomers[0]?.id ?? "",
        receiverName: "",
        receiverPhone: "",
        signatureDataUrl: "",
        photoUrl: "",
        latitude: "",
        longitude: "",
        note: ""
      });
    }

    if (action === "collection") {
      const firstCustomerId = apiCustomers[0]?.id ?? "";
      const firstInvoice = apiInvoices.find((invoice) => invoice.customerId === firstCustomerId && invoice.paymentStatus !== "PAID");
      setCollectionForm({
        customerId: firstCustomerId,
        invoiceId: firstInvoice?.id ?? "",
        actionType: "CALL",
        note: "",
        promisedAmount: 0,
        promisedDate: "",
        nextFollowUpAt: ""
      });
    }
  }

  async function runAction(task: () => Promise<void>, successMessage: string) {
    if (!accessToken) return;

    setIsActionSubmitting(true);
    setActionError(null);
    setActionNotice(null);

    try {
      await task();
      await loadLiveData(accessToken);
      setActionNotice(successMessage);
      setActiveAction(null);
    } catch (error) {
      setActionNotice(null);
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

  async function submitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    const payload = {
      name: customerForm.name,
      phone: customerForm.phone || undefined,
      route: customerForm.route || undefined,
      location: customerForm.location || undefined,
      creditLimit: customerForm.creditLimit
    };

    await runAction(
      async () => {
        if (customerFormMode === "edit" && customerForm.customerId) {
          await updateCustomer(accessToken, customerForm.customerId, payload);
          return;
        }
        await createCustomer(accessToken, payload);
      },
      customerFormMode === "edit" ? t("customerUpdated") : t("customerCreated")
    );
  }

  async function submitEmptyReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    const payload = {
      customerId: emptyReturnForm.customerId,
      productId: emptyReturnForm.productId || undefined,
      movementType: emptyReturnForm.movementType,
      quantity: emptyReturnForm.quantity,
      referenceType: emptyReturnForm.referenceType || "manual-entry"
    };

    if (!isOnline) {
      enqueueOfflineDraft("empties", payload);
      return;
    }

    await runAction(
      async () => {
        await recordEmptyContainerMovement(accessToken, payload);
      },
      t("emptyMovementRecorded")
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

  async function submitDeliveryProof(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !proofForm.tripId) return;
    const payload = {
      customerId: proofForm.customerId || undefined,
      receiverName: proofForm.receiverName,
      receiverPhone: proofForm.receiverPhone || undefined,
      latitude: proofForm.latitude ? Number(proofForm.latitude) : undefined,
      longitude: proofForm.longitude ? Number(proofForm.longitude) : undefined,
      signatureDataUrl: proofForm.signatureDataUrl || undefined,
      photoUrl: proofForm.photoUrl || undefined,
      note: proofForm.note || undefined
    };

    if (!isOnline) {
      enqueueOfflineDraft("proof", {
        tripId: proofForm.tripId,
        data: payload
      });
      return;
    }

    await runAction(
      async () => {
        await createDeliveryProof(accessToken, proofForm.tripId, payload);
      },
      t("proofSaved")
    );
  }

  async function submitCollectionActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !collectionForm.customerId) return;
    const payload = {
      customerId: collectionForm.customerId,
      invoiceId: collectionForm.invoiceId || undefined,
      actionType: collectionForm.actionType,
      note: collectionForm.note || undefined,
      promisedAmount: collectionForm.promisedAmount || undefined,
      promisedDate: collectionForm.promisedDate || undefined,
      nextFollowUpAt: collectionForm.nextFollowUpAt || undefined
    };

    if (!isOnline) {
      enqueueOfflineDraft("collection", payload);
      return;
    }

    await runAction(
      async () => {
        await createDebtCollectionActivity(accessToken, payload);
      },
      t("collectionActivitySaved")
    );
  }

  async function setPaymentReconciliation(paymentId: string, status: "MATCHED" | "FLAGGED") {
    if (!accessToken) return;
    await runAction(
      async () => {
        await reconcilePayment(accessToken, paymentId, {
          reconciliationStatus: status,
          reconciliationNote: status === "MATCHED" ? "Matched by owner/admin review" : "Flagged for investigation"
        });
      },
      t("paymentReconciliation")
    );
  }

  async function markInvoiceEbmSubmitted(invoiceId: string) {
    if (!accessToken) return;
    await runAction(
      async () => {
        await updateInvoiceEbmStatus(accessToken, invoiceId, {
          ebmStatus: "SUBMITTED",
          ebmSubmittedAt: new Date().toISOString()
        });
      },
      t("markEbmSubmitted")
    );
  }

  async function completeCollectionActivity(activityId: string) {
    if (!accessToken) return;
    await runAction(
      async () => {
        await updateDebtCollectionActivity(accessToken, activityId, { status: "COMPLETED" });
      },
      t("collectionActivitySaved")
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

  async function submitCompanyProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;

    await runAction(
      async () => {
        const updated = await updateCompanyProfile(accessToken, {
          name: companyForm.name,
          industry: companyForm.industry,
          logoUrl: companyForm.logoUrl,
          primaryColor: companyForm.primaryColor,
          secondaryColor: companyForm.secondaryColor,
          currency: companyForm.currency.trim().toUpperCase(),
          defaultLocale: companyForm.defaultLocale
        });
        setCompanyProfile(updated);
        setCompanyForm({
          name: updated.name,
          industry: updated.industry,
          logoUrl: updated.logoUrl ?? "",
          primaryColor: updated.primaryColor,
          secondaryColor: updated.secondaryColor,
          currency: updated.currency,
          defaultLocale: updated.defaultLocale
        });
      },
      t("companyProfileUpdated")
    );
  }

  async function submitWarehouse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;

    await runAction(
      async () => {
        if (warehouseForm.warehouseId) {
          await updateWarehouse(accessToken, warehouseForm.warehouseId, {
            name: warehouseForm.name,
            location: warehouseForm.location || undefined
          });
          return;
        }

        const warehouse = await createWarehouse(accessToken, {
          name: warehouseForm.name,
          location: warehouseForm.location || undefined
        });
        setWarehouseForm({
          warehouseId: warehouse.id,
          name: warehouse.name,
          location: warehouse.location ?? ""
        });
      },
      t("warehouseSaved")
    );
  }

  async function submitVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;

    await runAction(
      async () => {
        if (vehicleForm.vehicleId) {
          await updateVehicle(accessToken, vehicleForm.vehicleId, {
            plateNumber: vehicleForm.plateNumber,
            driverId: vehicleForm.driverId || ""
          });
          return;
        }

        const vehicle = await createVehicle(accessToken, {
          plateNumber: vehicleForm.plateNumber,
          driverId: vehicleForm.driverId || undefined
        });
        setVehicleForm({
          vehicleId: vehicle.id,
          plateNumber: vehicle.plateNumber,
          driverId: vehicle.driverId ?? ""
        });
      },
      t("vehicleSaved")
    );
  }

  async function submitCancelInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !cancelInvoiceForm.invoiceId) return;
    if (!window.confirm(t("cancelInvoiceConfirm"))) return;

    await runAction(
      async () => {
        await cancelInvoice(accessToken, cancelInvoiceForm.invoiceId, {
          note: cancelInvoiceForm.note || undefined
        });
        setCancelInvoiceForm({ invoiceId: "", note: "" });
      },
      t("invoiceCancelled")
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

  async function removeProduct(target: ApiProduct) {
    if (!accessToken) return;
    if (!window.confirm(t("deleteProductConfirm"))) return;

    await runAction(
      async () => {
        await deleteProduct(accessToken, target.id);
        if (productForm.productId === target.id) {
          startCreateProduct();
        }
      },
      t("productDeleted")
    );
  }

  function editCustomer(target: ApiCustomer) {
    setCustomerFormMode("edit");
    setCustomerForm({
      customerId: target.id,
      name: target.name,
      phone: target.phone ?? "",
      route: target.route ?? "",
      location: target.location ?? "",
      creditLimit: asNumber(target.creditLimit)
    });
    setActionNotice(null);
    setActionError(null);
    setActiveAction("customer");
  }

  async function toggleCustomerStatus(target: ApiCustomer) {
    if (!accessToken) return;

    await runAction(
      async () => {
        await updateCustomer(accessToken, target.id, {
          isActive: !target.isActive
        });
      },
      target.isActive ? t("customerDeactivated") : t("customerReactivated")
    );
  }

  async function removeCustomer(target: ApiCustomer) {
    if (!accessToken) return;
    if (!window.confirm(t("deleteCustomerConfirm"))) return;

    await runAction(
      async () => {
        await deleteCustomer(accessToken, target.id);
      },
      t("customerDeleted")
    );
  }

  async function removePayment(target: Payment) {
    if (!accessToken || !isAccountAdmin) return;
    if (!window.confirm(t("deletePaymentConfirm"))) return;

    await runAction(
      async () => {
        await deletePayment(accessToken, target.id);
      },
      t("paymentDeleted")
    );
  }

  async function toggleWarehouseStatus(target: ApiWarehouse) {
    if (!accessToken) return;

    await runAction(
      async () => {
        await updateWarehouse(accessToken, target.id, { isActive: !target.isActive });
      },
      target.isActive ? t("warehouseDeactivated") : t("warehouseReactivated")
    );
  }

  async function removeWarehouse(target: ApiWarehouse) {
    if (!accessToken) return;
    if (!window.confirm(t("deleteWarehouseConfirm"))) return;

    await runAction(
      async () => {
        await deleteWarehouse(accessToken, target.id);
        setWarehouseForm({ warehouseId: "", name: "", location: "" });
      },
      t("warehouseDeleted")
    );
  }

  async function toggleVehicleStatus(target: ApiVehicle) {
    if (!accessToken) return;

    await runAction(
      async () => {
        await updateVehicle(accessToken, target.id, { isActive: !target.isActive });
      },
      target.isActive ? t("vehicleDeactivated") : t("vehicleReactivated")
    );
  }

  async function removeVehicle(target: ApiVehicle) {
    if (!accessToken) return;
    if (!window.confirm(t("deleteVehicleConfirm"))) return;

    await runAction(
      async () => {
        await deleteVehicle(accessToken, target.id);
        setVehicleForm({ vehicleId: "", plateNumber: "", driverId: "" });
      },
      t("vehicleDeleted")
    );
  }

  return (
    <main className="app-shell" data-theme={colorMode} style={tenantTheme}>
      <DashboardSidebar
        activeSection={activeSection}
        appName={t("appName")}
        brandMark={brandInitials}
        business={companyProfile.name}
        logoUrl={companyProfile.logoUrl}
        navItems={navItems}
        systemScope={t("systemScope")}
        onSectionChange={setActiveSection}
      />

      <section className="main">
        <DashboardTopbar
          colorMode={colorMode}
          colorModeLabel={t("colorMode")}
          darkModeLabel={t("darkMode")}
          languageLabel={t("language")}
          lightModeLabel={t("lightMode")}
          locale={locale}
          locales={locales}
          searchPlaceholder={t("searchPlaceholder")}
          onColorModeToggle={toggleColorMode}
          onLocaleChange={setLocale}
        />

        <div className="content">
          <AuthBand
            apiStatus={apiStatus}
            authError={authError}
            email={email}
            isLiveDataLoading={isLiveDataLoading}
            isLoggingIn={isLoggingIn}
            labels={{
              apiConnected: t("apiConnected"),
              demoMode: t("demoMode"),
              email: t("email"),
              fallbackDataNote: t("fallbackDataNote"),
              liveDataNote: t("liveDataNote"),
              loadingData: t("loadingData"),
              login: t("login"),
              logout: t("logout"),
              password: t("password"),
              seedCredentials: t("seedCredentials"),
              signInLiveApi: t("signInLiveApi"),
              signedInAs: t("signedInAs")
            }}
            password={password}
            user={user}
            onEmailChange={setEmail}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onPasswordChange={setPassword}
          />

          <StatusBanners actionError={actionError} actionNotice={actionNotice} />

          {isAuthenticated ? (
            <SyncBanner
              disabled={!isOnline || offlineDrafts.length === 0 || isSyncingDrafts}
              isOnline={isOnline}
              isSyncingDrafts={isSyncingDrafts}
              labels={{
                noPendingDrafts: t("noPendingDrafts"),
                offline: t("offline"),
                online: t("online"),
                pendingDrafts: t("pendingDrafts"),
                syncNow: t("syncNow"),
                syncing: t("syncing")
              }}
              offlineDraftCount={offlineDrafts.length}
              onSync={() => void syncOfflineDrafts()}
            />
          ) : null}

          {!isAuthenticated ? (
            <LoginRequiredPanel
              login={t("login")}
              loginRequired={t("loginRequired")}
              signInLiveApi={t("signInLiveApi")}
            />
          ) : (
            <>
              <PageHeading
                activeSection={activeSection}
                dateLabel={t("today")}
                formattedDate={formatToday(locale)}
                ownerTitle={t("ownerCommand")}
                overview={t("overview")}
                sectionLabel={activeNavItem?.label}
                systemScope={t("systemScope")}
              />

              {activeSection === "dashboard" || activeSection === "reports" ? (
                <KpiGrid kpis={kpis} />
              ) : null}

              {activeSection === "dashboard" || activeSection === "inventory" ? (
                <DashboardOverview
                  canUseLiveActions={canUseLiveActions}
                  criticalCreditCount={criticalCreditCustomers.length}
                  highEmptiesCount={highEmptiesCustomers.length}
                  isLiveDataLoading={isLiveDataLoading}
                  labels={{
                    alertCredit: t("alertCredit"),
                    alertEmpties: t("alertEmpties"),
                    alertLowStock: t("alertLowStock"),
                    alerts: t("alerts"),
                    bottlesAtRisk: t("bottlesAtRisk"),
                    collectionPriority: t("collectionPriority"),
                    empties: t("empties"),
                    emptiesControl: t("emptiesControl"),
                    emptiesControlNote: t("emptiesControlNote"),
                    emptiesRecoveredAction: t("emptiesRecoveredAction"),
                    healthy: t("healthy"),
                    inventory: t("inventory"),
                    liveEntry: t("liveEntry"),
                    loadingData: t("loadingData"),
                    loginRequired: t("loginRequired"),
                    lowStock: t("lowStock"),
                    margin: t("margin"),
                    noRecords: t("noRecords"),
                    package: t("package"),
                    product: t("product"),
                    quickActions: t("quickActions"),
                    receiveStock: t("receiveStock"),
                    reorder: t("reorder"),
                    reorderNow: t("reorderNow"),
                    status: t("status"),
                    stock: t("stock"),
                    watch: t("watch")
                  }}
                  highEmptiesCustomers={highEmptiesCustomers}
                  lowStockCount={metrics.lowStock}
                  products={displayedProducts}
                  quickActions={quickActions}
                  totalEmptiesOutstanding={metrics.emptyLiability}
                  onOpenAction={openActionModal}
                />
              ) : null}

              {activeSection === "inventory" && isAccountAdmin ? (
                <article className="panel">
	                  <div className="panel-header">
	                    <div>
	                      <h3>{t("productManagement")}</h3>
	                      <span>{t("productSetupNote")}</span>
	                    </div>
	                    <div className="panel-actions">
	                      <button className="ghost-button" disabled={!canUseLiveActions} onClick={startCreateProduct} type="button">
	                        {t("createProduct")}
	                      </button>
	                      <button
	                        className="ghost-button"
	                        disabled={!canUseLiveActions}
	                        onClick={() => openActionModal("stock")}
	                        type="button"
	                      >
	                        {t("receiveStock")}
	                      </button>
	                      <Boxes size={18} color="var(--brand)" aria-hidden="true" />
	                    </div>
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
	                            onFocus={selectNumberInput}
	                            inputMode="decimal"
	                            required
	                            type="text"
                            value={productForm.unitCost}
                            onChange={(event) =>
                              setProductForm((current) => ({ ...current, unitCost: parseNumericInput(event.target.value) }))
                            }
                          />
                        </label>
                        <label>
                          <span>{t("unitPrice")}</span>
                          <input
	                            min={0}
	                            onFocus={selectNumberInput}
	                            inputMode="decimal"
	                            required
	                            type="text"
                            value={productForm.unitPrice}
                            onChange={(event) =>
                              setProductForm((current) => ({ ...current, unitPrice: parseNumericInput(event.target.value) }))
                            }
                          />
                        </label>
                      </div>
                      <div className="form-grid">
                        <label>
                          <span>{t("reorder")}</span>
                          <input
	                            min={0}
	                            onFocus={selectNumberInput}
	                            inputMode="numeric"
	                            required
	                            type="text"
                            value={productForm.reorderLevel}
                            onChange={(event) =>
                              setProductForm((current) => ({ ...current, reorderLevel: parseNumericInput(event.target.value) }))
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
                        {productFormMode === "edit" && apiProducts.find((product) => product.id === productForm.productId) ? (
                          <button
                            className="danger-icon-button"
                            disabled={isActionSubmitting}
                            onClick={() => {
                              const selected = apiProducts.find((product) => product.id === productForm.productId);
                              if (selected) void removeProduct(selected);
                            }}
                            title={t("deleteProduct")}
                            type="button"
                          >
                            <Trash2 size={16} aria-hidden="true" />
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
                            <th>{t("action")}</th>
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
                              <td>
                                <button
                                  className="danger-icon-button"
                                  disabled={isActionSubmitting}
                                  onClick={() => void removeProduct(product)}
                                  title={t("deleteProduct")}
                                  type="button"
                                >
                                  <Trash2 size={16} aria-hidden="true" />
                                </button>
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

              {activeSection === "empties" ? (
                <section className="report-grid">
                  <article className="empties-spotlight compact-spotlight">
                    <div className="empties-copy">
                      <span className="feature-kicker">{t("emptyReturns")}</span>
                      <h3>{metrics.emptyLiability.toLocaleString()}</h3>
                      <p>{t("emptyReturnsScreenNote")}</p>
                      <div className="empties-actions">
                        {canRecordEmptyReturns ? (
                          <button
                            className="primary-button"
                            disabled={!canUseLiveActions}
                            onClick={() => openActionModal("empties")}
                            type="button"
                          >
                            <RotateCcw size={17} aria-hidden="true" />
                            {t("recordEmptyReturn")}
                          </button>
                        ) : null}
                        <button
                          className="ghost-button"
                          disabled={displayedCustomers.length === 0}
                          onClick={() =>
                            downloadCsv(
                              "empty-balances.csv",
                              displayedCustomers.map((customer) => ({
                                customer: customer.name,
                                deliveryArea: customer.route,
                                phone: customer.phone,
                                emptyBalance: customer.emptiesBalance
                              }))
                            )
                          }
                          type="button"
                        >
                          {t("exportCsv")}
                        </button>
                      </div>
                    </div>
                    <div className="empties-priority">
                      <div className="priority-header">
                        <strong>{t("collectionPriority")}</strong>
                        <span>{t("emptyBalance")}</span>
                      </div>
                      <div className="priority-list">
                        {highEmptiesCustomers.slice(0, 6).map((customer) => (
                          <div className="priority-row" key={customer.id}>
                            <span>
                              <strong>{customer.name}</strong>
                              <small>{customer.route}</small>
                            </span>
                            <b>{customer.emptiesBalance.toLocaleString()}</b>
                          </div>
                        ))}
                        {highEmptiesCustomers.length === 0 ? (
                          <div className="priority-empty">{isLiveDataLoading ? t("loadingData") : t("noRecords")}</div>
                        ) : null}
                      </div>
                    </div>
                  </article>

                  <article className="panel">
                    <div className="panel-header">
                      <div>
                        <h3>{t("customerEmptyBalances")}</h3>
                        <span>{t("customerEmptyBalancesNote")}</span>
                      </div>
                      <RotateCcw size={18} color="var(--brand)" aria-hidden="true" />
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>{t("customer")}</th>
                            <th>{t("deliveryArea")}</th>
                            <th>{t("phone")}</th>
                            <th>{t("emptyBalance")}</th>
                            <th>{t("status")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedCustomers.map((customer) => (
                            <tr key={customer.id}>
                              <td>
                                <strong>{customer.name}</strong>
                                <small>{customer.lastOrder ? new Date(customer.lastOrder).toLocaleDateString("en-RW") : "-"}</small>
                              </td>
                              <td>{customer.route}</td>
                              <td>{customer.phone}</td>
                              <td>{customer.emptiesBalance.toLocaleString()}</td>
                              <td>
                                <span className={`badge ${customer.emptiesBalance > 250 ? "danger" : customer.emptiesBalance > 0 ? "warn" : "good"}`}>
                                  {customer.emptiesBalance > 250 ? t("collectNow") : customer.emptiesBalance > 0 ? t("watch") : t("healthy")}
                                </span>
                              </td>
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

                  <article className="panel">
                    <div className="panel-header">
                      <div>
                        <h3>{t("emptyMovementLedger")}</h3>
                        <span>{t("emptyMovementLedgerNote")}</span>
                      </div>
                      <ShieldCheck size={18} color="var(--brand)" aria-hidden="true" />
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>{t("time")}</th>
                            <th>{t("customer")}</th>
                            <th>{t("movementType")}</th>
                            <th>{t("product")}</th>
                            <th>{t("quantity")}</th>
                            <th>{t("actor")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {apiEmptyMovements.map((movement) => (
                            <tr key={movement.id}>
                              <td>{new Date(movement.createdAt).toLocaleString("en-RW")}</td>
                              <td>
                                <strong>{movement.customer.name}</strong>
                                <small>{formatDeliveryArea(movement.customer.route)}</small>
                              </td>
                              <td>{titleCaseEnum(movement.movementType)}</td>
                              <td>{movement.product?.name ?? "-"}</td>
                              <td>{movement.quantity.toLocaleString()}</td>
                              <td>
                                <strong>{movement.createdBy.fullName}</strong>
                                <small>{movement.createdBy.role.name}</small>
                              </td>
                            </tr>
                          ))}
                          {apiEmptyMovements.length === 0 ? (
                            <tr>
                              <td className="table-state" colSpan={6}>
                                {isLiveDataLoading ? t("loadingData") : t("noRecords")}
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </article>
                </section>
              ) : null}

              {activeSection === "dashboard" || activeSection === "customers" || activeSection === "deliveries" ? (
              <section className="two-column">
                {activeSection === "dashboard" || activeSection === "customers" ? (
	                <article className="panel">
	                  <div className="panel-header">
	                    <h3>{t("customers")}</h3>
	                    <div className="panel-actions">
	                      {canCreateCustomers ? (
	                        <button
	                          className="ghost-button"
	                          disabled={!canUseLiveActions}
	                          onClick={() => openActionModal("customer")}
	                          type="button"
	                        >
	                          {t("createCustomer")}
	                        </button>
	                      ) : null}
	                      {canRecordCollections ? (
	                        <button
	                          className="ghost-button"
	                          disabled={!canUseLiveActions}
	                          onClick={() => openActionModal("collection")}
	                          type="button"
	                        >
	                          {t("recordCollectionActivity")}
	                        </button>
	                      ) : null}
	                      <Users size={18} color="var(--brand)" aria-hidden="true" />
	                    </div>
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
                      {canManageCustomers ? <th>{t("action")}</th> : null}
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
                        {canManageCustomers ? (
                          <td>
                            {apiCustomers.find((entry) => entry.id === customer.id) ? (
                              <>
                                <button
                                  className="ghost-button inline-button"
                                  disabled={isActionSubmitting}
                                  onClick={() => {
                                    const selected = apiCustomers.find((entry) => entry.id === customer.id);
                                    if (selected) editCustomer(selected);
                                  }}
                                  title={t("editCustomer")}
                                  type="button"
                                >
                                  <Pencil size={14} aria-hidden="true" />
                                </button>
                                <button
                                  className="ghost-button inline-button"
                                  disabled={isActionSubmitting}
                                  onClick={() => {
                                    const selected = apiCustomers.find((entry) => entry.id === customer.id);
                                    if (selected) void toggleCustomerStatus(selected);
                                  }}
                                  type="button"
                                >
                                  {apiCustomers.find((entry) => entry.id === customer.id)?.isActive
                                    ? t("deactivate")
                                    : t("reactivate")}
                                </button>
                                <button
                                  aria-label={t("deleteCustomer")}
                                  className="ghost-button danger-button inline-button"
                                  disabled={isActionSubmitting}
                                  onClick={() => {
                                    const selected = apiCustomers.find((entry) => entry.id === customer.id);
                                    if (selected) void removeCustomer(selected);
                                  }}
                                  title={t("deleteCustomer")}
                                  type="button"
                                >
                                  <Trash2 size={14} aria-hidden="true" />
                                </button>
                              </>
                            ) : null}
                          </td>
                        ) : null}
                      </tr>
                    ))}
                    {displayedCustomers.length === 0 ? (
                      <tr>
                        <td className="table-state" colSpan={canManageCustomers ? 6 : 5}>
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
	                    <div className="panel-actions">
	                    {canCreateDeliveries ? (
	                        <button
	                          className="ghost-button"
	                          disabled={!canUseLiveActions}
	                          onClick={() => openActionModal("delivery")}
	                          type="button"
	                        >
	                          {t("createDeliveryTrip")}
	                        </button>
	                      ) : null}
	                      {canReconcileDeliveries ? (
	                        <button
	                          className="ghost-button"
	                          disabled={!canUseLiveActions}
	                          onClick={() => openActionModal("reconcile")}
	                          type="button"
	                        >
	                          {t("reconcileTruck")}
	                        </button>
	                      ) : null}
	                      {canRecordDeliveryProof ? (
	                        <button
	                          className="ghost-button"
	                          disabled={!canUseLiveActions}
	                          onClick={() => openActionModal("proof")}
	                          type="button"
	                        >
	                          {t("recordDeliveryProof")}
	                        </button>
	                      ) : null}
	                      <Route size={18} color="var(--brand)" aria-hidden="true" />
	                    </div>
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
	                  <div className="panel-actions">
	                    {canRecordPayments ? (
	                      <button
	                        className="ghost-button"
	                        disabled={!canUseLiveActions}
	                        onClick={() => openActionModal("payment")}
	                        type="button"
	                      >
	                        {t("recordPayment")}
	                      </button>
	                    ) : null}
	                    <ShieldCheck size={18} color="var(--brand)" aria-hidden="true" />
	                  </div>
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
                    <th>{t("reconciliationStatus")}</th>
                    {isAccountAdmin ? <th>{t("action")}</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {displayedPayments.map((payment) => {
                    const apiPayment = apiPayments.find((entry) => entry.id === payment.id);
                    const reconciliationStatus = apiPayment?.reconciliationStatus ?? "PENDING";
                    return (
                    <tr key={payment.id}>
                      <td>{payment.customer}</td>
                      <td>{payment.method}</td>
                      <td>{money(payment.amount)}</td>
                      <td>{payment.reference}</td>
                      <td>{payment.recordedAt}</td>
                      <td>
                        <span className={`badge ${reconciliationStatus === "MATCHED" ? "good" : reconciliationStatus === "FLAGGED" ? "danger" : "warn"}`}>
                          {reconciliationStatus === "MATCHED" ? t("matched") : reconciliationStatus === "FLAGGED" ? t("flagged") : t("pending")}
                        </span>
                      </td>
                      {isAccountAdmin ? (
                        <td>
                          <div className="inline-actions">
                            {canReconcilePayments ? (
                              <>
                                <button
                                  className="ghost-button inline-button"
                                  disabled={isActionSubmitting}
                                  onClick={() => void setPaymentReconciliation(payment.id, "MATCHED")}
                                  title={t("matchPayment")}
                                  type="button"
                                >
                                  {t("matched")}
                                </button>
                                <button
                                  className="ghost-button inline-button"
                                  disabled={isActionSubmitting}
                                  onClick={() => void setPaymentReconciliation(payment.id, "FLAGGED")}
                                  title={t("flagPayment")}
                                  type="button"
                                >
                                  {t("flagged")}
                                </button>
                              </>
                            ) : null}
                            <button
                              aria-label={t("deletePayment")}
                              className="ghost-button danger-button inline-button"
                              disabled={isActionSubmitting}
                              onClick={() => void removePayment(payment)}
                              title={t("deletePayment")}
                              type="button"
                            >
                              <Trash2 size={14} aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  )})}
                  {displayedPayments.length === 0 ? (
                    <tr>
                      <td className="table-state" colSpan={isAccountAdmin ? 7 : 6}>
                        {isLiveDataLoading ? t("loadingData") : t("noRecords")}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
                  </table>
                </div>
              </article>
              ) : null}

              {activeSection === "payments" && isAccountAdmin ? (
                <article className="panel">
                  <div className="panel-header">
                    <div>
                      <h3>{t("invoiceCorrections")}</h3>
                      <span>{t("invoiceCorrectionNote")}</span>
                    </div>
                    <ReceiptText size={18} color="var(--brand)" aria-hidden="true" />
                  </div>
                  <div className="panel-body">
                    <form className="entry-form tight-form" onSubmit={submitCancelInvoice}>
                      <div className="form-grid">
                        <label>
                          <span>{t("invoice")}</span>
                          <select
                            required
                            value={cancelInvoiceForm.invoiceId}
                            onChange={(event) =>
                              setCancelInvoiceForm((current) => ({ ...current, invoiceId: event.target.value }))
                            }
                          >
                            {apiInvoices
                              .filter((invoice) => invoice.status !== "CANCELLED" && invoice.payments.length === 0)
                              .map((invoice) => (
                                <option key={invoice.id} value={invoice.id}>
                                  {invoice.invoiceNumber} - {invoice.customer.name} - {money(asNumber(invoice.totalAmount))}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label>
                          <span>{t("note")}</span>
                          <input
                            value={cancelInvoiceForm.note}
                            onChange={(event) =>
                              setCancelInvoiceForm((current) => ({ ...current, note: event.target.value }))
                            }
                          />
                        </label>
                      </div>
                      <div className="modal-actions">
                        <button className="ghost-button danger-button" disabled={isActionSubmitting} type="submit">
                          {isActionSubmitting ? t("saving") : t("cancelInvoice")}
                        </button>
                      </div>
                    </form>
                  </div>
                </article>
              ) : null}

	              {activeSection === "settings" ? (
	              <section className="two-column">
	                {isAccountAdmin ? (
	                  <article className="panel">
	                    <div className="panel-header">
	                      <div>
	                        <h3>{t("companyProfile")}</h3>
	                        <span>{t("companyProfileNote")}</span>
	                      </div>
	                      <Settings size={18} color="var(--brand)" aria-hidden="true" />
	                    </div>
	                    <div className="panel-body">
	                      <form className="entry-form tight-form" onSubmit={submitCompanyProfile}>
	                        <div className="form-grid">
	                          <label>
	                            <span>{t("companyName")}</span>
	                            <input
	                              required
	                              value={companyForm.name}
	                              onChange={(event) => setCompanyForm((current) => ({ ...current, name: event.target.value }))}
	                            />
	                          </label>
	                          <label>
	                            <span>{t("industry")}</span>
	                            <input
	                              required
	                              value={companyForm.industry}
	                              onChange={(event) => setCompanyForm((current) => ({ ...current, industry: event.target.value }))}
	                            />
	                          </label>
	                          <label>
	                            <span>{t("currency")}</span>
	                            <input
	                              maxLength={3}
	                              required
	                              value={companyForm.currency}
	                              onChange={(event) =>
	                                setCompanyForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))
	                              }
	                            />
	                          </label>
	                        </div>
	                        <div className="form-grid">
	                          <label>
	                            <span>{t("primaryColor")}</span>
	                            <input
	                              type="color"
	                              value={companyForm.primaryColor}
	                              onChange={(event) =>
	                                setCompanyForm((current) => ({ ...current, primaryColor: event.target.value }))
	                              }
	                            />
	                          </label>
	                          <label>
	                            <span>{t("secondaryColor")}</span>
	                            <input
	                              type="color"
	                              value={companyForm.secondaryColor}
	                              onChange={(event) =>
	                                setCompanyForm((current) => ({ ...current, secondaryColor: event.target.value }))
	                              }
	                            />
	                          </label>
	                          <label>
	                            <span>{t("locale")}</span>
	                            <select
	                              value={companyForm.defaultLocale}
	                              onChange={(event) =>
	                                setCompanyForm((current) => ({ ...current, defaultLocale: event.target.value as Locale }))
	                              }
	                            >
	                              {locales.map((entry) => (
	                                <option key={entry.code} value={entry.code}>
	                                  {entry.label}
	                                </option>
	                              ))}
	                            </select>
	                          </label>
	                        </div>
	                        <label>
	                          <span>{t("logoUrl")}</span>
	                          <input
	                            placeholder="https://example.com/logo.png"
	                            value={companyForm.logoUrl}
	                            onChange={(event) => setCompanyForm((current) => ({ ...current, logoUrl: event.target.value }))}
	                          />
	                        </label>
	                        <div className="modal-actions">
	                          <button className="primary-button" disabled={isActionSubmitting} type="submit">
	                            {isActionSubmitting ? t("saving") : t("saveCompanyProfile")}
	                          </button>
	                        </div>
	                      </form>
	                    </div>
	                  </article>
	                ) : null}

	                {isAccountAdmin ? (
	                  <article className="panel">
	                    <div className="panel-header">
	                      <div>
	                        <h3>{t("warehouseManagement")}</h3>
	                        <span>{t("warehouseManagementNote")}</span>
	                      </div>
	                      <Boxes size={18} color="var(--brand)" aria-hidden="true" />
	                    </div>
	                    <div className="panel-body">
	                      <form className="entry-form tight-form" onSubmit={submitWarehouse}>
	                        <div className="form-grid">
	                          <label>
	                            <span>{t("selectedWarehouse")}</span>
	                            <select
	                              value={warehouseForm.warehouseId}
	                              onChange={(event) => {
	                                const warehouse = apiWarehouses.find((entry) => entry.id === event.target.value);
	                                setWarehouseForm({
	                                  warehouseId: warehouse?.id ?? "",
	                                  name: warehouse?.name ?? "",
	                                  location: warehouse?.location ?? ""
	                                });
	                              }}
	                            >
	                              <option value="">{t("createWarehouse")}</option>
	                              {apiWarehouses.map((warehouse) => (
	                                <option key={warehouse.id} value={warehouse.id}>
	                                  {warehouse.name}
	                                </option>
	                              ))}
	                            </select>
	                          </label>
	                          <label>
	                            <span>{t("warehouse")}</span>
	                            <input
	                              required
	                              value={warehouseForm.name}
	                              onChange={(event) => setWarehouseForm((current) => ({ ...current, name: event.target.value }))}
	                            />
	                          </label>
	                          <label>
	                            <span>{t("location")}</span>
	                            <input
	                              value={warehouseForm.location}
	                              onChange={(event) => setWarehouseForm((current) => ({ ...current, location: event.target.value }))}
	                            />
	                          </label>
	                        </div>
	                        <div className="modal-actions">
	                          <button className="primary-button" disabled={isActionSubmitting} type="submit">
	                            {isActionSubmitting ? t("saving") : t("saveWarehouse")}
	                          </button>
	                          <button
	                            className="ghost-button"
	                            disabled={isActionSubmitting || !warehouseForm.warehouseId}
	                            onClick={() => setWarehouseForm({ warehouseId: "", name: "", location: "" })}
	                            type="button"
	                          >
	                            {t("createWarehouse")}
	                          </button>
	                        </div>
	                      </form>

	                      <div className="table-wrap">
	                        <table>
	                          <thead>
	                            <tr>
	                              <th>{t("warehouse")}</th>
	                              <th>{t("location")}</th>
	                              <th>{t("status")}</th>
	                              <th>{t("action")}</th>
	                            </tr>
	                          </thead>
	                          <tbody>
	                            {apiWarehouses.map((warehouse) => (
	                              <tr key={warehouse.id}>
	                                <td>{warehouse.name}</td>
	                                <td>{warehouse.location ?? "-"}</td>
	                                <td>
	                                  <span className={`badge ${warehouse.isActive ? "good" : "danger"}`}>
	                                    {warehouse.isActive ? t("active") : t("inactive")}
	                                  </span>
	                                </td>
	                                <td>
	                                  <button
	                                    className="ghost-button inline-button"
	                                    disabled={isActionSubmitting}
	                                    onClick={() => void toggleWarehouseStatus(warehouse)}
	                                    type="button"
	                                  >
	                                    {warehouse.isActive ? t("deactivate") : t("reactivate")}
	                                  </button>
	                                  <button
	                                    aria-label={t("deleteWarehouse")}
	                                    className="ghost-button danger-button inline-button"
	                                    disabled={isActionSubmitting}
	                                    onClick={() => void removeWarehouse(warehouse)}
	                                    title={t("deleteWarehouse")}
	                                    type="button"
	                                  >
	                                    <Trash2 size={14} aria-hidden="true" />
	                                  </button>
	                                </td>
	                              </tr>
	                            ))}
	                          </tbody>
	                        </table>
	                      </div>
	                    </div>
	                  </article>
	                ) : null}

	                {isAccountAdmin ? (
	                  <article className="panel">
	                    <div className="panel-header">
	                      <div>
	                        <h3>{t("vehicleManagement")}</h3>
	                        <span>{t("vehicleManagementNote")}</span>
	                      </div>
	                      <Truck size={18} color="var(--brand)" aria-hidden="true" />
	                    </div>
	                    <div className="panel-body">
	                      <form className="entry-form tight-form" onSubmit={submitVehicle}>
	                        <div className="form-grid">
	                          <label>
	                            <span>{t("selectedVehicle")}</span>
	                            <select
	                              value={vehicleForm.vehicleId}
	                              onChange={(event) => {
	                                const vehicle = apiVehicles.find((entry) => entry.id === event.target.value);
	                                setVehicleForm({
	                                  vehicleId: vehicle?.id ?? "",
	                                  plateNumber: vehicle?.plateNumber ?? "",
	                                  driverId: vehicle?.driverId ?? ""
	                                });
	                              }}
	                            >
	                              <option value="">{t("createVehicle")}</option>
	                              {apiVehicles.map((vehicle) => (
	                                <option key={vehicle.id} value={vehicle.id}>
	                                  {vehicle.plateNumber}
	                                </option>
	                              ))}
	                            </select>
	                          </label>
	                          <label>
	                            <span>{t("truck")}</span>
	                            <input
	                              required
	                              value={vehicleForm.plateNumber}
	                              onChange={(event) => setVehicleForm((current) => ({ ...current, plateNumber: event.target.value }))}
	                            />
	                          </label>
	                          <label>
	                            <span>{t("driver")}</span>
	                            <select
	                              value={vehicleForm.driverId}
	                              onChange={(event) => setVehicleForm((current) => ({ ...current, driverId: event.target.value }))}
	                            >
	                              <option value="">{t("unassigned")}</option>
	                              {driverUsers.map((driver) => (
	                                <option key={driver.id} value={driver.id}>
	                                  {driver.fullName}
	                                </option>
	                              ))}
	                            </select>
	                          </label>
	                        </div>
	                        <div className="modal-actions">
	                          <button className="primary-button" disabled={isActionSubmitting} type="submit">
	                            {isActionSubmitting ? t("saving") : t("saveVehicle")}
	                          </button>
	                          <button
	                            className="ghost-button"
	                            disabled={isActionSubmitting || !vehicleForm.vehicleId}
	                            onClick={() => setVehicleForm({ vehicleId: "", plateNumber: "", driverId: "" })}
	                            type="button"
	                          >
	                            {t("createVehicle")}
	                          </button>
	                        </div>
	                      </form>

	                      <div className="table-wrap">
	                        <table>
	                          <thead>
	                            <tr>
	                              <th>{t("truck")}</th>
	                              <th>{t("driver")}</th>
	                              <th>{t("status")}</th>
	                              <th>{t("action")}</th>
	                            </tr>
	                          </thead>
	                          <tbody>
	                            {apiVehicles.map((vehicle) => (
	                              <tr key={vehicle.id}>
	                                <td>{vehicle.plateNumber}</td>
	                                <td>{vehicle.driver?.fullName ?? "-"}</td>
	                                <td>
	                                  <span className={`badge ${vehicle.isActive ? "good" : "danger"}`}>
	                                    {vehicle.isActive ? t("active") : t("inactive")}
	                                  </span>
	                                </td>
	                                <td>
	                                  <button
	                                    className="ghost-button inline-button"
	                                    disabled={isActionSubmitting}
	                                    onClick={() => void toggleVehicleStatus(vehicle)}
	                                    type="button"
	                                  >
	                                    {vehicle.isActive ? t("deactivate") : t("reactivate")}
	                                  </button>
	                                  <button
	                                    aria-label={t("deleteVehicle")}
	                                    className="ghost-button danger-button inline-button"
	                                    disabled={isActionSubmitting}
	                                    onClick={() => void removeVehicle(vehicle)}
	                                    title={t("deleteVehicle")}
	                                    type="button"
	                                  >
	                                    <Trash2 size={14} aria-hidden="true" />
	                                  </button>
	                                </td>
	                              </tr>
	                            ))}
	                          </tbody>
	                        </table>
	                      </div>
	                    </div>
	                  </article>
	                ) : null}

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
                              <td>{formatDeliveryArea(row.route)}</td>
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

                  <article className="panel">
                    <div className="panel-header">
                      <div>
                        <h3>{t("driverAccountability")}</h3>
                        <span>{money(driverAccountabilityReport?.totals.cashVariance ?? 0)}</span>
                      </div>
                      <button
                        className="ghost-button"
                        disabled={!driverAccountabilityReport?.rows.length}
                        onClick={() => downloadCsv("driver-accountability.csv", driverAccountabilityReport?.rows ?? [])}
                        type="button"
                      >
                        {t("exportCsv")}
                      </button>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>{t("driver")}</th>
                            <th>{t("expectedCash")}</th>
                            <th>{t("cashCollected")}</th>
                            <th>{t("cashVariance")}</th>
                            <th>{t("proofCount")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {driverAccountabilityReport?.rows.slice(0, 8).map((row) => (
                            <tr key={row.tripId}>
                              <td>
                                <strong>{row.driver}</strong>
                                <small>{formatDeliveryArea(row.deliveryArea)} - {row.vehicle}</small>
                              </td>
                              <td>{money(row.expectedCash)}</td>
                              <td>{money(row.cashCollected)}</td>
                              <td>
                                <span className={`badge ${row.cashVariance === 0 ? "good" : row.cashVariance < 0 ? "danger" : "warn"}`}>
                                  {money(row.cashVariance)}
                                </span>
                              </td>
                              <td>{row.proofCount}</td>
                            </tr>
                          ))}
                          {!driverAccountabilityReport?.rows.length ? (
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

                  <article className="panel">
                    <div className="panel-header">
                      <div>
                        <h3>{t("ebmReadiness")}</h3>
                        <span>{apiInvoices.filter((invoice) => invoice.ebmStatus === "NOT_SUBMITTED").length} {t("pending")}</span>
                      </div>
                      <ReceiptText size={18} color="var(--brand)" aria-hidden="true" />
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>{t("invoice")}</th>
                            <th>{t("amount")}</th>
                            <th>{t("ebmStatus")}</th>
                            {isAccountAdmin ? <th>{t("action")}</th> : null}
                          </tr>
                        </thead>
                        <tbody>
                          {apiInvoices.slice(0, 8).map((invoice) => (
                            <tr key={invoice.id}>
                              <td>
                                <strong>{invoice.invoiceNumber}</strong>
                                <small>{invoice.customer.name}</small>
                              </td>
                              <td>{money(asNumber(invoice.totalAmount))}</td>
                              <td>{titleCaseEnum(invoice.ebmStatus)}</td>
                              {isAccountAdmin ? (
                                <td>
                                  <button
                                    className="ghost-button inline-button"
                                    disabled={isActionSubmitting || invoice.ebmStatus !== "NOT_SUBMITTED"}
                                    onClick={() => void markInvoiceEbmSubmitted(invoice.id)}
                                    type="button"
                                  >
                                    {t("markEbmSubmitted")}
                                  </button>
                                </td>
                              ) : null}
                            </tr>
                          ))}
                          {apiInvoices.length === 0 ? (
                            <tr>
                              <td className="table-state" colSpan={isAccountAdmin ? 4 : 3}>
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
                        <h3>{t("debtCollection")}</h3>
                        <span>{apiDebtCollections.filter((activity) => activity.status === "OPEN").length} {t("pending")}</span>
                      </div>
                      <button className="ghost-button" disabled={!canUseLiveActions} onClick={() => openActionModal("collection")} type="button">
                        {t("recordCollectionActivity")}
                      </button>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>{t("customer")}</th>
                            <th>{t("actionType")}</th>
                            <th>{t("nextFollowUp")}</th>
                            <th>{t("status")}</th>
                            <th>{t("action")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {apiDebtCollections.slice(0, 8).map((activity) => (
                            <tr key={activity.id}>
                              <td>
                                <strong>{activity.customer.name}</strong>
                                <small>{activity.invoice?.invoiceNumber ?? "-"}</small>
                              </td>
                              <td>{titleCaseEnum(activity.actionType)}</td>
                              <td>{activity.nextFollowUpAt ? new Date(activity.nextFollowUpAt).toLocaleDateString("en-RW") : "-"}</td>
                              <td>{titleCaseEnum(activity.status)}</td>
                              <td>
                                <button
                                  className="ghost-button inline-button"
                                  disabled={isActionSubmitting || activity.status === "COMPLETED"}
                                  onClick={() => void completeCollectionActivity(activity.id)}
                                  type="button"
                                >
                                  {t("complete")}
                                </button>
                              </td>
                            </tr>
                          ))}
                          {apiDebtCollections.length === 0 ? (
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
                        : activeAction === "customer"
                          ? customerFormMode === "edit"
                            ? t("editCustomer")
                            : t("createCustomer")
                          : activeAction === "empties"
                            ? t("recordEmptyReturn")
                            : activeAction === "proof"
                              ? t("recordDeliveryProof")
                              : activeAction === "collection"
                                ? t("recordCollectionActivity")
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
	                    onFocus={selectNumberInput}
	                    inputMode="numeric"
	                    type="text"
                    value={stockForm.quantity}
                    onChange={(event) =>
                      setStockForm((current) => ({ ...current, quantity: parseNumericInput(event.target.value) }))
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
                    {t("close")}
                  </button>
                  <button className="primary-button" disabled={isActionSubmitting} type="submit">
                    {isActionSubmitting ? t("saving") : t("receiveStock")}
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
                    <strong>{t("items")}</strong>
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
                      {t("addItem")}
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
                        <span>{t("quantity")}</span>
                        <input
	                          min={1}
	                          onFocus={selectNumberInput}
	                          inputMode="numeric"
	                          type="text"
                          value={item.quantity}
                          onChange={(event) =>
                            setInvoiceForm((current) => ({
                              ...current,
                              items: current.items.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, quantity: parseNumericInput(event.target.value) } : entry
                              )
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>{t("discount")}</span>
                        <input
	                          min={0}
	                          onFocus={selectNumberInput}
	                          inputMode="decimal"
	                          type="text"
                          value={item.discountAmount}
                          onChange={(event) =>
                            setInvoiceForm((current) => ({
                              ...current,
                              items: current.items.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? { ...entry, discountAmount: parseNumericInput(event.target.value) }
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
                        {t("remove")}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="form-grid">
                  <label>
                    <span>{t("initialPaymentMethod")}</span>
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
                    <span>{t("initialPaymentAmount")}</span>
                    <input
	                      min={0}
	                      onFocus={selectNumberInput}
	                      inputMode="decimal"
	                      type="text"
                      value={invoiceForm.initialPaymentAmount}
                      onChange={(event) =>
                        setInvoiceForm((current) => ({
                          ...current,
                          initialPaymentAmount: parseNumericInput(event.target.value)
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
                    {t("close")}
                  </button>
                  <button className="primary-button" disabled={isActionSubmitting} type="submit">
                    {isActionSubmitting ? t("saving") : t("createInvoice")}
                  </button>
                </div>
	              </form>
	            ) : null}

	            {activeAction === "customer" ? (
	              <form className="entry-form" onSubmit={submitCustomer}>
	                <div className="form-grid">
	                  <label>
	                    <span>{t("customer")}</span>
	                    <input
	                      required
	                      value={customerForm.name}
	                      onChange={(event) => setCustomerForm((current) => ({ ...current, name: event.target.value }))}
	                    />
	                  </label>
	                  <label>
	                    <span>{t("phone")}</span>
	                    <input
	                      value={customerForm.phone}
	                      onChange={(event) => setCustomerForm((current) => ({ ...current, phone: event.target.value }))}
	                    />
	                  </label>
	                </div>
	                <div className="form-grid">
	                  <label>
	                    <span>{t("route")}</span>
	                    <input
	                      value={customerForm.route}
	                      onChange={(event) => setCustomerForm((current) => ({ ...current, route: event.target.value }))}
	                    />
	                  </label>
	                  <label>
	                    <span>{t("creditLimit")}</span>
	                    <input
	                      min={0}
	                      onFocus={selectNumberInput}
	                      inputMode="decimal"
	                      type="text"
	                      value={customerForm.creditLimit}
	                      onChange={(event) =>
	                        setCustomerForm((current) => ({ ...current, creditLimit: parseNumericInput(event.target.value) }))
	                      }
	                    />
	                  </label>
	                </div>
	                <label>
	                  <span>Location</span>
	                  <input
	                    value={customerForm.location}
	                    onChange={(event) => setCustomerForm((current) => ({ ...current, location: event.target.value }))}
	                  />
	                </label>
	                <div className="modal-actions">
	                  <button className="ghost-button" onClick={closeActionModal} type="button">
	                    {t("close")}
	                  </button>
	                  <button className="primary-button" disabled={isActionSubmitting} type="submit">
	                    {isActionSubmitting
	                      ? t("saving")
	                      : customerFormMode === "edit"
	                        ? t("updateCustomer")
	                        : t("createCustomer")}
	                  </button>
	                </div>
	              </form>
	            ) : null}

	            {activeAction === "empties" ? (
	              <form className="entry-form" onSubmit={submitEmptyReturn}>
	                <div className="form-grid">
	                  <label>
	                    <span>{t("customer")}</span>
	                    <select
	                      required
	                      value={emptyReturnForm.customerId}
	                      onChange={(event) => setEmptyReturnForm((current) => ({ ...current, customerId: event.target.value }))}
	                    >
	                      {apiCustomers.map((customer) => (
	                        <option key={customer.id} value={customer.id}>
	                          {customer.name}
	                        </option>
	                      ))}
	                    </select>
	                  </label>
	                  <label>
	                    <span>{t("movementType")}</span>
	                    <select
	                      value={emptyReturnForm.movementType}
	                      onChange={(event) =>
	                        setEmptyReturnForm((current) => ({
	                          ...current,
	                          movementType: event.target.value as typeof emptyReturnForm.movementType
	                        }))
	                      }
	                    >
	                      <option value="RETURNED_BY_CUSTOMER">{t("emptiesReturned")}</option>
	                      <option value="ISSUED_TO_CUSTOMER">{t("emptiesIssued")}</option>
	                      <option value="LOST">{t("emptiesLost")}</option>
	                      <option value="ADJUSTMENT">{t("emptiesAdjustment")}</option>
	                    </select>
	                  </label>
	                  <label>
	                    <span>{t("quantity")}</span>
	                    <input
	                      min={1}
	                      onFocus={selectNumberInput}
	                      inputMode="numeric"
	                      type="text"
	                      value={emptyReturnForm.quantity}
	                      onChange={(event) =>
	                        setEmptyReturnForm((current) => ({ ...current, quantity: parseNumericInput(event.target.value) }))
	                      }
	                    />
	                  </label>
	                </div>
	                <div className="form-grid">
	                  <label>
	                    <span>{t("product")}</span>
	                    <select
	                      value={emptyReturnForm.productId}
	                      onChange={(event) => setEmptyReturnForm((current) => ({ ...current, productId: event.target.value }))}
	                    >
	                      <option value="">{t("notSpecified")}</option>
	                      {apiProducts
	                        .filter((product) => product.tracksEmpties)
	                        .map((product) => (
	                          <option key={product.id} value={product.id}>
	                            {product.name}
	                          </option>
	                        ))}
	                    </select>
	                  </label>
	                  <label>
	                    <span>{t("reference")}</span>
	                    <input
	                      value={emptyReturnForm.referenceType}
	                      onChange={(event) => setEmptyReturnForm((current) => ({ ...current, referenceType: event.target.value }))}
	                    />
	                  </label>
	                </div>
	                <div className="modal-actions">
	                  <button className="ghost-button" onClick={closeActionModal} type="button">
	                    {t("close")}
	                  </button>
	                  <button className="primary-button" disabled={isActionSubmitting} type="submit">
	                    {isActionSubmitting ? t("saving") : t("saveEmptyMovement")}
	                  </button>
	                </div>
	              </form>
	            ) : null}

	            {activeAction === "proof" ? (
	              <form className="entry-form" onSubmit={submitDeliveryProof}>
	                <label>
	                  <span>{t("truck")}</span>
	                  <select
	                    required
	                    value={proofForm.tripId}
	                    onChange={(event) => setProofForm((current) => ({ ...current, tripId: event.target.value }))}
	                  >
	                    {apiTrips.map((trip) => (
	                      <option key={trip.id} value={trip.id}>
	                        {trip.vehicle.plateNumber} - {formatDeliveryArea(trip.route)}
	                      </option>
	                    ))}
	                  </select>
	                </label>
	                <div className="form-grid">
	                  <label>
	                    <span>{t("customer")}</span>
	                    <select
	                      value={proofForm.customerId}
	                      onChange={(event) => setProofForm((current) => ({ ...current, customerId: event.target.value }))}
	                    >
	                      <option value="">{t("notSpecified")}</option>
	                      {apiCustomers.map((customer) => (
	                        <option key={customer.id} value={customer.id}>
	                          {customer.name}
	                        </option>
	                      ))}
	                    </select>
	                  </label>
	                  <label>
	                    <span>{t("receiverName")}</span>
	                    <input
	                      required
	                      value={proofForm.receiverName}
	                      onChange={(event) => setProofForm((current) => ({ ...current, receiverName: event.target.value }))}
	                    />
	                  </label>
	                  <label>
	                    <span>{t("receiverPhone")}</span>
	                    <input
	                      value={proofForm.receiverPhone}
	                      onChange={(event) => setProofForm((current) => ({ ...current, receiverPhone: event.target.value }))}
	                    />
	                  </label>
	                </div>
	                <div className="form-grid">
	                  <label>
	                    <span>{t("latitude")}</span>
	                    <input
	                      inputMode="decimal"
	                      value={proofForm.latitude}
	                      onChange={(event) => setProofForm((current) => ({ ...current, latitude: event.target.value }))}
	                    />
	                  </label>
	                  <label>
	                    <span>{t("longitude")}</span>
	                    <input
	                      inputMode="decimal"
	                      value={proofForm.longitude}
	                      onChange={(event) => setProofForm((current) => ({ ...current, longitude: event.target.value }))}
	                    />
	                  </label>
	                  <label>
	                    <span>{t("photoUrl")}</span>
	                    <input
	                      value={proofForm.photoUrl}
	                      onChange={(event) => setProofForm((current) => ({ ...current, photoUrl: event.target.value }))}
	                    />
	                  </label>
	                </div>
	                <label>
	                  <span>{t("signature")}</span>
	                  <textarea
	                    rows={2}
	                    value={proofForm.signatureDataUrl}
	                    onChange={(event) => setProofForm((current) => ({ ...current, signatureDataUrl: event.target.value }))}
	                  />
	                </label>
	                <label>
	                  <span>{t("note")}</span>
	                  <textarea
	                    rows={3}
	                    value={proofForm.note}
	                    onChange={(event) => setProofForm((current) => ({ ...current, note: event.target.value }))}
	                  />
	                </label>
	                <div className="modal-actions">
	                  <button className="ghost-button" onClick={closeActionModal} type="button">
	                    {t("close")}
	                  </button>
	                  <button className="primary-button" disabled={isActionSubmitting} type="submit">
	                    {isActionSubmitting ? t("saving") : t("recordDeliveryProof")}
	                  </button>
	                </div>
	              </form>
	            ) : null}

	            {activeAction === "collection" ? (
	              <form className="entry-form" onSubmit={submitCollectionActivity}>
	                <div className="form-grid">
	                  <label>
	                    <span>{t("customer")}</span>
	                    <select
	                      required
	                      value={collectionForm.customerId}
	                      onChange={(event) => {
	                        const customerId = event.target.value;
	                        const invoice = apiInvoices.find((entry) => entry.customerId === customerId && entry.paymentStatus !== "PAID");
	                        setCollectionForm((current) => ({ ...current, customerId, invoiceId: invoice?.id ?? "" }));
	                      }}
	                    >
	                      {apiCustomers.map((customer) => (
	                        <option key={customer.id} value={customer.id}>
	                          {customer.name}
	                        </option>
	                      ))}
	                    </select>
	                  </label>
	                  <label>
	                    <span>{t("invoice")}</span>
	                    <select
	                      value={collectionForm.invoiceId}
	                      onChange={(event) => setCollectionForm((current) => ({ ...current, invoiceId: event.target.value }))}
	                    >
	                      <option value="">{t("notSpecified")}</option>
	                      {apiInvoices
	                        .filter((invoice) => invoice.customerId === collectionForm.customerId && invoice.paymentStatus !== "PAID")
	                        .map((invoice) => (
	                          <option key={invoice.id} value={invoice.id}>
	                            {invoice.invoiceNumber} - {money(asNumber(invoice.totalAmount))}
	                          </option>
	                        ))}
	                    </select>
	                  </label>
	                  <label>
	                    <span>{t("actionType")}</span>
	                    <select
	                      value={collectionForm.actionType}
	                      onChange={(event) =>
	                        setCollectionForm((current) => ({
	                          ...current,
	                          actionType: event.target.value as ApiDebtCollectionActivity["actionType"]
	                        }))
	                      }
	                    >
	                      <option value="CALL">Call</option>
	                      <option value="VISIT">Visit</option>
	                      <option value="SMS">SMS</option>
	                      <option value="WHATSAPP">WhatsApp</option>
	                      <option value="PROMISE_TO_PAY">Promise to pay</option>
	                      <option value="PAYMENT_REMINDER">Payment reminder</option>
	                      <option value="ACCOUNT_BLOCKED">Account blocked</option>
	                      <option value="NOTE">Note</option>
	                    </select>
	                  </label>
	                </div>
	                <div className="form-grid">
	                  <label>
	                    <span>{t("promisedAmount")}</span>
	                    <input
	                      min={0}
	                      onFocus={selectNumberInput}
	                      inputMode="decimal"
	                      type="text"
	                      value={collectionForm.promisedAmount}
	                      onChange={(event) =>
	                        setCollectionForm((current) => ({ ...current, promisedAmount: parseNumericInput(event.target.value) }))
	                      }
	                    />
	                  </label>
	                  <label>
	                    <span>{t("promisedDate")}</span>
	                    <input
	                      type="date"
	                      value={collectionForm.promisedDate}
	                      onChange={(event) => setCollectionForm((current) => ({ ...current, promisedDate: event.target.value }))}
	                    />
	                  </label>
	                  <label>
	                    <span>{t("nextFollowUp")}</span>
	                    <input
	                      type="date"
	                      value={collectionForm.nextFollowUpAt}
	                      onChange={(event) => setCollectionForm((current) => ({ ...current, nextFollowUpAt: event.target.value }))}
	                    />
	                  </label>
	                </div>
	                <label>
	                  <span>{t("note")}</span>
	                  <textarea
	                    rows={3}
	                    value={collectionForm.note}
	                    onChange={(event) => setCollectionForm((current) => ({ ...current, note: event.target.value }))}
	                  />
	                </label>
	                <div className="modal-actions">
	                  <button className="ghost-button" onClick={closeActionModal} type="button">
	                    {t("close")}
	                  </button>
	                  <button className="primary-button" disabled={isActionSubmitting} type="submit">
	                    {isActionSubmitting ? t("saving") : t("recordCollectionActivity")}
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
	                          onFocus={selectNumberInput}
	                          inputMode="decimal"
	                          type="text"
                      value={paymentForm.amount}
                      onChange={(event) =>
                        setPaymentForm((current) => ({ ...current, amount: parseNumericInput(event.target.value) }))
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
                    {t("close")}
                  </button>
                  <button className="primary-button" disabled={isActionSubmitting} type="submit">
                    {isActionSubmitting ? t("saving") : t("recordPayment")}
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
                      {activeVehicles.map((vehicle) => (
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
	                          onFocus={selectNumberInput}
	                          inputMode="numeric"
	                          type="text"
	                          value={item.loadedQuantity}
                          onChange={(event) =>
                            setDeliveryForm((current) => ({
                              ...current,
                              items: current.items.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? { ...entry, loadedQuantity: parseNumericInput(event.target.value) }
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
                        {trip.vehicle.plateNumber} - {formatDeliveryArea(trip.route)}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedTrip ? (
                  <div className="trip-summary">
                    <span>{selectedTrip.driver.fullName}</span>
                    <span>{formatDeliveryArea(selectedTrip.route)}</span>
                  </div>
                ) : null}

                <div className="form-grid">
                  <label>
                    <span>{t("cashCollected")}</span>
                    <input
	                      min={0}
	                      onFocus={selectNumberInput}
	                      inputMode="decimal"
	                      type="text"
                      value={reconcileForm.cashCollected}
                      onChange={(event) =>
                        setReconcileForm((current) => ({
                          ...current,
                          cashCollected: parseNumericInput(event.target.value)
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>{t("creditIssued")}</span>
                    <input
	                      min={0}
	                      onFocus={selectNumberInput}
	                      inputMode="decimal"
	                      type="text"
                      value={reconcileForm.creditIssued}
                      onChange={(event) =>
                        setReconcileForm((current) => ({
                          ...current,
                          creditIssued: parseNumericInput(event.target.value)
                        }))
                      }
                    />
                  </label>
                </div>

                <div className="form-section">
                  <div className="form-section-header">
                    <strong>{t("loadedItems")}</strong>
                  </div>
                  {reconcileForm.items.map((item, index) => (
                    <div className="reconcile-row" key={item.itemId}>
                      <div>
                        <strong>{item.productName}</strong>
                        <span>Loaded: {item.loadedQuantity}</span>
                      </div>
                      <label>
                        <span>{t("delivered")}</span>
                        <input
	                          min={0}
	                          onFocus={selectNumberInput}
	                          inputMode="numeric"
	                          type="text"
                          value={item.deliveredQuantity}
                          onChange={(event) =>
                            setReconcileForm((current) => ({
                              ...current,
                              items: current.items.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? { ...entry, deliveredQuantity: parseNumericInput(event.target.value) }
                                  : entry
                              )
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>{t("returned")}</span>
                        <input
	                          min={0}
	                          onFocus={selectNumberInput}
	                          inputMode="numeric"
	                          type="text"
                          value={item.returnedQuantity}
                          onChange={(event) =>
                            setReconcileForm((current) => ({
                              ...current,
                              items: current.items.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? { ...entry, returnedQuantity: parseNumericInput(event.target.value) }
                                  : entry
                              )
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>{t("damaged")}</span>
                        <input
	                          min={0}
	                          onFocus={selectNumberInput}
	                          inputMode="numeric"
	                          type="text"
                          value={item.damagedQuantity}
                          onChange={(event) =>
                            setReconcileForm((current) => ({
                              ...current,
                              items: current.items.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? { ...entry, damagedQuantity: parseNumericInput(event.target.value) }
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
                    {t("close")}
                  </button>
                  <button className="primary-button" disabled={isActionSubmitting} type="submit">
                    {isActionSubmitting ? t("saving") : t("reconcileTruck")}
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
