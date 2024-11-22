FROM mcr.microsoft.com/vscode/devcontainers/typescript-node:18

# Install additional OS tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
        git \
        openssh-client \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Switch to non-root user for npm operations
USER node