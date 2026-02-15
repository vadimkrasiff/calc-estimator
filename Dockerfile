# Используем официальный Node.js 22 образ для сборки
FROM node:22-alpine AS builder

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем ВСЕ зависимости (включая devDependencies)
RUN npm ci

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