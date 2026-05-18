# Agents API Reference

## Overview

The Agents API provides interfaces for interacting with different AI agents (Claude, Gemini, Q) and managing agent execution.

## Agent Interface

### Base Agent Class

```python
class Agent:
    """
    Abstract base class for AI agents.
    
    All agent implementations must inherit from this class
    and implement the required methods.
    """
    
    def __init__(self, name: str, command: str):
        """
        Initialize agent.
        
        Args:
            name (str): Agent identifier
            command (str): Command to execute agent
        """
        self.name = name
        self.command = command
        self.available = self.check_availability()
    
    def check_availability(self) -> bool:
        """
        Check if agent is available on system.
        
        Returns:
            bool: True if agent is available
            
        Example:
            agent = ClaudeAgent()
            if agent.available:
                agent.execute(prompt)
        """
        return shutil.which(self.command) is not None
    
    def execute(self, prompt_file: str) -> Tuple[bool, str]:
        """
        Execute agent with prompt file.
        
        Args:
            prompt_file (str): Path to prompt file
            
        Returns:
            tuple: (success, output)
            
        Raises:
            AgentExecutionError: If execution fails
        """
        raise NotImplementedError
    
    def validate_prompt(self, prompt_file: str) -> bool:
        """
        Validate prompt file before execution.
        
        Args:
            prompt_file (str): Path to prompt file
            
        Returns:
            bool: True if prompt is valid
        """
        if not os.path.exists(prompt_file):
            return False
        
        with open(prompt_file) as f:
            content = f.read()
        
        return len(content) > 0 and len(content) < self.max_context
```

## Agent Implementations

### Claude Agent

```python
class ClaudeAgent(Agent):
    """
    Claude AI agent implementation.
    
    Attributes:
        max_context (int): Maximum context window (200K tokens)
        timeout (int): Execution timeout in seconds
    """
    
    def __init__(self):
        super().__init__('claude', 'claude')
        self.max_context = 800000  # ~200K tokens
        self.timeout = 300
    
    def execute(self, prompt_file: str) -> Tuple[bool, str]:
        """
        Execute Claude with prompt.
        
        Args:
            prompt_file (str): Path to prompt file
            
        Returns:
            tuple: (success, output)
            
        Example:
            claude = ClaudeAgent()
            success, output = claude.execute('PROMPT.md')
        """
        if not self.available:
            return False, "Claude not available"
        
        try:
            result = subprocess.run(
                [self.command, prompt_file],
                capture_output=True,
                text=True,
                timeout=self.timeout,
                env=self.get_environment()
            )
            
            return result.returncode == 0, result.stdout
            
        except subprocess.TimeoutExpired:
            return False, "Claude execution timed out"
        except Exception as e:
            return False, f"Claude execution error: {str(e)}"
    
    def get_environment(self) -> dict:
        """Get environment variables for Claude."""
        env = os.environ.copy()
        # Add Claude-specific environment variables
        return env
```

### Gemini Agent

```python
class GeminiAgent(Agent):
    """
    Gemini AI agent implementation.
    
    Attributes:
        max_context (int): Maximum context window (32K tokens)
        timeout (int): Execution timeout in seconds
    """
    
    def __init__(self):
        super().__init__('gemini', 'gemini')
        self.max_context = 130000  # ~32K tokens
        self.timeout = 300
    
    def execute(self, prompt_file: str) -> Tuple[bool, str]:
        """
        Execute Gemini with prompt.
        
        Args:
            prompt_file (str): Path to prompt file
            
        Returns:
            tuple: (success, output)
            
        Example:
            gemini = GeminiAgent()
            success, output = gemini.execute('PROMPT.md')
        """
        if not self.available:
            return False, "Gemini not available"
        
        try:
            # Gemini may need additional arguments
            cmd = [self.command, '--no-web', prompt_file]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=self.timeout
            )
            
            return result.returncode == 0, result.stdout
            
        except subprocess.TimeoutExpired:
            return False, "Gemini execution timed out"
        except Exception as e:
            return False, f"Gemini execution error: {str(e)}"
```

### Q Agent

```python
class QAgent(Agent):
    """
    Q Chat AI agent implementation.
    
    Attributes:
        max_context (int): Maximum context window (8K tokens)
        timeout (int): Execution timeout in seconds
    """
    
    def __init__(self):
        super().__init__('q', 'q')
        self.max_context = 32000  # ~8K tokens
        self.timeout = 300
    
    def execute(self, prompt_file: str) -> Tuple[bool, str]:
        """
        Execute Q with prompt.
        
        Args:
            prompt_file (str): Path to prompt file
            
        Returns:
            tuple: (success, output)
            
        Example:
            q = QAgent()
            success, output = q.execute('PROMPT.md')
        """
        if not self.available:
            return False, "Q not available"
        
        try:
            result = subprocess.run(
                [self.command, prompt_file],
                capture_output=True,
                text=True,
                timeout=self.timeout
            )
            
            return result.returncode == 0, result.stdout
            
        except subprocess.TimeoutExpired:
            return False, "Q execution timed out"
        except Exception as e:
            return False, f"Q execution error: {str(e)}"
```

## Agent Manager

```python
class AgentManager:
    """
    Manages multiple AI agents and handles agent selection.
    
    Example:
        manager = AgentManager()
        agent = manager.get_agent('auto')
        success, output = agent.execute('PROMPT.md')
    """
    
    def __init__(self):
        """Initialize agent manager with all available agents."""
        self.agents = {
            'claude': ClaudeAgent(),
            'gemini': GeminiAgent(),
            'q': QAgent()
        }
        self.available_agents = self.detect_available_agents()
    
    def detect_available_agents(self) -> List[str]:
        """
        Detect which agents are available on the system.
        
        Returns:
            list: Names of available agents
            
        Example:
            manager = AgentManager()
            available = manager.detect_available_agents()
            print(f"Available agents: {available}")
        """
        available = []
        for name, agent in self.agents.items():
            if agent.available:
                available.append(name)
        return available
    
    def get_agent(self, name: str = 'auto') -> Agent:
        """
        Get specific agent or auto-select best available.
        
        Args:
            name (str): Agent name or 'auto' for auto-selection
            
        Returns:
            Agent: Selected agent instance
            
        Raises:
            ValueError: If requested agent not available
            
        Example:
            manager = AgentManager()
            
            # Get specific agent
            claude = manager.get_agent('claude')
            
            # Auto-select best available
            agent = manager.get_agent('auto')
        """
        if name == 'auto':
            return self.auto_select_agent()
        
        if name not in self.agents:
            raise ValueError(f"Unknown agent: {name}")
        
        agent = self.agents[name]
        if not agent.available:
            raise ValueError(f"Agent not available: {name}")
        
        return agent
    
    def auto_select_agent(self) -> Agent:
        """
        Automatically select the best available agent.
        
        Priority: claude > gemini > q
        
        Returns:
            Agent: Best available agent
            
        Raises:
            RuntimeError: If no agents available
        """
        priority = ['claude', 'gemini', 'q']
        
        for agent_name in priority:
            if agent_name in self.available_agents:
                return self.agents[agent_name]
        
        raise RuntimeError("No AI agents available")
    
    def execute_with_fallback(self, prompt_file: str, 
                             preferred_agent: str = 'auto') -> Tuple[bool, str, str]:
        """
        Execute with fallback to other agents if preferred fails.
        
        Args:
            prompt_file (str): Path to prompt file
            preferred_agent (str): Preferred agent name
            
        Returns:
            tuple: (success, output, agent_used)
            
        Example:
            manager = AgentManager()
            success, output, agent = manager.execute_with_fallback('PROMPT.md')
            print(f"Executed with {agent}")
        """
        # Try preferred agent first
        try:
            agent = self.get_agent(preferred_agent)
            success, output = agent.execute(prompt_file)
            if success:
                return True, output, agent.name
        except (ValueError, RuntimeError):
            pass
        
        # Try other available agents
        for agent_name in self.available_agents:
            if agent_name != preferred_agent:
                agent = self.agents[agent_name]
                success, output = agent.execute(prompt_file)
                if success:
                    return True, output, agent.name
        
        return False, "All agents failed", None
```

## Agent Execution Utilities

### Retry Logic

```python
def execute_with_retry(agent: Agent, prompt_file: str, 
                       max_retries: int = 3, 
                       delay: int = 2) -> Tuple[bool, str]:
    """
    Execute agent with retry logic.
    
    Args:
        agent (Agent): Agent to execute
        prompt_file (str): Path to prompt file
        max_retries (int): Maximum retry attempts
        delay (int): Delay between retries in seconds
        
    Returns:
        tuple: (success, output)
        
    Example:
        agent = ClaudeAgent()
        success, output = execute_with_retry(agent, 'PROMPT.md')
    """
    for attempt in range(max_retries):
        success, output = agent.execute(prompt_file)
        
        if success:
            return True, output
        
        if attempt < max_retries - 1:
            time.sleep(delay * (2 ** attempt))  # Exponential backoff
    
    return False, f"Failed after {max_retries} attempts"
```

### Output Processing

```python
def process_agent_output(output: str) -> dict:
    """
    Process and parse agent output.
    
    Args:
        output (str): Raw agent output
        
    Returns:
        dict: Processed output with metadata
        
    Example:
        success, raw_output = agent.execute('PROMPT.md')
        processed = process_agent_output(raw_output)
    """
    processed = {
        'raw': output,
        'lines': output.splitlines(),
        'size': len(output),
        'has_error': 'error' in output.lower(),
        'has_completion': False,  # Legacy completion marker - no longer used
        'files_modified': extract_modified_files(output),
        'commands_run': extract_commands(output)
    }
    
    return processed

def extract_modified_files(output: str) -> List[str]:
    """Extract list of modified files from output."""
    files = []
    patterns = [
        r"Created file: (.+)",
        r"Modified file: (.+)",
        r"Writing to (.+)"
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, output)
        files.extend(matches)
    
    return list(set(files))

def extract_commands(output: str) -> List[str]:
    """Extract executed commands from output."""
    commands = []
    patterns = [
        r"Running: (.+)",
        r"Executing: (.+)",
        r"\$ (.+)"
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, output)
        commands.extend(matches)
    
    return commands
```

## Agent Metrics

```python
class AgentMetrics:
    """
    Track agent performance metrics.
    
    Example:
        metrics = AgentMetrics()
        metrics.record_execution('claude', 45.3, True)
        stats = metrics.get_stats('claude')
    """
    
    def __init__(self):
        self.executions = []
    
    def record_execution(self, agent_name: str, 
                        duration: float, 
                        success: bool,
                        output_size: int = 0):
        """
        Record agent execution metrics.
        
        Args:
            agent_name (str): Name of agent
            duration (float): Execution duration in seconds
            success (bool): Whether execution succeeded
            output_size (int): Size of output in bytes
        """
        self.executions.append({
            'agent': agent_name,
            'duration': duration,
            'success': success,
            'output_size': output_size,
            'timestamp': time.time()
        })
    
    def get_stats(self, agent_name: str = None) -> dict:
        """
        Get statistics for agent(s).
        
        Args:
            agent_name (str): Specific agent or None for all
            
        Returns:
            dict: Agent statistics
        """
        if agent_name:
            data = [e for e in self.executions if e['agent'] == agent_name]
        else:
            data = self.executions
        
        if not data:
            return {}
        
        durations = [e['duration'] for e in data]
        success_rate = sum(1 for e in data if e['success']) / len(data)
        
        return {
            'total_executions': len(data),
            'success_rate': success_rate,
            'avg_duration': sum(durations) / len(durations),
            'min_duration': min(durations),
            'max_duration': max(durations),
            'total_duration': sum(durations)
        }
```

## Custom Agent Implementation

```python
class CustomAgent(Agent):
    """
    Template for implementing custom AI agents.
    
    Example:
        class MyAgent(CustomAgent):
            def __init__(self):
                super().__init__('myagent', 'myagent-cli')
            
            def execute(self, prompt_file):
                # Custom execution logic
                pass
    """
    
    def __init__(self, name: str, command: str):
        super().__init__(name, command)
        self.configure()
    
    def configure(self):
        """Override to configure custom agent."""
        pass
    
    def pre_execute(self, prompt_file: str):
        """Hook called before execution."""
        pass
    
    def post_execute(self, output: str):
        """Hook called after execution."""
        pass
    
    def execute(self, prompt_file: str) -> Tuple[bool, str]:
        """Execute custom agent with hooks."""
        self.pre_execute(prompt_file)
        
        # Implement custom execution logic
        success, output = self._execute_command(prompt_file)
        
        self.post_execute(output)
        
        return success, output
    
    def _execute_command(self, prompt_file: str) -> Tuple[bool, str]:
        """Override with custom command execution."""
        raise NotImplementedError
```