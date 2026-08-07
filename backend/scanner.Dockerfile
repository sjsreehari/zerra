FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY cmd/scanner ./cmd/scanner
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /scanner ./cmd/scanner

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /scanner /scanner
USER nonroot:nonroot
ENTRYPOINT ["/scanner"]
