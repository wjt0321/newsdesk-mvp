/**
 * Shared status badge style mappings.
 * Usage: `statusBadgeStyles.success` returns `{ bg: "...", text: "..." }`.
 *
 * These map semantic intent → tailwind class names using design tokens
 * defined in tailwind.config.js (success, danger, amber, etc.).
 */

export type StatusTone = "success" | "warning" | "danger" | "neutral";

export const statusBadgeStyles: Record<
  StatusTone,
  { bg: string; text: string }
> = {
  success: { bg: "bg-success-light", text: "text-success" },
  warning: { bg: "bg-warning-light", text: "text-amber" },
  danger: { bg: "bg-danger-light", text: "text-danger" },
  neutral: { bg: "bg-muted-light", text: "text-text-secondary" },
};

/**
 * Returns combined badge className string for a given tone.
 * Example: `badgeClassName("success")` → `"bg-success-light text-success"`
 */
export function badgeClassName(tone: StatusTone): string {
  const s = statusBadgeStyles[tone];
  return `${s.bg} ${s.text}`;
}
