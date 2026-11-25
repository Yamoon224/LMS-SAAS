import { sortPurchasesNewestFirst } from "./purchase-history";
import type { PurchaseHistoryItem } from "./purchase-history";

const item = (id: string, purchasedAt: string, kind: PurchaseHistoryItem["kind"]): PurchaseHistoryItem => ({
  id,
  kind,
  enrollmentId: `e-${id}`,
  courseTitle: "Excel",
  amount: 1000,
  currency: "XOF",
  method: kind === "ONLINE" ? "WAVE" : null,
  status: kind === "ONLINE" ? "SUCCEEDED" : null,
  refundStatus: null,
  purchasedAt: new Date(purchasedAt),
});

describe("sortPurchasesNewestFirst", () => {
  it("mélange achats en ligne et hors plateforme, du plus récent au plus ancien", () => {
    const sorted = sortPurchasesNewestFirst([
      item("a", "2026-01-01T00:00:00Z", "ONLINE"),
      item("b", "2026-03-01T00:00:00Z", "OFFLINE"),
      item("c", "2026-02-01T00:00:00Z", "ONLINE"),
    ]);
    expect(sorted.map((entry) => entry.id)).toEqual(["b", "c", "a"]);
  });

  it("ne modifie pas la liste d'origine", () => {
    const original = [item("a", "2026-01-01T00:00:00Z", "ONLINE"), item("b", "2026-03-01T00:00:00Z", "ONLINE")];
    sortPurchasesNewestFirst(original);
    expect(original.map((entry) => entry.id)).toEqual(["a", "b"]);
  });
});
