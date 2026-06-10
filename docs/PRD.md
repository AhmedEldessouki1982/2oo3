# 2oo3 - Product Requirements Document (PRD)

## Product Name

2oo3

---

# Product Vision

2oo3 is a multi-model engineering copilot designed for power plant commissioning teams. It improves decision confidence by exposing agreements, disagreements, hidden assumptions, and unique insights across leading AI models operating under identical conditions.

The product's purpose is not to replace engineering judgment, but to reduce blind spots during research and investigation.

---

# Problem Statement

Commissioning engineers frequently use AI tools for:

- Troubleshooting.
- Reviewing procedures.
- Investigating alarms and trips.
- Researching unfamiliar systems.
- Validating hypotheses.

Current workflows require manually switching between AI systems, comparing outputs mentally, and identifying contradictions themselves.

This process is slow, error-prone, and increases the risk of overlooking critical assumptions.

---

# Goals

## Primary Goals

- Increase confidence through structured disagreement detection.
- Reveal hidden assumptions and risks.
- Surface unique insights from each model.
- Improve investigation quality.
- Maintain investigation history.

## Secondary Goals

- Reduce time spent switching between AI tools.
- Generate actionable follow-up investigations.
- Support engineering documentation during investigations.

---

# Non-Goals

The MVP will not:

- Replace engineering decision-making.
- Provide automated control recommendations.
- Integrate with DCS, SCADA, or plant control systems.
- Support real-time plant data ingestion.
- Provide regulatory compliance certification.
- Fine-tune custom AI models.

---

# Target Users

## Primary Users

- Power plant commissioning engineers.
- Commissioning managers.
- Technical specialists.
- Investigation teams.

## User Characteristics

Users:

- Conduct technical research frequently.
- Analyze abnormal events.
- Review technical documents.
- Require high confidence before acting.
- Value understanding disagreements more than obtaining fast answers.

---

# Core Value Proposition

Instead of asking:

> "What does one AI think?"

2oo3 answers:

> "What do multiple frontier models agree on, disagree on, and what risks might they collectively miss?"

---

# MVP Scope

## Included

### Multi-Model Chat

Support simultaneous conversations with:

- ChatGPT
- Claude
- Gemini

---

### Shared Context

All participating models receive identical context including:

- User prompts.
- Conversation history.
- Uploaded documents.
- User-provided notes.
- Web research findings.

---

### Side-by-Side Responses

Display each model independently.

Columns:

- ChatGPT
- Claude
- Gemini

Responses stream independently.

---

### Structured Comparison Engine

After responses complete, generate:

## Areas of Agreement

Common findings.

Common recommendations.

Common conclusions.

---

## Areas of Disagreement

Conflicting interpretations.

Different troubleshooting paths.

Contradicting assumptions.

---

## Unique Insights

Important observations produced by only one model.

Novel approaches.

Overlooked considerations.

---

## Hidden Risks & Assumptions

Potential blind spots.

Implicit assumptions.

Missing information.

Unverified premises.

Areas requiring validation.

---

## Recommended Next Investigations

Suggested follow-up questions.

Additional data required.

Documents to review.

Potential tests to perform.

Alternative hypotheses.

---

### Conversation Persistence

Support:

- Conversation titles.
- Conversation history.
- Rename conversations.
- Delete conversations.
- Resume conversations.

---

### Context Compression

Long conversations shall be compressed automatically.

Compression must preserve:

- Equipment identifiers.
- Technical facts.
- Decisions.
- Investigation findings.
- Assumptions.
- User conclusions.
- Referenced attachments.
- Important extracted information.

Compression should remove:

- Repetition.
- Non-essential wording.
- Redundant explanations.

Compressed summaries become the active memory for future turns.

---

### Attachment Support

Users can upload:

- PDF files.
- DOCX files.
- XLSX files.
- CSV files.
- Images.

Examples:

- OEM manuals.
- Commissioning procedures.
- Signal lists.
- Test sheets.
- Alarm screenshots.
- DCS screenshots.
- P&IDs.
- Historical trends.

---

### Attachment Processing

The system shall:

1. Extract content.
2. Convert extracted information into shared context.
3. Send identical extracted context to all models.
4. Preserve attachment references within conversation memory.

---

### User Notes

Users may add:

- Findings.
- Conclusions.
- External observations.

These notes become part of shared context.

---

### Web Research Injection

Users may provide externally discovered information.

Examples:

- Manufacturer articles.
- Forum discussions.
- Standards excerpts.
- Investigation findings.

Injected information becomes shared context.

---

### Provider Configuration

Support user-provided API keys for:

- OpenAI.
- Anthropic.
- Google.

Users can:

- Add keys.
- Update keys.
- Remove keys.
- Enable/disable providers.

---

### Free Usage

Where officially available:

- Allow free-tier access.

If quota expires:

- Disable affected provider.
- Notify user.
- Continue operating remaining providers.

---

# Functional Requirements

## FR-001: Create Conversation

Users can create a conversation.

Fields:

- ID
- Title
- Created Date
- Updated Date

---

## FR-002: Send Prompt

Users submit a prompt.

The backend dispatches requests to enabled providers simultaneously.

---

## FR-003: Shared Context Delivery

All enabled providers receive identical context.

No provider receives additional hidden information.

---

## FR-004: Streaming Responses

Responses stream independently.

Failure of one provider must not block others.

---

## FR-005: Provider Failure Handling

If a provider fails:

- Display failure state.
- Preserve successful responses.
- Continue comparison using available outputs.

---

## FR-006: Structured Analysis Generation

Generate comparison output after responses finish.

Sections:

- Agreement
- Disagreement
- Unique Insights
- Hidden Risks & Assumptions
- Recommended Next Investigations

---

## FR-007: Analysis Modes

Users can choose:

### Raw Responses

Only model outputs.

---

### Structured Comparison

Default mode.

---

### Consensus Summary

Emphasize agreements.

---

### Conflict Analysis

Emphasize disagreements and assumptions.

---

## FR-008: File Upload

Users upload attachments.

Files become part of conversation context.

---

## FR-009: Attachment Reuse

Previously uploaded files remain accessible within the conversation.

---

## FR-010: Context Compression

Automatically compress conversations approaching context limits.

---

## FR-011: Conversation Management

Support:

- List.
- Search.
- Rename.
- Delete.
- Resume.

---

# User Flow

## New Investigation

Create Conversation

↓

Upload Documents (Optional)

↓

Enter Question

↓

Dispatch Prompt To All Models

↓

Receive Streaming Responses

↓

Generate Structured Comparison

↓

Review Findings

↓

Ask Follow-Up Questions

↓

Context Compression (As Needed)

↓

Continue Investigation

---

# Technical Architecture

## Frontend

Framework:

- React

Language:

- TypeScript

Build Tool:

- Vite

Responsibilities:

- Chat UI.
- Conversation management.
- File uploads.
- Provider settings.
- Streaming display.
- Comparison visualization.

---

## Backend

Framework:

- NestJS

Responsibilities:

- Authentication.
- Conversation orchestration.
- Provider integrations.
- Attachment processing.
- Context compression.
- Structured analysis generation.
- Persistence.

---

## Database

Database:

- PostgreSQL

ORM:

- Prisma

---

# Suggested Core Entities

## User

- id
- email
- password_hash
- created_at

---

## ProviderCredential

- id
- user_id
- provider
- encrypted_key
- enabled

---

## Conversation

- id
- user_id
- title
- created_at
- updated_at

---

## Message

- id
- conversation_id
- role
- content
- compressed
- created_at

---

## ProviderResponse

- id
- message_id
- provider
- response
- status
- latency_ms

---

## ComparisonResult

- id
- message_id
- agreements
- disagreements
- unique_insights
- hidden_risks
- next_investigations

---

## Attachment

- id
- conversation_id
- filename
- file_type
- extracted_content
- uploaded_at

---

# Performance Requirements

- Initial response streaming begins as quickly as provider latency allows.
- One provider failure shall not interrupt others.
- Comparison generation occurs automatically after available responses complete.
- Context compression executes before provider limits are exceeded.

---

# Security Requirements

- Encrypt provider API keys at rest.
- Never expose provider secrets to the frontend.
- Scope user data to its owner.
- Validate uploaded files.
- Log provider failures without logging secrets.

---

# Success Metrics

## Adoption

- Conversations created per user.
- Weekly active users.

---

## Engagement

- Average investigation length.
- Follow-up prompts per conversation.
- Attachment usage rate.

---

## Product Value

- Percentage of conversations using structured comparison.
- Frequency of detected disagreements.
- Frequency of hidden risks surfaced.
- Percentage of users continuing investigations beyond one prompt.

---

# Future Enhancements

Not part of MVP.

Potential future work:

- Additional AI providers.
- Citation validation.
- Investigation templates.
- Team collaboration.
- Shared workspaces.
- Export to PDF/DOCX.
- Engineering investigation reports.
- Investigation timelines.
- Semantic search across conversations.
- Plant-specific knowledge bases.
- Offline document indexing.

---

# MVP Definition of Done

The MVP is complete when a commissioning engineer can:

1. Create a conversation.
2. Upload technical documents.
3. Ask a technical question once.
4. Receive simultaneous responses from ChatGPT, Claude, and Gemini.
5. View side-by-side outputs.
6. Review agreements, disagreements, unique insights, hidden risks, and recommended next investigations.
7. Continue the investigation through multiple turns.
8. Return later and resume the conversation with preserved compressed context.
9. Use personal API keys without exposing them to other users.

---

End of PRD
