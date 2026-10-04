FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./

# Vite embeds VITE_ variables in the static bundle at build time. These values
# are public configuration, never credentials or other secrets.
ARG VITE_COGNITO_USER_POOL_ID
ARG VITE_COGNITO_APP_CLIENT_ID
ARG VITE_API_URL=http://localhost:3000/api/v1
ENV VITE_COGNITO_USER_POOL_ID=$VITE_COGNITO_USER_POOL_ID
ENV VITE_COGNITO_APP_CLIENT_ID=$VITE_COGNITO_APP_CLIENT_ID
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
