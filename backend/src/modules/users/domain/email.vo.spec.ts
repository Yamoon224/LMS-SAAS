import { Email, InvalidEmailError } from "./email.vo";

describe("Email value object", () => {
  it("accepts a well-formed address and normalizes it to lowercase", () => {
    const email = Email.create("  User@Example.COM ");
    expect(email.toString()).toBe("user@example.com");
  });

  it.each(["not-an-email", "missing-domain@", "@missing-local.com", "spaces in@email.com"])(
    "rejects malformed address: %s",
    (raw) => {
      expect(() => Email.create(raw)).toThrow(InvalidEmailError);
    },
  );
});
