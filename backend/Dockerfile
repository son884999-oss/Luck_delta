# ── Chunmun 백엔드 (NestJS) 컨테이너 — Railway/Render/Fly 등 어디서나 ──
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# 호스트가 주입하는 PORT를 사용 (main.ts: process.env.PORT)
EXPOSE 3000
CMD ["node", "dist/main.js"]
