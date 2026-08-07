FROM golang:1.25-alpine AS build

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o /sentra-gateway ./cmd

FROM alpine:3.21
RUN adduser -D -H -u 10001 sentra
USER sentra
COPY --from=build /sentra-gateway /usr/local/bin/sentra-gateway
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/sentra-gateway"]
