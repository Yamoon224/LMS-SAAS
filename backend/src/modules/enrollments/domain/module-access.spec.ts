import { isModuleAccessible, type ModuleOrderInfo } from "./module-access";

describe("isModuleAccessible (RG-09/ENT-19)", () => {
  const module1: ModuleOrderInfo = { moduleId: "m1", order: 1, validated: true };
  const module2: ModuleOrderInfo = { moduleId: "m2", order: 2, validated: false };
  const module3: ModuleOrderInfo = { moduleId: "m3", order: 3, validated: false };
  const modules: ModuleOrderInfo[] = [module1, module2, module3];

  describe("mode SEQUENTIAL", () => {
    it("autorise le premier module", () => {
      expect(isModuleAccessible(module1, modules, "SEQUENTIAL")).toBe(true);
    });

    it("autorise un module dont tous les précédents sont validés", () => {
      expect(isModuleAccessible(module2, modules, "SEQUENTIAL")).toBe(true);
    });

    it("bloque un module dont un précédent n'est pas validé", () => {
      expect(isModuleAccessible(module3, modules, "SEQUENTIAL")).toBe(false);
    });
  });

  describe("mode FREE (ENT-19)", () => {
    it("autorise tous les modules indépendamment de la validation", () => {
      for (const module of modules) {
        expect(isModuleAccessible(module, modules, "FREE")).toBe(true);
      }
    });
  });
});
