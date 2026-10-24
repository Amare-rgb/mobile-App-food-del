# Node.js base image
FROM node:18-alpine

# Install OpenSSL required by Prisma on Alpine
RUN apk add --no-cache openssl libc6-compat

# Working directory
WORKDIR /app

# 1. መጀመሪያ package.json እና የprisma ፎልደርን መቅዳት
COPY package*.json ./
COPY prisma ./prisma/

# 2. dependencies መጫን (በዚህ ሰዓት postinstall ስክሪፕቱ prisma generate አድርጎ ይጨርሳል)
RUN npm install

# 3. የቀሩትን የኮድ ፋይሎች በሙሉ መቅዳት
COPY . .

# Expose port
EXPOSE 4000

# Start the server
CMD ["npm", "run", "start"]