# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# We'll copy the nginx.conf from the project root if desired, or provide a default here.
# For simplicity, we'll assume the nginx.conf is in the frontend folder for the build context.
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
