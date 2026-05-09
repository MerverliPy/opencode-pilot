# Performance Optimization

## Model Selection Strategy

**github-copilot/claude-sonnet-4** (Best coding model):

- Main development work
- Orchestrating multi-agent workflows
- Complex coding tasks
- Code review and architecture decisions

**Lightweight models** (e.g., opencode/kimi-k2.5 for cost savings):

- Lightweight agents with frequent invocation
- Pair programming and code generation
- Worker agents in multi-agent systems
- Simple documentation updates

## Context Window Management

Avoid last 20% of context window for:

- Large-scale refactoring
- Feature implementation spanning multiple files
- Debugging complex interactions

Lower context sensitivity tasks:

- Single-file edits
- Independent utility creation
- Documentation updates
- Simple bug fixes

## Ultrathink + Plan Mode

For complex tasks requiring deep reasoning:

1. Use `ultrathink` for enhanced thinking
2. Enable **Plan Mode** for structured approach
3. "Rev the engine" with multiple critique rounds
4. Use split role sub-agents for diverse analysis

## Build Troubleshooting

If build fails:

1. Use **build-error-resolver** agent
2. Analyze error messages
3. Fix incrementally
4. Verify after each fix
