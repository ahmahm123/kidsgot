import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { createHash, randomBytes } from 'crypto';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private prisma: PrismaService) {}
  private ensureAdmin(req: any) { if (req.user.role !== 'ADMIN') throw new ForbiddenException(); }

  @Post('agent-clients')
  async createAgent(@Req() req: any, @Body() b: any) {
    this.ensureAdmin(req);
    const raw = randomBytes(24).toString('hex');
    const apiKeyHash = createHash('sha256').update(raw).digest('hex');
    const agent = await this.prisma.agentClient.create({ data: { name: b.name, apiKeyHash } });
    return { ...agent, apiKey: raw };
  }

  @Get('disputes') disputes(@Req() req: any) { this.ensureAdmin(req); return this.prisma.task.findMany({ where: { status: 'DISPUTED' } }); }
  @Post('disputes/:taskId/resolve')
  async resolve(@Req() req: any, @Param('taskId') taskId: string, @Body() b: any) {
    this.ensureAdmin(req);
    const status = b.result === 'completed' ? 'COMPLETED' : 'CANCELED';
    await this.prisma.escrow.updateMany({ where: { taskId }, data: { status: 'RESOLVED' } });
    return this.prisma.task.update({ where: { id: taskId }, data: { status } });
  }

  @Get('audit-logs') logs(@Req() req: any) { this.ensureAdmin(req); return this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }); }
  @Patch('users/:id/trusted') trusted(@Req() req: any, @Param('id') id: string, @Body() b: any) { this.ensureAdmin(req); return this.prisma.user.update({ where: { id }, data: { trusted: b.trusted } }); }
}
