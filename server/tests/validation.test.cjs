const { getNonEmptyString, validateFileUpload } = require('../dist/utils/validation.js');

describe('getNonEmptyString', () => {
  test('preserves a valid string', () => {
    expect(getNonEmptyString(' user@example.com/file.txt ')).toBe(' user@example.com/file.txt ');
  });

  test.each(['', '   ', null, undefined, 123, {}, []])('rejects invalid input: %p', (value) => {
    expect(getNonEmptyString(value)).toBeUndefined();
  });
});

describe('validateFileUpload', () => {
  const content = Buffer.from('example file').toString('base64');
  const maxBytes = 18 * 1024 * 1024;

  test.each(['notes.txt', 'photo.PNG', 'resume.pdf', 'movie.mp4'])(
    'allows supported file type: %s',
    (name) => {
      expect(validateFileUpload(`user@example.com/${name}`, content)).toBeNull();
    },
  );

  test.each(['app.exe', 'script.sh', 'file', 'photo.jpg.exe'])(
    'rejects unsupported file type: %s',
    (name) => {
      expect(validateFileUpload(`user@example.com/${name}`, content)).toEqual({
        status: 415,
        error: 'This file type is not allowed',
      });
    },
  );

  test('allows an empty directory marker', () => {
    expect(validateFileUpload('user@example.com/projects/', '')).toBeNull();
  });

  test('rejects directory markers with content', () => {
    expect(validateFileUpload('user@example.com/projects/', content)?.status).toBe(415);
  });

  test('allows a file at the 18 MB limit', () => {
    expect(validateFileUpload('file.txt', Buffer.alloc(maxBytes).toString('base64'))).toBeNull();
  });

  test('rejects a file above the 18 MB limit', () => {
    expect(validateFileUpload('file.txt', Buffer.alloc(maxBytes + 1).toString('base64'))).toEqual({
      status: 413,
      error: 'Files must be 18 MB or smaller',
    });
  });
});
