import { BadRequestException, Injectable } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';

const allowed: Record<TaskStatus, TaskStatus[]> = {
  DRAFT: ['POSTED'],
  POSTED: ['INVITED', 'OPEN'],
  INVITED: ['ASSIGNED'],
  OPEN: ['ASSIGNED'],
  ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['REVIEW', 'DISPUTED'],
  REVIEW: ['COMPLETED', 'DISPUTED'],
  COMPLETED: [],
  DISPUTED: ['COMPLETED', 'CANCELED'],
  CANCELED: []
};

@Injectable()
export class TaskLifecycleService {
  transition(current: TaskStatus, next: TaskStatus) {
    if (!allowed[current].includes(next)) throw new BadRequestException(`Invalid transition ${current} -> ${next}`);
    return next;
  }
}
