import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';
import { ConnectionRegistryService } from './connection-registry.service';

describe('ConnectionRegistryService', () => {
  const config = {
    get: jest.fn(() => ({ maxConnectionsPerUser: 2 })),
  } as unknown as ConfigService;

  let registry: ConnectionRegistryService;

  beforeEach(() => {
    registry = new ConnectionRegistryService(config);
  });

  it('closes oldest connection when per-user limit is exceeded', () => {
    const first = { close: jest.fn() } as unknown as WebSocket;
    const second = { close: jest.fn() } as unknown as WebSocket;
    const third = { close: jest.fn() } as unknown as WebSocket;

    registry.register(first, 'alice');
    registry.register(second, 'alice');
    registry.register(third, 'alice');

    expect(first.close).toHaveBeenCalledWith(1008, 'connection_limit_exceeded');
    expect(second.close).not.toHaveBeenCalled();
    expect(third.close).not.toHaveBeenCalled();
    expect(registry.getSocketsForUser('alice').size).toBe(2);
  });
});
