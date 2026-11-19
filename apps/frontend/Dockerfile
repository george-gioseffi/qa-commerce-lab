FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY tests/e2e/package.json tests/e2e/package.json
COPY tests/load/package.json tests/load/package.json

RUN npm install

COPY . .

WORKDIR /app/apps/frontend

ENV VITE_PROXY_TARGET=http://backend:3333

CMD ["npm", "run", "dev"]
