const { sendServiceError } = require('../dist/utils/errors.js');

describe('sendServiceError', () => {
  let response;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  test('returns 500 for a missing bucket configuration', () => {
    sendServiceError(response, new Error('S3_BUCKET_NAME is not configured'));

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ error: 'S3_BUCKET_NAME is not configured' });
  });

  test('returns 502 without exposing internal service error details', () => {
    const error = new Error('Internal AWS error details');
    sendServiceError(response, error);

    expect(response.status).toHaveBeenCalledWith(502);
    expect(response.json).toHaveBeenCalledWith({ error: 'Unable to complete S3 request' });
    expect(console.error).toHaveBeenCalledWith('S3 request failed', error);
  });

  test('handles errors that are not Error objects', () => {
    sendServiceError(response, 'request failed');

    expect(response.status).toHaveBeenCalledWith(502);
    expect(response.json).toHaveBeenCalledWith({ error: 'Unable to complete S3 request' });
  });
});
