FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Headless test image (npm test's suite plus bot-sim); not part of the default build.
#   docker build --target test -t aoe-knockout-test . && docker run --rm aoe-knockout-test
#   docker run --rm aoe-knockout-test node test/bot-sim.js 12
FROM node:22-alpine AS test
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html buildings.html ages.html ./
COPY src ./src
COPY test ./test
CMD ["node", "--test", "test/*.test.js"]

# Keep the nginx stage last: it is the default target for `docker build .` and compose.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
WORKDIR /usr/share/nginx/html
COPY index.html buildings.html ages.html styles.css favicon.svg ./
COPY src ./src
# Point the pages at /v/<content hash>/..., so every deploy that changes a file gets fresh URLs that no
# browser or Cloudflare copy can serve stale. The modules' own imports are relative, so they inherit it.
RUN v=$(find index.html buildings.html ages.html styles.css src -type f | sort | xargs cat | md5sum | cut -c1-12) \
 && sed -i "s#href=\"styles.css\"#href=\"v/$v/styles.css\"#; s#src=\"src/#src=\"v/$v/src/#" index.html buildings.html ages.html
# index.html's (and the design pages') import map points at these two three.js paths
COPY --from=deps /app/node_modules/three/build ./node_modules/three/build
COPY --from=deps /app/node_modules/three/examples/jsm ./node_modules/three/examples/jsm
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
