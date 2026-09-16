FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/schema/package.json packages/schema/package.json
RUN npm install
COPY . .
RUN npx prisma generate --schema packages/schema/prisma/schema.prisma
CMD ["npm", "run", "start", "--workspace=@zerra/api"]
