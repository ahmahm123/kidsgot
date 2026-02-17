import { Body, Controller, Get, Param, Post, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TasksService } from './tasks.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private tasks: TasksService) {}
  @Get('me/tasks') list(@Req() req: any) { return this.tasks.listForHuman(req.user.userId); }
  @Post('tasks/:id/accept') accept(@Param('id') id: string, @Req() req: any) { return this.tasks.accept(id, req.user.userId); }
  @Post('tasks/:id/decline') decline(@Param('id') id: string, @Req() req: any) { return this.tasks.decline(id, req.user.userId); }
  @Get('tasks/:id') get(@Param('id') id: string) { return this.tasks.getTask(id); }
  @Post('tasks/:id/messages') message(@Param('id') id: string, @Body() b: any) { return this.tasks.message(id, 'human', b.content); }
  @Post('tasks/:id/submissions')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'proof', maxCount: 5 }], { storage: diskStorage({ destination: 'uploads', filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${extname(file.originalname)}`) }) }))
  sub(@Param('id') id: string, @Req() req: any, @Body() b: any, @UploadedFiles() files: any) {
    const proof = (files?.proof || []).map((f: any) => `/uploads/${f.filename}`);
    return this.tasks.submission(id, req.user.userId, b.note, proof);
  }
  @Post('tasks/:id/mark-complete') mark(@Param('id') id: string, @Req() req: any) { return this.tasks.markComplete(id, req.user.userId); }
}
