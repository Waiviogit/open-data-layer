describe('GET /query/v1/docs', () => {
  it('should serve OpenAPI UI', async () => {
    const res = await fetch(`${process.env.E2E_BASE_URL}/query/v1/docs`);

    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type') ?? '';
    expect(contentType).toContain('text/html');
  });
});
