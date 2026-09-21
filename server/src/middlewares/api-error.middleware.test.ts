import { apiErrorHandler } from './api-error.middleware';
describe('API failure responses', () => {
  it.each([['P2025',404],['P2002',409],['P2003',409],['P1001',503],['P2024',503],['P2028',503]])('maps %s without exposing database internals', (code,status) => {
    const res: any = { status: jest.fn(), json: jest.fn() }; res.status.mockReturnValue(res);
    apiErrorHandler({ code, message: 'private query and connection details' }, {} as any, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json.mock.calls[0][0].message).not.toContain('private');
  });
  it('returns a readable 400 for malformed JSON', () => {
    const res: any = { status: jest.fn(), json: jest.fn() }; res.status.mockReturnValue(res);
    apiErrorHandler({ type: 'entity.parse.failed', message: 'secret input' }, {} as any, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid JSON request body.' });
  });
});
