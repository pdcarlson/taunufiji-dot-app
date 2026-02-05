import { BaseEntity } from "./base.entity";
import { LedgerSchema } from "./appwrite.schema";

export type LedgerEntry = BaseEntity & LedgerSchema;
