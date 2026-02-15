# Используем официальный Node.js образ для сборки
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./
RUN npm ci --only=production

# Копируем исходники
COPY . .

# Собираем проект
RUN npm run build

# Используем Nginx для отдачи статики
FROM nginx:alpine

# Копируем результат сборки из builder в корень Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Копируем кастомную конфигурацию Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]