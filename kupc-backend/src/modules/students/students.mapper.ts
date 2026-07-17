import type { ResumeRecord } from '../../database/resumes.repository';
import type { StudentRecord } from '../../database/students.repository';
import type {
  ActiveResumeSummary,
  StudentProfileDto,
  StudentPublicCardDto,
  UpdateStudentProfileInput
} from './students.types';
import type { UpdateStudentProfileBody } from './students.validation';

function toCgpa(value: number | string | null): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

export function toActiveResumeSummary(resume: ResumeRecord): ActiveResumeSummary {
  return {
    id: resume.id,
    file_name: resume.file_name,
    uploaded_at: resume.uploaded_at
  };
}

export function toStudentProfileDto(
  student: StudentRecord,
  activeResume: ActiveResumeSummary | null = null
): StudentProfileDto {
  return {
    id: student.id,
    ku_id: student.ku_id,
    full_name: student.full_name,
    graduation_year: student.graduation_year,
    department: student.department,
    phone: student.phone,
    degree: student.degree,
    cgpa: toCgpa(student.cgpa),
    bio: student.bio,
    profile_picture_url: student.profile_picture_url,
    resume_id: student.resume_id,
    active_resume: activeResume,
    created_at: student.created_at,
    updated_at: student.updated_at
  };
}

export function toStudentPublicCardDto(student: StudentRecord): StudentPublicCardDto {
  return {
    id: student.id,
    full_name: student.full_name,
    graduation_year: student.graduation_year,
    department: student.department,
    degree: student.degree,
    cgpa: toCgpa(student.cgpa),
    bio: student.bio,
    profile_picture_url: student.profile_picture_url,
    resume_id: student.resume_id,
    created_at: student.created_at,
    updated_at: student.updated_at
  };
}

/** Map validated snake_case PATCH body → camelCase service input. */
export function toUpdateStudentProfileInput(body: UpdateStudentProfileBody): UpdateStudentProfileInput {
  const input: UpdateStudentProfileInput = {};

  if (body.full_name !== undefined) input.fullName = body.full_name;
  if (body.phone !== undefined) input.phone = body.phone;
  if (body.degree !== undefined) input.degree = body.degree;
  if (body.cgpa !== undefined) input.cgpa = body.cgpa;
  if (body.bio !== undefined) input.bio = body.bio;
  if (body.department !== undefined) input.department = body.department;
  if (body.graduation_year !== undefined) input.graduationYear = body.graduation_year;

  return input;
}
