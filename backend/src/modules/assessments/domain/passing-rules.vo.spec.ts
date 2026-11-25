import { PassingRules } from "./passing-rules.vo";

describe("PassingRules - isScoreSufficient", () => {
  it("evaluates a sufficient score against the threshold", () => {
    const rules = PassingRules.create({
      passingScorePercent: 60,
      maxAttempts: null,
      delayBetweenAttemptsMinutes: null,
      timeLimitMinutes: null,
    });

    expect(rules.isScoreSufficient(60)).toBe(true);
    expect(rules.isScoreSufficient(59)).toBe(false);
    expect(rules.isScoreSufficient(100)).toBe(true);
  });
});

describe("PassingRules - hasAttemptsRemaining (RG-10)", () => {
    it("allows unlimited attempts when maxAttempts is null", () => {
      const rules = PassingRules.create({
        passingScorePercent: 60,
        maxAttempts: null,
        delayBetweenAttemptsMinutes: null,
        timeLimitMinutes: null,
      });
      expect(rules.hasAttemptsRemaining(1000)).toBe(true);
    });

    it("blocks once the configured maximum is reached", () => {
      const rules = PassingRules.create({
        passingScorePercent: 60,
        maxAttempts: 3,
        delayBetweenAttemptsMinutes: null,
        timeLimitMinutes: null,
      });
      expect(rules.hasAttemptsRemaining(2)).toBe(true);
      expect(rules.hasAttemptsRemaining(3)).toBe(false);
    });

    it("extends the limit with extra attempts granted by a manager (ENT-31)", () => {
      const rules = PassingRules.create({
        passingScorePercent: 60,
        maxAttempts: 3,
        delayBetweenAttemptsMinutes: null,
        timeLimitMinutes: null,
      });
      expect(rules.hasAttemptsRemaining(3, 1)).toBe(true);
      expect(rules.hasAttemptsRemaining(4, 1)).toBe(false);
    });
});

describe("PassingRules - canRetryAt (ENT-28 delay between attempts)", () => {
    it("always allows retry when no delay is configured", () => {
      const rules = PassingRules.create({
        passingScorePercent: 60,
        maxAttempts: null,
        delayBetweenAttemptsMinutes: null,
        timeLimitMinutes: null,
      });
      expect(rules.canRetryAt(new Date())).toBe(true);
    });

    it("blocks retry before the delay has elapsed", () => {
      const rules = PassingRules.create({
        passingScorePercent: 60,
        maxAttempts: null,
        delayBetweenAttemptsMinutes: 30,
        timeLimitMinutes: null,
      });
      const lastAttempt = new Date();
      const tenMinutesLater = new Date(lastAttempt.getTime() + 10 * 60 * 1000);
      expect(rules.canRetryAt(lastAttempt, tenMinutesLater)).toBe(false);
    });

    it("allows retry once the delay has elapsed", () => {
      const rules = PassingRules.create({
        passingScorePercent: 60,
        maxAttempts: null,
        delayBetweenAttemptsMinutes: 30,
        timeLimitMinutes: null,
      });
      const lastAttempt = new Date();
      const thirtyOneMinutesLater = new Date(lastAttempt.getTime() + 31 * 60 * 1000);
      expect(rules.canRetryAt(lastAttempt, thirtyOneMinutesLater)).toBe(true);
    });
});

describe("PassingRules - hasTimeLimitElapsed (RG-12/ENT-36, server-side clock)", () => {
    it("never elapses when no time limit is configured", () => {
      const rules = PassingRules.create({
        passingScorePercent: 60,
        maxAttempts: null,
        delayBetweenAttemptsMinutes: null,
        timeLimitMinutes: null,
      });
      const longAgo = new Date(Date.now() - 1000 * 60 * 60 * 24);
      expect(rules.hasTimeLimitElapsed(longAgo)).toBe(false);
    });

    it("has not elapsed before the time limit", () => {
      const rules = PassingRules.create({
        passingScorePercent: 60,
        maxAttempts: null,
        delayBetweenAttemptsMinutes: null,
        timeLimitMinutes: 30,
      });
      const startedAt = new Date();
      const tenMinutesLater = new Date(startedAt.getTime() + 10 * 60 * 1000);
      expect(rules.hasTimeLimitElapsed(startedAt, tenMinutesLater)).toBe(false);
    });

    it("has elapsed after the time limit", () => {
      const rules = PassingRules.create({
        passingScorePercent: 60,
        maxAttempts: null,
        delayBetweenAttemptsMinutes: null,
        timeLimitMinutes: 30,
      });
      const startedAt = new Date();
      const thirtyOneMinutesLater = new Date(startedAt.getTime() + 31 * 60 * 1000);
      expect(rules.hasTimeLimitElapsed(startedAt, thirtyOneMinutesLater)).toBe(true);
    });
});
