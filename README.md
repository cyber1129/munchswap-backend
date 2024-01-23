# Marketplace API

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Local Development

Devcontainer allows you to run containerised from within VSCode. This is the recommended way to run the project.

### VSCode

Install the [Remote Development](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack) extension pack.

### Docker

Install [Docker](https://docs.docker.com/get-docker/)

### Devcontainer

Open the project in VSCode and click on the green button in the bottom left corner. Select `Reopen in Container`.

This will build the devcontainer and install dependencies.

To start the project, open a terminal within VSCode and run:

```bash
npm run start:dev
```

You can now access the API via your local browser at `http://localhost:3005/docs`

### Database

The devcontainer comes with a running postgres instance.

Connect to the local Postgres Database within terminal:

```bash
psql -h db -U postgres postgres
```

password is `postgres`

## Manual Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
