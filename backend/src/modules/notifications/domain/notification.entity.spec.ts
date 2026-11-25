import { NotificationChannel } from "./notification-channel";
import { NotificationStatus } from "./notification-status";
import { Notification, type NotificationProps } from "./notification.entity";

function buildNotification(overrides: Partial<NotificationProps> = {}): Notification {
  const props: NotificationProps = {
    id: "notif-1",
    tenantId: "tenant-1",
    recipientUserId: "user-1",
    channel: NotificationChannel.EMAIL,
    templateKey: "user.invited",
    locale: "fr",
    payload: { firstName: "Awa" },
    status: NotificationStatus.PENDING,
    errorMessage: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    sentAt: null,
    readAt: null,
    ...overrides,
  };
  return Notification.fromPersistence(props);
}

describe("Notification", () => {
  describe("markSent", () => {
    it("passe le statut à SENT et fixe sentAt", () => {
      const notification = buildNotification();
      notification.markSent();
      expect(notification.status).toBe(NotificationStatus.SENT);
      expect(notification.toSnapshot().sentAt).not.toBeNull();
    });
  });

  describe("markFailed", () => {
    it("passe le statut à FAILED et fixe le message d'erreur", () => {
      const notification = buildNotification();
      notification.markFailed("Fournisseur indisponible");
      expect(notification.status).toBe(NotificationStatus.FAILED);
      expect(notification.toSnapshot().errorMessage).toBe("Fournisseur indisponible");
    });
  });

  describe("markRead", () => {
    it("fixe readAt à la première lecture", () => {
      const notification = buildNotification({ readAt: null });
      notification.markRead();
      expect(notification.readAt).not.toBeNull();
    });

    it("ne réécrit pas readAt si déjà lue", () => {
      const existing = new Date("2026-01-02T00:00:00Z");
      const notification = buildNotification({ readAt: existing });
      notification.markRead();
      expect(notification.readAt).toEqual(existing);
    });
  });
});

describe("Notification accessors", () => {
  it("expose les champs persistés", () => {
    const notification = buildNotification({ locale: "en" });

    expect(notification.id).toBe("notif-1");
    expect(notification.templateKey).toBe("user.invited");
    expect(notification.locale).toBe("en");
    expect(notification.createdAt).toEqual(new Date("2026-01-01T00:00:00Z"));
    expect(notification.payload).toEqual({ firstName: "Awa" });
  });

  it("toSnapshot renvoie une copie qui reflète l'état courant", () => {
    const notification = buildNotification();
    notification.markFailed("boom");

    const snapshot = notification.toSnapshot() as NotificationProps;

    expect(snapshot).toMatchObject({ status: NotificationStatus.FAILED, errorMessage: "boom" });
    snapshot.errorMessage = "altéré";
    expect(notification.toSnapshot().errorMessage).toBe("boom");
  });
});
