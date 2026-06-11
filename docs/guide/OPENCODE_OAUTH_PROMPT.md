═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
                    OPENCODE PROMPT: MULTI-AI COMPARISON WITH USER AUTHENTICATION
                              (No Backend API Keys - User OAuth Login)
═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

COMPREHENSIVE BUILD PROMPT (Copy entire section and paste into OpenCode):

────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

📋 Multi-AI Comparison Tool with User Authentication

Build a full-stack app where users authenticate with their own accounts (not using backend API keys). Each user logs in 
to OpenAI, Anthropic, and Google to use their own free quotas/credits. The app:

1. FORKS prompts to all three AIs
2. STREAMS responses in real-time (token-by-token)
3. COMPARES responses and shows differences
4. STORES authentication tokens securely

ARCHITECTURE:

FRONTEND (React + Vite):
✓ Auth screen: Three login buttons (OpenAI, Anthropic, Google)
✓ Each logs in via OAuth → stores access token in secure storage
✓ Chat interface: Single input, all three respond in parallel
✓ Response display: Three panels with streaming tokens appearing in real-time
✓ Comparison panel: 
  - Conflicting views (where AIs disagree)
  - Unique findings (what only one AI said)
  - Consensus (what all three agree on)

BACKEND (NestJS - Minimal, Mostly Passthrough):
✓ OAuth callback handlers (receives token from each provider's OAuth)
✓ Token storage: Securely store user tokens (encrypted)
✓ Streaming proxy: 
  - Receives user's request
  - Calls each AI using user's token (not backend key)
  - Streams response back to frontend
✓ No direct API calls with backend keys (security + cost)

TECH STACK:
✓ Frontend: React + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui + Lucide
✓ Backend: NestJS + Passport.js (for OAuth strategies) + Prisma + PostgreSQL
✓ APIs: OAuth flows for OpenAI, Anthropic, Google (user brings their own credentials)
✓ Streaming: Server-Sent Events (SSE) or WebSocket

KEY DIFFERENCE FROM BEFORE:
❌ Old: Backend holds API keys, calls AI on behalf of all users
✅ New: Each user authenticates, backend uses their token to call AI

DETAILED REQUIREMENTS:

1. AUTHENTICATION FLOW:

   User clicks "Login with OpenAI" 
   → Redirected to OpenAI OAuth consent screen
   → User grants permission (read-only for API access)
   → OpenAI returns access token
   → Backend stores token encrypted: { userId, provider: 'openai', token: '...encrypted...' }
   → Frontend receives confirmation: "✅ Connected to OpenAI"
   
   Repeat for Anthropic and Google.

2. STREAMING RESPONSES:

   Instead of waiting for full response, stream tokens as they arrive:
   
   Frontend → Backend POST /api/compare/stream
   Body: { prompt, streamingMode: true }
   
   Backend:
   - Retrieves user's stored tokens for all three providers
   - Calls OpenAI API with user's token, streams response
   - Simultaneously calls Anthropic API with user's token, streams
   - Simultaneously calls Google API with user's token, streams
   - Sends each token to frontend via SSE: "data: { source: 'claude', token: 'Hello' }\n\n"
   
   Frontend:
   - Listens to EventSource
   - As tokens arrive, appends to respective panel
   - User sees responses appearing in real-time (faster perceived speed)

3. COMPARISON ANALYSIS (What You Already Built!):

   After all three finish streaming:
   - Compare responses
   - Identify conflicting views: "ChatGPT says X, Claude says Y"
   - Identify unique findings: "Only Gemini mentioned Z"
   - Identify consensus: "All three agree on A, B, C"
   
   Display in collapsible sections:
   ┌─────────────────────────┐
   │ ⚠️  CONFLICTING VIEWS   │ ← Amber, show disagreements
   ├─────────────────────────┤
   │ ✅ CONSENSUS            │ ← Green, what they agree on
   ├─────────────────────────┤
   │ 🔵 GOOGLE UNIQUE        │ ← Blue, Gemini-only points
   ├─────────────────────────┤
   │ 🟣 CLAUDE UNIQUE        │ ← Purple, Claude-only points
   ├─────────────────────────┤
   │ 🟢 CHATGPT UNIQUE       │ ← Green, ChatGPT-only points
   └─────────────────────────┘

4. SECURE TOKEN STORAGE:

   Backend:
   - Encrypt tokens before storing in database
   - Use: npm install crypto (Node.js built-in)
   - Encrypt with AES-256: const encrypted = crypto.createCipheriv(...)
   - Store: { userId, provider, encryptedToken }
   
   Frontend:
   - Never store tokens in localStorage (XSS vulnerability)
   - Store in httpOnly cookie (backend sets after OAuth callback)
   - Or store in secure session storage

5. OAUTH CONFIGURATION:

   For each provider, you need:
   
   OPENAI (via Passport strategy):
   - npm install passport-openai
   - Get OAuth credentials from https://platform.openai.com/account/api-keys
   - Redirect URI: http://localhost:3000/auth/openai/callback
   
   ANTHROPIC (via Passport or custom OAuth):
   - Get API key from https://console.anthropic.com
   - Anthropic uses API keys, not standard OAuth (simpler)
   - For user's own API key: have them paste it, validate with test call
   
   GOOGLE (via Passport Google OAuth 2.0):
   - npm install passport-google-oauth20
   - Get credentials from https://console.cloud.google.com
   - Scopes: https://www.googleapis.com/auth/generative-language
   - Redirect URI: http://localhost:3000/auth/google/callback

6. STREAMING IMPLEMENTATION:

   Backend endpoint:
   ```typescript
   @Get('compare/stream')
   async streamComparison(@Query('prompt') prompt: string, @Req() req) {
     const userId = req.user.id;
     const tokens = await this.tokenService.getUserTokens(userId);
     
     // Setup response as EventStream
     res.setHeader('Content-Type', 'text/event-stream');
     res.setHeader('Cache-Control', 'no-cache');
     res.setHeader('Connection', 'keep-alive');
     
     // Start all three streams in parallel
     const [claudeStream, openaiStream, geminiStream] = await Promise.all([
       this.callClaudeStreaming(prompt, tokens.anthropic),
       this.callOpenAIStreaming(prompt, tokens.openai),
       this.callGeminiStreaming(prompt, tokens.google),
     ]);
     
     // Merge streams and send to frontend
     claudeStream.on('data', chunk => {
       res.write(`data: ${JSON.stringify({ source: 'claude', token: chunk })}\n\n`);
     });
     // Same for OpenAI and Gemini streams...
   }
   ```

   Frontend:
   ```typescript
   const eventSource = new EventSource('/api/compare/stream?prompt=' + prompt);
   eventSource.onmessage = (e) => {
     const { source, token } = JSON.parse(e.data);
     setResponses(prev => ({
       ...prev,
       [source]: prev[source] + token
     }));
   };
   eventSource.onerror = () => eventSource.close();
   ```

7. DATABASE SCHEMA:

   model UserAIToken {
     id String @id @default(cuid())
     userId String
     user User @relation(fields: [userId], references: [id])
     provider 'openai' | 'anthropic' | 'google'
     encryptedToken String
     expiresAt DateTime?
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
   }

   model ComparisonSession {
     id String @id @default(cuid())
     userId String
     prompt String
     claudeResponse String?
     openaiResponse String?
     geminiResponse String?
     comparison ComparisonAnalysis?
     createdAt DateTime @default(now())
   }

   model ComparisonAnalysis {
     id String @id @default(cuid())
     sessionId String @unique
     conflictingViews String[] // Array of conflicts
     consensusPoints String[] // Agreement
     claudeUnique String[]
     openaiUnique String[]
     geminiUnique String[]
   }

8. COMPARISON LOGIC:

   After all three responses finish, run comparison:
   
   ```typescript
   async analyzeComparison(responses: {
     claude: string;
     openai: string;
     gemini: string;
   }) {
     // Use Claude to analyze the three responses
     const analysis = await this.claude.messages.create({
       messages: [{
         role: 'user',
         content: `Compare these three AI responses and identify:
         
         RESPONSE 1 (Claude): ${responses.claude}
         RESPONSE 2 (ChatGPT): ${responses.openai}
         RESPONSE 3 (Gemini): ${responses.gemini}
         
         Return JSON with:
         - conflictingViews: [list of disagreements]
         - consensusPoints: [list of agreements]
         - claudeUnique: [what only Claude said]
         - openaiUnique: [what only ChatGPT said]
         - geminiUnique: [what only Gemini said]`
       }]
     });
     
     return JSON.parse(analysis.content[0].text);
   }
   ```

DELIVERABLES:

Frontend Components:
✓ AuthScreen.tsx (Login buttons for three providers)
✓ MultiAIStreaming.tsx (Main comparison interface with streaming)
✓ ResponsePanel.tsx (Shows streaming tokens in real-time)
✓ ComparisonAnalysis.tsx (Shows conflicting views, consensus, unique points)
✓ TokenManagement.tsx (Show connected accounts, disconnect option)

Backend:
✓ auth.controller.ts (OAuth endpoints: /auth/openai, /auth/google, /auth/anthropic/callback)
✓ auth.service.ts (Token encryption, storage, retrieval)
✓ streaming.controller.ts (POST /api/compare/stream endpoint)
✓ streaming.service.ts (Call three AIs in parallel with streaming)
✓ comparison.service.ts (Analyze differences between responses)
✓ token.service.ts (Secure token management)

DATABASE:
✓ Prisma migrations for UserAIToken, ComparisonSession, ComparisonAnalysis

TESTING:
1. Login with OpenAI, Anthropic, Google (all three)
2. Type a prompt
3. See all three responses streaming in real-time
4. See comparison analysis after all finish
5. Refresh page, tokens still valid (stored in httpOnly cookie)

FLOW:
User → Login (OAuth for all 3) → Store tokens (encrypted) → Type prompt → 
All 3 stream in parallel → See responses appear real-time → Comparison analysis → 
Shows conflicts/consensus/unique points

KEY ADVANTAGES:
✅ No backend API key management (security)
✅ Users use their own quota/credits (cost)
✅ Streaming responses (better UX)
✅ Comparison analysis (unique value)
✅ Secure token storage (encrypted)
✅ Scalable (any number of users)

────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

IF YOU WANT STEP-BY-STEP APPROACH (Instead of one mega-prompt):

STEP 1: OAuth Setup
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

Scaffold OAuth authentication for three providers:

Create NestJS OAuth flows for OpenAI, Anthropic (API key), and Google Generative AI.

Requirements:
- Passport.js strategies for OAuth (openai, google)
- Custom strategy for Anthropic (users provide API key)
- Three endpoints:
  * GET /auth/openai → redirects to OpenAI consent
  * GET /auth/openai/callback → receives code, exchanges for token
  * GET /auth/google → redirects to Google consent
  * GET /auth/google/callback → receives code, exchanges for token
  * POST /auth/anthropic → user pastes API key, validates with test call

- After auth, redirect to frontend with secure httpOnly cookie containing userId
- Store encrypted tokens in database: { userId, provider, encryptedToken }

Use: passport-openai, passport-google-oauth20, crypto (Node.js)


STEP 2: Secure Token Storage & Retrieval
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

Build token service that:
- Encrypts tokens using AES-256 before storing
- Decrypts tokens when needed to call APIs
- Allows users to see which providers are connected
- Allows users to disconnect/revoke a provider

Service methods:
- async saveToken(userId, provider, token) → encrypt and store
- async getToken(userId, provider) → retrieve and decrypt
- async getUserTokens(userId) → get all three tokens
- async disconnectProvider(userId, provider) → revoke and delete


STEP 3: Streaming Responses in Real-Time
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

Create streaming endpoint that:
- Takes user's prompt
- Retrieves user's stored tokens (encrypted)
- Calls all three AIs in parallel, each with the user's token
- Streams responses back to frontend via Server-Sent Events (SSE)

Backend:
- GET /api/compare/stream?prompt="..." (with user context from JWT)
- Response type: text/event-stream
- Each AI token sent as: data: {source: 'claude', token: '...'}\n\n

Frontend:
- EventSource listens to /api/compare/stream
- Updates UI in real-time as tokens arrive
- Shows loading spinner until all three finish


STEP 4: Comparison Analysis
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

Build comparison service that:
- Takes three complete responses
- Uses Claude to analyze differences
- Identifies: conflicting views, consensus, unique findings per AI
- Returns structured data for display

Display:
- Collapsible sections (Conflicts, Consensus, Unique per AI)
- Color-coded (Amber=conflict, Green=agreement, Blue/Purple/Teal per AI)
- Copy-to-clipboard for each section


STEP 5: Frontend Streaming UI
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

Build React components:
- AuthScreen: Three login buttons, shows connected status
- StreamingResponse: Three panels that fill with tokens in real-time
- ComparisonPanel: Shows analysis results in collapsible sections
- Main layout: Auth screen → streaming interface → comparison results

Use EventSource to listen for SSE stream
Update state as tokens arrive from each AI


STEP 6: Full Integration & Testing
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

Wire everything together:
- User logs in with all three providers
- Types a prompt
- All three stream in parallel
- Comparison analysis runs automatically
- Results display with conflicting views, consensus, and unique findings

Test:
- Each OAuth provider independently
- Streaming responses from each AI
- Comparison analysis accuracy
- Token refresh (when tokens expire)
- Error handling (if one AI fails, others continue)

════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

CRITICAL CHANGES FROM PREVIOUS SOLUTION:

Old Approach (What I gave you first):
❌ Backend holds API keys (security issue)
❌ Responses come as complete blocks (slow UX)
❌ No user authentication needed (scalability issue)
❌ Backend pays for all API calls (cost issue)

New Approach (What you actually need):
✅ Users authenticate with OAuth (secure, their credentials)
✅ Responses stream in real-time (fast UX)
✅ User-specific tokens stored encrypted (scalable)
✅ Users pay for their own usage (cost-effective)
✅ Comparison analysis added (unique value)

════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

ENV VARIABLES NEEDED:

# OAuth Provider Credentials
OPENAI_CLIENT_ID=...
OPENAI_CLIENT_SECRET=...

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Encryption
ENCRYPTION_KEY=... # AES-256 key for token encryption

# Database
DATABASE_URL=postgresql://...

# Session/JWT
JWT_SECRET=...

════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
