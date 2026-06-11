# 🎯 3-Step Implementation Guide

---

## Step 1: Copy OpenCode Prompt (2 minutes)

**File:** `OPENCODE_READY_PROMPT.txt`

**Action:**
1. Open the file: `/mnt/user-data/outputs/OPENCODE_READY_PROMPT.txt`
2. Select ALL text (Ctrl+A or Cmd+A)
3. Copy it
4. Open OpenCode: `opencode`
5. Paste the entire prompt
6. Press Enter/Submit

**OpenCode will:**
- Scaffold full React + NestJS project
- Generate all components
- Create all services
- Set up database models
- Configure OAuth structure

⏱️ This takes ~5-10 minutes depending on your machine.

---

## Step 2: Configure OAuth & Encryption (15 minutes)

**File:** `OAUTH_AND_TOKEN_ENCRYPTION.md`

### 2A. Generate Encryption Key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: a1b2c3d4e5f6... (save this)
```

### 2B. Register OAuth Apps

**OpenAI:**
1. Go to https://platform.openai.com/account/api-keys
2. Create OAuth application
3. Get: OPENAI_CLIENT_ID and OPENAI_CLIENT_SECRET
4. Set redirect: http://localhost:3000/auth/openai/callback

**Google:**
1. Go to https://console.cloud.google.com
2. Create OAuth 2.0 Web Application
3. Get: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
4. Set redirect: http://localhost:3000/auth/google/callback

**Anthropic:**
1. Go to https://console.anthropic.com
2. Get API key (no OAuth needed)

### 2C. Create .env File
```bash
# In your backend directory, create .env:

OPENAI_CLIENT_ID=your_openai_client_id
OPENAI_CLIENT_SECRET=your_openai_client_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

ENCRYPTION_KEY=the_key_you_generated_above

DATABASE_URL=postgresql://user:password@localhost:5432/multi_ai_db

JWT_SECRET=your_random_jwt_secret_here

NODE_ENV=development
PORT=3000
```

### 2D. Install Dependencies
```bash
cd backend
npm install passport passport-openai passport-google-oauth20
npm install crypto  # built-in, but ensure it's available
```

---

## Step 3: Implementation Details (Reference as Needed)

The files are ready to copy. OpenCode may have generated them, but if you need to manually add/update:

### If using generated code:
- OpenCode created most of the structure
- Review the 6 files below for exact implementation
- Copy/adjust as needed

### If building manually:

**Copy these backend files:**
1. `comparison.service.ts` → `src/services/comparison.service.ts`
2. `streaming.controller.ts` → `src/controllers/streaming.controller.ts`
3. `streaming.service.ts` → `src/services/streaming.service.ts`

**Copy this frontend file:**
4. `StreamingComparison.tsx` → `src/components/StreamingComparison.tsx`

### Database Setup
```bash
npx prisma migrate dev --name oauth_and_tokens
# This creates tables: User, UserAIToken, ComparisonSession, ComparisonAnalysis
```

### Update NestJS Module
```typescript
// app.module.ts
import { ComparisonService } from './services/comparison.service';
import { StreamingService } from './services/streaming.service';
import { StreamingController } from './controllers/streaming.controller';
import { AuthController } from './controllers/auth.controller';

@Module({
  controllers: [StreamingController, AuthController],
  providers: [StreamingService, ComparisonService, TokenService],
})
export class AppModule {}
```

---

## 📋 Complete Checklist

### Before You Start:
- [ ] Have Node.js 18+ installed
- [ ] PostgreSQL database ready (or use Docker)
- [ ] Git repo initialized

### Step 1 (2 min):
- [ ] Copy OPENCODE_READY_PROMPT.txt content
- [ ] Paste into OpenCode
- [ ] Let it scaffold

### Step 2 (15 min):
- [ ] Generate encryption key
- [ ] Register OAuth apps (OpenAI, Google)
- [ ] Create .env file with all keys
- [ ] Run: `npm install` (additional packages if needed)

### Step 3 (10 min):
- [ ] Review/copy the 6 files (or use generated versions)
- [ ] Update NestJS module imports
- [ ] Run: `npx prisma migrate dev`

### Testing (10 min):
- [ ] Start backend: `npm run start:dev`
- [ ] Start frontend: `npm run dev`
- [ ] Go to http://localhost:5173
- [ ] Click "Login with OpenAI" → verify OAuth flow
- [ ] Repeat for Google and Anthropic
- [ ] Type a prompt
- [ ] Verify streaming responses
- [ ] Verify comparison analysis

---

## 🚀 Total Time: ~45 Minutes

```
OpenCode scaffold: 5-10 min
OAuth setup: 15 min
File review/copy: 5 min
Database migration: 2 min
Testing: 10 min
─────────────────
Total: ~45 min
```

---

## ❓ Troubleshooting

### OAuth redirect not working?
→ Check redirect URIs match exactly in .env and OAuth provider console

### Tokens not decrypting?
→ Verify ENCRYPTION_KEY is correct and matches the one used to encrypt

### Streaming not appearing?
→ Check EventSource is open in frontend
→ Check backend is emitting SSE events
→ Open browser DevTools → Network → check /api/compare/stream connection

### Database migration fails?
→ Verify DATABASE_URL is correct
→ Ensure PostgreSQL is running
→ Delete existing migrations if schema changed

### One AI response fails?
→ Verify that user is connected to all three providers
→ Check token is valid (call with dummy request)
→ Error should appear in comparison analysis

---

## 📚 Reference Files When Needed

| Issue | Reference File |
|-------|-----------------|
| "How do I set up OAuth?" | OAUTH_AND_TOKEN_ENCRYPTION.md (Part 2) |
| "How do I encrypt tokens?" | OAUTH_AND_TOKEN_ENCRYPTION.md (Part 3) |
| "How does streaming work?" | streaming.controller.ts (comments explain each step) |
| "How is comparison done?" | comparison.service.ts (code is self-documented) |
| "What's the database schema?" | OAUTH_AND_TOKEN_ENCRYPTION.md (Part 4) |
| "What's the frontend flow?" | StreamingComparison.tsx (component lifecycle) |

---

## ✅ Success Indicators

You'll know it's working when:

1. **Auth Screen:**
   - Three login buttons appear
   - Each button works (OpenAI/Google/Anthropic)
   - After login, shows "✅ Connected"

2. **Streaming:**
   - Type a prompt
   - See tokens appearing in real-time
   - Not waiting for full response
   - Each AI shows separately

3. **Comparison:**
   - After all three finish
   - See collapsible sections:
     - ⚠️ Conflicting views
     - ✅ Consensus
     - 🟣🟢🔵 Unique findings

4. **Performance:**
   - All three responding within 10-15 seconds
   - Tokens streaming immediately (not waiting)
   - No "complete response" block

---

## 🎓 For Future Enhancement

Once basic version works, you can add:

1. **Response history:**
   - Query past comparisons
   - Search by prompt
   - Export comparisons as PDF

2. **Advanced comparison:**
   - Show token counts per AI
   - Show confidence scores
   - Show source citations

3. **Custom system prompts:**
   - Let users set AI personalities
   - Save favorite prompt templates

4. **Integration with n8n:**
   - Use this API in your n8n workflows
   - Automate multi-AI analysis

5. **Commissioning-specific:**
   - Upload CCPP documents
   - Pre-trained prompts for commissioning questions
   - Commissioning team collaboration features

---

## 🤔 Which Path Should You Take?

### Path A: "Just use OpenCode" (If you trust automation)
1. Copy prompt
2. Paste into OpenCode
3. Let it build everything
4. Do Step 2 (OAuth setup)
5. Done!

⏱️ Faster, but less control

### Path B: "Copy the files manually" (If you want full control)
1. Use OpenCode to understand structure
2. Manually copy the 6 files
3. Understand each piece
4. Customize as needed
5. Done!

⏱️ Slower, but more learning

### Path C: "Hybrid" (Recommended)
1. Use OpenCode to scaffold
2. Review the 6 files to understand
3. Copy/adjust OpenCode's output
4. Customize for your needs
5. Done!

⏱️ Best balance of speed + understanding

---

## 🎯 You're Ready!

Everything is prepared. Pick your path above and go! 🚀

Questions along the way? The reference files have detailed explanations.

Good luck! 💪
