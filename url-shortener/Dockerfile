FROM node:22.15.1

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install -g nodemon
RUN npm install
EXPOSE 3000
CMD ["nodemon"]
