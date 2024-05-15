# Stage 1: Install Node.js dependencies and copy application code
FROM node:14 as node_builder

WORKDIR /usr/src/app

COPY package.json ./

# Install Node.js dependencies
RUN npm install --production

# Stage 2: Install GCC and copy application code
FROM node:14-alpine

# Install GCC compiler
RUN apk add --no-cache build-base

WORKDIR /usr/src/app

# Copy the rest of the application code
COPY . .

# Define the command to run your application
CMD ["node", "index.js"]
