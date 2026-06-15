FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY --chown=1000:1000 . .

RUN --mount=type=secret,id=DATABASE_URL,uid=1000 \
    env DATABASE_URL=$(cat /run/secrets/DATABASE_URL) \
    npx prisma generate --schema=./prisma/schema.prisma

RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma/ ./prisma/
COPY ci/aws-secret-to-db-url.js ./
COPY ci/runner.sh ./

ADD --chown=node https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /etc/ssl/certs/aws-global-bundle.pem
ENTRYPOINT [ "/app/runner.sh" ]

EXPOSE 3000
CMD ["node", "dist/index.js"]