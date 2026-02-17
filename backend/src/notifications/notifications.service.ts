import { Injectable } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';

@Injectable()
export class NotificationsService {
  private queue = new Queue('notifications', { connection: { url: process.env.REDIS_URL || 'redis://redis:6379' } as any });
  constructor() {
    new Worker('notifications', async job => { console.log('Mock email notification:', job.data); }, { connection: { url: process.env.REDIS_URL || 'redis://redis:6379' } as any });
  }
  sendEmail(data: any) { return this.queue.add('email', data); }
}
