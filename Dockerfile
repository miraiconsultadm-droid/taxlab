# Dockerfile para o Frontend (Vite/React)

# Estágio de construção
FROM node:20-alpine as build

WORKDIR /usr/src/app

# Copiar package.json e pnpm-lock.yaml
COPY package*.json pnpm-lock.yaml ./

# Instalar pnpm globalmente e dependências
RUN npm install -g pnpm
RUN pnpm install

# Copiar o código fonte
COPY . .

# Construir a aplicação
RUN pnpm run build

# Estágio de produção
FROM nginx:alpine

# Copiar a saída da construção para o diretório de serviço do Nginx
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

# Expor a porta
EXPOSE 80

# Comando para iniciar o Nginx
CMD ["nginx", "-g", "daemon off;"]
