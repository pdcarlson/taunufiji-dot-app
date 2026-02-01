import { BaseEntity } from "./base.entity";

export interface LibraryResource extends BaseEntity {
  department: string;
  course_number: string;
  course_name: string;
  professor: string;
  semester: string;
  year: number;
  type: string;
  version: string;
  original_filename: string;
  file_s3_key: string;
  uploaded_by: string;
}
