# HomeOps MCP — 2:15 demo script

**0:00–0:15 — Hook**
“Home maintenance is rarely hard because changing a filter is difficult. It is hard because six months later nobody remembers what was changed, when, or what size to buy. HomeOps turns Alexa+ into a durable household maintenance memory.”

**0:15–0:35 — Show the maintenance brief**
Open the demo. Point out one overdue item and one upcoming item. “This state is live, not a mockup. The same tool layer powers both this simulation and the MCP endpoint.”

**0:35–0:55 — Log maintenance by voice/text**
Say: “I changed the HVAC filter today.”
Show the updated date and next due date.

**0:55–1:20 — Add new recurring memory**
Say: “Remember the dryer vent and clean it every 6 months.”
Show the new item appear immediately.

**1:20–1:40 — Query memory**
Say: “What’s due?” then “When did I last change the HVAC filter?”
Show the conversational answers matching the dashboard state.

**1:40–2:00 — Show MCP**
Briefly show the README MCP curl examples or terminal output for `tools/list`. “HomeOps exposes six JSON-schema-described tools over Streamable HTTP using MCP protocol 2025-11-25.”

**2:00–2:15 — Close**
“No paid API, no required hardware, and no new app habit. HomeOps makes the conversation itself the maintenance workflow: say it once, and remember it when it matters.”
