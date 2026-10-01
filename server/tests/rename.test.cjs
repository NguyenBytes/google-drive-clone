jest.mock('../src/libs/s3.ts', () => ({ s3: { send: jest.fn() }, getBucket: () => 'bucket' }));
const { s3 } = require('../src/libs/s3.ts');
const { fileController } = require('../src/controllers/file.controller.ts');

beforeEach(() => s3.send.mockReset());

async function rename(key, name) {
  const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  await fileController.postFileRename({ body: { key, name } }, response);
  return response;
}

test('renames a file, encodes its source key, and uses conditional copy/delete', async () => {
  s3.send.mockResolvedValueOnce({ ETag: 'original' }).mockResolvedValueOnce({ Contents: [] })
    .mockResolvedValue({});
  const response = await rename('user/a #é.txt', 'new.txt');
  expect(response.json).toHaveBeenCalledWith({ key: 'user/new.txt', name: 'new.txt', isDirectory: false });
  expect(s3.send.mock.calls.map(([command]) => command.constructor.name)).toEqual([
    'HeadObjectCommand', 'ListObjectsV2Command', 'CopyObjectCommand', 'DeleteObjectCommand',
  ]);
  expect(s3.send.mock.calls[2][0].input).toMatchObject({
    Key: 'user/new.txt', CopySource: 'bucket/user/a%20%23%C3%A9.txt', CopySourceIfMatch: 'original', IfNoneMatch: '*',
  });
  expect(s3.send.mock.calls[3][0].input).toMatchObject({ Key: 'user/a #é.txt', IfMatch: 'original' });
});

test('renames every page of a nested folder including empty markers before deleting originals', async () => {
  s3.send.mockResolvedValueOnce({ Contents: [{ Key: 'user/old/nested/a.txt', ETag: 'a' }], IsTruncated: true, NextContinuationToken: 'page2' })
    .mockResolvedValueOnce({ Contents: [{ Key: 'user/old/empty/', ETag: 'empty' }] })
    .mockResolvedValueOnce({ Contents: [] }).mockResolvedValue({});
  const response = await rename('user/old/', 'new');
  expect(response.json).toHaveBeenCalledWith({ key: 'user/new/', name: 'new', isDirectory: true });
  expect(s3.send.mock.calls[1][0].input.ContinuationToken).toBe('page2');
  const mutations = s3.send.mock.calls.slice(3).map(([command]) => [command.constructor.name, command.input.Key]);
  expect(mutations).toEqual([
    ['CopyObjectCommand', 'user/new/nested/a.txt'], ['CopyObjectCommand', 'user/new/empty/'],
    ['DeleteObjectCommand', 'user/old/nested/a.txt'], ['DeleteObjectCommand', 'user/old/empty/'],
  ]);
});

test('renames an empty folder', async () => {
  s3.send.mockResolvedValueOnce({ Contents: [{ Key: 'user/old/' }] })
    .mockResolvedValueOnce({ Contents: [] }).mockResolvedValue({});
  const response = await rename('user/old/', 'empty');
  expect(response.json).toHaveBeenCalledWith({ key: 'user/empty/', name: 'empty', isDirectory: true });
  expect(s3.send.mock.calls[2][0].input.Key).toBe('user/empty/');
});

test.each(['user/new', 'user/new/nested.txt'])('rejects an existing destination %s without mutations', async (key) => {
  s3.send.mockResolvedValueOnce({ ETag: 'a' }).mockResolvedValueOnce({ Contents: [{ Key: key }] });
  const response = await rename('user/old.txt', 'new');
  expect(response.status).toHaveBeenCalledWith(409);
  expect(s3.send).toHaveBeenCalledTimes(2);
});

test('does not treat a longer sibling name as a conflict and checks later destination pages', async () => {
  s3.send.mockResolvedValueOnce({ ETag: 'a' })
    .mockResolvedValueOnce({ Contents: [{ Key: 'user/newer.txt' }], IsTruncated: true, NextContinuationToken: 'next' })
    .mockResolvedValueOnce({ Contents: [{ Key: 'user/new' }] });
  const response = await rename('user/old.txt', 'new');
  expect(response.status).toHaveBeenCalledWith(409);
  expect(s3.send.mock.calls[2][0].input.ContinuationToken).toBe('next');
});

test.each(['', '   ', '../other', 'a/b', 'a\\b', '.', '..', 'a\n'])('rejects invalid name %p', async (name) => {
  // Whitespace at the ends is trimmed; put a control character inside the name.
  const response = await rename('user/old.txt', name === 'a\n' ? 'a\nb' : name);
  expect(response.status).toHaveBeenCalledWith(400);
  expect(s3.send).not.toHaveBeenCalled();
});

test('rejects a missing folder', async () => {
  s3.send.mockResolvedValue({ Contents: [] });
  expect((await rename('user/missing/', 'new')).status).toHaveBeenCalledWith(404);
});

test('keeps all originals when a copy fails', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  s3.send.mockResolvedValueOnce({ Contents: [{ Key: 'user/old/a.txt' }, { Key: 'user/old/b.txt' }] })
    .mockResolvedValueOnce({ Contents: [] }).mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Copy failed'));
  const response = await rename('user/old/', 'new');
  expect(response.status).toHaveBeenCalledWith(502);
  expect(s3.send.mock.calls.some(([command]) => command.constructor.name === 'DeleteObjectCommand')).toBe(false);
});

test('reports partial cleanup failures after copying', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  s3.send.mockResolvedValueOnce({ ETag: 'a' }).mockResolvedValueOnce({ Contents: [] })
    .mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Delete failed'));
  const response = await rename('user/old.txt', 'new.txt');
  expect(response.status).toHaveBeenCalledWith(502);
  expect(response.json.mock.calls[0][0].error).toContain('some originals could not be removed');
});
