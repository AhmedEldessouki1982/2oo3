# Conversation APIs & Streaming

## Overview

Milestone 4 enables end-to-end multi-model chat with shared context, streaming, and graceful degradation. Authenticated users can create conversations, send prompts, and receive live streamed responses from OpenAI, Anthropic, and Google simultaneously.

## Architecture

```
User → Frontend (React)
         │
         ├── REST: conversation CRUD, message submission
         │
         ▼
      Backend (NestJS)
         │
         ├── ConversationsService ───── CRUD + user-scoped queries
         ├── MessagesService ────────── message creation + provider dispatch
         ├── ProviderOrchestrator ───── parallel provider fan-out
         │     └── simulateStream() ─── simulated responses (MVP)
         │
         ├── StreamEventService ─────── RxJS Subject event bus
         │
         └── StreamingController ────── SSE endpoint
                │
                ▼
         Frontend EventSource ──────── live chunk updates
```

### Provider Flow

1. `POST /api/conversations/:id/messages` creates a `Message` and `ProviderResponse` records (status: `PENDING`)
2. The controller returns immediately with the message + provider IDs
3. `ProviderOrchestratorService.dispatchAll()` fires all providers in parallel via `Promise.allSettled()`
4. Each provider simulation:
   - Updates `ProviderResponse` → `STREAMING`
   - Emits chunks through `StreamEventService` (RxJS Subject)
   - Frontend receives SSE events and updates UI
   - On completion: saves full content + latency to DB, emits `done: true`
   - On failure: saves error summary, emits `done: true` with error
5. One provider failure never blocks the others

## API Endpoints

### Conversations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/conversations` | Bearer | Create conversation |
| `GET` | `/api/conversations` | Bearer | List user's conversations (desc by updatedAt) |
| `GET` | `/api/conversations/:id` | Bearer | Get conversation with messages + provider responses |
| `PATCH` | `/api/conversations/:id` | Bearer | Update conversation title |
| `DELETE` | `/api/conversations/:id` | Bearer | Delete conversation (cascades) |

**POST /api/conversations**
```json
{ "title": "GT-1 vibration analysis" }
```

**Response**
```json
{
  "data": {
    "id": "clx...",
    "title": "GT-1 vibration analysis",
    "status": "ACTIVE",
    "createdAt": "2026-06-10T12:00:00.000Z",
    "updatedAt": "2026-06-10T12:00:00.000Z"
  }
}
```

### Messages

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/conversations/:id/messages` | Bearer | Send prompt → dispatch to all providers |
| `GET` | `/api/conversations/:id/messages` | Bearer | Get conversation messages with responses |

**POST /api/conversations/:id/messages**
```json
{ "content": "What are the risks of proceeding with GT-1 first fire while HRSG steam blow remains open?" }
```

**Response (immediate)**
```json
{
  "data": {
    "message": {
      "id": "msg_1",
      "role": "USER",
      "content": "What are the risks...",
      "createdAt": "2026-06-10T12:00:00.000Z"
    },
    "providerResponses": [
      { "id": "pr_openai", "provider": "OPENAI", "status": "PENDING" },
      { "id": "pr_anthropic", "provider": "ANTHROPIC", "status": "PENDING" },
      { "id": "pr_google", "provider": "GOOGLE", "status": "PENDING" }
    ]
  }
}
```

### SSE Streaming

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/conversations/:id/stream?token=<jwt>` | Query param | SSE stream of provider chunks |

The SSE endpoint uses a JWT token as a query parameter (since `EventSource` API cannot set custom headers).

**Event format:**
```
event: message
data: {"providerResponseId":"pr_1","messageId":"msg_1","provider":"OPENAI","chunk":"\n\n**OpenAI","done":false}
```

**Events:**
- `chunk` events: incremental text content for each provider
- `done: true` event: provider response finished
- `error` field present: provider response failed

### Provider Response Detail

Use `GET /api/conversations/:id` to fetch completed messages with full provider responses after streaming finishes:

```json
{
  "data": {
    "id": "conv_1",
    "title": "GT-1 readiness",
    "messages": [{
      "id": "msg_1",
      "role": "USER",
      "content": "What are the risks...",
      "providerResponses": [{
        "id": "pr_openai",
        "provider": "OPENAI",
        "status": "COMPLETED",
        "content": "**OpenAI Analysis**...",
        "latencyMs": 1280,
        "errorSummary": null
      }]
    }]
  }
}
```

## Simulated Responses (MVP)

For development, the `ProviderOrchestratorService` generates contextual simulated responses based on the prompt. Each provider returns commissioning-domain content:

- **OpenAI**: Risk-focused with timeline impact
- **Anthropic**: Critical path analysis with hidden risks
- **Google**: Permissive conditions with calibration recommendations

Real provider adapters will replace these in Milestone 8.

## Error Handling

- **Provider failure**: Status updates to `FAILED` with error summary in DB; SSE emits `done: true` with `error` field
- **Non-blocking**: One provider failure doesn't affect others
- **Auth failure**: SSE returns a single error event and closes the connection if the JWT token is invalid
- **Not found**: Conversation endpoints return `404` for missing/unauthorized resources

## Frontend Integration

```typescript
// Create conversation
const conv = await createConversation('My investigation')

// Send message
const result = await sendMessage(conv.id, 'What are the risks?')

// Connect to SSE stream
const es = new EventSource(`/api/conversations/${conv.id}/stream?token=${accessToken}`)
es.addEventListener('message', (event) => {
  const data = JSON.parse(event.data)
  // data.provider, data.chunk, data.done, data.error
})

// Get persisted results
const detail = await getConversation(conv.id)
```

## Key Models

### Conversation
| Field | Type | Description |
|-------|------|-------------|
| id | String | CUID |
| userId | String | Owner reference |
| title | String | User-defined name |
| status | Enum | ACTIVE / ARCHIVED / COMPACTING |
| contextSummary | Text? | Compressed context |
| compressionState | JSON? | Compression metadata |

### Message
| Field | Type | Description |
|-------|------|-------------|
| id | String | CUID |
| conversationId | String | Parent conversation |
| role | Enum | SYSTEM / USER / ASSISTANT / TOOL |
| content | Text | Message body |
| compressed | Boolean | Whether context-compressed |

### ProviderResponse
| Field | Type | Description |
|-------|------|-------------|
| id | String | CUID |
| messageId | String | Parent message |
| provider | Enum | OPENAI / ANTHROPIC / GOOGLE |
| status | Enum | PENDING / STREAMING / COMPLETED / FAILED |
| content | Text? | Full response text |
| latencyMs | Int? | Wall-clock time |
| errorCode | String? | Machine-readable error |
| errorSummary | Text? | Human-readable error |
| startedAt | DateTime? | Dispatch timestamp |
| completedAt | DateTime? | Completion timestamp |
