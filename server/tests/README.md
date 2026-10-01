# Server tests

Run from the `server` directory:

```sh
npm run tests
```

The command checks the TypeScript build, then runs Jest against the source.
Tests cover allowed file types, folder markers, upload size limits, input validation,
and service error responses. They do not require AWS credentials or make network requests.

To rerun the full suite whenever server source, tests, or test configuration are saved:

```sh
npm run test
```

Keep this command running while working. Jest watches source and test files and
compiles TypeScript directly during each test run. Press Ctrl+C to stop.
`npm run tests:watch` is also available as an alias for the same watcher.

`npm run dev` starts only the development server. Run `npm run tests` or
`npm run test` separately when needed.
