# syntax=docker/dockerfile:1

# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL=https://api.miralpatel.tech
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ---------- serve ----------
FROM nginx:1.27-alpine AS runtime

RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
