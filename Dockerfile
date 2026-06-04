FROM node:20-alpine

WORKDIR /app

COPY Server/package*.json ./Server/

RUN cd Server && npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5000

EXPOSE 5000

CMD ["npm", "--prefix", "Server", "start"]
