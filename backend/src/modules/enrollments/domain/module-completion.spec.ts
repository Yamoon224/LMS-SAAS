import { isModuleValidated, type ModuleCompletionInput } from "./module-completion";

function buildInput(overrides: Partial<ModuleCompletionInput> = {}): ModuleCompletionInput {
  return {
    lessons: [],
    requiredLiveAttendanceSatisfied: true,
    quizPassed: null,
    ...overrides,
  };
}

describe("isModuleValidated (RG-08)", () => {
  it("valide un module sans contenu obligatoire, sans live, sans quiz", () => {
    expect(isModuleValidated(buildInput())).toBe(true);
  });

  it("rejette si un contenu obligatoire n'est pas satisfait", () => {
    const input = buildInput({
      lessons: [
        { lessonId: "l1", isMandatory: true, isSatisfied: false },
        { lessonId: "l2", isMandatory: true, isSatisfied: true },
      ],
    });
    expect(isModuleValidated(input)).toBe(false);
  });

  it("ignore les contenus non obligatoires non satisfaits", () => {
    const input = buildInput({
      lessons: [
        { lessonId: "l1", isMandatory: false, isSatisfied: false },
        { lessonId: "l2", isMandatory: true, isSatisfied: true },
      ],
    });
    expect(isModuleValidated(input)).toBe(true);
  });

  it("rejette si la présence live obligatoire n'est pas satisfaite", () => {
    const input = buildInput({ requiredLiveAttendanceSatisfied: false });
    expect(isModuleValidated(input)).toBe(false);
  });

  it("rejette si un quiz existe et n'est pas réussi", () => {
    const input = buildInput({ quizPassed: false });
    expect(isModuleValidated(input)).toBe(false);
  });

  it("valide si le quiz existe et est réussi", () => {
    const input = buildInput({ quizPassed: true });
    expect(isModuleValidated(input)).toBe(true);
  });

  it("valide si aucun quiz n'est configuré (quizPassed null)", () => {
    const input = buildInput({ quizPassed: null });
    expect(isModuleValidated(input)).toBe(true);
  });

  it("exige que les trois conditions soient réunies simultanément", () => {
    const input = buildInput({
      lessons: [{ lessonId: "l1", isMandatory: true, isSatisfied: true }],
      requiredLiveAttendanceSatisfied: true,
      quizPassed: true,
    });
    expect(isModuleValidated(input)).toBe(true);
  });
});
