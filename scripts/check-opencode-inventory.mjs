#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const writeMode = process.argv.includes("--write");

function listFiles(dir, predicate = () => true) {
  if (!existsSync(dir)) return [];
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const name of readdirSync(current)) {
      const full = join(current, name);
      const st = statSync(full);
      if (st.isDirectory()) stack.push(full);
      else if (predicate(full)) out.push(relative(root, full).replaceAll("\\", "/"));
    }
  }
  return out.sort();
}

function frontmatter(file) {
  const text = readFileSync(join(root, file), "utf8");
  if (!text.startsWith("---\n")) return {};
  const end = text.indexOf("\n---", 4);
  if (end === -1) return {};
  const raw = text.slice(4, end).split(/\r?\n/);
  const obj = {};
  for (const line of raw) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) obj[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return obj;
}

const agents = listFiles(join(root, ".opencode", "agents"), f => f.endsWith(".md"));
const skills = listFiles(join(root, ".opencode", "skills"), f => f.endsWith("/SKILL.md"));
const commands = listFiles(join(root, ".opencode", "commands"), f => f.endsWith(".md"));
const plugins = listFiles(join(root, ".opencode", "plugins"), f => f.endsWith(".ts") || f.endsWith(".js"));
const tools = listFiles(join(root, ".opencode", "tools"), f => f.endsWith(".ts") || f.endsWith(".js"));
const rules = listFiles(join(root, ".opencode", "rules"), f => f.endsWith(".md"));

const agentModes = { primary: [], subagent: [], unknown: [] };
for (const file of agents) {
  const fm = frontmatter(file);
  const name = file.split("/").pop().replace(/\.md$/, "");
  if (fm.mode === "primary") agentModes.primary.push(name);
  else if (fm.mode === "subagent") agentModes.subagent.push(name);
  else agentModes.unknown.push(name);
}

const skillNames = skills.map(file => {
  const parts = file.split("/");
  return parts[parts.length - 2];
});

const inventory = {
  generated_by: "scripts/check-opencode-inventory.mjs",
  counts: {
    agents: agents.length,
    primary_agents: agentModes.primary.length,
    subagents: agentModes.subagent.length,
    commands: commands.length,
    skills: skills.length,
    plugins: plugins.length,
    tools: tools.length,
    rules: rules.length
  },
  agents: agentModes,
  commands: commands.map(f => f.split("/").pop().replace(/\.md$/, "")),
  skills: skillNames,
  plugins: plugins.map(f => f.split("/").pop()),
  tools,
  rules
};

const inventoryJson = JSON.stringify(inventory, null, 2) + "\n";
const inventoryPath = join(root, ".opencode", "inventory.json");

const md = `# OpenCode Inventory

This file is generated from the current repository by \`npm run write:opencode-inventory\`.
Do not edit counts by hand.

## Counts

| Surface | Count |
| --- | ---: |
| Agents | ${inventory.counts.agents} |
| Primary agents | ${inventory.counts.primary_agents} |
| Subagents | ${inventory.counts.subagents} |
| Commands | ${inventory.counts.commands} |
| Skills | ${inventory.counts.skills} |
| Plugins | ${inventory.counts.plugins} |
| Tools | ${inventory.counts.tools} |
| Rules | ${inventory.counts.rules} |

## Agents

### Primary

${agentModes.primary.map(x => `- \`${x}\``).join("\n")}

### Subagents

${agentModes.subagent.map(x => `- \`${x}\``).join("\n")}

${agentModes.unknown.length ? `### Unknown mode\n\n${agentModes.unknown.map(x => `- \`${x}\``).join("\n")}\n` : ""}

## Commands

${inventory.commands.map(x => `- \`/${x}\``).join("\n")}

## Skills

${inventory.skills.map(x => `- \`${x}\``).join("\n")}

## Plugins

${inventory.plugins.map(x => `- \`${x}\``).join("\n")}

## Tools

${inventory.tools.map(x => `- \`${x}\``).join("\n")}
`;

const mdPath = join(root, "docs", "opencode-inventory.md");

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

if (writeMode) {
  writeFileSync(inventoryPath, inventoryJson);
  writeFileSync(mdPath, md);
  console.log(`Wrote ${relative(root, inventoryPath)} and ${relative(root, mdPath)}`);
} else {
  if (!existsSync(inventoryPath)) fail(`${relative(root, inventoryPath)} missing. Run npm run write:opencode-inventory.`);
  else if (readFileSync(inventoryPath, "utf8") !== inventoryJson) fail(`${relative(root, inventoryPath)} is stale. Run npm run write:opencode-inventory.`);
  if (!existsSync(mdPath)) fail(`${relative(root, mdPath)} missing. Run npm run write:opencode-inventory.`);
  else if (readFileSync(mdPath, "utf8") !== md) fail(`${relative(root, mdPath)} is stale. Run npm run write:opencode-inventory.`);

  for (const skillFile of skills) {
    const parts = skillFile.split("/");
    const folder = parts[parts.length - 2];
    const fm = frontmatter(skillFile);
    if (fm.name && fm.name !== folder) fail(`Skill name mismatch: ${skillFile} has name=${fm.name}, folder=${folder}`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(folder)) fail(`Invalid skill folder name: ${folder}`);
  }

  const opencodeJson = join(root, "opencode.json");
  if (existsSync(opencodeJson)) {
    const text = readFileSync(opencodeJson, "utf8");
    if (/"apiKey"\s*:\s*"[^"{][^"]{10,}"/.test(text)) fail("opencode.json contains a literal apiKey. Use local env/auth and keep it out of bundles.");
  }
}
