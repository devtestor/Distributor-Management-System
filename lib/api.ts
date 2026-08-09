export type ApiUser = {
  id: string;
  companyId?: string;
  companyName?: string;
  fullName: string;
  email: string | null;
  phone?: string | null;
  role: string;
  preferredLocale: string;
  isActive?: boolean;
  createdAt?: string;
};

export type ApiCompanyProfile = {
  id: string;
  name: string;
  code: string;
  industry: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  currency: string;
  defaultLocale: "en" | "fr" | "rw" | "sw";
  featureFlags: Record<string, unknown> | null;
  createdAt: string;
};

export type ApiRole = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
};

export type ApiAuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string | null;
    role: {
      name: string;
    };
  } | null;
};

export type LoginResponse = {
  accessToken: string;
  user: ApiUser;
};

export type ApiHealthResponse = {
  status: string;
  service: string;
  timestamp: string;
};

export type OwnerDashboardResponse = {
  generatedAt: string;
  totals: {
    stockValue: number;
    sales: number;
    payments: number;
    creditExposure: number;
    activeCustomers: number;
    emptyContainerExposure: number;
    activeDeliveries: number;
    lowStockProducts: number;
  };
  lowStock: Array<{
    id: string;
    sku: string;
    name: string;
    quantity: number;
    reorderLevel: number;
    stockValue: number;
    needsReorder: boolean;
  }>;
};

export type ApiProduct = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  packageType: string;
  unitSize: string;
  unitCost: number | string;
  unitPrice: number | string;
  reorderLevel: number;
  tracksEmpties: boolean;
  isActive: boolean;
  createdAt: string;
};

export type ApiProductPriceHistory = {
  id: string;
  productId: string;
  previousCost: number | string | null;
  newCost: number | string;
  previousPrice: number | string | null;
  newPrice: number | string;
  changeReason: string | null;
  createdAt: string;
  changedBy: {
    id: string;
    fullName: string;
    email: string | null;
    role: {
      name: string;
    };
  } | null;
};

export type ApiWarehouseStockItem = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  unitSize: string;
  reorderLevel: number;
  unitCost: number | string;
  unitPrice: number | string;
  quantity: number;
  needsReorder: boolean;
};

export type ApiCustomer = {
  id: string;
  name: string;
  phone: string | null;
  route: string | null;
  location: string | null;
  creditLimit: number | string;
  isActive: boolean;
  createdAt: string;
  outstanding?: number;
  emptyBalance?: number;
};

export type ApiCustomerBalance = {
  customer: ApiCustomer;
  outstanding: number;
  emptyBalance: number;
};

export type ApiCustomerAccountHistory = {
  customer: ApiCustomer;
  entries: Array<{
    id: string;
    type: "INVOICE" | "PAYMENT";
    reference: string;
    debit: number;
    credit: number;
    status: string;
    occurredAt: string;
    runningBalance: number;
  }>;
};

export type ApiDebtAgingEntry = {
  invoiceId: string;
  invoiceNumber: string;
  customer: ApiCustomer;
  invoiceDate: string;
  ageDays: number;
  outstanding: number;
  bucket: "0_30" | "31_60" | "61_90" | "90_PLUS";
};

export type ApiPayment = {
  id: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
  };
  method: string;
  amount: number | string;
  reference: string | null;
  receivedAt: string;
};

export type ApiInvoice = {
  id: string;
  customerId: string;
  invoiceNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number | string;
  createdAt: string;
  customer: {
    id: string;
    name: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    discountAmount: number | string;
    lineTotal: number | string;
    product: {
      id: string;
      name: string;
      unitPrice: number | string;
    };
  }>;
  payments: Array<{
    id: string;
    amount: number | string;
  }>;
};

export type ApiDeliveryTrip = {
  id: string;
  route: string;
  status: string;
  cashCollected: number | string;
  creditIssued: number | string;
  createdAt: string;
  loadedAt: string | null;
  returnedAt: string | null;
  driver: {
    id: string;
    fullName: string;
  };
  vehicle: {
    id: string;
    plateNumber: string;
  };
  items: Array<{
    id: string;
    loadedQuantity: number;
    deliveredQuantity: number;
    returnedQuantity: number;
    damagedQuantity: number;
    product: {
      id: string;
      name: string;
      unitPrice: number | string;
    };
  }>;
};

export type ApiVehicle = {
  id: string;
  plateNumber: string;
  driverId: string | null;
  isActive: boolean;
  driver: {
    id: string;
    fullName: string;
    email: string | null;
  } | null;
};

export type ApiSalesReport = {
  from: string | null;
  to: string | null;
  totals: {
    invoices: number;
    sales: number;
    collected: number;
    credit: number;
    grossMargin: number;
  };
  products: Array<{
    productId: string;
    sku: string;
    name: string;
    quantity: number;
    revenue: number;
    grossMargin: number;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    customer: string;
    totalAmount: number;
    paidAmount: number;
    paymentStatus: string;
    createdAt: string;
  }>;
};

export type ApiStockReport = {
  totals: {
    products: number;
    stockValue: number;
    lowStock: number;
  };
  rows: Array<{
    productId: string;
    sku: string;
    name: string;
    brand: string;
    quantity: number;
    unitCost: number;
    unitPrice: number;
    stockValue: number;
    reorderLevel: number;
    needsReorder: boolean;
  }>;
};

export type ApiDebtReport = {
  totals: {
    outstanding: number;
    invoices: number;
    over90Days: number;
  };
  rows: Array<{
    invoiceId: string;
    invoiceNumber: string;
    customer: string;
    route: string | null;
    totalAmount: number;
    paidAmount: number;
    outstanding: number;
    ageDays: number;
    bucket: string;
    createdAt: string;
  }>;
};

export type ApiEmptiesReport = {
  totals: {
    exposure: number;
    customers: number;
  };
  rows: Array<{
    customerId: string;
    customer: string;
    route: string | null;
    balance: number;
    movements: number;
  }>;
};

function resolveApiBaseUrl() {
  const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

  if (!rawBaseUrl) return "/api";
  if (rawBaseUrl.endsWith("/api")) return rawBaseUrl;
  if (rawBaseUrl.startsWith("http://") || rawBaseUrl.startsWith("https://")) return `${rawBaseUrl}/api`;

  return rawBaseUrl;
}

const apiBaseUrl = resolveApiBaseUrl();

async function request<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(async () => {
      const message = await response.text().catch(() => "Request failed");
      return { message: message || `Request failed with status ${response.status}` };
    });
    throw new Error(Array.isArray(body.message) ? body.message.join(", ") : body.message ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export function login(email: string, password: string) {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function getApiHealth() {
  return request<ApiHealthResponse>("/health");
}

export function getOwnerDashboard(accessToken: string) {
  return request<OwnerDashboardResponse>("/dashboard/owner", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}

export function getMe(accessToken: string) {
  return request<ApiUser>("/me", {
    headers: authHeaders(accessToken)
  });
}

function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`
  };
}

export function getProducts(accessToken: string) {
  return request<ApiProduct[]>("/products", {
    headers: authHeaders(accessToken)
  });
}

export function createProduct(
  accessToken: string,
  payload: {
    sku: string;
    name: string;
    brand: string;
    category: string;
    packageType: string;
    unitSize: string;
    unitCost: number;
    unitPrice: number;
    reorderLevel: number;
    tracksEmpties?: boolean;
  }
) {
  return request<ApiProduct>("/products", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload)
  });
}

export function updateProduct(
  accessToken: string,
  productId: string,
  payload: {
    sku?: string;
    name?: string;
    brand?: string;
    category?: string;
    packageType?: string;
    unitSize?: string;
    unitCost?: number;
    unitPrice?: number;
    reorderLevel?: number;
    tracksEmpties?: boolean;
    isActive?: boolean;
    priceChangeReason?: string;
  }
) {
  return request<ApiProduct>(`/products/${productId}`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload)
  });
}

export function deleteProduct(accessToken: string, productId: string) {
  return request<{ id: string; deletedById: string }>(`/products/${productId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken)
  });
}

export function getProductPriceHistory(accessToken: string, productId: string) {
  return request<ApiProductPriceHistory[]>(`/products/${productId}/price-history`, {
    headers: authHeaders(accessToken)
  });
}

export function getWarehouseStock(accessToken: string, warehouseId: string) {
  return request<ApiWarehouseStockItem[]>(`/warehouses/${warehouseId}/stock`, {
    headers: authHeaders(accessToken)
  });
}

export function getCustomers(accessToken: string) {
  return request<ApiCustomer[]>("/customers", {
    headers: authHeaders(accessToken)
  });
}

export function getCompanyProfile(accessToken: string) {
  return request<ApiCompanyProfile>("/company/profile", {
    headers: authHeaders(accessToken)
  });
}

export function updateCompanyProfile(
  accessToken: string,
  payload: {
    name?: string;
    industry?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    currency?: string;
    defaultLocale?: "en" | "fr" | "rw" | "sw";
  }
) {
  return request<ApiCompanyProfile>("/company/profile", {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload)
  });
}

export function createCustomer(
  accessToken: string,
  payload: {
    name: string;
    phone?: string;
    route?: string;
    location?: string;
    creditLimit: number;
  }
) {
  return request<ApiCustomer>("/customers", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload)
  });
}

export function updateCustomer(
  accessToken: string,
  customerId: string,
  payload: {
    name?: string;
    phone?: string;
    route?: string;
    location?: string;
    creditLimit?: number;
    isActive?: boolean;
  }
) {
  return request<ApiCustomer>(`/customers/${customerId}`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload)
  });
}

export function deleteCustomer(accessToken: string, customerId: string) {
  return request<{ id: string; deletedById: string }>(`/customers/${customerId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken)
  });
}

export function getCustomerBalance(accessToken: string, customerId: string) {
  return request<ApiCustomerBalance>(`/customers/${customerId}/balance`, {
    headers: authHeaders(accessToken)
  });
}

export function getCustomerAccountHistory(accessToken: string, customerId: string) {
  return request<ApiCustomerAccountHistory>(`/customers/${customerId}/account-history`, {
    headers: authHeaders(accessToken)
  });
}

export function getDebtAging(accessToken: string) {
  return request<ApiDebtAgingEntry[]>("/customers/debt-aging", {
    headers: authHeaders(accessToken)
  });
}

export function getPayments(accessToken: string) {
  return request<ApiPayment[]>("/payments", {
    headers: authHeaders(accessToken)
  });
}

export function getInvoices(accessToken: string) {
  return request<ApiInvoice[]>("/invoices", {
    headers: authHeaders(accessToken)
  });
}

export function getDeliveryTrips(accessToken: string) {
  return request<ApiDeliveryTrip[]>("/deliveries/trips", {
    headers: authHeaders(accessToken)
  });
}

export function getVehicles(accessToken: string) {
  return request<ApiVehicle[]>("/deliveries/trips/vehicles", {
    headers: authHeaders(accessToken)
  });
}

export function getUsers(accessToken: string) {
  return request<ApiUser[]>("/users", {
    headers: authHeaders(accessToken)
  });
}

export function getRoles(accessToken: string) {
  return request<ApiRole[]>("/users/roles", {
    headers: authHeaders(accessToken)
  });
}

export function getAuditLogs(accessToken: string) {
  return request<ApiAuditLog[]>("/audit-logs", {
    headers: authHeaders(accessToken)
  });
}

export function getSalesReport(accessToken: string, params: { from?: string; to?: string } = {}) {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  const suffix = query.toString() ? `?${query.toString()}` : "";

  return request<ApiSalesReport>(`/reports/sales${suffix}`, {
    headers: authHeaders(accessToken)
  });
}

export function getStockReport(accessToken: string) {
  return request<ApiStockReport>("/reports/stock", {
    headers: authHeaders(accessToken)
  });
}

export function getDebtReport(accessToken: string) {
  return request<ApiDebtReport>("/reports/debt", {
    headers: authHeaders(accessToken)
  });
}

export function getEmptiesReport(accessToken: string) {
  return request<ApiEmptiesReport>("/reports/empties", {
    headers: authHeaders(accessToken)
  });
}

export function receiveStock(
  accessToken: string,
  payload: {
    productId: string;
    warehouseId: string;
    movementType: "PURCHASE_RECEIPT";
    quantity: number;
    note?: string;
  }
) {
  return request("/stock/receive", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload)
  });
}

export function createInvoice(
  accessToken: string,
  payload: {
    customerId: string;
    items: Array<{
      productId: string;
      quantity: number;
      discountAmount?: number;
    }>;
    initialPaymentMethod?: "CASH" | "BANK" | "MOBILE_MONEY" | "CREDIT";
    initialPaymentAmount?: number;
    paymentReference?: string;
    warehouseId?: string;
    allowCreditLimitOverride?: boolean;
    allowNegativeStock?: boolean;
  }
) {
  return request("/invoices", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload)
  });
}

export function recordPayment(
  accessToken: string,
  payload: {
    customerId: string;
    invoiceId?: string;
    method: "CASH" | "BANK" | "MOBILE_MONEY" | "CREDIT";
    amount: number;
    reference?: string;
  }
) {
  return request("/payments", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload)
  });
}

export function reconcileDeliveryTrip(
  accessToken: string,
  tripId: string,
  payload: {
    cashCollected: number;
    creditIssued: number;
    items: Array<{
      itemId: string;
      deliveredQuantity: number;
      returnedQuantity: number;
      damagedQuantity: number;
    }>;
  }
) {
  return request(`/deliveries/trips/${tripId}/reconcile`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload)
  });
}

export function createDeliveryTrip(
  accessToken: string,
  payload: {
    warehouseId: string;
    vehicleId: string;
    driverId: string;
    route: string;
    items: Array<{
      productId: string;
      loadedQuantity: number;
    }>;
    allowNegativeStock?: boolean;
  }
) {
  return request<ApiDeliveryTrip>("/deliveries/trips", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload)
  });
}

export function createUser(
  accessToken: string,
  payload: {
    fullName: string;
    email: string;
    phone?: string;
    role: string;
    preferredLocale: "en" | "fr" | "rw" | "sw";
    password: string;
  }
) {
  return request<ApiUser>("/users", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload)
  });
}

export function updateUser(
  accessToken: string,
  userId: string,
  payload: {
    fullName?: string;
    phone?: string;
    role?: string;
    preferredLocale?: "en" | "fr" | "rw" | "sw";
    isActive?: boolean;
  }
) {
  return request<ApiUser>(`/users/${userId}`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload)
  });
}

export function deleteUser(accessToken: string, userId: string) {
  return request<{ id: string; deletedById: string }>(`/users/${userId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken)
  });
}

export function resetUserPassword(accessToken: string, userId: string, newPassword: string) {
  return request<{ id: string; resetById: string }>(`/users/${userId}/reset-password`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ newPassword })
  });
}

export function changeMyPassword(
  accessToken: string,
  payload: {
    currentPassword: string;
    newPassword: string;
  }
) {
  return request<{ id: string; message: string }>("/me/change-password", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload)
  });
}
