FROM node:20

WORKDIR /app

# Install and build frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Install backend deps (better-sqlite3 needs native compilation)
COPY backend/package*.json ./backend/
RUN cd backend && npm install

COPY backend/ ./backend/

WORKDIR /app/backend
CMD ["node", "server.js"]
