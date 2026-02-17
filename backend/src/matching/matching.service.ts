import { Injectable } from '@nestjs/common';

@Injectable()
export class MatchingService {
  score(human: any, task: any) {
    const skillOverlap = task.requiredSkills.filter((s: string) => human.skills.includes(s)).length;
    const availability = human.availability ? 2 : 0;
    const proximity = human.city && task.city && human.city === task.city ? 2 : 0;
    const rating = Math.round((human.rating || 0));
    return skillOverlap * 3 + availability + proximity + rating;
  }
}
