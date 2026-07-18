import type { StudentRecord } from '../../database/students.repository';
import type { SwipeRecord } from '../../database/swipes.repository';
import type { CreateSwipeBody } from './swipes.validation';
import type {
  CreateSwipeServiceInput,
  InboundSwipeDto,
  SwipeDto,
  SwipeStudentSummaryDto
} from './swipes.types';

export function toSwipeDto(swipe: SwipeRecord): SwipeDto {
  return {
    id: swipe.id,
    student_id: swipe.student_id,
    company_id: swipe.company_id,
    job_id: swipe.job_id,
    direction: swipe.direction,
    swiped_at: swipe.swiped_at
  };
}

export function toSwipeStudentSummaryDto(student: StudentRecord): SwipeStudentSummaryDto {
  return {
    id: student.id,
    full_name: student.full_name,
    department: student.department,
    graduation_year: student.graduation_year,
    avatar_url: student.profile_picture_url
  };
}

export function toInboundSwipeDto(
  swipe: SwipeRecord,
  student: StudentRecord,
  job: { id: string; title: string; status: string }
): InboundSwipeDto {
  return {
    swipe: toSwipeDto(swipe),
    student: toSwipeStudentSummaryDto(student),
    job: {
      id: job.id,
      title: job.title,
      status: job.status
    }
  };
}

export function toCreateSwipeServiceInput(body: CreateSwipeBody): CreateSwipeServiceInput {
  return {
    jobId: body.job_id,
    direction: body.direction
  };
}
