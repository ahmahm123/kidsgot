import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { PrismaService } from '../prisma/prisma.service';
import { createHash, randomBytes } from 'crypto';

@Module({ controllers: [AdminController], providers: [PrismaService] })
export class AdminModule {}
