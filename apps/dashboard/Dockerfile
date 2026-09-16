FROM node:22-alpine
WORKDIR /app
COPY apps/dashboard/package.json ./package.json
RUN npm install
COPY apps/dashboard .
RUN npm run build
CMD ["npm","run","start"]
