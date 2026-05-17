FROM python:3.13-slim

WORKDIR /app

# Install system dependencies for audio processing (Silero VAD, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy agent code
COPY agent.py backrooms.py tools.py ./

# API keys injected via Fly secrets at runtime (fly secrets set)
# .env.local is NOT baked into the image — use fly secrets for security

# Expose the health/metrics port that LiveKit Agents uses
EXPOSE 59245

# Run the agent in production mode (not dev)
# The agent reads LIVEKIT_AGENT_ID and all API keys from env (Fly secrets)
CMD ["python", "-u", "agent.py", "start"]
