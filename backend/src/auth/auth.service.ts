import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(email: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('Email already exists');
    const verifyToken = randomBytes(16).toString('hex');
    const user = await this.prisma.user.create({ data: { email, passwordHash: await bcrypt.hash(password, 10), verifyToken } });
    console.log(`Verify token for ${email}: ${verifyToken}`);
    return { id: user.id, email: user.email };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new UnauthorizedException('Invalid credentials');
    const token = this.jwt.sign({ sub: user.id, role: user.role, email: user.email });
    return { accessToken: token, user: { id: user.id, role: user.role, verified: user.verified } };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({ where: { verifyToken: token } });
    if (!user) throw new BadRequestException('Invalid token');
    await this.prisma.user.update({ where: { id: user.id }, data: { verified: true, verifyToken: null } });
    return { success: true };
  }
}
