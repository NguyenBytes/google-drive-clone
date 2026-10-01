# JWT middleware

Set `COGNITO_USER_POOL_ID` and `COGNITO_APP_CLIENT_ID` in the server environment
to the same Cognito pool and app client used by the frontend.

`index.ts` runs `verifyJwt` before the API router, protecting every `/api/v1`
route, including the health endpoint:

```ts
import { verifyJwt } from "./middleware/verifyJwt.js";

app.use("/api/v1", verifyJwt, router);
```

Clients must send `Authorization: Bearer <Cognito access token>`. Successful
verification makes the verified claims available as `request.auth` and calls
the next handler. Missing or invalid tokens return 401; missing or invalid server
configuration returns 500.
