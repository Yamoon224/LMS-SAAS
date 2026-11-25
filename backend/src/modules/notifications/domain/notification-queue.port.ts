export interface NotificationJobData {
  notificationId: string;
}

/**
 * Port vers la file d'attente (section 12.7: "envoi asynchrone, avec
 * nouvelle tentative en cas d'échec"). Découple la création de la
 * notification (synchrone, transactionnelle) de son envoi effectif
 * (asynchrone, sujet à l'indisponibilité du fournisseur).
 */
export interface NotificationQueueStats {
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  paused: number;
}

export interface NotificationQueuePort {
  enqueue(data: NotificationJobData): Promise<void>;
  /** Nombre de tâches par état (ADM-35). Lève si la file est injoignable (ex. Redis arrêté). */
  getStats(): Promise<NotificationQueueStats>;
}

export const NOTIFICATION_QUEUE = Symbol("NOTIFICATION_QUEUE");
