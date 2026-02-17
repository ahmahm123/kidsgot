import { TaskLifecycleService } from './task-lifecycle.service';

describe('TaskLifecycleService', () => {
  it('allows valid transition', () => {
    const s = new TaskLifecycleService();
    expect(s.transition('DRAFT' as any, 'POSTED' as any)).toEqual('POSTED');
  });
  it('rejects invalid transition', () => {
    const s = new TaskLifecycleService();
    expect(() => s.transition('DRAFT' as any, 'ASSIGNED' as any)).toThrow();
  });
});
