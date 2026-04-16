export interface INotificationConsumer {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export const NOTIFICATION_CONSUMER = Symbol('NOTIFICATION_CONSUMER');
