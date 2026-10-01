jest.mock('../src/libs/s3.ts', () => ({
  s3: { send: jest.fn() },
  getBucket: jest.fn(() => 'bucket'),
}));
jest.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: jest.fn() }));

const { s3, getBucket } = require('../src/libs/s3.ts');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { fileController: controller } = require('../src/controllers/file.controller.ts');

const request = {
  query: { key: 'user/file.txt', prefix: 'user/' },
  body: { key: 'user/file.txt', content: 'aGk=', name: 'new.txt' },
  method: 'POST',
};
const handlers = ['postFile', 'putFile', 'getFiles', 'getFileDownload', 'getPresignedDownloadUrl', 'deleteFile', 'postFileRename'];

function response() {
  return {
    status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn(),
    attachment: jest.fn(), setHeader: jest.fn(),
  };
}

beforeEach(() => {
  s3.send.mockReset();
  getSignedUrl.mockReset();
  getBucket.mockReset().mockReturnValue('bucket');
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

test.each(handlers)('%s responds to synchronous missing bucket errors', async (handler) => {
  getBucket.mockImplementation(() => { throw new Error('S3_BUCKET_NAME is not configured'); });
  const res = response();
  await controller[handler](request, res);
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ error: 'S3_BUCKET_NAME is not configured' });
  expect(s3.send).not.toHaveBeenCalled();
  expect(getSignedUrl).not.toHaveBeenCalled();
});

test.each(handlers)('%s returns a service error and stops on rejected operations', async (handler) => {
  s3.send.mockRejectedValue(new Error('AWS failed'));
  getSignedUrl.mockRejectedValue(new Error('Signing failed'));
  const res = response();
  await controller[handler](request, res);
  expect(res.status).toHaveBeenCalledWith(502);
  expect(res.json).toHaveBeenCalledWith({ error: 'Unable to complete S3 request' });
  expect(res.send).not.toHaveBeenCalled();
});

test('download body errors respond before writing attachment headers', async () => {
  s3.send.mockResolvedValue({ Body: { transformToByteArray: () => Promise.reject(new Error('Read failed')) } });
  const res = response();
  await controller.getFileDownload(request, res);
  expect(res.status).toHaveBeenCalledWith(502);
  expect(res.attachment).not.toHaveBeenCalled();
  expect(res.setHeader).not.toHaveBeenCalled();
  expect(res.send).not.toHaveBeenCalled();
});

test('rename keeps the missing source response', async () => {
  s3.send.mockRejectedValue(Object.assign(new Error('Not found'), { $metadata: { httpStatusCode: 404 } }));
  const res = response();
  await controller.postFileRename(request, res);
  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.json).toHaveBeenCalledWith({ error: 'File or folder not found' });
});

test.each([
  ['postFile', 'POST', 201, 'File uploaded'],
  ['putFile', 'PUT', 200, 'File updated'],
])('%s works as a bound Express handler', async (method, httpMethod, status, message) => {
  s3.send.mockResolvedValue({});
  const res = response();
  const handler = controller[method].bind(controller);
  await handler({ ...request, method: httpMethod }, res);
  expect(res.status).toHaveBeenCalledWith(status);
  expect(res.json).toHaveBeenCalledWith({ key: 'user/file.txt', message });
});
