import { PickleballSkill } from '../../common/player-skill.enum';

export interface PracticeSkillMetricDto {
  skill: PickleballSkill;
  attempts: number;
  successes: number;
}

export class CreatePracticeSessionDto {
  tournamentId: string;
  playerId: string;
  focus: string;
  location?: string;
  durationMinutes: number;
  practiceDate: string;
  skillMetrics: PracticeSkillMetricDto[];
}
