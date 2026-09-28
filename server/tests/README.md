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
npm run tests:watch
```

Keep this command running while working. It rebuilds before each run and ignores
generated `dist` files to avoid rebuild loops. Press Ctrl+C to stop.

`npm run dev` starts both the development server and the test watcher together.
Press Ctrl+C to stop both. Use `npm run dev:server` to run only the server.
