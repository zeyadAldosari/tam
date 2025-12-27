FROM node:22-alpine

WORKDIR /app

COPY backend/package*.json backend/
RUN cd backend && npm install

COPY frontend/package*.json frontend/
RUN cd frontend && npm install

COPY frontend frontend
RUN cd frontend && npm run build

COPY backend backend

RUN cp -r frontend/dist backend/frontend

RUN cd backend && npx prisma generate && npm run build

COPY backend/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /app/backend
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
