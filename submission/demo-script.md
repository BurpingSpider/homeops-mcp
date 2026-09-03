# HomeOps — WebMCP Challenge demo script

Target length: **2:25**. The final public YouTube video must stay under three minutes.

## 0:00–0:15 — Problem and promise

**Visual:** Open the live HomeOps hero and maintenance brief.

**Narration:**

“Home maintenance rarely fails because changing a filter is difficult. It fails because dates, part sizes, service notes, and recurring intervals disappear into memory. HomeOps gives the homeowner a clear maintenance brief and gives their agent structured WebMCP tools to work with the same household record.”

## 0:15–0:32 — Show the human experience

**Visual:** Scroll through the due list, household record, and shared activity area.

**Narration:**

“The homeowner can see what is overdue, what is coming up, when each item was last serviced, and the details needed next time. The hosted demo requires no account or API key, and its demo data stays in the browser.”

## 0:32–0:51 — Explain WebMCP

**Visual:** Show the Agent Contract section, then briefly show the `registerTool` implementation in `challenge-site/app.js`.

**Narration:**

“Instead of forcing an agent to interpret these cards and buttons, HomeOps registers seven browser-native WebMCP tools with typed schemas and read-write annotations. The tools inspect state, find due work, look up history, propose a session, read the human decision, and update confirmed records.”

## 0:51–1:16 — Agent proposes, human decides

**Visual:** Reset the demo, then click **Run WebMCP agent demo**. Show the three-task proposal. Click **Request shorter session** or **Approve proposal** so the human decision becomes visible.

**Narration:**

“A user can ask, ‘Audit my home for the next thirty days and propose the best three-task work session.’ The agent calls `homeops_list_due`, then `homeops_propose_session`. That creates a visible proposal—but it does not claim any physical work happened. The homeowner remains in control and can approve the plan or request a revision.”

## 1:16–1:36 — Agent reads the decision

**Visual:** Show the proposal status and shared activity trail; briefly point to `homeops_get_plan_status` in the Agent Contract.

**Narration:**

“The agent can call `homeops_get_plan_status` to read that human decision before continuing. The proposal, the person’s response, and the agent handoff all stay visible in one shared workspace instead of disappearing into a chat transcript.”

## 1:36–1:58 — Confirmed physical-world update

**Visual:** Show `homeops_lookup_item` and `homeops_log_service` in the tools panel or source. If testing through a WebMCP-capable browser, demonstrate the HVAC-filter lookup and confirmed service update; otherwise show the relevant source guard and resulting dashboard state in the local/full prototype.

**Narration:**

“The agent can look up the HVAC filter, including its saved size and next due date. But `homeops_log_service` rejects the update unless the person explicitly confirms the work is complete. Once confirmed, the tool and the dashboard update the same state immediately.”

## 1:58–2:13 — Why this matters

**Visual:** Show the seven-tool grid and activity trail together.

**Narration:**

“WebMCP changes HomeOps from a dashboard an agent must scrape into a small capability layer built around the homeowner’s actual goals. The agent gets useful initiative; the person keeps visibility and control.”

## 2:13–2:25 — Close

**Visual:** Return to hero, then show live URL and GitHub repository.

**Narration:**

“HomeOps is a shared home memory for people and agents: structured, local-first, auditable, and built around human confirmation where the digital workflow meets the physical world.”

## Required video checks

- Under 3:00
- Public YouTube URL
- Clear audio
- Shows the live project functioning
- Explicitly explains how WebMCP is implemented
- Shows the proposal plus human decision loop
- Shows or clearly demonstrates the confirmation gate for physical-world updates
- No copyrighted music
- Live URL and public repository visible before the end
