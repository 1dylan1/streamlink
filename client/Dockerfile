FROM node:17.0.1

LABEL version="2.0"

WORKDIR /app

COPY . .

RUN npm install && npm install -g serve && npm run build

EXPOSE 3000

CMD ["serve", "-s", "dist"]