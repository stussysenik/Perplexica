# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
COPY web/package.json ./web/
COPY api/package.json ./api/

# Install dependencies for the whole workspace
RUN yarn install --immutable

# Copy source code
COPY . .

# Set environment variables for build
ARG PHOENIX_URL
ENV PHOENIX_URL=$PHOENIX_URL

# Build the web side
RUN yarn rw build web

# Production stage
FROM nginx:alpine AS runner

# Copy built static files from builder
COPY --from=builder /app/web/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
