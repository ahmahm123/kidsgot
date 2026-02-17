import { MatchingService } from './matching.service';

describe('MatchingService', () => {
  it('scores overlap availability and proximity', () => {
    const s = new MatchingService();
    const score = s.score({ skills:['a','b'], availability:true, city:'Berlin', rating:4.6 }, { requiredSkills:['a'], city:'Berlin' });
    expect(score).toBeGreaterThan(8);
  });
});
