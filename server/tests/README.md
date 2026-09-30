# Server tests

Run from the `server` directory:

```sh
npm run tests
```

The command builds the TypeScript source, then runs Jest against the compiled utilities.
Tests cover allowed file types, folder markers, upload size limits, input validation,
and service error responses. They do not require AWS credentials or make network requests.

To rerun the full suite whenever server source, tests, or test configuration are saved:

```sh
npm run test
```

Keep this command running while working. It rebuilds before each run and ignores
generated `dist` files to avoid rebuild loops. Press Ctrl+C to stop.
`npm run tests:watch` is also available as an alias for the same watcher.

`npm run dev` starts only the development server. Run `npm run tests` or
`npm run test` separately when needed.
