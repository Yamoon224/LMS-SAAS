import { Option } from "./option.vo";

describe("Option value object", () => {
  it("exposes the persisted props", () => {
    const option = Option.fromPersistence({ id: "o1", label: "Paris", isCorrect: true, order: 2 });

    expect(option.id).toBe("o1");
    expect(option.label).toBe("Paris");
    expect(option.isCorrect).toBe(true);
    expect(option.order).toBe(2);
  });
});
