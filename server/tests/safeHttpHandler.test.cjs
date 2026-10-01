const { safeHttpHandler } = require('../src/utils/safeHttpHandler.ts');

test('returns successful data, including null, in the tuple', async () => {
  const value = { id: 1 };
  expect(await safeHttpHandler(Promise.resolve(value))).toEqual([null, value]);
  expect(await safeHttpHandler(Promise.resolve(null))).toEqual([null, null]);
});

test('preserves the rejected Error and its service metadata', async () => {
  const error = Object.assign(new Error('Not found'), { $metadata: { httpStatusCode: 404 } });
  const [caught, data] = await safeHttpHandler(Promise.reject(error));
  expect(caught).toBe(error);
  expect(data).toBeNull();
});

test('captures synchronous errors from callbacks', async () => {
  const error = new Error('Missing configuration');
  expect(await safeHttpHandler(() => { throw error; })).toEqual([error, null]);
});

test.each([undefined, null, false, 0, '', 'failure'])('makes a non-Error rejection detectable: %p', async (reason) => {
  const [error, data] = await safeHttpHandler(Promise.reject(reason));
  expect(error).toBeInstanceOf(Error);
  expect(error.cause).toBe(reason);
  expect(data).toBeNull();
});
