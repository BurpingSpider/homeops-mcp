# HomeOps — Devpost submission copy

## Elevator pitch

HomeOps is a shared household-maintenance memory for people and agents. The homeowner sees a clear maintenance brief; a WebMCP-capable agent gets seven narrow, typed tools to inspect due work, retrieve history, propose a work session, read the homeowner’s decision, and update confirmed records without guessing through the UI.

## Inspiration

Routine home maintenance is usually not hard because changing a filter or testing a smoke detector is complicated. It is hard because the context disappears: when was it last done, which part or size was used, what is overdue, and what should happen next?

Those facts get scattered across memory, manuals, notes, reminders, receipts, and different apps. HomeOps turns them into one durable record that works for both sides of a human-agent collaboration.

## What it does

HomeOps tracks recurring household responsibilities, service dates, intervals, notes, estimated effort, due dates, and overdue status.

A homeowner can open the site and immediately understand what needs attention. A WebMCP-capable agent can use seven structured tools:

- `homeops_get_state` — retrieve the household record, active proposal, and recent activity
- `homeops_list_due` — list overdue and upcoming work within a chosen horizon
- `homeops_lookup_item` — retrieve service history, notes, and calculated next due date
- `homeops_propose_session` — create a visible prioritized work-session proposal for human review
- `homeops_get_plan_status` — read the homeowner’s approval or revision request
- `homeops_log_service` — record completed maintenance only after explicit human confirmation
- `homeops_add_item` — add a recurring responsibility only after explicit human confirmation

A representative mission is:

> Audit my home for the next 30 days and propose the best three-task work session.

The agent can inspect the record, identify the time-sensitive work, create a visible proposal, and then stop. The homeowner can approve it or request a shorter revision. The agent can read that decision through WebMCP before continuing.

If the homeowner later says the HVAC filter was actually changed, the agent can record the service only when the tool call includes explicit human confirmation. HomeOps never treats a proposal as completed physical work.

## Why HomeOps is a strong fit for WebMCP

Without WebMCP, an agent would have to infer the meaning of maintenance cards, status badges, buttons, dates, and forms. That is brittle and ties the agent to presentation details.

HomeOps instead exposes the household capabilities directly. Each tool has a focused description, constrained JSON input schema, and read/write annotations. The agent can work with the underlying maintenance model while the person stays on the same page and sees the same state.

WebMCP is not decorative here: it changes the interaction model from “agent clicks through a dashboard” to “person states a goal, agent uses explicit capabilities, person reviews consequential decisions.”

## What people and agents can do together that was difficult before

A homeowner can delegate a goal such as “prepare my next 30 days of maintenance” without surrendering visibility or control.

The agent can:

1. inspect the current household state;
2. find overdue and upcoming responsibilities;
3. retrieve the details needed to reason about them;
4. propose a prioritized work session;
5. wait while the homeowner approves or asks for a revision;
6. read that decision through WebMCP; and
7. update the durable record only after the person confirms that real-world work occurred.

The visible proposal and activity trail make the handoffs inspectable. Human decisions and agent actions remain synchronized instead of disappearing into a chat transcript.

## How we built it

The hosted challenge build is a dependency-free HTML, CSS, and JavaScript application deployed on Vercel. It requires no account, API key, external model API, or paid runtime service. Demo state is stored locally in the browser.

The page registers seven imperative tools through the browser WebMCP interface:

```js
await document.modelContext.registerTool({
  name,
  description,
  inputSchema,
  annotations,
  execute
});
```

The same handlers used by WebMCP read and write the state that renders the human-facing dashboard. That shared state is what makes an agent action immediately visible to the homeowner.

For visitors whose browser does not expose WebMCP, the built-in “Run WebMCP agent demo” button invokes the same handlers and demonstrates the proposal workflow. In ChatGPT’s in-app browser or Chrome with WebMCP testing enabled, the registered tools are discoverable directly.

The repository also contains a fuller Node.js prototype with a Streamable HTTP MCP endpoint, reusable maintenance logic, local persistence, and automated tests. That earlier prototype helped validate the capability model before the final browser-native challenge experience.

## Safety and human control

HomeOps treats physical-world state differently from ordinary app state.

- Planning does not imply approval.
- A proposal waits for a human decision.
- `homeops_get_plan_status` lets the agent read that decision explicitly.
- `homeops_log_service` rejects calls unless `confirmedByHuman` is true.
- `homeops_add_item` uses the same explicit-confirmation gate.
- No purchase, booking, payment, or irreversible external action exists in the demo.
- Hosted data remains in browser local storage.

This gives the agent useful initiative while preventing it from claiming that physical work happened merely because it suggested the work.

## Challenges we ran into

The hardest problem was not registering tools; it was deciding what the tools should mean.

A one-to-one mapping from every button to an agent tool would still leave the agent performing UI choreography. We instead designed a small capability layer around real homeowner goals: inspect the record, identify due work, propose a session, read the human decision, and record confirmed outcomes.

A second challenge was making human control visible rather than describing it in documentation. We added a proposal state, explicit approve/revision controls, a plan-status tool, confirmation-gated record changes, and a shared activity trail so judges can see the collaboration happen in the product.

## Accomplishments that we're proud of

- Seven working browser-native WebMCP tools
- A multi-step human-agent workflow rather than isolated tool calls
- Explicit proposal, approval, and revision states
- Confirmation gates before recording completed physical work
- One shared state model for the human interface and agent tools
- An auditable activity trail of agent and human handoffs
- A live app with no login, API key, or paid dependency
- Local-first hosted demo data
- Public MIT-licensed source code
- Automated tests plus a fuller local MCP prototype

## What we learned

The strongest agent-native websites do not expose every control as a tool. They expose a small set of capabilities that match what the user is actually trying to accomplish.

We also learned that human-agent collaboration is easier to trust when the tool result changes the visible product. The homeowner should not have to trust a hidden chat transcript to know what the agent proposed, what they approved, or what was recorded.

Finally, physical-world workflows need a stronger boundary than ordinary digital edits. An agent can plan maintenance autonomously, but it should not mark the maintenance complete until a person confirms that the work really happened.

## What's next for HomeOps

Future versions could add shared household roles, optional calendar handoff, manual/receipt import, photo-assisted equipment identification, property-specific maintenance templates, and confirmation-gated service-request drafting.

The same WebMCP model could support other durable household workflows—appliance history, warranty records, seasonal preparation, and service handoffs—while keeping external commitments under human control.

## Testing instructions

1. Open the live app in ChatGPT’s in-app browser, or Chrome with WebMCP testing enabled.
2. Ask the agent to inspect maintenance due within 30 days.
3. Ask it to propose the best three-task work session.
4. Approve the proposal or request the shorter-session revision in the visible UI.
5. Ask the agent to read the latest plan status.
6. Ask it to look up the HVAC filter details.
7. After explicitly confirming that the physical work has been completed, ask it to record the HVAC-filter service and verify the visible record changes.
8. Optionally ask it to add a new recurring responsibility, such as a refrigerator water filter every 180 days, again with explicit human confirmation.

The built-in **Run WebMCP agent demo** button demonstrates the proposal flow for visitors using a browser without WebMCP support.

## Submission URLs

Live app: https://homeops-webmcp.vercel.app

Public repository: https://github.com/BurpingSpider/homeops-mcp
