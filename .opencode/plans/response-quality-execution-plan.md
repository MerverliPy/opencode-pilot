# Response Quality Execution Plan

**Goal:** Fix model outputting XML-style tool calls (`<tool_calls>...`) in response text instead of plain summaries. Two workstreams: (1) strip XML from server response, (2) tune system prompt to prevent it.

**Status:** [x] Task 1 Done  |  [x] Task 2 Done  |  [x] All complete

---

## Task 1: Response Post-Processing — Strip XML Tool Call Blocks

**Owner:** @orchestrator
**Status:** [x] Done
**Depends on:** None
**Risk:** Low — pure text transformation, no API contract change

### Subtasks

- [x] **1.1 Identify XML patterns to strip**
  - [x] `<tool_calls>...</tool_calls>` blocks (Anthropic format)
  - [x] `<invoke name="...">...</invoke>` blocks
  - [x] `<use_mcp_tool>...</use_mcp_tool>` blocks (Claude Code format)
  - [x] `<search>...</search>`, `<read>...</read>` blocks
  - [x] Any `<[a-z_]+>...</[a-z_]+>` block that looks like tool usage

- [x] **1.2 Add XML stripping to `server/src/n9routerChat.ts`**
  - Create function: `stripXmlToolBlocks(text: string): string`
  - Apply it in `streamFromN9router()` before `controller.enqueue(value)` — strip each SSE chunk's content field
  - Apply it in `rawSSEToResponse()` path too (no-tool-calls path)
  - Handle case: XML split across chunk boundaries (partial tags)

- [x] **1.3 Test XML stripping**
  - Test case: model returns `<tool_calls><invoke name="read_file"><parameter name="path" string="true">foo.ts</parameter></invoke></tool_calls>` → stripped to empty
  - Test case: model returns `Here is the summary.\n<tool_calls>...` → kept "Here is the summary."
  - Test case: partial XML across chunks → correctly stripped
  - Test case: normal text without XML → unchanged
  - Test case: HTML content with `<div>` tags → NOT stripped (only tool patterns)

- [x] **1.4 Verify with live model call**
  - Send question that previously triggered XML output
  - Confirm no XML blocks in streamed response
  - Check server logs for stripping stats

### Edge cases
- Deeply nested XML tags
- Unclosed XML tags at end of stream
- Mix of HTML and XML tool blocks
- Model uses `&lt;` escaped XML instead of raw tags

### Verification command
```bash
curl -s http://localhost:3201/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"ds/deepseek-v4-flash","messages":[{"role":"user","content":"Read server/src/memory/index.ts and summarize its routes"}],"max_tokens":800}' \
  | grep "^data:" | grep -v "data: \[DONE\]" \
  | python3 -c "
import sys, json
for line in sys.stdin:
    data = line[6:].strip()
    try:
        for c in json.loads(data).get('choices', []):
            txt = (c.get('delta', {}).get('content', '') or '')
            if txt: print(txt, end='')
    except: pass
print()
" | grep -c '<tool_calls\|<invoke\|<use_mcp_tool'
# Should output: 0
```

---

## Task 2: Better System Prompt Tuning

**Owner:** @orchestrator
**Status:** [x] Done
**Depends on:** None  
**Risk:** Low — prompt changes only, revert-safe

### Subtasks

- [x] **2.1 Audit current system prompt**
  - Read `server/src/tools/toolDefinitions.ts` — `SYSTEM_PROMPT` constant
  - Identify weak spots: places where model might decide XML is acceptable
  - Check: does prompt clearly distinguish OpenAI function calling vs XML tool format?

- [x] **2.2 Strengthen anti-XML instructions**
  - Add explicit: "Never output XML tool call blocks in your response text"
  - Add: "If you need to reference a tool call, describe it in plain English, e.g. 'I read the file X and found...'"
  - Add negative example: "BAD: `<tool_calls><invoke name=\"read_file\">...`"
  - Add positive example: "GOOD: 'I read `server/src/index.ts` and found the proxy setup at line 42.'"

- [x] **2.3 Add output format guidance**
  - Specify expected response structure: plain text with optional code blocks
  - Add: "Your entire response should be readable by a developer without XML parsing"
  - Add token/format guardrails

- [x] **2.4 Test with multiple queries**
  - `"What is the memory feature? Read the memory router and summarize."` → no XML
  - `"Show me the proxy setup code"` → no XML, just code blocks
  - `"How does authentication work?"` → plain text explanation
  - `"Find all TODO comments in the codebase"` → list without XML

### Verification

Compare responses BEFORE and AFTER prompt change using same query. Response should:
- Be shorter (no XML bloat)
- Have human-readable summaries
- Reference file paths inline (not in XML tags)

### Prompt diff template

```diff
- Always read the relevant source files before answering code questions.
+ Always read the relevant source files before answering code questions.
+ Never include XML tool call blocks in your response text.
+ Describe tool usage in plain English, e.g. "I read file X and found..."
```

---

## Rollback Plan

If either change causes regression:
1. Task 1: Remove `stripXmlToolBlocks` calls from stream paths, rebuild server
2. Task 2: Revert `SYSTEM_PROMPT` to original content, rebuild server

Rollback command:
```bash
cd /home/calvin/pilot && git checkout -- server/src/n9routerChat.ts server/src/tools/toolDefinitions.ts && npm run build -w server && systemctl --user restart pilot-server.service
```

---

## Done checklist

- [x] Task 1 complete — no XML blocks in responses
- [x] Task 2 complete — model consistently outputs plain text
- [x] All tests pass (`npm run build -w server`)
- [x] Server restarted via systemd
- [x] Verified with live curl test (0 XML matches)
- [x] Committed and pushed
