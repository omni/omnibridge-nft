FROM node:14 as contracts

WORKDIR /workdir

COPY package.json yarn.lock ./
RUN yarn

COPY truffle-config.js truffle-config.js
COPY ./contracts ./contracts
RUN yarn compile

FROM node:14

WORKDIR /workdir

COPY package.json yarn.lock ./
RUN yarn install --prod

# Allows remixd to be run within a docker container
RUN sed -i s/127.0.0.1/0.0.0.0/g node_modules/@remix-project/remixd/websocket.js

COPY truffle-config.js truffle-config.js
# No need to have coverage module within the container
RUN sed -i s/\'solidity-coverage\'\,\ // truffle-config.js

COPY ./contracts ./contracts

COPY --from=contracts /workdir/build ./build

COPY deploy.sh deploy.sh
COPY ./deploy ./deploy

EXPOSE 65520

ENV PATH="/workdir:/workdir/node_modules/.bin:${PATH}"
