export type Role = "owner" | "admin" | "staff";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  tenant_id: string | null;
  permissions: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
};

export type Tenant = {
  id: string;
  name: string;
  owner_user_id: string | null;
  phone: string | null;
  address: string | null;
  receipt_footer: string;
  receipt_width: "58" | "80";
  timezone: string;
  tax_enabled: boolean;
  tax_rate: number;
  tax_inclusive: boolean;
  created_at: string;
};

export type Product = {
  id: string;
  tenant_id: string;
  sku: string | null;
  name: string;
  category: string | null;
  unit: string;
  cost_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  track_stock: boolean;
  is_active: boolean;
  created_at: string;
};

export type StockMovement = {
  id: string;
  tenant_id: string;
  product_id: string;
  type: "in" | "out" | "sale" | "purchase" | "opname" | "cancel";
  qty: number;
  stock_before: number;
  stock_after: number;
  unit_cost: number;
  ref_type: string | null;
  ref_id: string | null;
  note: string | null;
  created_at: string;
  products?: { name: string; unit: string } | null;
};

export type Sale = {
  id: string;
  tenant_id: string;
  invoice_no: string;
  customer_name: string;
  partner_id: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  change: number;
  payment_method: string;
  status: "paid" | "unpaid";
  note: string | null;
  sold_at: string;
  tax_rate: number;
  cashier_name: string | null;
  created_at: string;
};

export type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  qty: number;
  unit_price: number;
  unit_cost: number;
  discount: number;
  subtotal: number;
};

export type Purchase = {
  id: string;
  tenant_id: string;
  purchase_no: string;
  supplier_name: string;
  partner_id: string | null;
  total: number;
  paid: number;
  status: "paid" | "unpaid";
  note: string | null;
  purchased_at: string;
  created_at: string;
};

export type PurchaseItem = {
  id: string;
  purchase_id: string;
  product_id: string | null;
  product_name: string;
  qty: number;
  unit_cost: number;
  subtotal: number;
};

export type CashTransaction = {
  id: string;
  tenant_id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  note: string | null;
  occurred_at: string;
  created_at: string;
};

export type LicenseCode = {
  id: string;
  code: string;
  plan: string;
  status: "unused" | "used" | "revoked";
  note: string | null;
  tenant_id: string | null;
  used_by: string | null;
  created_at: string;
  used_at: string | null;
  tenants?: { name: string } | null;
};

export type DashboardStats = {
  revenue_today: number;
  tax_today: number;
  transactions_today: number;
  revenue_month: number;
  profit_month: number;
  cash_balance: number;
  receivable: number;
  payable: number;
  product_count: number;
  low_stock_count: number;
  stock_value: number;
};

export type ReportSummary = {
  revenue: number;
  tax: number;
  sales_count: number;
  cogs: number;
  discount: number;
  purchase_total: number;
  other_income: number;
  other_expense: number;
  expense_by_category: { category: string; amount: number }[];
  income_by_category: { category: string; amount: number }[];
  top_products: { name: string; qty: number; revenue: number; profit: number }[];
  daily_sales: { date: string; total: number; transactions: number }[];
};
