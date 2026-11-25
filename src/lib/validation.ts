import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor no formato #38BDF8");
const optionalText = (max = 200) =>
  z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));

export const CURRENCIES = ["BRL", "USD", "EUR", "GBP", "CAD", "MXN", "ARS", "AUD", "CHF", "JPY"] as const;
export const LOCALES = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "pt-PT", label: "Português (Portugal)" },
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "es-ES", label: "Español" },
  { value: "fr-FR", label: "Français" },
] as const;
export const DATE_FORMATS = ["dd/MM/yyyy", "dd MMM yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "MMM d, yyyy"] as const;
export const RESTAURANT_TYPES = [
  "Hamburgueria", "Pizzaria", "Cafeteria e padaria", "Bistrô", "Alta gastronomia", "Bar e boteco",
  "Japonês / Sushi", "Self-service / Por quilo", "Lanchonete", "Food truck", "Dark kitchen", "Churrascaria",
  "Marmitaria", "Outro",
] as const;

export const restaurantProfileSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do restaurante").max(120),
  address: optionalText(300),
  phone: optionalText(40),
  email: z.union([z.email("Informe um e-mail válido"), z.literal("")]).optional().nullable().transform((v) => v || null),
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
    }, "Fuso horário desconhecido"),
    date_format: z.enum(DATE_FORMATS),
    business_hours: z.record(z.string(), z.object({ open: z.string(), close: z.string(), closed: z.boolean().optional() })),
    onboarding_step: z.number().int().min(1).max(11),
  })
  .partial();

export const menuItemSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(120),
  description: optionalText(500),
  price: z.coerce.number().min(0, "O preço não pode ser negativo").max(100000),
  category_id: z.string().uuid().nullable().optional(),
  is_available: z.boolean().default(true),
  photo_url: z.url().nullable().optional(),
});

export const UNITS = ["kg", "g", "l", "ml", "unit", "box"] as const;
export const UNIT_LABELS: Record<(typeof UNITS)[number], string> = {
  kg: "Quilos (kg)", g: "Gramas (g)", l: "Litros (L)", ml: "Mililitros (ml)", unit: "Unidades", box: "Caixas",
};

export const inventoryItemSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(120),
  category: z.string().trim().min(1).max(60).default("Geral"),
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
  ingredients: "Ingredientes", rent: "Aluguel", salaries: "Salários", electricity: "Energia", water: "Água",
  gas: "Gás", marketing: "Marketing", equipment: "Equipamentos", delivery_fees: "Taxas de delivery", taxes: "Impostos", other: "Outros",
};
export const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "card", label: "Cartão" },
  { value: "cash", label: "Dinheiro" },
  { value: "bank_transfer", label: "Transferência / boleto" },
  { value: "platform_payout", label: "Repasse de app" },
  { value: "other", label: "Outro" },
] as const;

export const expenseSchema = z
  .object({
    description: z.string().trim().min(1, "Descreva a despesa").max(200),
    amount: z.coerce.number().positive("O valor precisa ser maior que zero").max(1e8),
    category: z.enum(EXPENSE_CATEGORIES),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha uma data"),
    supplier_id: z.string().uuid().nullable().optional().or(z.literal("").transform(() => null)),
    payment_method: optionalText(40),
    is_recurring: z.boolean().default(false),
    recurrence: z.enum(["weekly", "monthly", "yearly"]).nullable().optional(),
    notes: optionalText(1000),
    receipt_path: z.string().max(300).nullable().optional(),
  })
  .refine((v) => !v.is_recurring || v.recurrence, { message: "Escolha a frequência", path: ["recurrence"] });

export const revenueSchema = z.object({
  description: z.string().trim().min(1, "Descreva a receita").max(200),
  amount: z.coerce.number().positive("O valor precisa ser maior que zero").max(1e8),
  source: z.enum(["manual", "catering", "event", "other"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha uma data"),
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
    .min(1, "Adicione pelo menos um item"),
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
  email: z.email("Informe um e-mail válido"),
  role: z.enum(["manager", "employee", "accountant", "kitchen"]),
  custom_role_id: z.string().uuid().nullable().optional(),
});
