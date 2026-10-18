const DEFAULT_WHATSAPP_NUMBER = "33748674807";
const DEFAULT_TELEGRAM_HANDLE = "tom_glock";

export function normalizeWhatsappNumber(value?: string | null) {
  const digits = value?.trim().replace(/[^\d]/g, "") || "";
  return digits || null;
}

export function normalizeTelegramHandle(value?: string | null) {
  const raw = value?.trim() || "";
  const withoutProtocol = raw.replace(/^https?:\/\/(?:www\.)?(?:t\.me|telegram\.me)\//i, "");
  const candidate = withoutProtocol.replace(/^@+/, "").split(/[/?#\s]/, 1)[0] || "";
  return /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(candidate) ? candidate : null;
}

export function buildWhatsappConversationUrl(number: string | null | undefined, message: string) {
  const normalized = normalizeWhatsappNumber(number) || DEFAULT_WHATSAPP_NUMBER;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildTelegramConversationUrl(handle: string | null | undefined, message: string) {
  const normalized = normalizeTelegramHandle(handle) || DEFAULT_TELEGRAM_HANDLE;
  return `https://t.me/${normalized}?text=${encodeURIComponent(message)}`;
}
