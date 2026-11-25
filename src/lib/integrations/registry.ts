import type { Availability, ProviderInfo } from "@/lib/integrations/types";

export const INTEGRATION_PROVIDERS: ProviderInfo[] = [
  { key: "ifood", name: "iFood", short: "iF", color: "#EA1D2C", category: "Delivery", orderSource: "ifood",
    description: "Receba os pedidos do iFood direto na fila do CheffeData e na tela da cozinha.",
    requiredEnv: ["IFOOD_CLIENT_ID", "IFOOD_CLIENT_SECRET"], partnerUrl: "https://developer.ifood.com.br", supportsDemo: true, implemented: false },
  { key: "ubereats", name: "Uber Eats", short: "UE", color: "#06C167", category: "Delivery", orderSource: "ubereats",
    description: "Sincronize os pedidos e a disponibilidade do cardápio no Uber Eats.",
    requiredEnv: ["UBER_EATS_CLIENT_ID", "UBER_EATS_CLIENT_SECRET"], partnerUrl: "https://developer.uber.com/docs/eats", supportsDemo: true, implemented: false },
  { key: "doordash", name: "DoorDash", short: "DD", color: "#FF3008", category: "Delivery", orderSource: "doordash",
    description: "Traga os pedidos do DoorDash para a mesma fila.",
    requiredEnv: ["DOORDASH_DEVELOPER_ID", "DOORDASH_KEY_ID", "DOORDASH_SIGNING_SECRET"], partnerUrl: "https://developer.doordash.com", supportsDemo: true, implemented: false },
  { key: "stripe", name: "Stripe", short: "S", color: "#635BFF", category: "Pagamentos",
    description: "Confira os pagamentos com cartão e os repasses com o seu faturamento.",
    requiredEnv: ["STRIPE_CONNECT_CLIENT_ID", "STRIPE_SECRET_KEY"], partnerUrl: "https://docs.stripe.com/connect", supportsDemo: false, implemented: false },
  { key: "square", name: "Square", short: "Sq", color: "#1A1A1A", category: "PDV", orderSource: "pos",
    description: "Importe as vendas do PDV Square como pedidos concluídos.",
    requiredEnv: ["SQUARE_APPLICATION_ID", "SQUARE_APPLICATION_SECRET"], partnerUrl: "https://developer.squareup.com", supportsDemo: false, implemented: false },
  { key: "shopify", name: "Shopify", short: "Sh", color: "#5E8E3E", category: "Loja online", orderSource: "website",
    description: "Transforme pedidos da loja online em comandas da cozinha.",
    requiredEnv: ["SHOPIFY_API_KEY", "SHOPIFY_API_SECRET"], partnerUrl: "https://shopify.dev", supportsDemo: false, implemented: false },
  { key: "google", name: "Perfil da Empresa no Google", short: "G", color: "#4285F4", category: "Marketing",
    description: "Mantenha horário e cardápio sempre atualizados no Google.",
    requiredEnv: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"], partnerUrl: "https://developers.google.com/my-business", supportsDemo: false, implemented: false },
];

export function providerInfo(key: string) {
  return INTEGRATION_PROVIDERS.find((p) => p.key === key);
}

/** Server-side: what can actually be done with this provider right now. */
export function availability(p: ProviderInfo): Availability {
  if (!p.implemented) return "coming_soon";
  return p.requiredEnv.every((k) => Boolean(process.env[k])) ? "available" : "needs_credentials";
}
