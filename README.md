# HomeOps

**HomeOps is an agent-ready household maintenance memory built for the 2026 WebMCP Challenge.**

It turns routine home upkeep into structured, browser-native tools that people and AI agents can use together. A homeowner sees a simple maintenance brief; an agent can inspect due work, look up service history, add recurring responsibilities, log completed maintenance, and create a prioritized plan without guessing its way through the interface.

## Live demo

**https://homeops-webmcp.vercel.app**

The hosted challenge build is static, requires no account or API key, and stores demo data locally in the browser.

## Why HomeOps

Home maintenance rarely fails because the work is technically difficult. It fails because dates, filter sizes, service notes, and recurring intervals are scattered across memory, paper manuals, and disconnected apps.

HomeOps creates one shared household record:

- People can see what needs attention and when.
- Agents can call explicit tools instead of scraping or clicking blindly.
- Read and write actions operate on the same state shown in the UI.
- Changes made by an agent are immediately visible to the person.

## WebMCP tools

The challenge build registers these tools with the browser's WebMCP interface when available:

| Tool | Purpose | State change |
|---|---|---|
| `homeops_list_due` | List overdue and upcoming maintenance within a horizon | No |
| `homeops_lookup_item` | Retrieve service history, notes, and next due date | No |
| `homeops_log_service` | Record completed maintenance and update the dashboard | Yes |
| `homeops_add_item` | Add a new recurring household responsibility | Yes |
| `homeops_plan_next` | Return a prioritized maintenance action plan | No |

The page also remains fully usable in browsers that do not expose WebMCP yet.

## Human-agent experience

Example mission:

> Audit my home for the next 30 days, tell me the top three things to handle, and record that I changed the HVAC filter today.

An agent can:

1. Call `homeops_plan_next` to create the priority list.
2. Explain the recommendations to the homeowner.
3. Call `homeops_log_service` after confirmation.
4. Leave the visible dashboard and agent-readable state synchronized.

## Repository structure

```text
webmcp-static/          Hosted WebMCP challenge entry
  index.html
  styles.css
  app.js
public/                 Original interactive prototype UI
lib/                    Maintenance logic and tool definitions
server.js               Local MCP + demo server
tests/                  Node test suite
submission/             Submission copy and demo materials
.github/workflows/      Automated tests
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

No npm packages or paid API keys are required.

## Architecture

```text
Person / browser agent
          |
          v
HomeOps browser interface
          |
          +--> WebMCP tool registration
          |
          +--> Shared maintenance state
          |
          +--> Visible maintenance brief

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
- The demo contains no purchasing or irreversible real-world actions.

## Challenge

Built for **The WebMCP Challenge**, with judging centered on usefulness, originality, execution, thoughtful WebMCP use, and the quality of the human-agent experience.

## License

MIT
