import type { MatchRecord } from '../database/matches.repository';
import type { SwipeRecord } from '../database/swipes.repository';
import { toMatchDto, toCreateMatchServiceInput } from '../modules/matches/matches.mapper';
import { toSwipeDto, toCreateSwipeServiceInput } from '../modules/swipes/swipes.mapper';

describe('Phase 7 B1 - swipe/match mappers', () => {
  it('toSwipeDto maps repository row to snake_case DTO', () => {
    const row: SwipeRecord = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      student_id: '550e8400-e29b-41d4-a716-446655440010',
      company_id: '550e8400-e29b-41d4-a716-446655440020',
      job_id: '550e8400-e29b-41d4-a716-446655440030',
      direction: 'right',
      swiped_at: '2026-07-18T12:00:00.000Z'
    };

    expect(toSwipeDto(row)).toEqual({
      id: row.id,
      student_id: row.student_id,
      company_id: row.company_id,
      job_id: row.job_id,
      direction: 'right',
      swiped_at: row.swiped_at
    });
  });

  it('toCreateSwipeServiceInput maps snake_case body to camelCase', () => {
    expect(
      toCreateSwipeServiceInput({
        job_id: '550e8400-e29b-41d4-a716-446655440030',
        direction: 'left'
      })
    ).toEqual({
      jobId: '550e8400-e29b-41d4-a716-446655440030',
      direction: 'left'
    });
  });

  it('toMatchDto maps repository row to snake_case DTO', () => {
    const row: MatchRecord = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      student_id: '550e8400-e29b-41d4-a716-446655440010',
      company_id: '550e8400-e29b-41d4-a716-446655440020',
      job_id: '550e8400-e29b-41d4-a716-446655440030',
      matched_at: '2026-07-18T12:00:00.000Z'
    };

    expect(toMatchDto(row)).toEqual({
      id: row.id,
      student_id: row.student_id,
      company_id: row.company_id,
      job_id: row.job_id,
      matched_at: row.matched_at
    });
  });

  it('toCreateMatchServiceInput maps snake_case body to camelCase', () => {
    expect(
      toCreateMatchServiceInput({
        job_id: '550e8400-e29b-41d4-a716-446655440030',
        student_id: '550e8400-e29b-41d4-a716-446655440010'
      })
    ).toEqual({
      jobId: '550e8400-e29b-41d4-a716-446655440030',
      studentId: '550e8400-e29b-41d4-a716-446655440010'
    });
  });
});
