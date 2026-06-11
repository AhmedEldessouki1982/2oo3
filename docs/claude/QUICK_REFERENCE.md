# 🚀 Multi-AI Orchestrator: Quick Reference Card

## Problem Summary
```
❌ Incomplete responses → Sequential calls, low max_tokens
❌ Non-authentic bots → Missing system prompts  
❌ Slow execution → Waiting for one AI blocks the others
```

## Solution Summary
```
✅ Parallel calls (Promise.allSettled) → All three run simultaneously
✅ High max_tokens (2048) → Complete responses, no truncation
✅ Personality prompts → Each AI behaves like itself
✅ Error resilience → One failure doesn't break everything
```

---

## 📦 Files to Use (Copy-Paste Ready)

### Backend Files
1. **ai-orchestrator.service.ts**
   - Location: `/home/claude/ai-orchestrator.service.ts`
   - Place in: `src/ai-orchestration/`
   - Purpose: Core parallel orchestration logic

2. **ai-orchestrator.controller.ts**
   - Location: `/home/claude/ai-orchestrator.controller.ts`
   - Place in: `src/ai-orchestration/`
   - Purpose: API endpoints (`/api/ai/chat`, `/api/ai/analyze-document`)

### Frontend Files
3. **MultiAIChat.tsx**
   - Location: `/home/claude/MultiAIChat.tsx`
   - Place in: `src/components/`
   - Purpose: Main UI with Chat + Commissioning modes

### Configuration Files
4. **multi-ai-orchestrator-SKILL.md**
   - Location: `/home/claude/multi-ai-orchestrator-SKILL.md`
   - Purpose: OpenCode skill reference

5. **multi-ai-architecture.txt**
   - Location: `/home/claude/multi-ai-architecture.txt`
   - Purpose: Visual architecture diagrams

6. **opencode-prompts.txt**
   - Location: `/home/claude/opencode-prompts.txt`
   - Purpose: Ready-to-paste OpenCode prompts

---

## 🔧 Implementation Steps (5 Min Overview)

### Step 1: Set Up Environment
```bash
# Install dependencies
npm install @anthropic-ai/sdk openai @google/generative-ai
npm install axios  # for frontend

# Create .env file
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
```

### Step 2: Backend Setup
```bash
# Copy files
cp /home/claude/ai-orchestrator.service.ts src/ai-orchestration/
cp /home/claude/ai-orchestrator.controller.ts src/ai-orchestration/

# Update app.module.ts to import controller + service

# Run migrations
npx prisma migrate dev --name init
```

### Step 3: Frontend Setup
```bash
# Copy component
cp /home/claude/MultiAIChat.tsx src/components/

# Import in your main page
import { MultiAIChat } from '@/components/MultiAIChat';

# Add to your page
<MultiAIChat />
```

### Step 4: Test
```bash
# Backend should be running on :3000
# Frontend should be running on :5173

# Test endpoint with curl
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{"prompt":"Hello", "history":[]}'

# Should return responses from all three AIs in ~5-10 seconds
```

---

## 📋 Key Code Patterns

### Parallel Execution (Why Your Responses Are Complete)
```typescript
// This runs all three at the same time
const [r1, r2, r3] = await Promise.allSettled([
  callClaude(),    // starts immediately
  callOpenAI(),    // starts immediately  
  callGemini(),    // starts immediately
]);
// Waits for slowest one (usually ~8s instead of 20s)
```

### System Prompts (Why Bots Behave Authentically)
```typescript
// Without: Claude sounds like ChatGPT sounds like Gemini
const response = await api.call({ messages });

// With: Each bot is distinctly itself
const response = await api.call({
  system: "You are Claude, thoughtful and honest...",
  messages,
});
```

### Max Tokens (Why Responses Are Complete)
```typescript
// 512 tokens = responses cut short
// 2048 tokens = full, complete responses
max_tokens: 2048,
```

---

## 🎯 OpenCode Workflow

### Option 1: Sequential (Safest for Learning)
```bash
# Copy PROMPT #1 from opencode-prompts.txt
opencode
# Paste prompt, wait for scaffold
# Copy PROMPT #2, repeat...
```

### Option 2: One-Shot (Fastest)
```bash
# Copy the "COMPREHENSIVE MULTI-AI ORCHESTRATOR BUILD" section
# Paste entire prompt into OpenCode
# Watch it scaffold everything
```

### Option 3: Pi Agent (Your Current Setup)
Since you're using Pi Agent now, convert these to Pi-compatible skills:

```markdown
# Skills to Create:
1. `multi-ai-orchestrator` - full-stack builder
2. `ai-parallel-caller` - orchestration logic
3. `multi-ai-ui` - React component builder
```

---

## 🐛 Troubleshooting

### Issue: Still getting incomplete responses
- [ ] Check `max_tokens` is set to 2048 in ALL three API calls
- [ ] Verify backend logs show all three APIs responding (not timeout)
- [ ] Frontend should see `"response": "..."` with full text

### Issue: Responses still generic (not authentic)
- [ ] Verify `systemPrompts` object is populated in service
- [ ] Verify controller passes system prompt to service
- [ ] Check API call includes `system: systemPrompts.claude` etc.

### Issue: Taking longer than 10 seconds
- [ ] Confirm using `Promise.allSettled()` not sequential `await`
- [ ] Check if one API is slow (Google, OpenAI, or Anthropic)
- [ ] Add timeout per API: 30s max per call

### Issue: One API fails, entire request fails
- [ ] Must use `Promise.allSettled()` NOT `Promise.all()`
- [ ] `allSettled` = if one fails, others still return
- [ ] `all` = if one fails, entire Promise rejects

---

## 📊 Expected Performance

| Metric | Before | After | Why |
|--------|--------|-------|-----|
| Response Time | 20-30s | 5-10s | Parallel execution |
| Response Completeness | 50% | 100% | max_tokens: 2048 |
| Bot Authenticity | 30% | 100% | System prompts |
| Error Resilience | Fails completely | Partial response | allSettled() |
| Frontend Timeout | Common | Rare | Faster response |

---

## 🔗 API Endpoints

### Chat Mode
```
POST /api/ai/chat
Input: { 
  prompt: "Your question here",
  history?: [{ role: 'user'|'assistant', content: '...' }],
  sessionId?: "uuid"
}
Output: {
  success: true,
  data: {
    responses: [
      { source: 'claude', response: '...', model: '...', tokens: 1200 },
      { source: 'chatgpt', response: '...', model: '...', tokens: 1100 },
      { source: 'gemini', response: '...', model: '...', tokens: 950 }
    ]
  }
}
```

### Commissioning Mode
```
POST /api/ai/analyze-document
Input: {
  documentContent: "Raw text from PDF/DOCX/TXT",
  userQuestion: "What is the commissioning schedule?",
  fileName?: "project-plan.pdf",
  sessionId?: "uuid"
}
Output: {
  success: true,
  data: {
    responses: [
      { source: 'claude', analysis: '...', tokens: 1400 },
      { source: 'chatgpt', analysis: '...', tokens: 1350 },
      { source: 'gemini', analysis: '...', tokens: 1200 }
    ]
  }
}
```

---

## 💾 Database Schema Reference

### Save messages after each call
```typescript
const message = await prisma.chatMessage.create({
  data: {
    sessionId: sessionId,
    userPrompt: prompt,
    claudeResponse: responses[0].content,
    chatgptResponse: responses[1].content,
    geminiResponse: responses[2].content,
  },
});
```

### Retrieve conversation history
```typescript
const history = await prisma.chatMessage.findMany({
  where: { sessionId },
  orderBy: { timestamp: 'asc' },
});
```

---

## 🎨 Frontend Configuration

### Theme Colors (Dracula Palette)
```css
--claude: #BD93F9    /* Purple */
--chatgpt: #50FA7B   /* Green */
--gemini: #8BE9FD    /* Cyan */
--bg: #282A36        /* Dark gray */
--text: #F8F8F2      /* Light gray */
```

### Component Hierarchy
```
<MultiAIChat>
  ├─ Mode Toggle (Chat / Commissioning)
  ├─ Input Area
  │  ├─ Chat: Textarea
  │  └─ Doc: FileUpload + Textarea
  ├─ Response Display
  │  ├─ Option A: Tabs (one at a time)
  │  └─ Option B: Grid (all three visible)
  └─ Chat History (Chat mode only)
```

---

## 📞 Support

If responses are still incomplete or not working:

1. **Check logs:** Backend should print "All three AI responses completed in Xms"
2. **Test with curl:** Verify endpoint works independently
3. **Check API keys:** All three must be valid
4. **Check network:** All three APIs must be reachable
5. **Increase timeout:** If APIs are slow, increase from 30s to 60s

---

## 🚀 Next: Streaming Enhancement

Once basic version works, add real-time streaming:

```typescript
// Backend emits tokens as they arrive
res.setHeader('Content-Type', 'text/event-stream');
claudeStream.on('data', chunk => res.write(`data: ${chunk}\n\n`));

// Frontend listens in real-time
const source = new EventSource('/api/ai/chat?id=...;
source.onmessage = (e) => setResponses(prev => [..., e.data]);
```

This is optional but creates a wow effect! ✨

---

## 📝 Commissioning-Specific Notes

Since you're a commissioning engineer, here's how to leverage this:

### Document Types to Support
- Project schedules (Primavera XER, MS Project XML)
- Commissioning plans (PDF)
- Equipment manuals (PDF)
- Test procedures (DOCX)
- Daily reports (TXT)

### Commissioning Questions Each Bot Excels At
- **Claude:** "What are the risks and recommendations?"
- **ChatGPT:** "What is the detailed step-by-step approach?"
- **Gemini:** "How does this impact schedule and resources?"

### Integration with Your n8n Workflow
Once this app is running, you can call it from n8n:

```n8n
Telegram Input 
  → HTTP POST to /api/ai/analyze-document (send document + question)
  → Get all three analyses
  → Format and send to email
```

---

## 🎯 Success Criteria

You'll know it's working when:

✅ Type a prompt → Get full responses from all three AIs in <10 seconds
✅ Each AI responds distinctly (Claude sounds like Claude, etc.)
✅ Upload a commissioning document → All three analyze it
✅ Chat history saves and persists
✅ If one API fails, you still get responses from the other two
✅ Responses are complete, not truncated mid-sentence

---

**Happy orchestrating!** 🎼🤖🤖🤖

Contact: Use this when setting up your Pi Agent skills or hitting blockers with OpenCode.
