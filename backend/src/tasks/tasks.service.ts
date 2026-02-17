import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskLifecycleService } from '../state-machine/task-lifecycle.service';
import { EscrowStatus, InvitationStatus } from '@prisma/client';

const BLOCKLIST = ['fraud', 'weapon', 'violence'];

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService, private lifecycle: TaskLifecycleService) {}

  listForHuman(userId: string) {
    return this.prisma.task.findMany({
      where: {
        OR: [{ invitations: { some: { userId, status: InvitationStatus.PENDING } } }, { status: 'OPEN' }]
      }
    });
  }

  getTask(id: string) { return this.prisma.task.findUnique({ where: { id }, include: { messages: true, submissions: true, escrow: true, assignment: true } }); }

  async accept(taskId: string, userId: string) {
    const task = await this.getTask(taskId);
    if (!task) throw new BadRequestException('Task not found');
    if (task.assignment) throw new BadRequestException('Already assigned');
    const next = this.lifecycle.transition(task.status, 'ASSIGNED');
    await this.prisma.taskInvitation.updateMany({ where: { taskId, userId }, data: { status: 'ACCEPTED' } });
    await this.prisma.taskAssignment.create({ data: { taskId, userId } });
    return this.prisma.task.update({ where: { id: taskId }, data: { status: next } });
  }

  decline(taskId: string, userId: string) { return this.prisma.taskInvitation.updateMany({ where: { taskId, userId }, data: { status: 'DECLINED' } }); }
  message(taskId: string, senderType: string, content: string) { return this.prisma.message.create({ data: { taskId, senderType, content } }); }

  async submission(taskId: string, userId: string, note: string, proofFiles: string[]) {
    return this.prisma.submission.create({ data: { taskId, userId, note, proofFiles } });
  }

  async markComplete(taskId: string, userId: string) {
    const task = await this.getTask(taskId);
    if (task?.assignment?.userId !== userId) throw new BadRequestException('Not assigned');
    return this.prisma.task.update({ where: { id: taskId }, data: { status: this.lifecycle.transition(task.status, 'REVIEW') } });
  }

  checkPolicy(text: string) {
    if (BLOCKLIST.some(k => text.toLowerCase().includes(k))) throw new BadRequestException('Task violates policy');
  }

  async release(taskId: string) {
    const task = await this.getTask(taskId);
    if (!task?.escrow || task.escrow.status !== EscrowStatus.FUNDED) throw new BadRequestException('Escrow not funded');
    if (task.status !== 'REVIEW') throw new BadRequestException('Task not in REVIEW');
    await this.prisma.escrow.update({ where: { taskId }, data: { status: 'RELEASED', releasedAt: new Date() } });
    await this.prisma.payout.create({ data: { userId: task.assignment!.userId, taskId, amount: task.budget, status: 'PAID' } });
    return this.prisma.task.update({ where: { id: taskId }, data: { status: 'COMPLETED' } });
  }

  async dispute(taskId: string) {
    const task = await this.getTask(taskId);
    if (!task || !['REVIEW', 'IN_PROGRESS'].includes(task.status)) throw new BadRequestException('Cannot dispute');
    await this.prisma.escrow.updateMany({ where: { taskId }, data: { status: 'DISPUTED' } });
    return this.prisma.task.update({ where: { id: taskId }, data: { status: 'DISPUTED' } });
  }
}
