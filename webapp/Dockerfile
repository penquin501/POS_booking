FROM node:10
WORKDIR /opt/webapp
COPY src/package.json package.json
RUN ls -la
RUN npm install
COPY src/ .
CMD npm run start