FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the application code to the container
COPY . .

# Upgrade pip and install the package
RUN pip install --upgrade pip \
    && pip install --no-cache-dir .

# Command to run the MCP server
CMD ["elevenlabs-mcp"]