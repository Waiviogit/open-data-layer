import type { OblNotificationService } from './obl-notification.service';

export function mockOblNotifications(): {
  service: OblNotificationService;
  emit: jest.Mock;
} {
  const emit = jest.fn();
  return {
    emit,
    service: { emit } as unknown as OblNotificationService,
  };
}
