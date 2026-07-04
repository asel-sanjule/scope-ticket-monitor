FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma

# Generate Prisma client without needing DATABASE_URL at build time
RUN PRISMA_SKIP_POSTINSTALL_GENERATE=true npx prisma generate

COPY src ./src

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node src/app.js"]