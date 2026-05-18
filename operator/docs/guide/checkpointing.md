# Checkpointing and Recovery Guide

Ralph Orchestrator provides robust checkpointing mechanisms to ensure work is never lost and tasks can be resumed after interruptions.

## Overview

Checkpointing saves the state of your orchestration at regular intervals, enabling:
- **Recovery** from crashes or interruptions
- **Progress tracking** across iterations
- **State inspection** for debugging
- **Audit trails** for compliance

## Checkpoint Types

### 1. Git Checkpoints

Automatic git commits at specified intervals:

```bash
# Enable git checkpointing (default)
python ralph_orchestrator.py --checkpoint-interval 5

# Disable git checkpointing
python ralph_orchestrator.py --no-git
```

**What's saved:**
- Current prompt file state
- Any files created/modified by the agent
- Timestamp and iteration number

### 2. Prompt Archives

Historical versions of the prompt file:

```bash
# Enable prompt archiving (default)
python ralph_orchestrator.py

# Disable prompt archiving
python ralph_orchestrator.py --no-archive
```

**Location:** `.agent/prompts/prompt_YYYYMMDD_HHMMSS.md`

### 3. State Snapshots

JSON files containing orchestrator state:

```json
{
  "iteration": 15,
  "agent": "claude",
  "start_time": "2024-01-10T10:00:00",
  "tokens_used": 50000,
  "cost_incurred": 2.50,
  "status": "running"
}
```

**Location:** `.agent/metrics/state_*.json`

## Configuration

### Checkpoint Interval

Control how often checkpoints occur:

```bash
# Checkpoint every iteration (maximum safety)
python ralph_orchestrator.py --checkpoint-interval 1

# Checkpoint every 10 iterations (balanced)
python ralph_orchestrator.py --checkpoint-interval 10

# Checkpoint every 50 iterations (minimal overhead)
python ralph_orchestrator.py --checkpoint-interval 50
```

### Checkpoint Strategies

#### Aggressive Checkpointing
For critical or experimental tasks:

```bash
python ralph_orchestrator.py \
  --checkpoint-interval 1 \
  --metrics-interval 1 \
  --verbose
```

#### Balanced Checkpointing
For standard production tasks:

```bash
python ralph_orchestrator.py \
  --checkpoint-interval 5 \
  --metrics-interval 10
```

#### Minimal Checkpointing
For simple, fast tasks:

```bash
python ralph_orchestrator.py \
  --checkpoint-interval 20 \
  --no-archive
```

## Recovery Procedures

### Automatic Recovery

Ralph Orchestrator automatically recovers from the last checkpoint:

1. **Detect interruption**
2. **Load last checkpoint**
3. **Resume from last known state**
4. **Continue iteration**

### Manual Recovery

#### From Git Checkpoint

```bash
# View checkpoint history
git log --oneline | grep "Ralph checkpoint"

# Restore specific checkpoint
git checkout <commit-hash>

# Resume orchestration
python ralph_orchestrator.py --prompt PROMPT.md
```

#### From Prompt Archive

```bash
# List archived prompts
ls -la .agent/prompts/

# Restore archived prompt
cp .agent/prompts/prompt_20240110_100000.md PROMPT.md

# Resume orchestration
python ralph_orchestrator.py
```

#### From State Snapshot

```python
# Load state programmatically
import json

with open('.agent/metrics/state_20240110_100000.json') as f:
    state = json.load(f)
    
print(f"Last iteration: {state['iteration']}")
print(f"Tokens used: {state['tokens_used']}")
print(f"Cost incurred: ${state['cost_incurred']}")
```

## Checkpoint Storage

### Directory Structure

```
.agent/
├── checkpoints/       # Git checkpoint metadata
├── prompts/          # Archived prompt files
│   ├── prompt_20240110_100000.md
│   ├── prompt_20240110_101500.md
│   └── prompt_20240110_103000.md
├── metrics/          # State and metrics
│   ├── state_20240110_100000.json
│   ├── state_20240110_101500.json
│   └── metrics_20240110_103000.json
└── logs/            # Execution logs
```

### Storage Management

#### Clean Old Checkpoints

```bash
# Remove checkpoints older than 7 days
find .agent/prompts -mtime +7 -delete
find .agent/metrics -name "*.json" -mtime +7 -delete

# Keep only last 100 checkpoints
ls -t .agent/prompts/*.md | tail -n +101 | xargs rm -f
```

#### Backup Checkpoints

```bash
# Create backup archive
tar -czf ralph_checkpoints_$(date +%Y%m%d).tar.gz .agent/

# Backup to remote
rsync -av .agent/ user@backup-server:/backups/ralph/
```

## Advanced Checkpointing

### Custom Checkpoint Triggers

Beyond interval-based checkpointing, you can trigger checkpoints in your prompt:

```markdown
## Progress
- Step 1 complete [CHECKPOINT]
- Step 2 complete [CHECKPOINT]
- Step 3 complete [CHECKPOINT]
```

### Checkpoint Hooks

Use git hooks for custom checkpoint processing:

```bash
# .git/hooks/post-commit
#!/bin/bash
if [[ $1 == *"Ralph checkpoint"* ]]; then
    # Custom backup or notification
    cp PROMPT.md /backup/location/
    echo "Checkpoint created" | mail -s "Ralph Progress" admin@example.com
fi
```

### Distributed Checkpointing

For team environments:

```bash
# Push checkpoints to shared repository
python ralph_orchestrator.py --checkpoint-interval 5

# In another terminal/machine
git pull  # Get latest checkpoints

# Or use automated sync
watch -n 60 'git pull'
```

## Best Practices

### 1. Choose Appropriate Intervals

| Task Type | Recommended Interval | Rationale |
|-----------|---------------------|-----------|
| Experimental | 1-2 | Maximum recovery points |
| Development | 5-10 | Balance safety/performance |
| Production | 10-20 | Minimize overhead |
| Simple | 20-50 | Low risk tasks |

### 2. Monitor Checkpoint Size

```bash
# Check checkpoint storage usage
du -sh .agent/

# Monitor growth
watch -n 60 'du -sh .agent/*'
```

### 3. Test Recovery

Regularly test recovery procedures:

```bash
# Simulate interruption
python ralph_orchestrator.py &
PID=$!
sleep 30
kill $PID

# Verify recovery
python ralph_orchestrator.py  # Should resume
```

### 4. Clean Up Regularly

Implement checkpoint rotation:

```bash
# Keep last 50 checkpoints
#!/bin/bash
MAX_CHECKPOINTS=50
COUNT=$(ls .agent/prompts/*.md 2>/dev/null | wc -l)
if [ $COUNT -gt $MAX_CHECKPOINTS ]; then
    ls -t .agent/prompts/*.md | tail -n +$(($MAX_CHECKPOINTS+1)) | xargs rm
fi
```

## Troubleshooting

### Common Issues

#### 1. Git Checkpointing Fails

**Error:** "Not a git repository"

**Solution:**
```bash
# Initialize git repository
git init
git add .
git commit -m "Initial commit"

# Or disable git checkpointing
python ralph_orchestrator.py --no-git
```

#### 2. Checkpoint Storage Full

**Error:** "No space left on device"

**Solution:**
```bash
# Clean old checkpoints
find .agent -type f -mtime +30 -delete

# Move to larger storage
mv .agent /larger/disk/
ln -s /larger/disk/.agent .agent
```

#### 3. Corrupted Checkpoint

**Error:** "Invalid checkpoint data"

**Solution:**
```bash
# Use previous checkpoint
ls -la .agent/prompts/  # Find earlier version
cp .agent/prompts/prompt_EARLIER.md PROMPT.md
```

### Recovery Validation

Verify checkpoint integrity:

```python
#!/usr/bin/env python3
import json
import os
from pathlib import Path

def validate_checkpoints():
    checkpoint_dir = Path('.agent/metrics')
    for state_file in checkpoint_dir.glob('state_*.json'):
        try:
            with open(state_file) as f:
                data = json.load(f)
                assert 'iteration' in data
                assert 'agent' in data
                print(f"✓ {state_file.name}")
        except Exception as e:
            print(f"✗ {state_file.name}: {e}")

validate_checkpoints()
```

## Performance Impact

### Checkpoint Overhead

| Interval | Overhead | Use Case |
|----------|----------|----------|
| 1 | High (5-10%) | Critical tasks |
| 5 | Moderate (2-5%) | Standard tasks |
| 10 | Low (1-2%) | Long tasks |
| 20+ | Minimal (<1%) | Simple tasks |

### Optimization Tips

1. **Use SSDs** for checkpoint storage
2. **Disable unnecessary features** (e.g., `--no-archive` if not needed)
3. **Adjust intervals** based on task criticality
4. **Clean up regularly** to maintain performance

## Integration

### CI/CD Integration

```yaml
# .github/workflows/ralph.yml
name: Ralph Orchestration
on:
  push:
    branches: [main]
    
jobs:
  orchestrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Run Ralph
        run: |
          python ralph_orchestrator.py \
            --checkpoint-interval 10 \
            --max-iterations 100
            
      - name: Save Checkpoints
        uses: actions/upload-artifact@v2
        with:
          name: ralph-checkpoints
          path: .agent/
```

### Monitoring Integration

```bash
# Send checkpoint events to monitoring
#!/bin/bash
CHECKPOINT_COUNT=$(ls .agent/prompts/*.md 2>/dev/null | wc -l)
curl -X POST https://metrics.example.com/api/v1/metrics \
  -d "ralph.checkpoints.count=$CHECKPOINT_COUNT"
```

## Next Steps

- Learn about [Cost Management](cost-management.md) to optimize checkpoint costs
- Explore [Configuration](configuration.md) for checkpoint options
- Review [Troubleshooting](../troubleshooting.md) for recovery issues
- See [Examples](../examples/index.md) for checkpoint patterns