FROM node:22-alpine AS runtime

WORKDIR /app

ARG RELEASE_TAG=dev
ARG RELEASE_URL=https://github.com/markwylde/gramadoc/releases

ENV NODE_ENV=production
ENV PORT=3002
ENV RELEASE_TAG=${RELEASE_TAG}
ENV RELEASE_URL=${RELEASE_URL}

COPY packages/gramadoc/package.json ./packages/gramadoc/package.json
RUN npm install --omit=dev --prefix /app/packages/gramadoc

COPY packages/gramadoc-api/dist ./packages/gramadoc-api/dist
COPY packages/gramadoc/dist ./packages/gramadoc/dist

WORKDIR /app/packages/gramadoc-api

EXPOSE 3002

CMD ["node", "dist/index.js"]
