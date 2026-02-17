import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { PrismaService } from '../prisma/prisma.service';
import { TaskLifecycleService } from '../state-machine/task-lifecycle.service';
import { MatchingService } from '../matching/matching.service';

@Module({ controllers: [TasksController], providers: [TasksService, PrismaService, TaskLifecycleService, MatchingService], exports: [TasksService, TaskLifecycleService] })
export class TasksModule {}
