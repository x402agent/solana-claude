# Configuration API Reference

## Overview

The Configuration API provides methods for managing Ralph Orchestrator settings, including agent selection, runtime limits, and behavior customization.

## Configuration Structure

### Default Configuration

```python
DEFAULT_CONFIG = {
    'agent': 'auto',                    # AI agent to use
    'prompt_file': 'PROMPT.md',         # Task description file
    'max_iterations': 100,               # Maximum loop iterations
    'max_runtime': 14400,                # Maximum runtime in seconds (4 hours)
    'checkpoint_interval': 5,            # Create checkpoint every N iterations
    'retry_delay': 2,                    # Delay between retries in seconds
    'retry_max': 5,                      # Maximum consecutive errors
    'timeout_per_iteration': 300,        # Timeout per iteration in seconds
    'verbose': False,                    # Enable verbose logging
    'dry_run': False,                    # Test mode without execution
    'git_enabled': True,                 # Enable Git checkpointing
    'archive_enabled': True,             # Enable prompt archiving
    'working_directory': '.',            # Working directory path
    'agent_directory': '.agent'          # Agent workspace directory
}
```

## Configuration Loading

### From File

```python
def load_config(config_file='config.json'):
    """
    Load configuration from JSON file.
    
    Args:
        config_file (str): Path to configuration file
        
    Returns:
        dict: Merged configuration with defaults
        
    Example:
        config = load_config('production.json')
    """
    config = DEFAULT_CONFIG.copy()
    
    if os.path.exists(config_file):
        with open(config_file) as f:
            user_config = json.load(f)
        config.update(user_config)
    
    return config
```

### From Environment Variables

```python
def load_env_config():
    """
    Load configuration from environment variables.
    
    Environment variables:
        RALPH_AGENT: Agent to use (claude, q, gemini, auto)
        RALPH_MAX_ITERATIONS: Maximum iterations
        RALPH_MAX_RUNTIME: Maximum runtime in seconds
        RALPH_CHECKPOINT_INTERVAL: Checkpoint interval
        RALPH_VERBOSE: Enable verbose mode (true/false)
        RALPH_DRY_RUN: Enable dry run mode (true/false)
        
    Returns:
        dict: Configuration from environment
        
    Example:
        os.environ['RALPH_AGENT'] = 'claude'
        config = load_env_config()
    """
    config = {}
    
    # String values
    for key in ['AGENT', 'PROMPT_FILE', 'WORKING_DIRECTORY']:
        env_key = f'RALPH_{key}'
        if env_key in os.environ:
            config[key.lower()] = os.environ[env_key]
    
    # Integer values
    for key in ['MAX_ITERATIONS', 'MAX_RUNTIME', 'CHECKPOINT_INTERVAL']:
        env_key = f'RALPH_{key}'
        if env_key in os.environ:
            config[key.lower()] = int(os.environ[env_key])
    
    # Boolean values
    for key in ['VERBOSE', 'DRY_RUN', 'GIT_ENABLED']:
        env_key = f'RALPH_{key}'
        if env_key in os.environ:
            config[key.lower()] = os.environ[env_key].lower() == 'true'
    
    return config
```

### From Command Line Arguments

```python
def parse_args():
    """
    Parse command line arguments for configuration.
    
    Returns:
        argparse.Namespace: Parsed arguments
        
    Example:
        args = parse_args()
        config = vars(args)
    """
    parser = argparse.ArgumentParser(
        description='Ralph Orchestrator - AI task automation'
    )
    
    parser.add_argument(
        '--agent',
        choices=['claude', 'q', 'gemini', 'auto'],
        default='auto',
        help='AI agent to use'
    )
    
    parser.add_argument(
        '--prompt',
        default='PROMPT.md',
        help='Prompt file path'
    )
    
    parser.add_argument(
        '--max-iterations',
        type=int,
        default=100,
        help='Maximum iterations'
    )
    
    parser.add_argument(
        '--max-runtime',
        type=int,
        default=14400,
        help='Maximum runtime in seconds'
    )
    
    parser.add_argument(
        '--checkpoint-interval',
        type=int,
        default=5,
        help='Checkpoint every N iterations'
    )
    
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose output'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Test mode without execution'
    )
    
    return parser.parse_args()
```

## Configuration Validation

```python
def validate_config(config):
    """
    Validate configuration values.
    
    Args:
        config (dict): Configuration to validate
        
    Raises:
        ValueError: If configuration is invalid
        
    Example:
        config = load_config()
        validate_config(config)
    """
    # Check required fields
    required_fields = ['agent', 'prompt_file', 'max_iterations']
    for field in required_fields:
        if field not in config:
            raise ValueError(f"Missing required field: {field}")
    
    # Validate agent
    valid_agents = ['claude', 'q', 'gemini', 'auto']
    if config['agent'] not in valid_agents:
        raise ValueError(f"Invalid agent: {config['agent']}")
    
    # Validate numeric limits
    if config['max_iterations'] < 1:
        raise ValueError("max_iterations must be at least 1")
    
    if config['max_runtime'] < 60:
        raise ValueError("max_runtime must be at least 60 seconds")
    
    if config['checkpoint_interval'] < 1:
        raise ValueError("checkpoint_interval must be at least 1")
    
    # Validate file paths
    if not os.path.exists(config['prompt_file']):
        raise ValueError(f"Prompt file not found: {config['prompt_file']}")
    
    return True
```

## Configuration Merging

```python
def merge_configs(*configs):
    """
    Merge multiple configuration sources with priority.
    
    Priority (highest to lowest):
    1. Command line arguments
    2. Environment variables
    3. Configuration file
    4. Defaults
    
    Args:
        *configs: Configuration dictionaries to merge
        
    Returns:
        dict: Merged configuration
        
    Example:
        final_config = merge_configs(
            DEFAULT_CONFIG,
            file_config,
            env_config,
            cli_config
        )
    """
    merged = {}
    
    for config in configs:
        if config:
            merged.update({k: v for k, v in config.items() 
                          if v is not None})
    
    return merged
```

## Configuration Access

```python
class Config:
    """
    Configuration accessor with dot notation support.
    
    Example:
        config = Config(load_config())
        print(config.agent)
        print(config.max_iterations)
    """
    
    def __init__(self, config_dict):
        self._config = config_dict
    
    def __getattr__(self, name):
        if name in self._config:
            return self._config[name]
        raise AttributeError(f"Config has no attribute '{name}'")
    
    def __setattr__(self, name, value):
        if name == '_config':
            super().__setattr__(name, value)
        else:
            self._config[name] = value
    
    def get(self, key, default=None):
        """Get configuration value with default."""
        return self._config.get(key, default)
    
    def update(self, updates):
        """Update configuration values."""
        self._config.update(updates)
    
    def to_dict(self):
        """Convert to dictionary."""
        return self._config.copy()
    
    def save(self, filename):
        """Save configuration to file."""
        with open(filename, 'w') as f:
            json.dump(self._config, f, indent=2)
```

## Agent-Specific Configuration

### Claude Configuration

```python
CLAUDE_CONFIG = {
    'command': 'claude',
    'args': [],
    'env': {},
    'timeout': 300,
    'context_limit': 200000,
    'features': {
        'code_execution': True,
        'web_search': False,
        'file_operations': True
    }
}
```

### Gemini Configuration

```python
GEMINI_CONFIG = {
    'command': 'gemini',
    'args': ['--no-web'],
    'env': {},
    'timeout': 300,
    'context_limit': 32768,
    'features': {
        'code_execution': True,
        'web_search': True,
        'file_operations': True
    }
}
```

### Q Configuration

```python
Q_CONFIG = {
    'command': 'q',
    'args': [],
    'env': {},
    'timeout': 300,
    'context_limit': 8192,
    'features': {
        'code_execution': True,
        'web_search': False,
        'file_operations': True
    }
}
```

## Runtime Configuration

### Dynamic Updates

```python
class RuntimeConfig:
    """
    Configuration that can be updated during execution.
    
    Example:
        runtime_config = RuntimeConfig(initial_config)
        runtime_config.update_agent('gemini')
        runtime_config.adjust_limits(iterations=50)
    """
    
    def __init__(self, initial_config):
        self.config = initial_config.copy()
        self.history = [initial_config.copy()]
    
    def update_agent(self, agent):
        """Switch to different agent."""
        if agent in ['claude', 'q', 'gemini']:
            self.config['agent'] = agent
            self.history.append(self.config.copy())
    
    def adjust_limits(self, iterations=None, runtime=None):
        """Adjust runtime limits."""
        if iterations:
            self.config['max_iterations'] = iterations
        if runtime:
            self.config['max_runtime'] = runtime
        self.history.append(self.config.copy())
    
    def rollback(self):
        """Rollback to previous configuration."""
        if len(self.history) > 1:
            self.history.pop()
            self.config = self.history[-1].copy()
```

## Configuration Templates

### Development Template

```json
{
  "agent": "auto",
  "max_iterations": 50,
  "max_runtime": 3600,
  "checkpoint_interval": 10,
  "verbose": true,
  "dry_run": false,
  "git_enabled": true,
  "archive_enabled": true
}
```

### Production Template

```json
{
  "agent": "claude",
  "max_iterations": 100,
  "max_runtime": 14400,
  "checkpoint_interval": 5,
  "retry_delay": 5,
  "retry_max": 3,
  "verbose": false,
  "dry_run": false,
  "git_enabled": true,
  "archive_enabled": true,
  "monitoring": {
    "enabled": true,
    "metrics_interval": 60,
    "alert_on_error": true
  }
}
```

### Testing Template

```json
{
  "agent": "auto",
  "max_iterations": 10,
  "max_runtime": 600,
  "checkpoint_interval": 1,
  "verbose": true,
  "dry_run": true,
  "git_enabled": false,
  "archive_enabled": false
}
```

## Configuration Examples

### Basic Usage

```python
# Load default configuration
config = Config(DEFAULT_CONFIG)

# Update specific values
config.agent = 'claude'
config.max_iterations = 50

# Access values
print(f"Using agent: {config.agent}")
print(f"Max iterations: {config.max_iterations}")
```

### Advanced Usage

```python
# Load from multiple sources
file_config = load_config('custom.json')
env_config = load_env_config()
cli_config = vars(parse_args())

# Merge with priority
final_config = merge_configs(
    DEFAULT_CONFIG,
    file_config,
    env_config,
    cli_config
)

# Validate
validate_config(final_config)

# Create accessor
config = Config(final_config)

# Save for reproducibility
config.save('execution_config.json')
```

### Programmatic Configuration

```python
# Create configuration programmatically
config = Config({
    'agent': detect_best_agent(),
    'prompt_file': 'task.md',
    'max_iterations': calculate_iterations(task_complexity),
    'max_runtime': estimate_runtime(task_size),
    'checkpoint_interval': 5 if production else 10,
    'verbose': debug_mode,
    'dry_run': test_mode
})

# Use configuration
orchestrator = RalphOrchestrator(config.to_dict())
result = orchestrator.run()
```