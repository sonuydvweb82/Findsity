/**
 * Risk-based claim verification.
 *
 * The risk level is determined automatically from the item's category and
 * identifying keywords — users can never choose it manually.
 */

const HIGH_RISK_CATEGORIES = new Set(['id-card', 'wallet', 'documents', 'certificates', 'passport', 'cards']);
const LOW_RISK_CATEGORIES = new Set(['books', 'clothing', 'stationery', 'water-bottle', 'other']);

const HIGH_RISK_KEYWORDS = [
  'phone', 'iphone', 'samsung', 'pixel', 'oneplus', 'laptop', 'macbook', 'tablet', 'ipad',
  'camera', 'airpods', 'watch series', 'apple watch', 'drone', 'console', 'switch', 'ps5', 'ps4',
  'wallet', 'card', 'passport', 'certificate', 'id card', 'airpods',
];

export type RiskLevel = 'low' | 'medium' | 'high';

export function computeRiskLevel(
  categorySlug: string,
  name = '',
  brand = '',
  model = '',
  description = '',
): RiskLevel {
  const text = `${name} ${brand} ${model} ${description}`.toLowerCase();

  if (HIGH_RISK_CATEGORIES.has(categorySlug)) return 'high';
  if (HIGH_RISK_KEYWORDS.some((k) => text.includes(k))) return 'high';
  if (LOW_RISK_CATEGORIES.has(categorySlug)) return 'low';

  return 'medium';
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const RISK_DESCRIPTIONS: Record<RiskLevel, string> = {
  low: 'Basic verification. The finder reviews the claim and approves or rejects it.',
  medium:
    'Detailed ownership questions and optional proof of ownership are required. The finder reviews before deciding.',
  high:
    'Strong verification required: ownership questions, proof of ownership, and admin review before approval.',
};