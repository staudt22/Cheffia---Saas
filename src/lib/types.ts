export type AppRole = "owner" | "manager" | "employee" | "accountant" | "kitchen";
export type OrderStatus = "new" | "accepted" | "preparing" | "ready" | "completed" | "cancelled";
export type OrderSource = "website" | "manual" | "pos" | "ifood" | "ubereats" | "doordash" | "other";
export type InventoryUnit = "kg" | "g" | "l" | "ml" | "unit" | "box";
export type MovementType = "purchase" | "usage" | "waste" | "adjustment" | "order_deduction" | "po_receipt" | "initial";
export type ExpenseCategory =
  | "ingredients" | "rent" | "salaries" | "electricity" | "water" | "gas"
  | "marketing" | "equipment" | "delivery_fees" | "taxes" | "other";
export type Recurrence = "weekly" | "monthly" | "yearly";
export type RevenueSource = "order" | "manual" | "catering" | "event" | "other";

export type Section =
  | "overview" | "orders" | "finances" | "inventory" | "menu" | "suppliers"
  | "team" | "analytics" | "assistant" | "integrations" | "settings";

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  restaurant_type: string | null;
  logo_url: string | null;
  cover_url: string | null;
  brand_color: string;
  accent_color: string;
  currency: string;
  locale: string;
  timezone: string;
  date_format: string;
  business_hours: Record<string, { open: string; close: string; closed?: boolean }>;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  is_demo: boolean;
  onboarding_step: number;
  onboarding_completed_at: string | null;
  plan: string;
  trial_ends_at: string | null;
}

export interface RestaurantSettings {
  restaurant_id: string;
  inventory_auto_deduct: boolean;
  default_prep_minutes: number;
  tax_rate: number;
  notifications: Record<string, boolean>;
}

export interface WidgetInstance {
  id: string;
  type: string;
  size: "sm" | "md" | "lg" | "xl";
  config?: { chart?: "area" | "bar" | "line"; bucket?: "hour" | "day" | "week" | "month" };
}

export interface DashboardLayout {
  id: string;
  name: string;
  is_active: boolean;
  density: "compact" | "comfortable";
  widgets: WidgetInstance[];
}

export interface Order {
  id: string;
  number: number;
  source: OrderSource;
  is_simulated: boolean;
  status: OrderStatus;
  fulfillment: "dine_in" | "takeaway" | "delivery";
  table_label: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  notes: string | null;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  payment_method: string | null;
  estimated_prep_minutes: number | null;
  created_at: string;
  accepted_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  menu_item_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  modifiers: string | null;
  notes: string | null;
  total: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: InventoryUnit;
  min_quantity: number;
  unit_cost: number;
  supplier_id: string | null;
  expires_on: string | null;
  storage_location: string | null;
  notes: string | null;
  updated_at: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  position: number;
}

export interface MenuItem {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  photo_url: string | null;
  price: number;
  is_available: boolean;
  position: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  supplier_id: string | null;
  payment_method: string | null;
  is_recurring: boolean;
  recurrence: Recurrence | null;
  next_due_on: string | null;
  recurring_parent_id: string | null;
  notes: string | null;
  receipt_path: string | null;
}

export interface RevenueRecord {
  id: string;
  description: string;
  amount: number;
  source: RevenueSource;
  date: string;
  order_id: string | null;
  payment_method: string | null;
  notes: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
}

/** Standard result shape for server actions. */
export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };
