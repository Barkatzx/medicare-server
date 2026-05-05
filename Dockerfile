# ---- Base Stage ----
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build   # skip if you don't have a build step

# ---- Production Stage ----
FROM node:20-alpine AS production
WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist         
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000
CMD ["node", "dist/index.js"] 