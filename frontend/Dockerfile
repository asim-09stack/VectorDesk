# ─────────────────────────────────────────────
# Stage 1: build the static assets
# ─────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# In the container image the frontend talks to the backend via nginx proxy at
# the relative "/api" path, so the default VITE_API_URL is correct.
RUN npm run build

# ─────────────────────────────────────────────
# Stage 2: serve with nginx
# ─────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
