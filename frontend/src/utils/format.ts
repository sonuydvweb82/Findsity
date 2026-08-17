export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function formatDate(value: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', opts ?? { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function timeAgo(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function titleCase(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .split(/[\s_]+/)
    .map((w) => (w.length ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export function posterLabel(poster?: { name?: string | null; college?: string | null } | null): string {
  const name = poster?.name?.trim();
  if (!name) return 'Campus member';
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (parts.length > 1 && last) {
    return `${first} ${last[0]}.`;
  }
  return first;
}

export const RISK_LABELS: Record<string, string> = {
  low: 'Low risk',
  medium: 'Medium risk',
  high: 'High risk',
};

export const CLAIM_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending review',
  more_info: 'More info needed',
  approved: 'Approved',
  rejected: 'Rejected',
  escalated: 'Escalated',
  closed: 'Closed',
  returned: 'Returned',
};

export const ITEM_STATUS_LABELS: Record<string, string> = {
  lost: 'Still lost',
  found: 'Available',
  return_pending: 'Return in progress',
  returned: 'Returned',
};