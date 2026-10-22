# Node.js base image
FROM node:18-alpine

# Install OpenSSL required by Prisma on Alpine
RUN apk add --no-cache openssl libc6-compat

# Working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy all project files
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose port
EXPOSE 4000

# Start the server
CMD ["npm", "run", "start"]