import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { PrismaService } from '../prisma/prisma.service';
import { TasksService } from '../tasks/tasks.service';
import { TaskLifecycleService } from '../state-machine/task-lifecycle.service';
import { MatchingService } from '../matching/matching.service';

@Module({ controllers: [AgentController], providers: [PrismaService, TasksService, TaskLifecycleService, MatchingService] })
export class AgentModule {}
