import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

export const sellSchema = z.object({
  quantity: z.number().int().positive().max(100_000),
  paymentMethod: z.enum(["CASH", "CARD"]),
});

export const adjustSchema = z.object({
  mode: z.enum(["set", "delta"]),
  value: z.number().int().max(1_000_000),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(200),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  sortOrder: z.number().int().optional(),
});

export const createProductSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  stockCount: z.number().int().min(0).max(1_000_000).optional(),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  categoryId: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
  linkedCartonProductId: z.string().min(1).nullable().optional(),
});

export const createStaffSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(200),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8).max(200),
});

export const priceSchema = z.object({
  cashPriceCents: z.number().int().min(0).max(1_000_000).nullable().optional(),
  cardPriceCents: z.number().int().min(0).max(1_000_000).nullable().optional(),
  dealNote: z.string().trim().max(60).nullable().optional(),
});
