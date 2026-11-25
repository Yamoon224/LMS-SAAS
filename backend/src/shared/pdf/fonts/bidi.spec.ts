import { analyze, visualRuns } from "./bidi";

function visual(text: string): string[] {
  const analysis = analyze(text);
  return visualRuns(analysis, 0, analysis.chars.length).map((run) => run.text);
}

describe("réordonnancement bidirectionnel simplifié", () => {
  it("arabe pur : un seul run RTL", () => {
    const analysis = analyze("مرحبا بكم");
    expect(analysis.rtlParagraph).toBe(true);
    expect(visualRuns(analysis, 0, analysis.chars.length)).toEqual([{ text: "مرحبا بكم", rtl: true }]);
  });

  it("paragraphe RTL : latin et nombre restent lisibles de gauche à droite, l'ordre des runs est inversé", () => {
    // Logique : « كتاب » puis « ABC 123 ». Visuel (gauche -> droite) : « ABC 123 » puis « كتاب ».
    expect(visual("كتاب ABC 123").map((text) => text.trim())).toEqual(["ABC 123", "كتاب"]);
  });

  it("paragraphe LTR contenant de l'arabe : seul le mot arabe est RTL", () => {
    const analysis = analyze("Course: دورة 2026");
    expect(analysis.rtlParagraph).toBe(false);
    const runs = visualRuns(analysis, 0, analysis.chars.length);
    expect(runs.filter((run) => run.rtl).map((run) => run.text.trim())).toEqual(["دورة"]);
  });

  it("les parenthèses autour d'un texte latin ne sont pas inversées dans un paragraphe arabe", () => {
    expect(visual("شركة (ABC)").join("")).toContain("(ABC)");
  });

  it("les parenthèses autour d'un texte arabe sont miroitées", () => {
    expect(visualRuns(analyze("(شهادة)"), 0, 7)).toEqual([{ text: ")شهادة(", rtl: true }]);
  });

  it("garde les séparateurs de nombres dans le run numérique", () => {
    expect(visual("المبلغ 1,500.50 EUR").some((text) => text.includes("1,500.50"))).toBe(true);
  });

  it("garde le pourcentage collé à son nombre", () => {
    expect(visual("النتيجة : 88%").some((text) => text.includes("88%"))).toBe(true);
  });
});
