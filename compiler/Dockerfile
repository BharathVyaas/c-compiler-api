
FROM node:14 as node_builder

WORKDIR /usr/src/app

COPY package.json ./

RUN npm install --production

FROM node:14-alpine

RUN apk add --no-cache build-base

WORKDIR /usr/src/app

COPY . .

CMD ["node", "index.js"]
