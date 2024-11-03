FROM golang:1.22.5

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

WORKDIR /app

RUN CGO_ENABLED=1 GOOS=linux go build -o /backend

EXPOSE 8080

CMD ["/backend"]