FROM ubuntu:latest

RUN apt-get update && apt-get install -y \
    bash \
    curl \
    python3 \
    python3-pip \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /sandbox

CMD ["bash"]