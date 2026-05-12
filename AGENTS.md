# Everything OpenCode - Project Instructions

This file contains project-specific instructions and guidelines for OpenCode.

## Project Overview

This is a comprehensive collection of OpenCode configurations including agents, skills, commands, and rules. It provides production-ready tools for AI-assisted software development.

This repository also contains **Pilot**, a web PWA for OpenCode built with React + Vite + Hono.

## Agent Workflow

Before starting any work, read `TASKS.md` to see the active task and follow the instructions there. Execute tasks in order, then update `TASKS.md` after completion.

## Quick Reference

### Available Agents

Invoke agents using `@agent-name`:

- `@code-reviewer` - Code quality and security review
- `@planner` - Implementation planning for complex features
- `@architect` - System design and architecture decisions
- `@security-reviewer` - Security vulnerability detection
- `@tdd-guide` - Test-driven development guidance
- `@python-reviewer` - Python code review (PEP 8, idioms)
- `@refactor-cleaner` - Dead code cleanup
- `@go-reviewer` - Go code review (idiomatic Go)
- `@go-build-resolver` - Fix Go build errors
- `@e2e-runner` - End-to-end testing with Playwright
- `@database-reviewer` - PostgreSQL optimization and design
- `@doc-updater` - Documentation and codemap maintenance
- `@build-error-resolver` - TypeScript/build error resolution

### Available Commands

Use `/command-name` syntax:

- `/plan` - Create implementation plan
- `/code-review` - Run code review
- `/tdd` - Start TDD workflow
- `/build-fix` - Fix build errors
- `/refactor-clean` - Clean dead code
- `/e2e` - Run E2E tests
- `/python-review` - Review Python code
- `/go-review` - Review Go code
- `/go-build` - Fix Go build errors
- `/go-test` - Run Go tests
- `/verify` - Run verification loop
- `/eval` - Evaluate session
- `/test-coverage` - Check test coverage
- `/update-codemaps` - Update codemaps
- `/update-docs` - Update documentation
- `/setup-pm` - Configure package manager
- `/setup-n9router` - Connect to a running n9router instance
- `/caveman [lite|full|ultra]` - Enable terse output mode; `/caveman off` to revert
- `/orchestrate` - Orchestrate subagents
- `/learn` - Extract reusable patterns from session
- `/checkpoint` - Create checkpoint snapshot
- `/evolve` - Evolve instincts into skills
- `/instinct-export` - Export learned instincts
- `/instinct-import` - Import instincts
- `/instinct-status` - Check instinct status
- `/skill-create` - Create new skill

### Available Skills

Skills are automatically loaded from `.opencode/skills/`:

- `python-testing` - Pytest patterns and TDD
- `python-patterns` - Python best practices
- `golang-testing` - Go testing patterns
- `golang-patterns` - Go best practices
- `backend-patterns` - API and database patterns
- `frontend-patterns` - React/Next.js patterns
- `security-review` - Security checklist
- `coding-standards` - TypeScript/JavaScript best practices
- `java-coding-standards` - Java best practices
- `springboot-patterns` - Spring Boot architecture
- `springboot-security` - Spring Boot security
- `springboot-tdd` - Spring Boot TDD
- `springboot-verification` - Spring Boot verification loop
- `jpa-patterns` - JPA/Hibernate patterns
- `postgres-patterns` - PostgreSQL optimization
- `django-patterns` - Django architecture
- `django-security` - Django security
- `django-tdd` - Django TDD
- `django-verification` - Django verification loop
- `clickhouse-io` - ClickHouse analytics
- `eval-harness` - Verification loops
- `strategic-compact` - Context compaction
- `tdd-workflow` - Test-driven development workflow
- `verification-loop` - Comprehensive verification system
- `iterative-retrieval` - Progressive context retrieval
- `continuous-learning` - Pattern extraction from sessions
- `continuous-learning-v2` - Instinct-based learning system
- `project-guidelines-example` - Project guidelines template
- `9router` - n9router setup and capability index (entry point)
- `9router-chat` - Chat / code generation via n9router
- `9router-embeddings` - Vector embeddings via n9router
- `9router-image` - Image generation via n9router
- `9router-stt` - Speech-to-text via n9router
- `9router-tts` - Text-to-speech via n9router
- `9router-web-fetch` - Fetch URL → markdown via n9router
- `9router-web-search` - Web search via n9router

### Available Rules

Rules in `.opencode/rules/`:

- `security.md` - Mandatory security checks
- `coding-style.md` - Immutability, file organization, error handling
- `testing.md` - 80%+ coverage, TDD workflow
- `git-workflow.md` - Commit format, PR workflow
- `agents.md` - Agent orchestration patterns
- `performance.md` - Model selection, context management
- `hooks.md` - PreToolUse, PostToolUse, Stop hooks
- `patterns.md` - Common API response format, hooks, repository pattern

### Available Plugins

Plugins in `.opencode/plugins/`:

- `session-manager.ts` - Session lifecycle tracking
- `tool-guardrails.ts` - Tool execution guardrails
- `code-quality.ts` - Write-time code quality enforcement
- `strategic-compact.ts` - Context compaction suggestions
- `rtk-compressor.ts` - RTK tool output compression (conservative, >2KB threshold)

### MCP Servers

Configure MCP servers in `opencode.json`. Key servers available:

- GitHub operations
- Memory persistence
- Sequential thinking
- Filesystem access

**Warning**: Enable only 5-10 MCPs at a time to preserve context window.

## Pilot (Web PWA)

This repo also contains **Pilot**, a React + Vite web PWA that connects to `opencode serve` via a Hono proxy server.

Key features:

- Real-time message streaming via SSE
- Session management with auto-resume
- File browser with search
- Diff viewer
- Inline permission prompts
- Push notifications via Web Push (Hono server)
- Slash commands & @ mentions
- Memory plugin with semantic extraction/injection

See `TASKS.md` for the active work agenda, and `README.md`, `DESIGN.md`, and `ROADMAP.md` for full Pilot documentation.

## Core Principles

1. **Security First**: Never hardcode secrets, always validate input
2. **Test-Driven Development**: Write tests before code (Red-Green-Refactor)
3. **Code Quality**: 80%+ coverage, immutability, small functions
4. **Many Small Files**: 200-400 lines per file, high cohesion
5. **Continuous Review**: Use @code-reviewer for all changes

## Customization

Add project-specific rules by:

1. Creating `.opencode/rules/custom.md`
2. Adding to `instructions` array in `opencode.json`
3. Updating agent prompts for project-specific checks

## Support

- **OpenCode Docs**: https://opencode.ai/docs/
- **Repository**: https://github.com/karma-works/everything-opencode
- **Issues**: Report on GitHub

---

_Last Updated: 2026-05-12_
