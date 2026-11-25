import type { UsersFacade } from "@modules/users/users.facade";
import { NotFoundDomainError } from "@shared/errors";

import { NotificationChannel } from "../domain/notification-channel";
import { NotificationStatus } from "../domain/notification-status";
import { Notification } from "../domain/notification.entity";

import { EnqueueNotificationUseCase } from "./enqueue-notification.use-case";
import { ListNotificationsUseCase } from "./list-notifications.use-case";
import { MarkNotificationReadUseCase } from "./mark-notification-read.use-case";
import { NotifyUserUseCase } from "./notify-user.use-case";
import { SendNotificationUseCase } from "./send-notification.use-case";

function buildNotification(overrides: Partial<Parameters<typeof Notification.fromPersistence>[0]> = {}): Notification {
  return Notification.fromPersistence({
    id: "n1",
    tenantId: "t1",
    recipientUserId: "u1",
    channel: NotificationChannel.EMAIL,
    templateKey: "payment.failed",
    locale: "fr",
    payload: { amount: 10, currency: "EUR", firstName: "Awa" },
    status: NotificationStatus.PENDING,
    errorMessage: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    sentAt: null,
    readAt: null,
    ...overrides,
  });
}

describe("EnqueueNotificationUseCase", () => {
  it("persists the notification then enqueues its id", async () => {
    const repo = { create: jest.fn().mockResolvedValue({ id: "n9" }) };
    const queue = { enqueue: jest.fn().mockResolvedValue(undefined) };
    const input = {
      tenantId: "t1",
      recipientUserId: "u1",
      channel: NotificationChannel.SMS,
      templateKey: "k",
      locale: "fr",
      payload: { a: 1 },
    };

    await new EnqueueNotificationUseCase(repo as never, queue as never).execute(input);

    expect(repo.create).toHaveBeenCalledWith(input);
    expect(queue.enqueue).toHaveBeenCalledWith({ notificationId: "n9" });
  });

  it("does not enqueue when persistence fails", async () => {
    const repo = { create: jest.fn().mockRejectedValue(new Error("db")) };
    const queue = { enqueue: jest.fn() };

    await expect(
      new EnqueueNotificationUseCase(repo as never, queue as never).execute({
        tenantId: null,
        recipientUserId: "u1",
        channel: NotificationChannel.EMAIL,
        templateKey: "k",
        locale: "fr",
        payload: {},
      }),
    ).rejects.toThrow("db");
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
});

describe("ListNotificationsUseCase", () => {
  it("lists all notifications by default", async () => {
    const list = [buildNotification()];
    const repo = { listForRecipient: jest.fn().mockResolvedValue(list) };

    const result = await new ListNotificationsUseCase(repo as never).execute("u1");

    expect(repo.listForRecipient).toHaveBeenCalledWith("u1", { unreadOnly: false });
    expect(result).toBe(list);
  });

  it("can restrict to unread notifications", async () => {
    const repo = { listForRecipient: jest.fn().mockResolvedValue([]) };

    await new ListNotificationsUseCase(repo as never).execute("u1", true);

    expect(repo.listForRecipient).toHaveBeenCalledWith("u1", { unreadOnly: true });
  });
});

describe("MarkNotificationReadUseCase", () => {
  it("marks the notification read for its recipient and saves it", async () => {
    const notification = buildNotification();
    const repo = { findById: jest.fn().mockResolvedValue(notification), save: jest.fn().mockResolvedValue(undefined) };

    await new MarkNotificationReadUseCase(repo as never).execute("n1", "u1");

    expect(notification.readAt).toBeInstanceOf(Date);
    expect(repo.save).toHaveBeenCalledWith(notification);
  });

  it("answers not found for an unknown notification", async () => {
    const repo = { findById: jest.fn().mockResolvedValue(null), save: jest.fn() };

    await expect(new MarkNotificationReadUseCase(repo as never).execute("n1", "u1")).rejects.toThrow(
      NotFoundDomainError,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("answers not found when the notification belongs to someone else", async () => {
    const notification = buildNotification();
    const repo = { findById: jest.fn().mockResolvedValue(notification), save: jest.fn() };

    await expect(new MarkNotificationReadUseCase(repo as never).execute("n1", "intruder")).rejects.toThrow(
      NotFoundDomainError,
    );
    expect(notification.readAt).toBeNull();
    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe("NotifyUserUseCase", () => {
  let enqueue: { execute: jest.Mock };
  let users: { findById: jest.Mock };
  let useCase: NotifyUserUseCase;

  beforeEach(() => {
    enqueue = { execute: jest.fn().mockResolvedValue(undefined) };
    users = {
      findById: jest.fn().mockResolvedValue({ tenantId: "t1", fullName: "Awa Diop", locale: "fr" }),
    };
    useCase = new NotifyUserUseCase(enqueue as unknown as EnqueueNotificationUseCase, users as unknown as UsersFacade);
  });

  it("enqueues an e-mail by default with the first name merged into the payload", async () => {
    await useCase.execute({ userId: "u1", templateKey: "k", payload: { x: 1 } });

    expect(enqueue.execute).toHaveBeenCalledWith({
      tenantId: "t1",
      recipientUserId: "u1",
      channel: NotificationChannel.EMAIL,
      templateKey: "k",
      locale: "fr",
      payload: { firstName: "Awa", x: 1 },
    });
  });

  it("honours the requested channel and lets the payload override firstName", async () => {
    await useCase.execute({
      userId: "u1",
      templateKey: "k",
      channel: NotificationChannel.IN_APP,
      payload: { firstName: "Custom" },
    });

    expect(enqueue.execute).toHaveBeenCalledWith(
      expect.objectContaining({ channel: NotificationChannel.IN_APP, payload: { firstName: "Custom" } }),
    );
  });

  it("does not enqueue for an unknown recipient", async () => {
    users.findById.mockResolvedValue(null);

    await useCase.execute({ userId: "ghost", templateKey: "k", payload: {} });

    expect(enqueue.execute).not.toHaveBeenCalled();
  });
});

describe("SendNotificationUseCase", () => {
  let notifications: { findById: jest.Mock; save: jest.Mock };
  let email: { send: jest.Mock };
  let sms: { send: jest.Mock };
  let overrides: { find: jest.Mock };
  let users: { findById: jest.Mock };
  let useCase: SendNotificationUseCase;

  beforeEach(() => {
    notifications = { findById: jest.fn(), save: jest.fn().mockResolvedValue(undefined) };
    email = { send: jest.fn().mockResolvedValue(undefined) };
    sms = { send: jest.fn().mockResolvedValue(undefined) };
    overrides = { find: jest.fn().mockResolvedValue(null) };
    users = { findById: jest.fn().mockResolvedValue({ id: "u1", email: "awa@example.com", phone: "+22100000" }) };
    useCase = new SendNotificationUseCase(
      notifications as never,
      email as never,
      sms as never,
      overrides as never,
      users as unknown as UsersFacade,
    );
  });

  it("throws not found for an unknown notification", async () => {
    notifications.findById.mockResolvedValue(null);

    await expect(useCase.execute("n1")).rejects.toThrow(NotFoundDomainError);
    expect(email.send).not.toHaveBeenCalled();
  });

  it("marks an in-app notification as sent without any delivery", async () => {
    const notification = buildNotification({ channel: NotificationChannel.IN_APP });
    notifications.findById.mockResolvedValue(notification);

    await useCase.execute("n1");

    expect(notification.status).toBe(NotificationStatus.SENT);
    expect(notifications.save).toHaveBeenCalledWith(notification);
    expect(users.findById).not.toHaveBeenCalled();
    expect(email.send).not.toHaveBeenCalled();
  });

  it("sends an SMS rendered body to the recipient phone", async () => {
    const notification = buildNotification({ channel: NotificationChannel.SMS });
    notifications.findById.mockResolvedValue(notification);

    await useCase.execute("n1");

    expect(sms.send).toHaveBeenCalledWith({ to: "+22100000", body: expect.stringContaining("10") });
    expect(email.send).not.toHaveBeenCalled();
    expect(notification.status).toBe(NotificationStatus.SENT);
  });

  it("fails an SMS notification when the recipient has no phone", async () => {
    const notification = buildNotification({ channel: NotificationChannel.SMS });
    notifications.findById.mockResolvedValue(notification);
    users.findById.mockResolvedValue({ id: "u1", email: "a@b.c", phone: null });

    await expect(useCase.execute("n1")).rejects.toThrow("sans numéro de téléphone");

    expect(sms.send).not.toHaveBeenCalled();
    expect(notification.status).toBe(NotificationStatus.FAILED);
    expect(notification.toSnapshot().errorMessage).toContain("sans numéro de téléphone");
    expect(notifications.save).toHaveBeenCalledWith(notification);
  });

  it("marks the notification failed and rethrows when the recipient is unknown", async () => {
    const notification = buildNotification();
    notifications.findById.mockResolvedValue(notification);
    users.findById.mockResolvedValue(null);

    await expect(useCase.execute("n1")).rejects.toThrow("Destinataire introuvable: u1");

    expect(notification.status).toBe(NotificationStatus.FAILED);
    expect(email.send).not.toHaveBeenCalled();
  });

  it("marks the notification failed and rethrows when the e-mail provider fails", async () => {
    const notification = buildNotification();
    notifications.findById.mockResolvedValue(notification);
    email.send.mockRejectedValue(Object.assign(new Error("smtp down"), { code: "ECONNREFUSED" }));

    await expect(useCase.execute("n1")).rejects.toThrow("smtp down");

    expect(notification.status).toBe(NotificationStatus.FAILED);
    expect(notification.toSnapshot().errorMessage).toBe("[ECONNREFUSED] smtp down");
    expect(notifications.save).toHaveBeenCalledWith(notification);
  });

  it("sends an e-mail with the rendered default template", async () => {
    const notification = buildNotification();
    notifications.findById.mockResolvedValue(notification);

    await useCase.execute("n1");

    expect(overrides.find).toHaveBeenCalledWith("payment.failed", "fr");
    expect(email.send).toHaveBeenCalledWith(expect.objectContaining({ to: "awa@example.com" }));
    expect(notification.status).toBe(NotificationStatus.SENT);
  });
});
