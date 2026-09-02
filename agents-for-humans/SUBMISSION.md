# Agents for Humans submission draft

## Project name

HomeOps Quiet Agent

## Tagline

The maintenance agent that does the tracking, builds the plan, and asks only when a real decision is needed.

## Track

Everyday Agents

## What it does

HomeOps Quiet Agent takes over the invisible administrative work of maintaining a home. It keeps a durable record of recurring responsibilities, calculates due dates, audits overdue and upcoming work, and groups the most urgent tasks into a realistic work session based on the homeowner's available time.

The agent does not silently take control. It stores a visible proposal and stops for the person's approval, revision, or rejection. It can only record physical maintenance as completed after explicit human confirmation.

## Who it is for

Homeowners, renters, caregivers, and families who know maintenance matters but do not want another app, spreadsheet, or calendar system to manage.

## Why it matters

Small maintenance tasks are easy to perform but hard to remember. Missed filters, vents, safety tests, and seasonal service create avoidable expense and risk. HomeOps turns scattered household memory into one quiet agent workflow.

## How Strands is used

The Strands Agent coordinates seven narrow Python tools. It reads shared state, audits due work, looks up item history, creates a time-bounded proposal, checks the person's decision, and applies only confirmed changes. The system prompt encodes stopping rules and the tools enforce those rules again in deterministic domain logic.

Amazon Bedrock is the default contest path. Ollama is supported as a free local alternative, and the persistence and safety layer has a zero-dependency test suite.

## Human-in-the-loop design

The key handoff is explicit:

1. Agent audits the home.
2. Agent proposes a session.
3. Agent stops.
4. Person approves, rejects, or requests a revision.
5. Agent reads that decision.
6. Durable records change only after confirmation.

## Built with

Python, Strands Agents SDK, Amazon Bedrock, Amazon Nova, JSON, unittest, Ollama (optional local provider), Mermaid.

## Demo prompt

Audit my home for the next 30 days. Propose the best maintenance session that fits within 60 minutes, then stop for my approval.
