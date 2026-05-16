# Metrics API Reference

## Overview

The Metrics API provides functionality for collecting, storing, and analyzing execution metrics from Ralph Orchestrator runs.

## Metrics Collection

### MetricsCollector Class

```python
class MetricsCollector:
    """
    Collects and manages execution metrics.
    
    Example:
        collector = MetricsCollector()
        collector.start_iteration(1)
        # ... execution ...
        collector.end_iteration(1, success=True)
        collector.save()
    """
    
    def __init__(self, metrics_dir: str = '.agent/metrics'):
        """
        Initialize metrics collector.
        
        Args:
            metrics_dir (str): Directory to store metrics files
        """
        self.metrics_dir = metrics_dir
        self.current_metrics = {
            'start_time': None,
            'iterations': [],
            'errors': [],
            'checkpoints': [],
            'agent_executions': [],
            'resource_usage': []
        }
        self._ensure_metrics_dir()
    
    def _ensure_metrics_dir(self):
        """Create metrics directory if it doesn't exist."""
        os.makedirs(self.metrics_dir, exist_ok=True)
    
    def start_iteration(self, iteration_num: int):
        """
        Mark the start of an iteration.
        
        Args:
            iteration_num (int): Iteration number
            
        Example:
            collector.start_iteration(1)
        """
        self.current_iteration = {
            'number': iteration_num,
            'start_time': time.time(),
            'end_time': None,
            'duration': None,
            'success': False,
            'output_size': 0,
            'errors': []
        }
    
    def end_iteration(self, iteration_num: int, 
                     success: bool = True, 
                     output_size: int = 0):
        """
        Mark the end of an iteration.
        
        Args:
            iteration_num (int): Iteration number
            success (bool): Whether iteration succeeded
            output_size (int): Size of output in bytes
            
        Example:
            collector.end_iteration(1, success=True, output_size=2048)
        """
        if hasattr(self, 'current_iteration'):
            self.current_iteration['end_time'] = time.time()
            self.current_iteration['duration'] = (
                self.current_iteration['end_time'] - 
                self.current_iteration['start_time']
            )
            self.current_iteration['success'] = success
            self.current_iteration['output_size'] = output_size
            
            self.current_metrics['iterations'].append(self.current_iteration)
            del self.current_iteration
    
    def record_error(self, error: str, iteration: int = None):
        """
        Record an error.
        
        Args:
            error (str): Error message
            iteration (int): Iteration number where error occurred
            
        Example:
            collector.record_error("Agent timeout", iteration=5)
        """
        error_record = {
            'timestamp': time.time(),
            'iteration': iteration,
            'message': error,
            'traceback': traceback.format_exc() if sys.exc_info()[0] else None
        }
        
        self.current_metrics['errors'].append(error_record)
        
        if hasattr(self, 'current_iteration'):
            self.current_iteration['errors'].append(error)
    
    def record_checkpoint(self, iteration: int, commit_hash: str = None):
        """
        Record a checkpoint.
        
        Args:
            iteration (int): Iteration number
            commit_hash (str): Git commit hash
            
        Example:
            collector.record_checkpoint(5, "abc123def")
        """
        checkpoint = {
            'iteration': iteration,
            'timestamp': time.time(),
            'commit_hash': commit_hash
        }
        self.current_metrics['checkpoints'].append(checkpoint)
    
    def record_agent_execution(self, agent: str, 
                              duration: float, 
                              success: bool):
        """
        Record agent execution details.
        
        Args:
            agent (str): Agent name
            duration (float): Execution duration
            success (bool): Whether execution succeeded
            
        Example:
            collector.record_agent_execution('claude', 45.3, True)
        """
        execution = {
            'agent': agent,
            'duration': duration,
            'success': success,
            'timestamp': time.time()
        }
        self.current_metrics['agent_executions'].append(execution)
    
    def record_resource_usage(self):
        """
        Record current resource usage.
        
        Example:
            collector.record_resource_usage()
        """
        import psutil
        
        process = psutil.Process()
        usage = {
            'timestamp': time.time(),
            'cpu_percent': process.cpu_percent(),
            'memory_mb': process.memory_info().rss / 1024 / 1024,
            'disk_io': process.io_counters()._asdict() if hasattr(process, 'io_counters') else {},
            'open_files': len(process.open_files()) if hasattr(process, 'open_files') else 0
        }
        self.current_metrics['resource_usage'].append(usage)
    
    def save(self, filename: str = None):
        """
        Save metrics to file.
        
        Args:
            filename (str): Custom filename or auto-generated
            
        Returns:
            str: Path to saved metrics file
            
        Example:
            path = collector.save()
            print(f"Metrics saved to {path}")
        """
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"metrics_{timestamp}.json"
        
        filepath = os.path.join(self.metrics_dir, filename)
        
        with open(filepath, 'w') as f:
            json.dump(self.current_metrics, f, indent=2, default=str)
        
        return filepath
```

## State Management

### StateManager Class

```python
class StateManager:
    """
    Manages Ralph execution state.
    
    Example:
        state = StateManager()
        state.update(iteration=5, status='running')
        state.save()
    """
    
    def __init__(self, state_dir: str = '.agent/metrics'):
        """
        Initialize state manager.
        
        Args:
            state_dir (str): Directory for state files
        """
        self.state_dir = state_dir
        self.state_file = os.path.join(state_dir, 'state_latest.json')
        self.state = self.load() or self.initialize_state()
    
    def initialize_state(self) -> dict:
        """
        Initialize empty state.
        
        Returns:
            dict: Initial state structure
        """
        return {
            'status': 'idle',
            'iteration_count': 0,
            'start_time': None,
            'last_update': None,
            'runtime': 0,
            'agent': None,
            'prompt_file': None,
            'errors': [],
            'checkpoints': [],
            'task_complete': False
        }
    
    def load(self) -> dict:
        """
        Load state from file.
        
        Returns:
            dict: Loaded state or None
            
        Example:
            state = StateManager()
            current = state.load()
        """
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file) as f:
                    return json.load(f)
            except json.JSONDecodeError:
                return None
        return None
    
    def save(self):
        """
        Save current state to file.
        
        Example:
            state.update(iteration=10)
            state.save()
        """
        os.makedirs(self.state_dir, exist_ok=True)
        
        # Update last_update timestamp
        self.state['last_update'] = time.time()
        
        # Save to latest file
        with open(self.state_file, 'w') as f:
            json.dump(self.state, f, indent=2, default=str)
        
        # Also save timestamped version
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        archive_file = os.path.join(
            self.state_dir, 
            f"state_{timestamp}.json"
        )
        with open(archive_file, 'w') as f:
            json.dump(self.state, f, indent=2, default=str)
    
    def update(self, **kwargs):
        """
        Update state values.
        
        Args:
            **kwargs: State values to update
            
        Example:
            state.update(
                iteration_count=5,
                status='running',
                agent='claude'
            )
        """
        self.state.update(kwargs)
        
        # Calculate runtime if start_time exists
        if self.state.get('start_time'):
            self.state['runtime'] = time.time() - self.state['start_time']
    
    def get(self, key: str, default=None):
        """
        Get state value.
        
        Args:
            key (str): State key
            default: Default value if key not found
            
        Returns:
            Value from state
            
        Example:
            iteration = state.get('iteration_count', 0)
        """
        return self.state.get(key, default)
    
    def reset(self):
        """
        Reset state to initial values.
        
        Example:
            state.reset()
        """
        self.state = self.initialize_state()
        self.save()
```

## Metrics Analysis

### MetricsAnalyzer Class

```python
class MetricsAnalyzer:
    """
    Analyze collected metrics.
    
    Example:
        analyzer = MetricsAnalyzer('.agent/metrics')
        report = analyzer.generate_report()
        print(report)
    """
    
    def __init__(self, metrics_dir: str = '.agent/metrics'):
        """
        Initialize metrics analyzer.
        
        Args:
            metrics_dir (str): Directory containing metrics files
        """
        self.metrics_dir = metrics_dir
        self.metrics_files = self.find_metrics_files()
    
    def find_metrics_files(self) -> List[str]:
        """
        Find all metrics files.
        
        Returns:
            list: Paths to metrics files
        """
        pattern = os.path.join(self.metrics_dir, 'metrics_*.json')
        return sorted(glob.glob(pattern))
    
    def load_metrics(self, filepath: str) -> dict:
        """
        Load metrics from file.
        
        Args:
            filepath (str): Path to metrics file
            
        Returns:
            dict: Loaded metrics
        """
        with open(filepath) as f:
            return json.load(f)
    
    def analyze_iterations(self, metrics: dict) -> dict:
        """
        Analyze iteration performance.
        
        Args:
            metrics (dict): Metrics data
            
        Returns:
            dict: Iteration analysis
            
        Example:
            metrics = analyzer.load_metrics('metrics.json')
            analysis = analyzer.analyze_iterations(metrics)
        """
        iterations = metrics.get('iterations', [])
        
        if not iterations:
            return {}
        
        durations = [i['duration'] for i in iterations if i.get('duration')]
        success_count = sum(1 for i in iterations if i.get('success'))
        
        return {
            'total_iterations': len(iterations),
            'successful_iterations': success_count,
            'success_rate': success_count / len(iterations) if iterations else 0,
            'avg_duration': sum(durations) / len(durations) if durations else 0,
            'min_duration': min(durations) if durations else 0,
            'max_duration': max(durations) if durations else 0,
            'total_duration': sum(durations)
        }
    
    def analyze_errors(self, metrics: dict) -> dict:
        """
        Analyze errors.
        
        Args:
            metrics (dict): Metrics data
            
        Returns:
            dict: Error analysis
        """
        errors = metrics.get('errors', [])
        
        if not errors:
            return {'total_errors': 0}
        
        # Group errors by iteration
        errors_by_iteration = {}
        for error in errors:
            iteration = error.get('iteration', 'unknown')
            if iteration not in errors_by_iteration:
                errors_by_iteration[iteration] = []
            errors_by_iteration[iteration].append(error['message'])
        
        return {
            'total_errors': len(errors),
            'errors_by_iteration': errors_by_iteration,
            'unique_errors': len(set(e['message'] for e in errors))
        }
    
    def analyze_resource_usage(self, metrics: dict) -> dict:
        """
        Analyze resource usage.
        
        Args:
            metrics (dict): Metrics data
            
        Returns:
            dict: Resource usage analysis
        """
        usage = metrics.get('resource_usage', [])
        
        if not usage:
            return {}
        
        cpu_values = [u['cpu_percent'] for u in usage if 'cpu_percent' in u]
        memory_values = [u['memory_mb'] for u in usage if 'memory_mb' in u]
        
        return {
            'avg_cpu_percent': sum(cpu_values) / len(cpu_values) if cpu_values else 0,
            'max_cpu_percent': max(cpu_values) if cpu_values else 0,
            'avg_memory_mb': sum(memory_values) / len(memory_values) if memory_values else 0,
            'max_memory_mb': max(memory_values) if memory_values else 0
        }
    
    def generate_report(self) -> str:
        """
        Generate comprehensive metrics report.
        
        Returns:
            str: Formatted report
            
        Example:
            report = analyzer.generate_report()
            print(report)
        """
        if not self.metrics_files:
            return "No metrics files found"
        
        # Load latest metrics
        latest_file = self.metrics_files[-1]
        metrics = self.load_metrics(latest_file)
        
        # Analyze different aspects
        iteration_analysis = self.analyze_iterations(metrics)
        error_analysis = self.analyze_errors(metrics)
        resource_analysis = self.analyze_resource_usage(metrics)
        
        # Format report
        report = []
        report.append("=" * 50)
        report.append("RALPH ORCHESTRATOR METRICS REPORT")
        report.append("=" * 50)
        report.append(f"Metrics File: {os.path.basename(latest_file)}")
        report.append("")
        
        # Iteration statistics
        report.append("ITERATION STATISTICS:")
        report.append(f"  Total Iterations: {iteration_analysis.get('total_iterations', 0)}")
        report.append(f"  Success Rate: {iteration_analysis.get('success_rate', 0):.1%}")
        report.append(f"  Avg Duration: {iteration_analysis.get('avg_duration', 0):.2f}s")
        report.append(f"  Total Runtime: {iteration_analysis.get('total_duration', 0):.2f}s")
        report.append("")
        
        # Error statistics
        report.append("ERROR STATISTICS:")
        report.append(f"  Total Errors: {error_analysis.get('total_errors', 0)}")
        report.append(f"  Unique Errors: {error_analysis.get('unique_errors', 0)}")
        report.append("")
        
        # Resource usage
        if resource_analysis:
            report.append("RESOURCE USAGE:")
            report.append(f"  Avg CPU: {resource_analysis.get('avg_cpu_percent', 0):.1f}%")
            report.append(f"  Max CPU: {resource_analysis.get('max_cpu_percent', 0):.1f}%")
            report.append(f"  Avg Memory: {resource_analysis.get('avg_memory_mb', 0):.1f} MB")
            report.append(f"  Max Memory: {resource_analysis.get('max_memory_mb', 0):.1f} MB")
        
        return "\n".join(report)
```

## Metrics Export

### Export Functions

```python
def export_to_csv(metrics: dict, output_file: str):
    """
    Export metrics to CSV.
    
    Args:
        metrics (dict): Metrics data
        output_file (str): Output CSV file path
        
    Example:
        metrics = load_metrics('metrics.json')
        export_to_csv(metrics, 'metrics.csv')
    """
    import csv
    
    iterations = metrics.get('iterations', [])
    
    with open(output_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'number', 'start_time', 'end_time', 
            'duration', 'success', 'output_size'
        ])
        writer.writeheader()
        writer.writerows(iterations)

def export_to_prometheus(metrics: dict, output_file: str):
    """
    Export metrics in Prometheus format.
    
    Args:
        metrics (dict): Metrics data
        output_file (str): Output file path
        
    Example:
        export_to_prometheus(metrics, 'metrics.prom')
    """
    lines = []
    
    # Iteration metrics
    iterations = metrics.get('iterations', [])
    if iterations:
        total = len(iterations)
        successful = sum(1 for i in iterations if i.get('success'))
        
        lines.append(f'ralph_iterations_total {total}')
        lines.append(f'ralph_iterations_successful {successful}')
        lines.append(f'ralph_success_rate {successful/total if total else 0}')
    
    # Error metrics
    errors = metrics.get('errors', [])
    lines.append(f'ralph_errors_total {len(errors)}')
    
    # Write to file
    with open(output_file, 'w') as f:
        f.write('\n'.join(lines))

def export_to_json_lines(metrics: dict, output_file: str):
    """
    Export metrics as JSON lines for streaming.
    
    Args:
        metrics (dict): Metrics data
        output_file (str): Output file path
        
    Example:
        export_to_json_lines(metrics, 'metrics.jsonl')
    """
    with open(output_file, 'w') as f:
        for iteration in metrics.get('iterations', []):
            f.write(json.dumps(iteration) + '\n')
```

## Real-time Metrics

```python
class RealtimeMetrics:
    """
    Provide real-time metrics access.
    
    Example:
        realtime = RealtimeMetrics()
        realtime.start_monitoring()
        # ... execution ...
        stats = realtime.get_current_stats()
    """
    
    def __init__(self):
        self.current_stats = {}
        self.monitoring = False
    
    def start_monitoring(self):
        """Start real-time monitoring."""
        self.monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
    
    def _monitor_loop(self):
        """Background monitoring loop."""
        while self.monitoring:
            self.current_stats = {
                'timestamp': time.time(),
                'cpu_percent': psutil.cpu_percent(interval=1),
                'memory_percent': psutil.virtual_memory().percent,
                'disk_usage': psutil.disk_usage('.').percent
            }
            time.sleep(5)
    
    def get_current_stats(self) -> dict:
        """Get current statistics."""
        return self.current_stats.copy()
    
    def stop_monitoring(self):
        """Stop monitoring."""
        self.monitoring = False
        if hasattr(self, 'monitor_thread'):
            self.monitor_thread.join(timeout=1)
```