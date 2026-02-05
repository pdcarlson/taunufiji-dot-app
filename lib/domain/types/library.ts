/**
 * Library Resource Entity
 */
import { z } from "zod";
import { BaseEntitySchema } from "./base";

export const LibraryResourceSchema = BaseEntitySchema.extend({
  department: z.string(),
  course_number: z.string(),
  course_name: z.string(),
  professor: z.string(),
  semester: z.string(),
  year: z.number(),
  type: z.string(),
  version: z.string(),
  original_filename: z.string(),
  file_s3_key: z.string(),
  uploaded_by: z.string(),
});

export type LibraryResource = z.infer<typeof LibraryResourceSchema>;
