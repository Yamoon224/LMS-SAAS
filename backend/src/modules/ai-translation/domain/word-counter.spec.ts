import { countWords } from "./word-counter";

describe("countWords", () => {
  it("compte les mots d'un texte simple", () => {
    expect(countWords("Bonjour le monde")).toBe(3);
  });

  it("ignore les balises HTML", () => {
    expect(countWords("<p>Bonjour <strong>le</strong> monde</p>")).toBe(3);
  });

  it("ignore les entités HTML", () => {
    expect(countWords("Café&nbsp;au lait")).toBe(3);
  });

  it("retourne 0 pour une chaîne vide", () => {
    expect(countWords("")).toBe(0);
  });

  it("retourne 0 pour du HTML sans texte", () => {
    expect(countWords("<div></div>")).toBe(0);
  });
});
