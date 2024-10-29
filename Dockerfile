FROM node:16-alpine

# Tạo thư mục ứng dụng và thiết lập quyền
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app

WORKDIR /home/node/app

# Sao chép package.json và package-lock.json trước
COPY --chown=node:node package*.json ./

# Chuyển sang người dùng node
USER node

# Cài đặt các dependencies
RUN npm install --production

# Sao chép mã nguồn vào container
COPY --chown=node:node . .

# Expose port 8000
EXPOSE 3001

# Chạy ứng dụng
CMD ["node", "src/index.js"]
