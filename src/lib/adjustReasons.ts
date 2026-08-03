export const ADJUST_DEDUCTION_REASONS = [
  "Damaged",
  "Miscount / correction",
  "Theft or loss",
  "Other",
] as const;

export type AdjustDeductionReason = (typeof ADJUST_DEDUCTION_REASONS)[number];
