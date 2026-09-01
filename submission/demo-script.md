# HomeOps — WebMCP Challenge demo script

Target length: **2:20**. The final video must stay under three minutes.

## 0:00–0:16 — Problem and promise

**Visual:** HomeOps hero and live maintenance brief.

**Narration:**

“Home maintenance rarely fails because changing a filter is difficult. It fails because dates, part sizes, service notes, and recurring intervals disappear into memory. HomeOps gives people a simple maintenance brief and gives their agents structured tools to act on the same household record.”

## 0:16–0:35 — Show the human experience

**Visual:** Scroll through the due list and household record.

**Narration:**

“The homeowner can immediately see what is overdue, what is coming up, when each item was last serviced, and the details needed next time. The hosted demo requires no account, API key, or paid service, and the data stays in the browser.”

## 0:35–0:54 — Explain WebMCP

**Visual:** Show the Agent Contract section and briefly show the `registerTool` implementation in the repository.

**Narration:**

“Instead of forcing an agent to infer these cards and buttons, HomeOps registers five browser-native WebMCP tools with typed input schemas. Read-only tools inspect due work and history. Action tools add responsibilities or record completed service.”

## 0:54–1:18 — Agent plans the work

**Visual:** Click **Run agent demo** and show the prioritized result.

**Narration:**

“A user can ask, ‘Audit my home for the next thirty days and tell me the top three things to handle.’ The `homeops_plan_next` tool returns a prioritized plan based on real due dates, not presentation details scraped from the page.”

## 1:18–1:45 — Agent reads and writes shared state

**Visual:** Demonstrate or illustrate calls to `homeops_lookup_item` and `homeops_log_service`; show the HVAC service date changing in the visible dashboard.

**Narration:**

“The agent can look up the HVAC filter, explain the saved size and next due date, and—after the homeowner confirms the work is finished—call `homeops_log_service`. The human-facing dashboard updates immediately because the tool and the interface share the same state.”

## 1:45–2:04 — Add a new responsibility

**Visual:** Add a refrigerator water filter with a 180-day interval and show it appear.

**Narration:**

“The agent can also add a new recurring responsibility, such as replacing a refrigerator water filter every one hundred eighty days. HomeOps preserves the result so future conversations begin with household context instead of starting over.”

## 2:04–2:20 — Close

**Visual:** Return to hero, then show live URL and GitHub repository.

**Narration:**

“HomeOps turns a website from a dashboard an agent must navigate into a capability layer it can use reliably. People keep visibility and control; agents handle the memory and repetitive work. That is the open web experience HomeOps is built to explore.”

## Required video checks

- Under 3:00
- Audio is clear
- Shows the live project functioning
- Explicitly explains how WebMCP is implemented
- No copyrighted music
- Upload publicly to YouTube before submitting
