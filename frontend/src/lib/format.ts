export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  if (Number.isNaN(date.getTime())) {
    return "unknown time";
  }

  const diffMs = now.getTime() - date.getTime();
  const isFuture = diffMs < 0;
  const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);

  if (diffSeconds < 60) {
    return isFuture ? "in a moment" : "just now";
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return isFuture ? `in ${diffMinutes}m` : `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return isFuture ? `in ${diffHours}h` : `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return isFuture ? `in ${diffDays}d` : `${diffDays}d ago`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return isFuture ? `in ${diffMonths}mo` : `${diffMonths}mo ago`;
  }

  const diffYears = Math.floor(diffDays / 365);
  return isFuture ? `in ${diffYears}y` : `${diffYears}y ago`;
}
