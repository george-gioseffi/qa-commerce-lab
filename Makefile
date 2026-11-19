setup:
	npm run setup

up:
	docker compose up --build

down:
	docker compose down -v

test:
	npm run test

test-unit:
	npm run test:unit

test-api:
	npm run test:api

test-api-docker:
	npm run test:api:docker

test-e2e:
	npm run test:e2e

test-e2e-docker:
	npm run test:e2e:docker

test-load:
	npm run test:load

lint:
	npm run lint

typecheck:
	npm run typecheck

report:
	npm run test:e2e:report
