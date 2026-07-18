import type { SwipeRecord } from '../../database/swipes.repository';
import type { CreateSwipeBody } from './swipes.validation';
import type { CreateSwipeServiceInput, SwipeDto } from './swipes.types';

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

export function toCreateSwipeServiceInput(body: CreateSwipeBody): CreateSwipeServiceInput {
  return {
    jobId: body.job_id,
    direction: body.direction
  };
}
