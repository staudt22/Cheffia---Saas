import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #3F6B4E");
const optionalText = (max = 200) =>
  z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));

export const CURRENCIES = ["USD", "BRL", "EUR", "GBP", "CAD", "MXN", "ARS", "AUD", "CHF", "JPY"] as const;
export const LOCALES = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "es-ES", label: "Español" },
  { value: "fr-FR", label: "Français" },
] as const;
export const DATE_FORMATS = ["MMM d, yyyy", "dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd"] as const;
export const RESTAURANT_TYPES = [
  "Burger & grill", "Pizzeria", "Café & bakery", "Bistro", "Fine dining", "Bar & pub",
  "Japanese / Sushi", "Fast casual", "Food truck", "Dark kitchen", "Steakhouse", "Other",
] as const;

export const restaurantProfileSchema = z.object({
  name: z.string().trim().min(1, "Enter your restaurant's name").max(120),
  address: optionalText(300),
  phone: optionalText(40),
  email: z.union([z.email("Enter a valid email"), z.literal("")]).optional().nullable().transform((v) => v || null),
  website: optionalText(200),
});

export const restaurantUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    address: optionalText(300),
    phone: optionalText(40),
    email: z.union([z.email(), z.literal("")]).nullable().transform((v) => v || null),
    website: optionalText(200),
    restaurant_type: optionalText(60),
    brand_color: hex,
    accent_color: hex,
    logo_url: z.url().nullable(),
    cover_url: z.url().nullable(),
    currency: z.enum(CURRENCIES),
    locale: z.enum(LOCALES.map((l) => l.value) as [string, ...string[]]),
    timezone: z.string().min(1).max(64).refine((tz) => {
      try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
    }, "Unknown time zone"),
    date_format: z.enum(DATE_FORMATS),
    business_hours: z.record(z.string(), z.object({ open: z.string(), close: z.string(), closed: z.boolean().optional() })),
    onboarding_step: z.number().int().min(1).max(11),
  })
  .partial();

export const menuItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: optionalText(500),
  price: z.coerce.number().min(0, "Price can't be negative").max(100000),
  category_id: z.string().uuid().nullable().optional(),
  is_available: z.boolean().default(true),
  photo_url: z.url().nullable().optional(),
});

export const UNITS = ["kg", "g", "l", "ml", "unit", "box"] as const;
export const UNIT_LABELS: Record<(typeof UNITS)[number], string> = {
  kg: "Kilograms", g: "Grams", l: "Liters", ml: "Milliliters", unit: "Units", box: "Boxes",
};

export const inventoryItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  category: z.string().trim().min(1).max(60).default("General"),
  unit: z.enum(UNITS),
  min_quantity: z.coerce.number().min(0).max(1e9),
  unit_cost: z.coerce.number().min(0).max(1e7),
  supplier_id: z.string().uuid().nullable().optional(),
  expires_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().or(z.literal("").transform(() => null)),
  storage_location: optionalText(80),
  notes: optionalText(500),
});

export const EXPENSE_CATEGORIES = [
  "ingredients", "rent", "salaries", "electricity", "water", "gas", "marketing",
  "equipment", "delivery_fees", "taxes", "other",
] as const;
export const EXPENSE_LABELS: Record<(typeof EXPENSE_CATEGORIES)[number], string> = {
  ingredients: "Ingredients", rent: "Rent", salaries: "Salaries", electricity: "Electricity", water: "Water",
  gas: "Gas", marketing: "Marketing", equipment: "Equipment", delivery_fees: "Delivery fees", taxes: "Taxes", other: "Other",
};
export const PAYMENT_METHODS = [
  { value: "card", label: "Card" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "pix", label: "Pix" },
  { value: "platform_payout", label: "Platform payout" },
  { value: "other", label: "Other" },
] as const;

export const expenseSchema = z
  .object({
    description: z.string().trim().min(1, "Describe the expense").max(200),
    amount: z.coerce.number().positive("Amount must be greater than zero").max(1e8),
    category: z.enum(EXPENSE_CATEGORIES),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    supplier_id: z.string().uuid().nullable().optional().or(z.literal("").transform(() => null)),
    payment_method: optionalText(40),
    is_recurring: z.boolean().default(false),
    recurrence: z.enum(["weekly", "monthly", "yearly"]).nullable().optional(),
    notes: optionalText(1000),
    receipt_path: z.string().max(300).nullable().optional(),
  })
  .refine((v) => !v.is_recurring || v.recurrence, { message: "Choose how often it repeats", path: ["recurrence"] });

export const revenueSchema = z.object({
  description: z.string().trim().min(1, "Describe the revenue").max(200),
  amount: z.coerce.number().positive("Amount must be greater than zero").max(1e8),
  source: z.enum(["manual", "catering", "event", "other"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  payment_method: optionalText(40),
  notes: optionalText(1000),
});

export const orderSchema = z.object({
  items: z
    .array(z.object({
      menu_item_id: z.string().uuid(),
      quantity: z.coerce.number().int().min(1).max(99),
      modifiers: optionalText(200),
      notes: optionalText(200),
    }))
    .min(1, "Add at least one item"),
  fulfillment: z.enum(["dine_in", "takeaway", "delivery"]),
  customer_name: optionalText(120),
  customer_phone: optionalText(40),
  table_label: optionalText(20),
  notes: optionalText(500),
  discount: z.coerce.number().min(0).max(1e6).default(0),
  delivery_fee: z.coerce.number().min(0).max(1e6).default(0),
  payment_method: optionalText(40),
  status: z.enum(["new", "accepted", "completed"]).default("new"),
});

export const inviteSchema = z.object({
  email: z.email("Enter a valid email"),
  role: z.enum(["manager", "employee", "accountant", "kitchen"]),
});
