# Build stage
FROM golang:1.22-alpine AS builder
RUN apk add --no-cache make git
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN make build-linux

# Runtime stage
FROM alpine:3.20
RUN apk add --no-cache ca-certificates libcap
RUN adduser -D -H -s /sbin/nologin netmon

COPY --from=builder /src/netmon-agent /usr/local/bin/netmon-agent
RUN setcap cap_net_raw=eip /usr/local/bin/netmon-agent

COPY config.yaml /etc/netmon-agent/config.yaml
RUN chown -R netmon:netmon /etc/netmon-agent

USER netmon
ENTRYPOINT ["/usr/local/bin/netmon-agent"]
CMD ["-config", "/etc/netmon-agent/config.yaml"]
