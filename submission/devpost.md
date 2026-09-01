# HomeOps — Devpost submission copy

## Elevator pitch

HomeOps is an agent-ready household maintenance memory. It gives people a clear visual maintenance brief while exposing structured WebMCP tools an agent can use to inspect due work, retrieve service history, add recurring responsibilities, record completed maintenance, and build a prioritized action plan.

## Inspiration

The hard part of routine home maintenance is often not performing the task. It is remembering what was done, when it happened, which filter or part was used, and when the work is due again. Those facts end up scattered across memory, paper manuals, notes, and disconnected apps.

HomeOps creates one durable household record that works for both sides of the experience: the homeowner can understand it at a glance, and an agent can act on it through explicit, narrow tools instead of guessing its way through a user interface.

## What it does

HomeOps tracks recurring household responsibilities, service dates, intervals, notes, due dates, and overdue status.

A person can open the dashboard and immediately see what needs attention. A WebMCP-capable agent can use five registered tools:

- `homeops_list_due` — inspect overdue and upcoming work
- `homeops_lookup_item` — retrieve history, notes, and next due date
- `homeops_log_service` — record completed maintenance and update the UI
- `homeops_add_item` — create a new recurring responsibility
- `homeops_plan_next` — generate a prioritized maintenance plan

Example mission:

> Audit my home for the next 30 days, tell me the top three things to handle, and record that I changed the HVAC filter today.

The agent can plan the work, explain its recommendation, execute the confirmed update, and leave the visible dashboard synchronized with the state it changed.

## Why this is a strong fit for WebMCP

A conventional browser agent would need to infer the meaning of cards, badges, buttons, dates, and forms. That is fragile and forces the agent to operate through presentation details.

HomeOps exposes the underlying household capabilities directly. The tools have typed input schemas, focused descriptions, and clear read-only versus state-changing behavior. WebMCP lets the page remain simple for a person while giving an agent a reliable contract for the same application state.

The result is a better user experience because the homeowner can state the goal rather than manually navigating every maintenance record. The agent can perform multi-step work without hidden API keys, a separate integration service, or UI scraping.

## How we built it

The hosted challenge build is a dependency-free HTML, CSS, and JavaScript application deployed on Vercel.

It registers tools with:

```js
document.modelContext.registerTool({
  name,
  description,
  inputSchema,
  annotations,
  execute
});
```

Tool execution reads and writes the same browser state used to render the visible dashboard. Hosted demo data is stored in local storage, so no account, paid service, or external model API is required.

The repository also contains a fuller Node.js prototype with a Streamable HTTP MCP endpoint, reusable maintenance logic, JSON-schema-described tools, voice/text interaction, local JSON persistence, and automated tests. That prototype helped validate the tool model before adapting the experience to browser-native WebMCP.

## Challenges we ran into

The main design challenge was making agent actions visibly meaningful instead of creating a technical demo whose tool calls were disconnected from the person’s experience.

We addressed that by sharing one state model between the WebMCP tool execution and the rendered maintenance brief. When an agent records service or adds an item, the human-facing page changes immediately. We also kept the tools narrow enough to be predictable while supporting a useful multi-step mission.

## Accomplishments that we're proud of

- Five working browser-native WebMCP tools
- Clear separation between read-only and mutating actions
- A coherent human and agent experience built on shared state
- A live app that requires no login or API key
- Local-first demo data and no paid runtime dependency
- A complete open-source repository with an MIT license
- A full local MCP prototype and automated tests in the same project

## What we learned

The most useful agent-native websites do not simply expose every button as a tool. They expose the user’s real goals as a small capability layer.

For HomeOps, “plan the next maintenance work” is more valuable than a sequence of low-level click tools. WebMCP made it possible to define that higher-level action while still keeping state changes explicit and inspectable.

We also learned that human-agent collaboration is strongest when tool results change the visible product, so the person can immediately understand and verify what the agent did.

## What's next for HomeOps

Future versions could add shared household roles, optional calendar handoff, manual and receipt import, photo-assisted equipment identification, property-specific maintenance templates, and confirmation gates for actions that create external commitments.

The same model could eventually give a homeowner an agent that prepares seasonal maintenance, gathers the relevant equipment history, and drafts a service request while the homeowner remains in control of any booking or payment.

## Testing instructions

1. Open the live app in ChatGPT’s in-app browser or Chrome 149+ with WebMCP testing enabled.
2. Ask the agent to list or prioritize maintenance due within 30 days.
3. Ask it to look up the HVAC filter history.
4. Ask it to record that the HVAC filter was changed today.
5. Confirm the visible household record updates.
6. Optionally ask it to add a new recurring item, such as a refrigerator water filter every 180 days.

The **Run agent demo** button also demonstrates the priority-plan result for visitors using a browser without WebMCP support.

## Submission URLs

Live app: https://homeops-webmcp.vercel.app

Public repository: https://github.com/BurpingSpider/homeops-mcp
