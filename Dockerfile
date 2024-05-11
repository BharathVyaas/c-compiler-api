# Stage 1: Install Node.js dependencies
FROM node:alpine as node_builder

WORKDIR /usr/app

COPY package.json package-lock.json ./

# Install Node.js dependencies
RUN npm install --production

# Stage 2: Build native dependencies with GCC
FROM node:alpine

# Install GCC compiler
RUN apk add --no-cache build-base

WORKDIR /usr/app

# Copy built Node.js dependencies from previous stage
COPY --from=node_builder /usr/app/node_modules ./node_modules

# Copy the rest of your application
COPY . .

CMD ["npm", "start"]
