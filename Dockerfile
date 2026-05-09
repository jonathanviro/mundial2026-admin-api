FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
RUN npm run build
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npx prisma db seed && npm run start"]
