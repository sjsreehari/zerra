FROM golang:1.25-alpine AS build

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o /zerra-gateway ./cmd

FROM alpine:3.21
RUN adduser -D -H -u 10001 zerra
USER zerra
COPY --from=build /zerra-gateway /usr/local/bin/zerra-gateway
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/zerra-gateway"]
