## Description

An implemenation of Nestjs as a production-ready framework for web backends.  Utilizes MongoDB as a repository/datastore.

This app consists of an example of just 2 features: Users, and Organizations.  The basic principal is that a User can sign up through the app (auth managed through JWT's issued by AuthO), and then create/modify an organization (simply a grouping of users).
The organization has RBAC permissions - users can either be an authorized User of the organization, or an Admin. Admins have the capablity to update/modify the organization, add additional users, or upgrade an existing user to become an admin.

Datastore - this implementation uses MongoDB as a datastore.  A very simple implementation as there are only 2 collections of documents; users and organiations.

## Installation

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

## Testing

Features fully fledged unit testing for 2 existing modules: the Organization feature, and the Users feature.

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
