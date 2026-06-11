# Multi-AI Orchestrator Skill

## Purpose
Build a parallel multi-AI chat/commissioning app that forks user prompts to ChatGPT, Gemini, and Claude, each responding with their authentic personality and complete responses.

## Stack
- Frontend: React + Vite + TypeScript + Tailwind + shadcn/ui
- Backend: NestJS + TypeScript + Prisma
- Database: PostgreSQL (Docker)
- APIs: OpenAI, Google Generative AI, Anthropic

## Core Issues to Solve
1. **Incomplete responses** → Max tokens too low, streaming not buffered properly
2. **Bots not authentic** → System prompts missing; each AI needs distinct behavior instructions
3. **Parallel execution** → Need Promise.all() on backend, not sequential calls
4. **Context persistence** → Chat history and document context must be passed to all three bots

## Architecture Pattern

### Backend (NestJS)
- **Service: AIOrchestrator** → Manages three parallel AI calls
  - `generateChatResponse(prompt, chatHistory)` → Calls all three in parallel
  - `analyzeDocument(doc, question, docContext)` → All three analyze same doc
- **Service: ChatHistory** → Stores conversation for each bot separately OR merged view
- **Service: DocumentAnalysis** → Stores document + analysis per bot
- **DTO: AIResponse** → { source: 'claude'|'chatgpt'|'gemini', response: string, tokens: number, model: string }

### Frontend (React)
- **Mode Toggle** → Chat / Commissioning
- **Multi-Output View** → Three panels, one per bot (or tabs)
- **Document Upload** → File saved, passed to all three analyzers
- **Chat Input** → Single input, broadcasts to all three

## System Prompts (Critical)

### Claude's System Prompt
```
You are Claude, an AI assistant made by Anthropic. You are helpful, harmless, and honest.
- You provide thoughtful, nuanced responses with appropriate caveats
- You acknowledge uncertainty when unsure
- You can refuse harmful requests gracefully
- You explain your reasoning step-by-step when appropriate
- You are direct, clear, and prefer conciseness over verbosity
- For commissioning/technical topics: You provide structured analysis with clear sections
```

### ChatGPT's System Prompt (GPT-4 Personality)
```
You are ChatGPT, an AI assistant made by OpenAI. You are helpful, creative, and precise.
- You provide comprehensive, well-organized responses
- You use bullet points and structured formatting when helpful
- You are conversational and engaging
- You can explain complex topics in accessible language
- You provide practical examples and use cases
- For commissioning/technical topics: You focus on actionable steps, best practices, and risk mitigation
```

### Gemini's System Prompt
```
You are Gemini, an AI assistant made by Google. You are versatile and multimodal-aware.
- You provide balanced, thorough responses considering multiple perspectives
- You are practical and solution-focused
- You can synthesize information across domains
- You use clear formatting and numbered lists
- You think through tradeoffs explicitly
- For commissioning/technical topics: You analyze schedule impacts, resource requirements, and integration points
```

## Response Structure
All three should respond with:
- Same max_tokens: 2048 (increase if needed)
- Same temperature: 0.7 (adjust per use case)
- Streaming: ENABLED to handle long responses
- Timeout: 30s per bot
- Fallback: If one fails, return error but continue with others

## Database Schema (Prisma)
```
model ChatSession {
  id String @id @default(cuid())
  userId String
  mode 'chat' | 'commissioning'
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  messages ChatMessage[]
  documents Document[]
}

model ChatMessage {
  id String @id @default(cuid())
  sessionId String
  session ChatSession @relation(fields: [sessionId], references: [id])
  userPrompt String
  claudeResponse String?
  chatgptResponse String?
  geminiResponse String?
  timestamp DateTime @default(now())
}

model Document {
  id String @id @default(cuid())
  sessionId String
  session ChatSession @relation(fields: [sessionId], references: [id])
  fileName String
  content String // Raw text from upload
  claudeAnalysis String?
  chatgptAnalysis String?
  geminiAnalysis String?
  uploadedAt DateTime @default(now())
}
```

## Key Patterns

### 1. Parallel API Calls (NestJS Service)
```typescript
async generateChatResponse(prompt: string, history: ChatMessage[]) {
  const systemPrompts = {
    claude: CLAUDE_SYSTEM,
    chatgpt: CHATGPT_SYSTEM,
    gemini: GEMINI_SYSTEM
  };

  const responses = await Promise.all([
    this.anthropic.messages.create({...}), // Claude
    this.openai.createChatCompletion({...}), // ChatGPT
    this.google.generateContent({...}) // Gemini
  ]);

  return {
    claude: responses[0],
    chatgpt: responses[1],
    gemini: responses[2]
  };
}
```

### 2. Streaming on Frontend (React)
- Use EventSource or WebSocket for real-time token streaming
- Buffer responses per bot so user sees complete output
- Display loading spinner per bot until done

### 3. Document Mode
- Upload → Extract text (PDF parser, .docx parser)
- Pass same document + question to all three
- Store analyses separately (allows later comparison)

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Incomplete responses | max_tokens too low | Set to 2048+; use streaming |
| Bots sound generic | Missing system prompt | Use personality-specific prompts above |
| One bot slow | Sequential calls | Use Promise.all() |
| Response timeout | API latency | Increase timeout to 30-60s |
| Truncated mid-sentence | Streaming buffer flush | Ensure response fully read before return |

## OpenCode Workflow

1. **Scaffold**: `multi-ai-orchestrator` (react+nest full-stack)
2. **Frontend Layer**: 
   - ChatInput component (single input, broadcast)
   - AIResponsePanel (three-column or tab view)
   - DocumentUpload (file handler)
3. **Backend Layer**:
   - AIOrchestrator service (core logic)
   - Three AI client configs (OpenAI, Google, Anthropic)
   - Streaming response handler
4. **Integration**:
   - Wire frontend to backend endpoints
   - Test parallel execution
   - Enable streaming per bot
5. **Refinement**:
   - System prompt tuning
   - Temperature/token adjustment
   - Error handling per AI provider

## Deployment Considerations
- Each AI provider has rate limits; consider queuing
- Store API keys in .env (never in code)
- Implement request deduplication (same prompt → cached response)
- Log all API calls for debugging
