import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}
  getProfile(userId: string) { return this.prisma.humanProfile.findUnique({ where: { userId } }); }
  upsertProfile(userId: string, data: any) { return this.prisma.humanProfile.upsert({ where: { userId }, update: data, create: { userId, ...data } }); }
  async wallet(userId: string) {
    const payouts = await this.prisma.payout.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return { payouts };
  }
}
