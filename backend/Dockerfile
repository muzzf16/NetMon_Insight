FROM node:18-alpine

WORKDIR /app

# Install dependencies for better-sqlite3 build fallback
RUN apk add --no-cache python3 make g++ sqlite

# Copy package info and install dependencies
COPY package*.json ./
RUN npm install --production

# Create volume dir for SQLite database
# Since SQLite stores data in a file, we want it to be persistent
RUN mkdir -p /app/data

# Copy source code
COPY ./src ./src
COPY .env.example .env

ENV NODE_ENV=production
ENV PORT=3001
# Update DB path or API config here if needed. 
# We'll use memory or a persistent volume mapped to /app/data

EXPOSE 3001

CMD ["npm", "start"]
