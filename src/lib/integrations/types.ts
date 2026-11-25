import type { OrderSource } from "@/lib/types";

/**
 * Integration abstraction. Each provider implements this contract; the rest of
 * CheffeData only talks to the interface, so adding a provider never touches the UI
 * or the order pipeline.
 */
export type Availability =
  | "available"      // credentials configured — real OAuth/API flow works
  | "needs_credentials" // implemented, but the platform's app credentials are not set
  | "coming_soon";   // connector not built yet

export interface ProviderInfo {
  key: string;
  name: string;
  short: string;
  color: string;
  category: string;
  description: string;
  orderSource?: OrderSource;
  /** Env vars that must be set for the real connection to work. */
  requiredEnv: string[];
  /** Official docs / partner programme, shown to owners. */
  partnerUrl: string;
  /** Whether a clearly-labelled demo mode exists (generates simulated orders). */
  supportsDemo: boolean;
  implemented: boolean;
  /** Official logo file in /public/brands, when the owner of the brand provided one. */
  logo?: string;
}

export interface NormalizedOrder {
  externalId: string;
  source: OrderSource;
  customerName?: string;
  notes?: string;
  items: { externalItemId?: string; name: string; quantity: number; unitPrice: number; modifiers?: string }[];
  deliveryFee?: number;
  createdAt: string;
}

export interface ProviderConnector {
  info: ProviderInfo;
  /** Build the URL the owner is redirected to for authorization. */
  getAuthorizationUrl(params: { state: string; redirectUri: string }): string;
  /** Exchange the OAuth code for tokens (server-side only). */
  exchangeCode(params: { code: string; redirectUri: string }): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: string; scopes?: string[] }>;
  /** Verify and translate a webhook payload into CheffeData orders. */
  parseWebhook?(headers: Headers, rawBody: string): Promise<NormalizedOrder[]>;
}
