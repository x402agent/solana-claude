#!/usr/bin/env python3
# ABOUTME: Example demonstrating WebSearch capability with Ralph's Claude adapter
# ABOUTME: Shows how to use Claude's WebSearch tool for current information

"""Example: Using WebSearch with Ralph Orchestrator and Claude."""

from pathlib import Path
from src.ralph_orchestrator.adapters.claude import ClaudeAdapter
from src.ralph_orchestrator.orchestrator import RalphOrchestrator


def example_websearch_task():
    """Create a task that requires web search."""
    
    print("\n=== WebSearch Example with Ralph Orchestrator ===\n")
    
    # Create a prompt that requires web search
    prompt_file = Path("WEBSEARCH_TASK.md")
    prompt_file.write_text("""# Task: Research Current AI Developments

## Objective
Research and summarize the latest developments in AI and machine learning.

## Requirements
- [ ] Search for recent AI breakthroughs in 2024
- [ ] Find information about the latest LLM releases
- [ ] Research current trends in AI safety and alignment
- [ ] Look up recent AI legislation and regulations
- [ ] Create a summary document with findings

## Deliverables
- Create a file called `AI_RESEARCH_2024.md` with:
  - Recent breakthroughs and innovations
  - New model releases and capabilities
  - Safety and alignment progress
  - Regulatory updates
  - Future predictions and trends

## Success Criteria
- Information is current (2024)
- Multiple sources are referenced
- Clear, organized summary is created
- Key developments are highlighted
""")
    
    print("Created WebSearch task prompt")
    
    # Create orchestrator with Claude
    orchestrator = RalphOrchestrator(
        prompt_file=prompt_file,
        primary_tool="claude",
        max_iterations=5,
        verbose=True
    )
    
    # Configure Claude with WebSearch enabled
    if 'claude' in orchestrator.adapters:
        claude_adapter = orchestrator.adapters['claude']
        claude_adapter.configure(
            enable_all_tools=True,
            enable_web_search=True  # Explicitly enable WebSearch
        )
        print("✓ Claude configured with WebSearch enabled")
    
    # Run the task
    try:
        orchestrator.run()
        print("\n✓ WebSearch task completed successfully")
        
        # Check if the research file was created
        research_file = Path("AI_RESEARCH_2024.md")
        if research_file.exists():
            print(f"✓ Research file created: {research_file}")
            print("\nFirst 500 characters of research:")
            print("-" * 40)
            content = research_file.read_text()
            print(content[:500] + "..." if len(content) > 500 else content)
    
    except KeyboardInterrupt:
        print("\nTask interrupted by user")
    
    finally:
        # Clean up
        if prompt_file.exists():
            prompt_file.unlink()
            print("\n✓ Cleaned up prompt file")


def example_direct_websearch():
    """Use WebSearch directly with the Claude adapter."""
    
    print("\n=== Direct WebSearch with Claude Adapter ===\n")
    
    adapter = ClaudeAdapter(verbose=True)
    adapter.configure(
        enable_all_tools=True,
        enable_web_search=True
    )
    
    if not adapter.available:
        print("Claude SDK not available")
        return
    
    # Simple WebSearch query
    query = """
    Use WebSearch to find:
    1. The current temperature in San Francisco
    2. Today's top technology news headline
    3. The latest Python version release
    
    Provide a brief summary of each.
    """
    
    print("Executing WebSearch query...")
    response = adapter.execute(query, enable_web_search=True)
    
    if response.success:
        print("\n✓ WebSearch query successful!")
        print("\nResults:")
        print("-" * 40)
        print(response.output)
    else:
        print(f"\n✗ Query failed: {response.error}")


def main():
    """Run WebSearch examples."""
    
    print("\n" + "="*60)
    print(" WebSearch Examples for Ralph Orchestrator")
    print("="*60)
    
    # Example 1: Direct WebSearch
    example_direct_websearch()
    
    # Example 2: WebSearch in orchestration (commented out as it runs a full loop)
    # Uncomment to run the full orchestration example
    # example_websearch_task()
    
    print("\n" + "="*60)
    print(" WebSearch Examples Complete!")
    print("="*60)
    
    print("\nWebSearch is now available in Ralph!")
    print("Use it by running: ralph -a claude")
    print("Or in code: adapter.configure(enable_web_search=True)")


if __name__ == "__main__":
    main()