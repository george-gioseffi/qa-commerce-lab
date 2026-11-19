FROM mcr.microsoft.com/playwright:v1.55.0-noble

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY tests/e2e/package.json tests/e2e/package.json
COPY tests/load/package.json tests/load/package.json

RUN npm install

COPY . .

CMD ["npm", "run", "test:e2e:local"]
