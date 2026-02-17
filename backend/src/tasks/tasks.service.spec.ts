import { BadRequestException } from '@nestjs/common';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  const lifecycle = { transition: jest.fn(() => 'ASSIGNED') } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects accepting invited tasks without a pending invitation', async () => {
    const tx = {
      task: {
        findUnique: jest.fn().mockResolvedValue({ id: 't1', status: 'INVITED', assignment: null }),
        update: jest.fn()
      },
      taskInvitation: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      taskAssignment: { create: jest.fn() }
    };
    const prisma = {
      $transaction: jest.fn(async (cb: any) => cb(tx))
    } as any;

    const service = new TasksService(prisma, lifecycle);
    await expect(service.accept('t1', 'u1')).rejects.toThrow(new BadRequestException('No pending invitation for this task'));
    expect(tx.taskAssignment.create).not.toHaveBeenCalled();
  });

  it('rejects submission from non-assigned users', async () => {
    const prisma = {} as any;
    const service = new TasksService(prisma, lifecycle);
    jest.spyOn(service, 'getTask').mockResolvedValue({
      id: 't1',
      assignment: { userId: 'someone-else' }
    } as any);

    await expect(service.submission('t1', 'u1', 'note', ['file'])).rejects.toThrow(new BadRequestException('Not assigned'));
  });
});
