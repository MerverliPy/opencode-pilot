---
description: Audit the UI Task Force for token waste, unnecessary subagents, broad context, premature MCP/plugin use, verbose output, and missing compaction points.
agent: pwa-ui-designer
---
Run a token-efficiency audit for the UI Task Force workflow.
User request or target:
$ARGUMENTS
Use this workflow:
1. Identify the UI task or workflow being audited.
2. Review whether the task used or proposed:
   - broad repo context
   - subagents
   - skills
   - commands
   - MCP
   - plugins
   - long final outputs
   - repeated procedures
3. Compare actual or proposed behavior against token-efficient defaults:
   - targeted context
   - limited subagents
   - on-demand skills
   - gated MCP
   - no plugin unless runtime behavior is required
   - compact summaries
   - clear approval gates
   - clear stop conditions
4. Flag waste.
5. Recommend a leaner workflow.
6. Do not edit files unless explicitly approved.
Output format:
## UI token audit
- Workflow/task:
- Known facts:
- Assumptions:
- Token risk: low / medium / high / critical
```yaml
token_audit_version: "2.0"
context_loading: "targeted | moderate | broad"
subagent_calls: "none | limited | targeted | broad"
skill_loading: "on-demand | always | disabled"
mcp_exposure: "none | gated | broad"
plugin_context_effect: "none | low | medium | high"
output_verbosity: "compact | standard | detailed"
compaction_points:
  - "<when to summarize>"
approval_gates:
  - "<where approval is required>"
stop_conditions:
  - "<when to stop instead of continuing>"
risks:
  - "<token risk>"
mitigations:
  - "<mitigation>"
```
## Waste findings
| Area | Finding | Cost | Fix |
|---|---|---|---|
| Context loading | | low/medium/high | |
| Subagents | | low/medium/high | |
| Skills | | low/medium/high | |
| MCP/plugins | | low/medium/high | |
| Output verbosity | | low/medium/high | |
| Repeated instructions | | low/medium/high | |
## Leaner recommended workflow
1. 
2. 
3. 
## Recommendation
State whether the workflow should stay as-is, be simplified, or be gated.
Do not recommend MCP or plugins unless simpler mechanisms are insufficient and the risk is justified.
