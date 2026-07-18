import type { SwipeDirection } from './swipes.constants';

/** Wire DTO — snake_case. */
export type SwipeDto = {
  id: string;
  student_id: string;
  company_id: string;
  job_id: string;
  direction: SwipeDirection;
  swiped_at: string;
};

/** Nested student summary on company inbound list (B4). */
export type SwipeStudentSummaryDto = {
  id: string;
  full_name: string;
  department: string | null;
  graduation_year: number | null;
  avatar_url: string | null;
};

/** Company inbound interest card (B4). */
export type InboundSwipeDto = {
  swipe: SwipeDto;
  student: SwipeStudentSummaryDto;
  job: {
    id: string;
    title: string;
    status: string;
  };
};

/** Service create input (camelCase) from POST /swipes body. */
export type CreateSwipeServiceInput = {
  jobId: string;
  direction: SwipeDirection;
};
