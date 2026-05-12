FROM node:20-alpine
ENV III_CONTAINER=docker
ENV III_ENV=development
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]
