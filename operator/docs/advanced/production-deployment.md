# Production Deployment Guide

## Overview

This guide covers deploying Ralph Orchestrator in production environments, including server setup, automation, monitoring, and scaling considerations.

## Deployment Options

### 1. Local Server Deployment

#### System Requirements
- **OS**: Linux (Ubuntu 20.04+, RHEL 8+, Debian 11+)
- **Python**: 3.9+
- **Git**: 2.25+
- **Memory**: 4GB minimum, 8GB recommended
- **Storage**: 20GB available space
- **Network**: Stable internet for AI agent APIs

#### Installation Script
```bash
#!/bin/bash
# ralph-install.sh

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install dependencies
sudo apt-get install -y python3 python3-pip git nodejs npm

# Install AI agents
npm install -g @anthropic-ai/claude-code
npm install -g @google/gemini-cli
# Install Q following its documentation

# Clone Ralph
git clone https://github.com/yourusername/ralph-orchestrator.git
cd ralph-orchestrator

# Set permissions
chmod +x ralph_orchestrator.py ralph

# Create systemd service
sudo cp ralph.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ralph
```

### 2. Docker Deployment

#### Dockerfile
```dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install AI CLI tools
RUN npm install -g @anthropic-ai/claude-code @google/gemini-cli

# Create ralph user
RUN useradd -m -s /bin/bash ralph
WORKDIR /home/ralph

# Copy application
COPY --chown=ralph:ralph . /home/ralph/ralph-orchestrator/
WORKDIR /home/ralph/ralph-orchestrator

# Set permissions
RUN chmod +x ralph_orchestrator.py ralph

# Switch to ralph user
USER ralph

# Default command
CMD ["./ralph", "run"]
```

#### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  ralph:
    build: .
    container_name: ralph-orchestrator
    restart: unless-stopped
    volumes:
      - ./workspace:/home/ralph/workspace
      - ./prompts:/home/ralph/prompts
      - ralph-agent:/home/ralph/ralph-orchestrator/.agent
    environment:
      - RALPH_MAX_ITERATIONS=100
      - RALPH_AGENT=auto
      - RALPH_CHECKPOINT_INTERVAL=5
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  ralph-agent:
```

### 3. Cloud Deployment

#### AWS EC2
```bash
# User data script for EC2 instance
#!/bin/bash
yum update -y
yum install -y python3 git nodejs

# Install Ralph
cd /opt
git clone https://github.com/yourusername/ralph-orchestrator.git
cd ralph-orchestrator
chmod +x ralph_orchestrator.py ralph

# Configure as service
cat > /etc/systemd/system/ralph.service << EOF
[Unit]
Description=Ralph Orchestrator
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/ralph-orchestrator
ExecStart=/opt/ralph-orchestrator/ralph run
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl enable ralph
systemctl start ralph
```

#### Kubernetes Deployment
```yaml
# ralph-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ralph-orchestrator
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ralph
  template:
    metadata:
      labels:
        app: ralph
    spec:
      containers:
      - name: ralph
        image: ralph-orchestrator:latest
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
        volumeMounts:
        - name: workspace
          mountPath: /workspace
        - name: config
          mountPath: /config
      volumes:
      - name: workspace
        persistentVolumeClaim:
          claimName: ralph-workspace
      - name: config
        configMap:
          name: ralph-config
```

## Configuration Management

### Environment Variables
```bash
# /etc/environment or .env file
RALPH_HOME=/opt/ralph-orchestrator
RALPH_WORKSPACE=/var/ralph/workspace
RALPH_LOG_LEVEL=INFO
RALPH_MAX_ITERATIONS=100
RALPH_MAX_RUNTIME=14400
RALPH_AGENT=claude
RALPH_CHECKPOINT_INTERVAL=5
RALPH_RETRY_DELAY=2
RALPH_GIT_ENABLED=true
RALPH_ARCHIVE_ENABLED=true
```

### Configuration File
```json
{
  "production": {
    "agent": "claude",
    "max_iterations": 100,
    "max_runtime": 14400,
    "checkpoint_interval": 5,
    "retry_delay": 2,
    "retry_max": 5,
    "timeout_per_iteration": 300,
    "git_enabled": true,
    "archive_enabled": true,
    "monitoring": {
      "enabled": true,
      "metrics_endpoint": "http://metrics.example.com",
      "log_level": "INFO"
    },
    "security": {
      "sandbox_enabled": true,
      "allowed_directories": ["/workspace"],
      "forbidden_commands": ["rm -rf", "sudo", "su"],
      "max_file_size": 10485760
    }
  }
}
```

## Automation

### Systemd Service
```ini
# /etc/systemd/system/ralph.service
[Unit]
Description=Ralph Orchestrator Service
Documentation=https://github.com/yourusername/ralph-orchestrator
After=network.target

[Service]
Type=simple
User=ralph
Group=ralph
WorkingDirectory=/opt/ralph-orchestrator
ExecStart=/opt/ralph-orchestrator/ralph run --config production.json
ExecReload=/bin/kill -HUP $MAINPID
Restart=on-failure
RestartSec=30
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ralph
Environment="PYTHONUNBUFFERED=1"

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/ralph-orchestrator /var/ralph

[Install]
WantedBy=multi-user.target
```

### Cron Jobs
```bash
# /etc/cron.d/ralph
# Clean old logs weekly
0 2 * * 0 ralph /opt/ralph-orchestrator/scripts/cleanup.sh

# Backup state daily
0 3 * * * ralph tar -czf /backup/ralph-$(date +\%Y\%m\%d).tar.gz /opt/ralph-orchestrator/.agent

# Health check every 5 minutes
*/5 * * * * ralph /opt/ralph-orchestrator/scripts/health-check.sh || systemctl restart ralph
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy Ralph

on:
  push:
    branches: [main]
    paths:
      - 'ralph_orchestrator.py'
      - 'ralph'
      - 'requirements.txt'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run tests
        run: python test_comprehensive.py
      
      - name: Build Docker image
        run: docker build -t ralph-orchestrator:${{ github.sha }} .
      
      - name: Push to registry
        run: |
          docker tag ralph-orchestrator:${{ github.sha }} ${{ secrets.REGISTRY }}/ralph:latest
          docker push ${{ secrets.REGISTRY }}/ralph:latest
      
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/ralph-orchestrator
            git pull
            systemctl restart ralph
```

## Monitoring in Production

### Prometheus Metrics
```python
# metrics_exporter.py
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import json
import glob

# Define metrics
iteration_counter = Counter('ralph_iterations_total', 'Total iterations')
error_counter = Counter('ralph_errors_total', 'Total errors')
runtime_gauge = Gauge('ralph_runtime_seconds', 'Current runtime')
iteration_duration = Histogram('ralph_iteration_duration_seconds', 'Iteration duration')

def collect_metrics():
    """Collect metrics from Ralph state files"""
    state_files = glob.glob('.agent/metrics/state_*.json')
    if state_files:
        latest = max(state_files)
        with open(latest) as f:
            state = json.load(f)
            
        iteration_counter.inc(state.get('iteration_count', 0))
        runtime_gauge.set(state.get('runtime', 0))
        
        if state.get('errors'):
            error_counter.inc(len(state['errors']))

if __name__ == '__main__':
    # Start metrics server
    start_http_server(8000)
    
    # Collect metrics periodically
    while True:
        collect_metrics()
        time.sleep(30)
```

### Logging Setup
```python
# logging_config.py
import logging
import logging.handlers
import json

def setup_production_logging():
    """Configure production logging"""
    
    # JSON formatter for structured logging
    class JSONFormatter(logging.Formatter):
        def format(self, record):
            log_obj = {
                'timestamp': self.formatTime(record),
                'level': record.levelname,
                'logger': record.name,
                'message': record.getMessage(),
                'module': record.module,
                'function': record.funcName,
                'line': record.lineno
            }
            if record.exc_info:
                log_obj['exception'] = self.formatException(record.exc_info)
            return json.dumps(log_obj)
    
    # Configure root logger
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    # File handler with rotation
    file_handler = logging.handlers.RotatingFileHandler(
        '/var/log/ralph/ralph.log',
        maxBytes=100*1024*1024,  # 100MB
        backupCount=10
    )
    file_handler.setFormatter(JSONFormatter())
    
    # Syslog handler
    syslog_handler = logging.handlers.SysLogHandler(address='/dev/log')
    syslog_handler.setFormatter(JSONFormatter())
    
    logger.addHandler(file_handler)
    logger.addHandler(syslog_handler)
```

## Security Hardening

### User Isolation
```bash
# Create dedicated user
sudo useradd -r -s /bin/bash -m -d /opt/ralph ralph
sudo chown -R ralph:ralph /opt/ralph-orchestrator

# Set restrictive permissions
chmod 750 /opt/ralph-orchestrator
chmod 640 /opt/ralph-orchestrator/*.py
chmod 750 /opt/ralph-orchestrator/ralph
```

### Network Security
```bash
# Firewall rules (iptables)
iptables -A OUTPUT -p tcp --dport 443 -j ACCEPT  # HTTPS for AI agents
iptables -A OUTPUT -p tcp --dport 22 -j ACCEPT   # Git SSH
iptables -A OUTPUT -j DROP                       # Block other outbound

# Or using ufw
ufw allow out 443/tcp
ufw allow out 22/tcp
ufw default deny outgoing
```

### API Key Management
```bash
# Use system keyring
pip install keyring

# Store API keys securely
python -c "import keyring; keyring.set_password('ralph', 'claude_api_key', 'your-key')"

# Or use environment variables from secure store
source /etc/ralph/secrets.env
```

## Scaling Considerations

### Horizontal Scaling
```python
# job_queue.py
import redis
import json

class RalphJobQueue:
    def __init__(self):
        self.redis = redis.Redis(host='localhost', port=6379)
    
    def add_job(self, prompt_file, config):
        """Add job to queue"""
        job = {
            'id': str(uuid.uuid4()),
            'prompt_file': prompt_file,
            'config': config,
            'status': 'pending',
            'created': time.time()
        }
        self.redis.lpush('ralph:jobs', json.dumps(job))
        return job['id']
    
    def get_job(self):
        """Get next job from queue"""
        job_data = self.redis.rpop('ralph:jobs')
        if job_data:
            return json.loads(job_data)
        return None
```

### Resource Limits
```python
# resource_limits.py
import resource

def set_production_limits():
    """Set resource limits for production"""
    
    # Memory limit (4GB)
    resource.setrlimit(
        resource.RLIMIT_AS,
        (4 * 1024 * 1024 * 1024, -1)
    )
    
    # CPU time limit (1 hour)
    resource.setrlimit(
        resource.RLIMIT_CPU,
        (3600, 3600)
    )
    
    # File size limit (100MB)
    resource.setrlimit(
        resource.RLIMIT_FSIZE,
        (100 * 1024 * 1024, -1)
    )
    
    # Process limit
    resource.setrlimit(
        resource.RLIMIT_NPROC,
        (100, 100)
    )
```

## Backup and Recovery

### Automated Backups
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup/ralph"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup
tar -czf $BACKUP_DIR/ralph_$TIMESTAMP.tar.gz \
    /opt/ralph-orchestrator/.agent \
    /opt/ralph-orchestrator/*.json \
    /opt/ralph-orchestrator/PROMPT.md

# Keep only last 30 days
find $BACKUP_DIR -name "ralph_*.tar.gz" -mtime +30 -delete

# Sync to S3 (optional)
aws s3 sync $BACKUP_DIR s3://my-bucket/ralph-backups/
```

### Disaster Recovery
```bash
#!/bin/bash
# restore.sh

BACKUP_FILE=$1
RESTORE_DIR="/opt/ralph-orchestrator"

# Stop service
systemctl stop ralph

# Restore backup
tar -xzf $BACKUP_FILE -C /

# Reset Git repository
cd $RESTORE_DIR
git reset --hard HEAD

# Restart service
systemctl start ralph
```

## Health Checks

### HTTP Health Endpoint
```python
# health_server.py
from flask import Flask, jsonify
import os
import json

app = Flask(__name__)

@app.route('/health')
def health():
    """Health check endpoint"""
    try:
        # Check Ralph process
        pid_file = '/var/run/ralph.pid'
        if os.path.exists(pid_file):
            with open(pid_file) as f:
                pid = int(f.read())
            os.kill(pid, 0)  # Check if process exists
            status = 'healthy'
        else:
            status = 'unhealthy'
        
        # Check last state
        state_files = glob.glob('.agent/metrics/state_*.json')
        if state_files:
            latest = max(state_files)
            with open(latest) as f:
                state = json.load(f)
        else:
            state = {}
        
        return jsonify({
            'status': status,
            'iteration': state.get('iteration_count', 0),
            'runtime': state.get('runtime', 0),
            'errors': len(state.get('errors', []))
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Production Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Configuration reviewed
- [ ] API keys secured
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Resource limits set
- [ ] Security hardening applied

### Deployment
- [ ] Service installed
- [ ] Permissions set correctly
- [ ] Logging configured
- [ ] Health checks working
- [ ] Metrics collection active
- [ ] Backup job scheduled

### Post-Deployment
- [ ] Service running
- [ ] Logs being generated
- [ ] Metrics visible
- [ ] Test job successful
- [ ] Alerts configured
- [ ] Documentation updated