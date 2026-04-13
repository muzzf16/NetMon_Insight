# Build Stage
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# We need to know the backend URL at build time if we hardcode it, 
# but Vite allows injecting via environment variables.
# VITE_API_URL should be provided if you want a custom url,
# otherwise it defaults to standard setup.
RUN npm run build

# Serve Stage
FROM nginx:alpine

# Copy built assets to NGINX serve directory
COPY --from=build /app/dist /usr/share/nginx/html

# Custom nginx config to support React client-side routing and proxy to backend
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://backend:3001/api/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
    location /ws { \
        proxy_pass http://backend:3001/ws; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "Upgrade"; \
        proxy_set_header Host $host; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
