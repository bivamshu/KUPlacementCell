import type { StudentRecord } from '../database/students.repository';
import {
  toStudentProfileDto,
  toStudentPublicCardDto,
  toUpdateStudentProfileInput
} from '../modules/students/students.mapper';

const student: StudentRecord = {
  id: '550e8400-e29b-41d4-a716-446655440010',
  ku_id: '078bct000',
  full_name: 'Test Student',
  graduation_year: 2026,
  department: 'Computer Engineering',
  phone: '9800000000',
  degree: 'B.E.',
  cgpa: 3.25,
  bio: 'Hello',
  profile_picture_url: null,
  resume_id: null,
  created_at: '2026-07-10T10:00:00.000Z',
  updated_at: '2026-07-11T10:00:00.000Z'
};

describe('Phase 5 Milestone B1 - student mappers', () => {
  it('maps full profile DTO including private fields', () => {
    const dto = toStudentProfileDto(student, null);
    expect(dto.ku_id).toBe('078bct000');
    expect(dto.phone).toBe('9800000000');
    expect(dto.cgpa).toBe(3.25);
    expect(dto.active_resume).toBeNull();
  });

  it('public card omits phone and ku_id', () => {
    const card = toStudentPublicCardDto(student);
    expect(card).not.toHaveProperty('phone');
    expect(card).not.toHaveProperty('ku_id');
    expect(card.full_name).toBe('Test Student');
  });

  it('maps snake_case PATCH body to camelCase update input', () => {
    expect(
      toUpdateStudentProfileInput({
        bio: 'Updated',
        graduation_year: 2027,
        cgpa: 3.8,
        phone: null
      })
    ).toEqual({
      bio: 'Updated',
      graduationYear: 2027,
      cgpa: 3.8,
      phone: null
    });
  });
});
