# HomeOps MCP — Devpost submission draft

## Inspiration

The hard part of routine home maintenance usually is not performing the task. It is remembering what was done, when it was done, what size/model is needed, and when it needs attention again. Those facts are naturally spoken in the moment, but existing maintenance apps require people to stop what they are doing, open an app, navigate forms, and keep the app alive as a habit.

HomeOps makes Alexa+ a durable household operations memory: say it once, and the system turns a spoken update into structured maintenance state that can be queried later.

## What it does

HomeOps supports a simple conversational loop:

- “Remember the dryer vent and clean it every 6 months.”
- “I changed the HVAC filter today.”
- “What’s due?”
- “When did I last change the HVAC filter?”

The system records household maintenance items, service history, intervals, notes, due dates, and overdue status. A visual Alexa+ simulation shows the same state being manipulated through voice or text.

## How we built it

HomeOps is a Node.js application with no third-party runtime dependencies. The MCP server implements Streamable HTTP and protocol version 2025-11-25, including `initialize`, `tools/list`, and `tools/call`. Six JSON-schema-described MCP tools manage household state.

The browser simulation uses the same tool layer as MCP, so the UI is not a scripted prototype. Voice input uses browser speech recognition where available, and spoken responses use browser speech synthesis. Household state is persisted locally in JSON.

## Challenges

The main design challenge was making the demo useful without requiring a paid LLM or a physical device. We solved that by separating natural-language intent routing from the MCP tool layer. The demo supports a focused set of high-value voice patterns while keeping the underlying MCP tools generic enough for a future Alexa+ agent to call directly.

## Accomplishments

- Working MCP 2025-11-25 Streamable HTTP endpoint
- Six real tools with schemas
- Voice-capable browser simulation
- Durable household state
- Due/overdue calculations
- Zero paid API dependency
- Local-first privacy posture
- Automated tests
- Fully open-source MIT codebase

## What we learned

A conversational agent becomes much more valuable when it owns durable structured memory instead of only answering a one-time question. MCP is a strong fit because it lets the conversation surface stay natural while the underlying actions remain explicit, testable, and interoperable.

## What's next

Future versions could add optional calendar handoff, device/manual metadata import, shared household roles, and proactive Alexa+ briefings while preserving user control over what information leaves the home.

## Product feedback draft

**MCP / Alexa+ simulated path:** The simulated-experience path lowers the barrier to experimentation because a physical device is not required. The most useful developer guidance would be more end-to-end reference examples showing a complete Streamable HTTP MCP integration, including recommended session handling and production deployment patterns.

**Onboarding:** The track definition makes the desired demo format clear. A small official conformance checker for the Alexa+ MCP requirements would reduce uncertainty for first-time MCP developers.

**Would we build with it again?** Yes. The tool-oriented architecture fits household operations well because actions are explicit and auditable while the conversational layer can stay flexible.
