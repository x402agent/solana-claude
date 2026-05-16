# Web Monitoring Quick Start

Get the Ralph Orchestrator web monitoring dashboard up and running in 5 minutes.

## 1. Start the Web Server

### Option A: Standalone Python Script

Create `start_web.py`:

```python
#!/usr/bin/env python3
import asyncio
from ralph_orchestrator.web import WebMonitor

async def main():
    # Create and start the web server
    monitor = WebMonitor(
        host="0.0.0.0",
        port=8000,
        enable_auth=False  # Disable auth for quick testing
    )
    
    print("🚀 Web server starting at http://localhost:8000")
    print("📊 Dashboard will open automatically...")
    
    await monitor.run()

if __name__ == "__main__":
    asyncio.run(main())
```

Run it:
```bash
python start_web.py
```

### Option B: Integrated with Orchestrator

```python
#!/usr/bin/env python3
import asyncio
from ralph_orchestrator import RalphOrchestrator
from ralph_orchestrator.web import WebMonitor

async def main():
    # Start web monitor
    monitor = WebMonitor(host="0.0.0.0", port=8000, enable_auth=False)
    monitor_task = asyncio.create_task(monitor.run())
    
    # Run orchestrator with web monitoring
    orchestrator = RalphOrchestrator(
        agent_name="claude",
        prompt_file="PROMPT.md",
        web_monitor=monitor
    )
    
    print(f"🌐 Web dashboard: http://localhost:8000")
    print(f"🤖 Starting orchestrator with {orchestrator.agent_name}")
    
    # Run orchestrator
    orchestrator.run()

if __name__ == "__main__":
    asyncio.run(main())
```

## 2. Access the Dashboard

Open your browser to: **http://localhost:8000**

You'll see:
- 📊 **System Metrics**: CPU, memory, and process count
- 🤖 **Active Orchestrators**: Running tasks and status
- 📝 **Live Logs**: Real-time agent output
- 📜 **History**: Previous execution runs

## 3. Enable Authentication (Production)

For production deployments, enable authentication:

```bash
# Set environment variables
export RALPH_WEB_SECRET_KEY="your-secret-key-minimum-32-chars"
export RALPH_WEB_USERNAME="admin"
export RALPH_WEB_PASSWORD="secure-password-here"

# Update your script
monitor = WebMonitor(
    host="0.0.0.0",
    port=8000,
    enable_auth=True  # Enable authentication
)
```

## 4. Monitor Your Orchestrators

### View Task Progress
Click the **Tasks** button on any orchestrator card to see:
- Current task being executed
- Pending tasks in queue
- Completed tasks with timing

### Control Execution
- **Pause**: Temporarily stop orchestrator
- **Resume**: Continue execution
- **Edit Prompt**: Modify task on-the-fly

### Check System Health
The metrics panel updates every 5 seconds showing:
- CPU usage percentage
- Memory usage (used/total)
- Number of active processes

## 5. Common Commands

### Check if web server is running
```bash
curl http://localhost:8000/api/status
```

### View active orchestrators
```bash
curl http://localhost:8000/api/orchestrators
```

### Get system metrics
```bash
curl http://localhost:8000/api/metrics
```

## 6. Docker Quick Start

```dockerfile
# Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install -e .
EXPOSE 8000
CMD ["python", "-c", "import asyncio; from ralph_orchestrator.web import WebMonitor; asyncio.run(WebMonitor(host='0.0.0.0', port=8000).run())"]
```

Build and run:
```bash
docker build -t ralph-web .
docker run -p 8000:8000 ralph-web
```

## 7. Troubleshooting

### Port already in use
```bash
# Find process using port 8000
lsof -i :8000
# Or use a different port
monitor = WebMonitor(port=8080)
```

### Can't connect to dashboard
```bash
# Check if server is running
ps aux | grep ralph
# Check firewall settings
sudo ufw allow 8000
```

### WebSocket disconnecting
- Check browser console for errors
- Ensure no proxy is blocking WebSocket
- Try disabling authentication for testing

## Next Steps

- 📖 Read the [full web monitoring guide](./web-monitoring.md)
- 🔒 Configure [authentication and security](./web-monitoring.md#security-considerations)
- 🚀 Deploy to [production](./web-monitoring.md#production-deployment)
- 📊 Explore the [API endpoints](./web-monitoring.md#api-endpoints)