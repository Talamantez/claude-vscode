FROM mcr.microsoft.com/vscode/devcontainers/typescript-node:18

# Install additional OS tools and VS Code test dependencies
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
        git \
        openssh-client \
        libnss3 \
        libatk1.0-0 \
        libatk-bridge2.0-0 \
        libdrm2 \
        libgtk-3-0 \
        libasound2 \
        libgbm1 \
        xvfb \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Switch to non-root user for npm operations
USER node