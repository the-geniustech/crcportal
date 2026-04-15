export function normalizeNigerianPhone(input: string): string | null {
  const raw = String(input || "").trim();
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");
  let local = "";

  if (digits.startsWith("234") && digits.length === 13) {
    local = digits.slice(3);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    local = digits.slice(1);
  } else if (digits.length === 10) {
    local = digits;
  } else {
    return null;
  }

  if (!/^[789]\d{9}$/.test(local)) return null;

  return `+234 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}
