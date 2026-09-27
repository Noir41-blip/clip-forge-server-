FROM node:20-bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg python3 python3-pip curl ca-certificates && \
    pip3 install --no-cache-dir -U yt-dlp --break-system-packages && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
