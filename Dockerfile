FROM node:14 as contracts

WORKDIR /contracts

COPY package.json yarn.lock ./
RUN yarn

COPY truffle-config.js truffle-config.js
COPY ./contracts ./contracts
RUN yarn compile

FROM node:14

WORKDIR /contracts

COPY package.json yarn.lock ./
RUN yarn install --prod

COPY --from=contracts /contracts/build ./build

COPY deploy.sh deploy.sh
COPY ./deploy ./deploy

ENV PATH="/contracts/:${PATH}"
