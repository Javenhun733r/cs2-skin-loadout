FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/package*.json ./
RUN npm install --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main && npm run seed"]