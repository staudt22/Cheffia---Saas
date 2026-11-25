import { TIMEZONE_GROUPS, currencyLabel, dateFormatExample, isKnownTimezone, timezoneLabel } from "@/lib/timezones";

/** <option>s for a time-zone <select>, grouped, with Portuguese names. */
export function TimezoneOptions({ current }: { current?: string }) {
  return (
    <>
      {current && !isKnownTimezone(current) && <option value={current}>{timezoneLabel(current)}</option>}
      {TIMEZONE_GROUPS.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.zones.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
        </optgroup>
      ))}
    </>
  );
}

export function CurrencyOptions({ codes }: { codes: readonly string[] }) {
  return <>{codes.map((c) => <option key={c} value={c}>{currencyLabel(c)}</option>)}</>;
}

export function DateFormatOptions({ formats }: { formats: readonly string[] }) {
  return <>{formats.map((f) => <option key={f} value={f}>{dateFormatExample(f)}</option>)}</>;
}
