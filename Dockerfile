FROM node:12-alpine

WORKDIR /usr/src/app

COPY package.json ./

RUN npm i

COPY ./index.js ./index.js
COPY ./index.pug ./index.pug
COPY ./logo.png ./logo.png

VOLUME /shares

ENV SONIC_SHARE_FOLDER=/shares
ENV SONIC_SHARE_PORT=11219

CMD [ "npm", "start" ]