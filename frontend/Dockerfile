# Build stage
FROM node:18 as builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Build the production version
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy build files to Nginx default directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose the default Nginx HTTP port
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
