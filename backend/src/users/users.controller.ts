import { Body, Controller, Get, Put, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private users: UsersService) {}
  @Get('profile') profile(@Req() req: any) { return this.users.getProfile(req.user.userId); }
  @Put('profile') update(@Req() req: any, @Body() body: any) { return this.users.upsertProfile(req.user.userId, body); }
  @Get('wallet') wallet(@Req() req: any) { return this.users.wallet(req.user.userId); }
}
