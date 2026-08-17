/**
 * Masks sensitive identifiers before they are shown publicly.
 *
 * "S123456782" → "S••••••82"
 * "A-8821-9931" → "A-••••-••31"
 */
export function maskId(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = String(value).trim();
  if (v.length <= 2) return '•••';
  const keepStart = Math.min(1, v.length - 2);
  const keepEnd = 2;
  const head = v.slice(0, keepStart);
  const tail = v.slice(-keepEnd);
  const dots = '•'.repeat(Math.max(2, v.length - keepStart - keepEnd));
  return `${head}${dots}${tail}`;
}

/**
 * Masks any phone number, email or long numeric sequence found in a string.
 * Used to scrub private contact details from public item descriptions.
 */
export function maskPrivateData(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '•••••@•••••')
    .replace(/\b(?:\+?\d[\d\s-]{7,}\d)\b/g, '••••••••');
}

export function isSensitiveCategory(categorySlug: string): boolean {
  return ['id-card', 'wallet', 'documents', 'certificates', 'passport', 'debit-card', 'credit-card'].includes(
    categorySlug,
  );
}