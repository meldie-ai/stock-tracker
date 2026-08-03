export const ADJUST_DEDUCTION_REASONS = [
  "Damaged",
  "Miscount / correction",
  "Staff freebie",
  "Theft or loss",
  "Other",
] as const;

export type AdjustDeductionReason = (typeof ADJUST_DEDUCTION_REASONS)[number];
