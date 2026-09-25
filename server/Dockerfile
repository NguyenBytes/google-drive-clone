# syntax=docker/dockerfile:1

# Install dependencies needed to compile the application.
FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build TypeScript into JavaScript.
FROM dependencies AS build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Install only runtime dependencies for the final image.
FROM node:22-alpine AS production-dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Small runtime image: compiled output plus production packages only.
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
