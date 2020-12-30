FROM node:15.4 as builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig*.json ./
COPY ./src ./src
RUN npm install && npm run compile

FROM node:15-alpine as production-builder
RUN apk --no-cache add --virtual builds-deps build-base python
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install

FROM node:15-alpine as production
USER node
RUN mkdir /home/node/application
WORKDIR /home/node/application
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=builder /app/build ./build
COPY --from=production-builder /app/node_modules ./node_modules
