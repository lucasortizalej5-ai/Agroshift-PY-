export async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    signal: AbortSignal.timeout(45000),
  });
  if (response.status === 204) return null;
  const result = await response.json().catch(() => ({
    error: { message: "El servidor devolvió una respuesta inesperada." },
  }));
  if (!response.ok) {
    const fields = result.error?.fields
      ?.map((x) => `${x.field}: ${x.message}`)
      .join(" · ");
    throw new Error(
      fields || result.error?.message || "No se pudo completar la solicitud.",
    );
  }
  return result;
}
export const number = (value, digits = 1, lang = "en") =>
  value === null || value === undefined
    ? "—"
    : Number(value).toLocaleString(lang === "es" ? "es-PY" : "en-US", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      });
export function dayLabel(date, lang = "en") {
  return date
    ? new Date(
        date.length === 10 ? date + "T12:00:00Z" : date,
      ).toLocaleDateString(lang === "es" ? "es-PY" : "en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "America/Asuncion",
      })
    : "—";
}
