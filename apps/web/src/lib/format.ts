// Formatação e datas no fuso de São Paulo (UTC-3, sem horário de verão).
export const TZ = "America/Sao_Paulo";

export const id = () => crypto.randomUUID();

export function brl(cents: number | null | undefined) {
  return ((cents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "1.250,50" | "1250.5" | "150" -> centavos */
export function parseMoney(v: FormDataEntryValue | null): number {
  const s = String(v ?? "").trim().replace(/[R$\s]/g, "");
  if (!s) return 0;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function centsToInput(cents: number | null | undefined) {
  return cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",");
}

/** Data local (YYYY-MM-DD) + hora (HH:mm) em São Paulo -> Date UTC */
export function fromLocal(date: string, time = "12:00") {
  return new Date(`${date}T${time}:00-03:00`);
}

/** Date -> "YYYY-MM-DD" no fuso de SP */
export function toLocalDate(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function toLocalTime(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
}

export function fmtDate(d: Date | null | undefined, opts: Intl.DateTimeFormatOptions = {}) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", ...opts }).format(d);
}

export function fmtDayMonth(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "short" }).format(d).replace(".", "");
}

export function fmtWeekday(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "long" }).format(d);
}

export function todayLocal() {
  return toLocalDate(new Date());
}

export function addDays(date: string, n: number) {
  const d = fromLocal(date);
  d.setUTCDate(d.getUTCDate() + n);
  return toLocalDate(d);
}

/** Segunda-feira da semana de `date` */
export function startOfWeek(date: string) {
  const d = fromLocal(date);
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(d);
  const idx = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(wd);
  return addDays(date, -idx);
}

/** "2026-10" -> [início, fim) do mês em UTC */
export function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const start = fromLocal(`${y}-${String(m).padStart(2, "0")}-01`, "00:00");
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  const end = fromLocal(`${ny}-${String(nm).padStart(2, "0")}-01`, "00:00");
  return { start, end };
}

export function currentMonth() {
  return todayLocal().slice(0, 7);
}

export function shiftMonth(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

export function monthLabel(ym: string, short = false) {
  const d = fromLocal(`${ym}-15`);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, month: short ? "short" : "long", year: short ? undefined : "numeric" })
    .format(d)
    .replace(".", "");
}

export function age(birth: Date | null | undefined) {
  if (!birth) return null;
  const b = toLocalDate(birth);
  const t = todayLocal();
  let a = Number(t.slice(0, 4)) - Number(b.slice(0, 4));
  if (t.slice(5) < b.slice(5)) a--;
  return a;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function onlyDigits(s: string | null | undefined) {
  return (s ?? "").replace(/\D/g, "");
}

/** Link wa.me com mensagem pronta (abre o WhatsApp do próprio personal). */
export function whatsappLink(phone: string | null | undefined, text: string) {
  let digits = onlyDigits(phone);
  if (digits && digits.length <= 11) digits = `55${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export const PLAN_TYPE_LABEL: Record<string, string> = {
  RECURRING: "Recorrente",
  PACKAGE: "Pacote de aulas",
  SINGLE: "Aula avulsa",
  ONLINE: "Consultoria online",
};

export const INTERVAL_LABEL: Record<string, string> = {
  MONTHLY: "mês",
  QUARTERLY: "trimestre",
  SEMIANNUAL: "semestre",
  YEARLY: "ano",
};

export const INTERVAL_MONTHS: Record<string, number> = { MONTHLY: 1, QUARTERLY: 3, SEMIANNUAL: 6, YEARLY: 12 };

export const METHOD_LABEL: Record<string, string> = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão",
  BOLETO: "Boleto",
  CASH: "Dinheiro",
  OTHER: "Outro",
};
