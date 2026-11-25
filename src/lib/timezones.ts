/** Time zones with friendly Portuguese names. Brazil first, then the countries most likely to use CheffeData. */
export const TIMEZONE_GROUPS: { label: string; zones: { value: string; label: string }[] }[] = [
  {
    label: "Brasil",
    zones: [
      { value: "America/Sao_Paulo", label: "Horário de Brasília — SP, RJ, MG, Sul, GO, DF (GMT-3)" },
      { value: "America/Bahia", label: "Bahia (GMT-3)" },
      { value: "America/Fortaleza", label: "Ceará, RN, PB, PI, MA (GMT-3)" },
      { value: "America/Recife", label: "Pernambuco (GMT-3)" },
      { value: "America/Maceio", label: "Alagoas e Sergipe (GMT-3)" },
      { value: "America/Belem", label: "Pará e Amapá (GMT-3)" },
      { value: "America/Araguaina", label: "Tocantins (GMT-3)" },
      { value: "America/Cuiaba", label: "Mato Grosso (GMT-4)" },
      { value: "America/Campo_Grande", label: "Mato Grosso do Sul (GMT-4)" },
      { value: "America/Manaus", label: "Amazonas (GMT-4)" },
      { value: "America/Porto_Velho", label: "Rondônia (GMT-4)" },
      { value: "America/Boa_Vista", label: "Roraima (GMT-4)" },
      { value: "America/Rio_Branco", label: "Acre (GMT-5)" },
      { value: "America/Noronha", label: "Fernando de Noronha (GMT-2)" },
    ],
  },
  {
    label: "Outros países",
    zones: [
      { value: "Europe/Lisbon", label: "Portugal — Lisboa" },
      { value: "America/Argentina/Buenos_Aires", label: "Argentina — Buenos Aires" },
      { value: "America/Montevideo", label: "Uruguai — Montevidéu" },
      { value: "America/Asuncion", label: "Paraguai — Assunção" },
      { value: "America/Santiago", label: "Chile — Santiago" },
      { value: "America/Bogota", label: "Colômbia — Bogotá" },
      { value: "America/Lima", label: "Peru — Lima" },
      { value: "America/Mexico_City", label: "México — Cidade do México" },
      { value: "America/New_York", label: "Estados Unidos — Nova York" },
      { value: "America/Chicago", label: "Estados Unidos — Chicago" },
      { value: "America/Los_Angeles", label: "Estados Unidos — Los Angeles" },
      { value: "America/Toronto", label: "Canadá — Toronto" },
      { value: "Europe/London", label: "Reino Unido — Londres" },
      { value: "Europe/Madrid", label: "Espanha — Madri" },
      { value: "Europe/Paris", label: "França — Paris" },
      { value: "Europe/Rome", label: "Itália — Roma" },
      { value: "Asia/Tokyo", label: "Japão — Tóquio" },
      { value: "UTC", label: "UTC (horário universal)" },
    ],
  },
];

const ALL = TIMEZONE_GROUPS.flatMap((g) => g.zones);

/** Friendly name for a stored zone, falling back to the technical name. */
export function timezoneLabel(tz: string) {
  return ALL.find((z) => z.value === tz)?.label ?? tz.replace(/_/g, " ").replace(/\//g, " / ");
}
export const isKnownTimezone = (tz: string) => ALL.some((z) => z.value === tz);

/** Currency name in Portuguese, e.g. "Real brasileiro (R$)". */
export function currencyLabel(code: string) {
  try {
    const name = new Intl.DisplayNames(["pt-BR"], { type: "currency" }).of(code) ?? code;
    const symbol = new Intl.NumberFormat("pt-BR", { style: "currency", currency: code }).formatToParts(0).find((p) => p.type === "currency")?.value ?? code;
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} (${symbol})`;
  } catch {
    return code;
  }
}

/** Example of a date format, e.g. "25/11/2026". */
export function dateFormatExample(fmt: string) {
  const d = new Date(2026, 10, 25);
  const mon = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][d.getMonth()]!;
  return fmt.replace("yyyy", "2026").replace("MMM", mon).replace("MM", "11").replace("dd", "25").replace(/\bd\b/, "25");
}
