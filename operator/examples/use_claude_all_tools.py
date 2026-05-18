#!/usr/bin/env python3
# ABOUTME: Example of using Ralph Orchestrator with Claude's full native tool access
# ABOUTME: Shows how to configure the adapter to enable all available tools

"""Example: Using Ralph Orchestrator with Claude's full native tool capabilities."""

import asyncio
from pathlib import Path
from src.ralph_orchestrator.adapters.claude import ClaudeAdapter
from src.ralph_orchestrator.orchestrator import RalphOrchestrator


def example_direct_adapter_usage():
    """Example of using the Claude adapter directly with all tools enabled."""
    
    print("\n=== Direct Claude Adapter Usage with All Tools ===\n")
    
    # Create and configure the adapter
    adapter = ClaudeAdapter(verbose=True)
    adapter.configure(enable_all_tools=True)
    
    if not adapter.available:
        print("Claude SDK not available. Please install claude-code-sdk")
        return
    
    # Example prompt that leverages multiple tools including WebSearch
    prompt = """
    Please help me analyze this codebase:
    1. Search for all Python files
    2. Find the main entry points
    3. Create a summary of the project structure
    4. Check if there are any tests
    5. Use WebSearch to find best practices for the frameworks used
    """
    
    # Execute with all tools enabled (WebSearch is enabled by default)
    response = adapter.execute(
        prompt,
        enable_all_tools=True,
        enable_web_search=True,  # Explicitly enable WebSearch (though it's on by default)
        system_prompt="You are a code analysis assistant with full tool access including web search."
    )
    
    if response.success:
        print("Response:", response.output)
    else:
        print("Error:", response.error)


def example_orchestrator_with_claude_tools():
    """Example of using Ralph Orchestrator with Claude's tools."""
    
    print("\n=== Ralph Orchestrator with Claude All Tools ===\n")
    
    # Create a prompt file for the orchestrator
    prompt_file = Path("ANALYZE_CODE.md")
    prompt_file.write_text("""
# Code Analysis Task

Please perform a comprehensive analysis of this codebase:

1. **Project Structure**: Map out the directory structure and key files
2. **Dependencies**: List all dependencies and their purposes  
3. **Entry Points**: Identify main entry points and scripts
4. **Testing**: Find and summarize the test suite
5. **Documentation**: Check for README, docs, and inline documentation
6. **Code Quality**: Look for potential issues or improvements

Use all available tools to thoroughly explore the codebase.

When complete, create a file called `ANALYSIS_REPORT.md` with your findings.
The orchestrator will continue until all analysis tasks are complete.
""")
    
    # Create orchestrator with Claude
    orchestrator = RalphOrchestrator(
        prompt_file=prompt_file,
        primary_tool="claude",
        max_iterations=10,
        verbose=True
    )
    
    # Get the Claude adapter and configure it
    if 'claude' in orchestrator.adapters:
        claude_adapter = orchestrator.adapters['claude']
        claude_adapter.configure(enable_all_tools=True)
        print("✓ Claude configured with all native tools enabled")
    
    # Run the orchestration loop
    try:
        orchestrator.run()
    except KeyboardInterrupt:
        print("\nOrchestration interrupted by user")
    finally:
        # Clean up
        if prompt_file.exists():
            prompt_file.unlink()


async def example_async_usage():
    """Example of async usage with all Claude tools."""
    
    print("\n=== Async Claude Usage with All Tools ===\n")
    
    adapter = ClaudeAdapter(verbose=False)
    adapter.configure(enable_all_tools=True)
    
    if not adapter.available:
        print("Claude SDK not available")
        return
    
    # Multiple prompts to execute concurrently
    prompts = [
        "List all Python files in the current directory",
        "Check if there's a README file and summarize it",
        "Find the latest modified file in the project"
    ]
    
    # Execute all prompts concurrently
    tasks = [
        adapter.aexecute(prompt, enable_all_tools=True)
        for prompt in prompts
    ]
    
    print("Executing multiple prompts concurrently...")
    responses = await asyncio.gather(*tasks)
    
    for i, response in enumerate(responses):
        print(f"\n--- Prompt {i+1} Result ---")
        if response.success:
            print(response.output[:200] + "..." if len(response.output) > 200 else response.output)
        else:
            print(f"Error: {response.error}")


def main():
    """Run examples."""
    
    print("\n" + "="*70)
    print(" Claude Native Tools Integration Examples")
    print("="*70)
    
    # Example 1: Direct adapter usage
    example_direct_adapter_usage()
    
    # Example 2: Orchestrator with Claude tools
    # example_orchestrator_with_claude_tools()  # Commented out as it runs a full loop
    
    # Example 3: Async usage
    print("\nRunning async example...")
    asyncio.run(example_async_usage())
    
    print("\n" + "="*70)
    print(" Examples Complete!")
    print("="*70)
    
    print("\nTo enable all Claude tools in your code:")
    print("1. Create adapter: adapter = ClaudeAdapter()")
    print("2. Configure: adapter.configure(enable_all_tools=True)")
    print("3. Execute: response = adapter.execute(prompt, enable_all_tools=True)")


if __name__ == "__main__":
    main()