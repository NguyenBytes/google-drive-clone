jest.mock('../src/libs/s3.ts', () => ({
  s3: { send: jest.fn() },
  getBucket: () => 'test-bucket',
}));

const { s3 } = require('../src/libs/s3.ts');
const { fileController } = require('../src/controllers/file.controller.ts');

const listing = {
  Contents: [
    { Key: 'user/', Size: 0 },
    { Key: 'user/notes.txt', Size: 12, LastModified: new Date('2026-01-01T00:00:00Z') },
  ],
  CommonPrefixes: [{ Prefix: 'user/empty/' }, { Prefix: 'user/photos/' }],
};

beforeEach(() => s3.send.mockReset());

async function list(query) {
  const response = { json: jest.fn(), status: jest.fn().mockReturnThis() };
  await fileController.getFiles({ query: { prefix: 'user/', ...query } }, response);
  expect(response.status).not.toHaveBeenCalled();
  return response.json.mock.calls[0][0];
}

test.each([{}, { page: '1' }])('lists immediate folders and files with correct totals: %p', async (query) => {
  s3.send.mockResolvedValue(listing);
  const result = await list(query);
  expect(result.files).toEqual([
    expect.objectContaining({ key: 'user/empty/', name: 'empty', isDirectory: true }),
    expect.objectContaining({ key: 'user/notes.txt', name: 'notes.txt', isDirectory: false, size: 12 }),
    expect.objectContaining({ key: 'user/photos/', name: 'photos', isDirectory: true }),
  ]);
  expect(result).toMatchObject({ totalItems: 3, totalPages: 1, hasMore: false });
  for (const [command] of s3.send.mock.calls) {
    expect(command.input).toMatchObject({ Bucket: 'test-bucket', Prefix: 'user/', Delimiter: '/' });
  }
});

test('counts folders across S3 pages and returns the requested numbered page', async () => {
  s3.send.mockResolvedValueOnce({
    CommonPrefixes: Array.from({ length: 10 }, (_, i) => ({ Prefix: `user/folder${i}/` })),
    IsTruncated: true,
    NextContinuationToken: 'next',
  }).mockResolvedValueOnce(listing);
  const result = await list({ page: '2' });
  expect(result).toMatchObject({ totalItems: 13, totalPages: 2, hasMore: false });
  expect(result.files).toHaveLength(3);
  expect(s3.send.mock.calls[1][0].input.ContinuationToken).toBe('next');
});

test('token pagination fills a page with folders and preserves the next token', async () => {
  const folders = { CommonPrefixes: Array.from({ length: 10 }, (_, i) => ({ Prefix: `user/folder${i}/` })) };
  s3.send.mockResolvedValueOnce({ ...folders, IsTruncated: true, NextContinuationToken: 'next' })
    .mockResolvedValueOnce(folders);
  const result = await list({ continuationToken: 'previous' });
  expect(result.files).toHaveLength(10);
  expect(result.files.every((entry) => entry.isDirectory)).toBe(true);
  expect(result).toMatchObject({ nextContinuationToken: 'next', hasMore: true });
  expect(s3.send.mock.calls[0][0].input.ContinuationToken).toBe('previous');
});

test('an empty directory does not list its own marker', async () => {
  s3.send.mockResolvedValue({ Contents: [{ Key: 'user/empty/', Size: 0 }] });
  const result = await list({ prefix: 'user/empty/', page: '1' });
  expect(result).toMatchObject({ files: [], totalItems: 0, totalPages: 0, hasMore: false });
});
