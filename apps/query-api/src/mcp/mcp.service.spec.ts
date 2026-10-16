import type { Request, Response } from 'express';
import { McpService } from './mcp.service';
import { registerAllMcpTools } from './register-all-tools';

jest.mock('./register-all-tools', () => ({
  registerAllMcpTools: jest.fn(),
}));

jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    registerResource: jest.fn(),
    registerPrompt: jest.fn(),
  })),
}));

jest.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: jest.fn().mockImplementation(() => ({
    handleRequest: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

const registerMock = registerAllMcpTools as jest.MockedFunction<
  typeof registerAllMcpTools
>;

describe('McpService.handle', () => {
  it('passes request-derived clientIp into tool registration', async () => {
    registerMock.mockClear();
    const service = Object.create(McpService.prototype) as McpService;
    (
      service as unknown as { buildDeps: () => Record<string, never> }
    ).buildDeps = () => ({});
    (service as unknown as { logger: { error: jest.Mock } }).logger = {
      error: jest.fn(),
    };

    const req = {
      ip: '1.2.3.4',
      body: { params: { ip: '9.9.9.9' } },
    } as unknown as Request;
    const res = {
      headersSent: true,
      status: jest.fn(),
      json: jest.fn(),
    } as unknown as Response;

    await service.handle(req, res);

    expect(registerMock.mock.calls[0]?.[2]).toEqual({ clientIp: '1.2.3.4' });
  });
});
