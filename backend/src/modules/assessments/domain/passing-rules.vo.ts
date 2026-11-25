export interface PassingRulesProps {
  passingScorePercent: number;
  maxAttempts: number | null;
  delayBetweenAttemptsMinutes: number | null;
  timeLimitMinutes: number | null;
}

/**
 * ENT-28: "note minimale, nombre maximal de tentatives, délai entre
 * tentatives, durée limite." Partagé par Quiz et Exam, qui ont la même
 * structure de règles de passage (section 4.1, modules Assessments).
 */
export class PassingRules {
  private constructor(private readonly props: PassingRulesProps) {}

  static create(props: PassingRulesProps): PassingRules {
    return new PassingRules(props);
  }

  get passingScorePercent(): number {
    return this.props.passingScorePercent;
  }

  get maxAttempts(): number | null {
    return this.props.maxAttempts;
  }

  get delayBetweenAttemptsMinutes(): number | null {
    return this.props.delayBetweenAttemptsMinutes;
  }

  get timeLimitMinutes(): number | null {
    return this.props.timeLimitMinutes;
  }

  isScoreSufficient(scorePercent: number): boolean {
    return scorePercent >= this.props.passingScorePercent;
  }

  /**
   * RG-10: "lorsque les tentatives sont épuisées, l'évaluation est
   * bloquée [...] seul un gestionnaire peut accorder de nouvelles
   * tentatives" (ENT-31). `extraAttemptsGranted` est la somme des bonus
   * accordés à cette inscription précise, jamais une modification du
   * plafond global qui affecterait les autres apprenants.
   */
  hasAttemptsRemaining(attemptsUsed: number, extraAttemptsGranted = 0): boolean {
    if (this.props.maxAttempts === null) return true;
    return attemptsUsed < this.props.maxAttempts + extraAttemptsGranted;
  }

  /** ENT-28: délai minimum entre deux tentatives. */
  canRetryAt(lastAttemptAt: Date, now: Date = new Date()): boolean {
    if (this.props.delayBetweenAttemptsMinutes === null) {
      return true;
    }
    const nextAllowed = new Date(lastAttemptAt);
    nextAllowed.setMinutes(nextAllowed.getMinutes() + this.props.delayBetweenAttemptsMinutes);
    return now >= nextAllowed;
  }

  /** RG-12/ENT-36: chronomètre géré côté serveur — jamais fait confiance au client. */
  hasTimeLimitElapsed(startedAt: Date, now: Date = new Date()): boolean {
    if (this.props.timeLimitMinutes === null) {
      return false;
    }
    const deadline = new Date(startedAt);
    deadline.setMinutes(deadline.getMinutes() + this.props.timeLimitMinutes);
    return now > deadline;
  }
}
