type NextTaskStatus = 'INVITED' | 'OPEN';

  constructor(
    private prisma: PrismaService,
    private tasks: TasksService,
    private lifecycle: TaskLifecycleService
  ) {}
  private async getOwnedTask(taskId: string, agentId: string) {
    return task;
  }

  private async transitionOwnedTask(taskId: string, agentId: string, nextStatus: NextTaskStatus) {
    const task = await this.getOwnedTask(taskId, agentId);
    const next = this.lifecycle.transition(task.status, nextStatus);
    return this.prisma.task.update({ where: { id: taskId }, data: { status: next } });
    const filtered = profiles.filter((p: any) => (!q.skills || q.skills.split(',').every((s: string) => p.skills.includes(s))) && (!q.city || p.city === q.city) && (!q.availability || p.availability));
    return this.transitionOwnedTask(id, req.agent.id, 'OPEN');
    await this.getOwnedTask(id, req.agent.id);
    await this.prisma.auditLog.create({ data: { actorType: 'agent', actorId: req.agent.id, action: 'funded', entityType: 'Task', entityId: id } });
    await this.getOwnedTask(id, req.agent.id);
    await this.getOwnedTask(id, req.agent.id);

    await this.getOwnedTask(id, req.agent.id);
    await this.getOwnedTask(id, req.agent.id);
    const profiles = await this.prisma.humanProfile.findMany({ include: { user: true } });
    const filtered = profiles.filter(p => (!q.skills || q.skills.split(',').every((s: string) => p.skills.includes(s))) && (!q.city || p.city === q.city) && (!q.availability || p.availability));
    return filtered;
  }

  @Post('tasks')
  async createTask(@Req() req: any, @Body() b: any) {
    this.tasks.checkPolicy(`${b.title} ${b.description}`);
    const task = await this.prisma.task.create({ data: { createdByAgentId: req.agent.id, ...b, status: 'DRAFT' } });
    await this.prisma.auditLog.create({ data: { actorType: 'agent', actorId: req.agent.id, action: 'task_created', entityType: 'Task', entityId: task.id } });
    return task;
  }

  @Post('tasks/:id/invite')
  async invite(@Param('id') id: string, @Body() b: any) {
    await this.prisma.task.update({ where: { id }, data: { status: 'INVITED' } });
    return this.prisma.taskInvitation.createMany({ data: b.userIds.map((u: string) => ({ taskId: id, userId: u })) });
  }

  @Post('tasks/:id/post-open') postOpen(@Param('id') id: string) { return this.prisma.task.update({ where: { id }, data: { status: 'OPEN' } }); }

  @Post('tasks/:id/fund-escrow')
  async fund(@Param('id') id: string, @Body() b: any) {
    await this.prisma.auditLog.create({ data: { actorType: 'agent', action: 'funded', entityType: 'Task', entityId: id } });
    return this.prisma.escrow.upsert({ where: { taskId: id }, update: { status: 'FUNDED', fundedAt: new Date(), amount: b.amount }, create: { taskId: id, amount: b.amount, status: 'FUNDED', fundedAt: new Date() } });
  }

  @Post('tasks/:id/messages') message(@Param('id') id: string, @Body() b: any) { return this.tasks.message(id, 'agent', b.content); }
  @Get('tasks/:id') get(@Param('id') id: string) { return this.tasks.getTask(id); }
  @Post('tasks/:id/approve') approve(@Param('id') id: string) { return this.tasks.release(id); }
  @Post('tasks/:id/dispute') dispute(@Param('id') id: string) { return this.tasks.dispute(id); }
}
