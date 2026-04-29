FROM node:20-bullseye

WORKDIR /app

# Build tools needed for better-sqlite3 native compilation
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install and build frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Install backend deps (better-sqlite3 needs native compilation)
COPY backend/package*.json ./backend/
RUN cd backend && npm install --build-from-source

COPY backend/ ./backend/

WORKDIR /app/backend
CMD ["node", "server.js"]
