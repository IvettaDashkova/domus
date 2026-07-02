/** Format PLN amounts. Prices across Domus are in złoty. */
export function zl(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 2 : 0)}M zł`;
  if (n >= 1_000) return `${Math.round(n / 1000)}k zł`;
  return `${n} zł`;
}

/** Full grouped amount, e.g. "1 250 000 zł". */
export function zlFull(n: number | null): string {
  return n == null ? "—" : `${Math.round(n).toLocaleString("pl-PL")} zł`;
}
