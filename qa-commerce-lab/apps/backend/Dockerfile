FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY tests/e2e/package.json tests/e2e/package.json
COPY tests/load/package.json tests/load/package.json

RUN npm install

COPY . .

RUN npm run db:generate
RUN npm run build:backend

WORKDIR /app/apps/backend

CMD ["sh", "-c", "npm run db:push && npm run db:seed && npm run start"]
