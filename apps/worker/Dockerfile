FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/schema/package.json packages/schema/package.json
COPY packages/scanner/package.json packages/scanner/package.json
COPY packages/fix-engine/package.json packages/fix-engine/package.json
RUN npm install
COPY . .
RUN npx prisma generate --schema packages/schema/prisma/schema.prisma
CMD ["npm", "run", "start", "--workspace=@zerra/worker"]
