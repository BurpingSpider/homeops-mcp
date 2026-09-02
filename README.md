# HomeOps

**HomeOps is an agent-ready household maintenance workspace built for the 2026 WebMCP Challenge.**

It turns routine home upkeep into structured, browser-native tools that a homeowner and an AI agent can use together. The person sees the same maintenance record, proposal, decision, and activity history that the agent reads and updates.

## Live demo

**https://homeops-webmcp.vercel.app**

The hosted challenge build is static, requires no account or API key, and stores demo data locally in the browser.

## Why HomeOps

Home maintenance rarely fails because the work is technically difficult. It fails because dates, filter sizes, service notes, recurring intervals, and past decisions are scattered across memory, paper manuals, reminders, and disconnected apps.

HomeOps creates one shared household record:

- People can see what needs attention and when.
- Agents can call explicit tools instead of scraping or clicking blindly.
- Read and write actions operate on the same state shown in the interface.
- Proposed work waits for human approval or revision.
- Important record changes require explicit human confirmation.
- Every handoff appears in an auditable activity trail.

## Seven WebMCP tools

The challenge build registers these tools with the browser's WebMCP interface when available:

| Tool | Purpose | State change |
|---|---|---|
| `homeops_get_state` | Retrieve the household record, active proposal, and recent activity | No |
| `homeops_list_due` | List overdue and upcoming maintenance within a chosen horizon | No |
| `homeops_lookup_item` | Retrieve service history, notes, interval, and next due date | No |
| `homeops_propose_session` | Create a visible prioritized work-session proposal for human review | Yes |
| `homeops_get_plan_status` | Read the person's latest approval or revision request | No |
| `homeops_log_service` | Record completed maintenance after explicit human confirmation | Yes |
| `homeops_add_item` | Add a recurring responsibility after explicit human confirmation | Yes |

Each tool has a focused description, constrained JSON input schema, and read/write annotations. The page remains usable in browsers that do not expose WebMCP yet and uses the same handlers for its built-in demonstration.

## Human-agent workflow

Example mission:

> Audit my home for the next 30 days and propose the best three-task work session.

The agent can:

1. Call `homeops_get_state` and `homeops_list_due` to understand the household context.
2. Call `homeops_propose_session` to create a visible proposal.
3. Stop while the homeowner approves it or requests a revision.
4. Call `homeops_get_plan_status` to read that human decision.
5. Use `homeops_log_service` only after the person explicitly confirms that physical work was completed.
6. Leave the visual dashboard and agent-readable state synchronized.

This design demonstrates useful initiative without hiding decisions or overstating what an agent has accomplished in the physical world.

## Repository structure

```text
challenge-site/         Exact static application used by the live challenge demo
  index.html
  styles.css
  app.js
webmcp/                 Earlier WebMCP prototype
public/                 Original interactive prototype UI
lib/                    Maintenance logic and tool definitions
server.js               Local MCP + demo server
tests/                  Node test suite
submission/             Submission copy and demo materials
.github/workflows/      Automated tests
```

## Run the challenge build

Serve the `challenge-site` directory with any static HTTP server. For example:

```bash
python -m http.server 8000 --directory challenge-site
```

Then open:

```text
http://localhost:8000
```

## Run the full local prototype

Requirements: Node.js 20+.

```bash
npm start
```

Then open:

```text
http://localhost:8787
```

The local MCP endpoint is:

```text
http://localhost:8787/mcp
```

## Test

```bash
npm test
```

No paid API key is required.

## Architecture

```text
Person / browser agent
          |
          v
HomeOps browser interface
          |
          +--> Seven WebMCP tool registrations
          |
          +--> Shared maintenance state
          |
          +--> Visible proposal + approval loop
          |
          +--> Auditable activity history

Local prototype also exposes:
          |
          v
MCP Streamable HTTP endpoint
```

## Privacy and safety

- Hosted challenge data stays in browser local storage.
- The project does not require account credentials or financial information.
- Tools are narrowly scoped to household maintenance records.
- Read-only and state-changing tools are clearly separated.
- Proposals do not imply approval.
- Completed physical work cannot be recorded without explicit human confirmation.
- The demo contains no purchasing or irreversible real-world action.

## Challenge

Built for **The WebMCP Challenge**, with judging centered on usefulness, originality, execution, thoughtful WebMCP use, and the quality of the human-agent experience.

## License

MIT
