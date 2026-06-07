FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build for production
RUN npm run build

# Expose port (Vite dev server or Express backend)
EXPOSE 3000 5173

# Start command (adjust based on your setup)
CMD ["sh", "-c", "npm run dev -- --host 0.0.0.0 || node server.js"]
