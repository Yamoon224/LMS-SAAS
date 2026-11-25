import type { UsersFacade } from "@modules/users/users.facade";
import type { WalletsFacade } from "@modules/wallets/wallets.facade";

import { NotifyUserUseCase } from "./notify-user.use-case";
import { PaymentFailedListener } from "./payment-failed.listener";
import { PayoutExecutedListener } from "./payout-executed.listener";
import { RefundRequestedListener } from "./refund-requested.listener";

describe("owner notification listeners", () => {
  let notify: { execute: jest.Mock };
  let users: { findTenantOwner: jest.Mock };

  beforeEach(() => {
    notify = { execute: jest.fn().mockResolvedValue(undefined) };
    users = { findTenantOwner: jest.fn().mockResolvedValue({ id: "owner-1" }) };
  });

  describe("PaymentFailedListener", () => {
    const event = { payment: { tenantId: "t1", amount: 1200, currency: "EUR" } } as never;
    let listener: PaymentFailedListener;

    beforeEach(() => {
      listener = new PaymentFailedListener(notify as unknown as NotifyUserUseCase, users as unknown as UsersFacade);
    });

    it("alerts the tenant owner with the amount and currency", async () => {
      await listener.handle(event);

      expect(users.findTenantOwner).toHaveBeenCalledWith("t1");
      expect(notify.execute).toHaveBeenCalledWith({
        userId: "owner-1",
        templateKey: "payment.failed",
        payload: { amount: 1200, currency: "EUR" },
      });
    });

    it("skips the notification when the owner is missing", async () => {
      users.findTenantOwner.mockResolvedValue(null);

      await listener.handle(event);

      expect(notify.execute).not.toHaveBeenCalled();
    });
  });

  describe("RefundRequestedListener", () => {
    const event = { tenantId: "t1", refundId: "r1", courseTitle: "Maths", amount: 50, currency: "XOF" } as never;
    let listener: RefundRequestedListener;

    beforeEach(() => {
      listener = new RefundRequestedListener(notify as unknown as NotifyUserUseCase, users as unknown as UsersFacade);
    });

    it("warns the owner that a refund request awaits review", async () => {
      await listener.handle(event);

      expect(users.findTenantOwner).toHaveBeenCalledWith("t1");
      expect(notify.execute).toHaveBeenCalledWith({
        userId: "owner-1",
        templateKey: "refund.requested",
        payload: { courseTitle: "Maths", amount: 50, currency: "XOF" },
      });
    });

    it("skips the notification when the owner is missing", async () => {
      users.findTenantOwner.mockResolvedValue(null);

      await listener.handle(event);

      expect(notify.execute).not.toHaveBeenCalled();
    });
  });

  describe("PayoutExecutedListener", () => {
    const event = { tenantId: "t1", payoutId: "po1" } as never;
    let wallets: { findPayoutById: jest.Mock };
    let listener: PayoutExecutedListener;

    beforeEach(() => {
      wallets = { findPayoutById: jest.fn().mockResolvedValue({ amount: 7000, currency: "XOF" }) };
      listener = new PayoutExecutedListener(
        notify as unknown as NotifyUserUseCase,
        users as unknown as UsersFacade,
        wallets as unknown as WalletsFacade,
      );
    });

    it("confirms the payout amount to the owner", async () => {
      await listener.handle(event);

      expect(wallets.findPayoutById).toHaveBeenCalledWith("po1");
      expect(notify.execute).toHaveBeenCalledWith({
        userId: "owner-1",
        templateKey: "payout.executed",
        payload: { amount: 7000, currency: "XOF" },
      });
    });

    it("skips the notification when the owner is missing", async () => {
      users.findTenantOwner.mockResolvedValue(null);

      await listener.handle(event);

      expect(wallets.findPayoutById).not.toHaveBeenCalled();
      expect(notify.execute).not.toHaveBeenCalled();
    });

    it("skips the notification when the payout is missing", async () => {
      wallets.findPayoutById.mockResolvedValue(null);

      await listener.handle(event);

      expect(notify.execute).not.toHaveBeenCalled();
    });
  });
});
