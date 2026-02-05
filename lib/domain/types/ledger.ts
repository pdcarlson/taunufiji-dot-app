/**
 * Ledger Entity
 */
import { z } from "zod";
import { BaseEntitySchema } from "./base";

export const LedgerCategorySchema = z.enum(["task", "fine", "event", "manual"]);

export const LedgerEntrySchema = BaseEntitySchema.extend({
  amount: z.number(),
  reason: z.string(),
  category: LedgerCategorySchema,
  timestamp: z.string(),
  user_id: z.string(),
  is_debit: z.boolean().optional(),
});

export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

export const CreateLedgerDTOSchema = LedgerEntrySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateLedgerDTO = z.infer<typeof CreateLedgerDTOSchema>;
