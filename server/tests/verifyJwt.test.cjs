jest.mock('aws-jwt-verify', () => ({ CognitoJwtVerifier: { create: jest.fn() } }));

const originalPool = process.env.COGNITO_USER_POOL_ID;
const originalClient = process.env.COGNITO_APP_CLIENT_ID;
let verifyJwt;
let create;
let verify;

beforeEach(() => {
  jest.resetModules();
  process.env.COGNITO_USER_POOL_ID = 'us-west-2_test';
  process.env.COGNITO_APP_CLIENT_ID = 'client';
  create = require('aws-jwt-verify').CognitoJwtVerifier.create;
  create.mockReset();
  verify = jest.fn();
  create.mockReturnValue({ verify });
  verifyJwt = require('../src/middleware/verifyJwt.ts').verifyJwt;
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  if (originalPool === undefined) delete process.env.COGNITO_USER_POOL_ID;
  else process.env.COGNITO_USER_POOL_ID = originalPool;
  if (originalClient === undefined) delete process.env.COGNITO_APP_CLIENT_ID;
  else process.env.COGNITO_APP_CLIENT_ID = originalClient;
});

async function run(header) {
  const request = { get: jest.fn(() => header) };
  const response = { status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn() };
  const next = jest.fn();
  await verifyJwt(request, response, next);
  return { request, response, next };
}

test.each([undefined, '', 'Basic token', 'Bearer', 'Bearer ', 'Bearer a b'])('rejects malformed authorization: %p', async (header) => {
  const { response, next } = await run(header);
  expect(response.status).toHaveBeenCalledWith(401);
  expect(response.setHeader).toHaveBeenCalledWith('WWW-Authenticate', 'Bearer');
  expect(create).not.toHaveBeenCalled();
  expect(next).not.toHaveBeenCalled();
});

test('verifies the access token and exposes claims to downstream handlers', async () => {
  const payload = { sub: 'user', token_use: 'access', client_id: 'client' };
  verify.mockResolvedValue(payload);
  const { request, response, next } = await run('bearer valid.jwt.token');
  expect(create).toHaveBeenCalledWith({ userPoolId: 'us-west-2_test', clientId: 'client', tokenUse: 'access' });
  expect(verify).toHaveBeenCalledWith('valid.jwt.token');
  expect(request.auth).toBe(payload);
  expect(next).toHaveBeenCalledTimes(1);
  expect(response.status).not.toHaveBeenCalled();
  await run('Bearer another.jwt.token');
  expect(create).toHaveBeenCalledTimes(1);
});

test.each(['Expired token', 'Bad signature', 'Wrong client', 'Wrong issuer', 'ID token'])('rejects verification failure: %s', async (message) => {
  verify.mockRejectedValue(new Error(message));
  const { request, response, next } = await run('Bearer invalid.jwt.token');
  expect(response.status).toHaveBeenCalledWith(401);
  expect(response.json).toHaveBeenCalledWith({ error: 'Invalid or expired access token' });
  expect(request.auth).toBeUndefined();
  expect(next).not.toHaveBeenCalled();
});

test.each(['COGNITO_USER_POOL_ID', 'COGNITO_APP_CLIENT_ID'])('handles missing configuration: %s', async (name) => {
  delete process.env[name];
  const { response, next } = await run('Bearer valid.jwt.token');
  expect(response.status).toHaveBeenCalledWith(500);
  expect(verify).not.toHaveBeenCalled();
  expect(next).not.toHaveBeenCalled();
});

test('handles invalid verifier configuration', async () => {
  create.mockImplementation(() => { throw new Error('Invalid pool ID'); });
  const { response, next } = await run('Bearer valid.jwt.token');
  expect(response.status).toHaveBeenCalledWith(500);
  expect(next).not.toHaveBeenCalled();
});
