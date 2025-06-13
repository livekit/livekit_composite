# This is an example Dockerfile that builds a minimal container for running LK Agents
# syntax=docker/dockerfile:1
FROM node:20-slim AS base

WORKDIR /app

# throw away build stage to reduce size of final image
FROM base AS build

RUN apt-get update -qq && apt-get install --no-install-recommends -y ca-certificates
COPY . .

RUN npm install

FROM base
COPY --from=build /app /app
COPY --from=build /etc/ssl/certs /etc/ssl/certs

# start the server by default, this can be overwritten at runtime
EXPOSE 8081

ENTRYPOINT ["npm", "run", "start"]
