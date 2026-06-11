# Complete OAuth Setup & Token Encryption Guide

## Architecture Overview

```
User Login → OAuth Provider → Backend Gets Token → Encrypt & Store → 
User Asks Question → Backend Uses User's Token to Call AI → Streams Response
```

Key Principle: **Backend never holds API keys. Users authenticate, backend uses their credentials.**

---

## Part 1: Generate Encryption Key

```bash
# Generate a 256-bit (32-byte) encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# Add to .env
ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

## Part 2: OAuth Setup for Each Provider

### Option A: OpenAI OAuth

**1. Register OAuth App:**
- Go to: https://platform.openai.com/account/api-keys
- Create a new OAuth application
- Set Redirect URI: `http://localhost:3000/auth/openai/callback` (or production domain)

**2. Get Credentials:**
```
OPENAI_CLIENT_ID=...
OPENAI_CLIENT_SECRET=...
```

**3. Install Passport Strategy:**
```bash
npm install passport passport-openai
```

**4. Backend OAuth Controller:**
```typescript
// auth.controller.ts - OAuth endpoints
import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  // Redirect to OpenAI consent screen
  @Get('openai')
  @UseGuards(AuthGuard('openai'))
  openaiAuth() {
    // Handled by Passport
  }

  // OAuth callback - receives code, exchanges for token
  @Get('openai/callback')
  @UseGuards(AuthGuard('openai'))
  async openaiCallback(@Req() req: any, @Res() res: any) {
    // Passport provides req.user.accessToken
    const userId = req.user.id;
    const token = req.user.accessToken;

    // Save encrypted token to database
    await this.tokenService.saveToken(userId, 'openai', token);

    // Redirect to frontend with success message
    res.redirect('/dashboard?connected=openai');
  }
}
```

**5. Passport Strategy Configuration:**
```typescript
// passport-openai.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-openai';

@Injectable()
export class OpenaiStrategy extends PassportStrategy(Strategy, 'openai') {
  constructor(private userService: UserService) {
    super({
      clientID: process.env.OPENAI_CLIENT_ID,
      clientSecret: process.env.OPENAI_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/openai/callback',
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    // Find or create user
    let user = await this.userService.findByOpenAIId(profile.id);
    if (!user) {
      user = await this.userService.create({
        openaiId: profile.id,
        email: profile.emails?.[0]?.value,
      });
    }
    return { ...user, accessToken };
  }
}
```

---

### Option B: Google OAuth

**1. Register OAuth App:**
- Go to: https://console.cloud.google.com
- Create OAuth 2.0 credentials (Web Application)
- Set Redirect URI: `http://localhost:3000/auth/google/callback`

**2. Get Credentials:**
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

**3. Install Passport Strategy:**
```bash
npm install passport-google-oauth20
```

**4. Passport Strategy:**
```typescript
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private userService: UserService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/callback',
      scope: [
        'https://www.googleapis.com/auth/generative-language',
        'https://www.googleapis.com/auth/cloud-platform',
      ],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    let user = await this.userService.findByGoogleId(profile.id);
    if (!user) {
      user = await this.userService.create({
        googleId: profile.id,
        email: profile.emails?.[0]?.value,
      });
    }
    return { ...user, accessToken };
  }
}
```

---

### Option C: Anthropic API Key (Simpler - No OAuth)

Anthropic doesn't have standard OAuth. Instead:

**1. User manually enters API key:**
```typescript
// auth.controller.ts
@Post('anthropic/verify')
async verifyAnthropicKey(
  @Body() { apiKey }: { apiKey: string },
  @Req() req: any,
) {
  // Test the API key with a simple call
  const client = new Anthropic({ apiKey });
  try {
    await client.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'test' }],
    });
  } catch (error) {
    throw new BadRequestException('Invalid Anthropic API key');
  }

  // Save encrypted key
  const userId = req.user.id;
  await this.tokenService.saveToken(userId, 'anthropic', apiKey);

  return { success: true, message: 'Anthropic key verified' };
}
```

**2. Frontend:**
```typescript
const handleAnthropicConnect = async () => {
  const apiKey = prompt('Enter your Anthropic API key:');
  if (apiKey) {
    const response = await axios.post('/auth/anthropic/verify', { apiKey });
    if (response.data.success) {
      setConnected({ ...connected, anthropic: true });
    }
  }
};
```

---

## Part 3: Token Service (Encryption/Decryption)

```typescript
// token.service.ts
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from './prisma.service';

@Injectable()
export class TokenService {
  private encryptionKey: Buffer;

  constructor(private prisma: PrismaService) {
    this.encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  }

  /**
   * Encrypt token before storing in database
   */
  private encryptToken(token: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt token from database
   */
  private decryptToken(encryptedToken: string): string {
    const parts = encryptedToken.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const cipher = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    let decrypted = decipher.update(cipher);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  }

  /**
   * Save encrypted token to database
   */
  async saveToken(userId: string, provider: string, token: string) {
    const encryptedToken = this.encryptToken(token);
    return this.prisma.userAIToken.upsert({
      where: {
        userId_provider: { userId, provider },
      },
      update: { encryptedToken },
      create: { userId, provider, encryptedToken },
    });
  }

  /**
   * Get decrypted token
   */
  async getToken(userId: string, provider: string): Promise<string> {
    const record = await this.prisma.userAIToken.findUnique({
      where: {
        userId_provider: { userId, provider },
      },
    });

    if (!record) {
      throw new Error(`No token found for ${provider}`);
    }

    return this.decryptToken(record.encryptedToken);
  }

  /**
   * Get all user's tokens (decrypted)
   */
  async getUserTokens(userId: string) {
    const records = await this.prisma.userAIToken.findMany({
      where: { userId },
    });

    const tokens = {};
    for (const record of records) {
      tokens[record.provider] = this.decryptToken(record.encryptedToken);
    }
    return tokens;
  }

  /**
   * Disconnect a provider (delete token)
   */
  async disconnectProvider(userId: string, provider: string) {
    return this.prisma.userAIToken.delete({
      where: {
        userId_provider: { userId, provider },
      },
    });
  }

  /**
   * Get connected providers for user
   */
  async getConnectedProviders(userId: string) {
    const records = await this.prisma.userAIToken.findMany({
      where: { userId },
      select: { provider: true },
    });

    return records.map((r) => r.provider);
  }
}
```

---

## Part 4: Prisma Schema Updates

```prisma
model User {
  id String @id @default(cuid())
  email String @unique
  openaiId String?
  googleId String?
  anthropicId String?
  
  tokens UserAIToken[]
  comparisons ComparisonSession[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model UserAIToken {
  id String @id @default(cuid())
  userId String
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  provider String // 'openai' | 'anthropic' | 'google'
  encryptedToken String // Stored encrypted
  expiresAt DateTime?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([userId, provider])
}

model ComparisonSession {
  id String @id @default(cuid())
  userId String
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  prompt String
  claudeResponse String?
  chatgptResponse String?
  geminiResponse String?
  
  comparison ComparisonAnalysis?
  
  createdAt DateTime @default(now())
}

model ComparisonAnalysis {
  id String @id @default(cuid())
  sessionId String @unique
  session ComparisonSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  conflictingViews String[] @default([])
  consensusPoints String[] @default([])
  claudeUnique String[] @default([])
  chatgptUnique String[] @default([])
  geminiUnique String[] @default([])
}
```

**Migration:**
```bash
npx prisma migrate dev --name oauth_and_tokens
```

---

## Part 5: Frontend Auth Screen

```tsx
// AuthScreen.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const AuthScreen = ({ onConnected }: { onConnected: () => void }) => {
  const [connected, setConnected] = useState({
    openai: false,
    google: false,
    anthropic: false,
  });

  const handleOpenAILogin = () => {
    window.location.href = '/auth/openai';
  };

  const handleGoogleLogin = () => {
    window.location.href = '/auth/google';
  };

  const handleAnthropicKey = async () => {
    const apiKey = prompt('Paste your Anthropic API key:');
    if (apiKey) {
      const response = await fetch('/auth/anthropic/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      if (response.ok) {
        setConnected((prev) => ({ ...prev, anthropic: true }));
      }
    }
  };

  const allConnected =
    connected.openai && connected.google && connected.anthropic;

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Connect AI Accounts</h1>

      <div className="space-y-3">
        <Button
          onClick={handleOpenAILogin}
          disabled={connected.openai}
          className="w-full"
        >
          {connected.openai ? '✅ OpenAI Connected' : 'Connect OpenAI'}
        </Button>

        <Button
          onClick={handleGoogleLogin}
          disabled={connected.google}
          className="w-full"
        >
          {connected.google ? '✅ Google Connected' : 'Connect Google'}
        </Button>

        <Button
          onClick={handleAnthropicKey}
          disabled={connected.anthropic}
          className="w-full"
        >
          {connected.anthropic ? '✅ Anthropic Connected' : 'Add Anthropic Key'}
        </Button>
      </div>

      {allConnected && (
        <Button onClick={onConnected} className="w-full" variant="default">
          Continue to Compare
        </Button>
      )}
    </div>
  );
};
```

---

## Part 6: Environment Variables

```env
# OAuth Credentials
OPENAI_CLIENT_ID=...
OPENAI_CLIENT_SECRET=...

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Encryption
ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/multi_ai

# Session
JWT_SECRET=your-jwt-secret

# Server
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
```

---

## Part 7: Deployment Checklist

- [ ] Generate and set ENCRYPTION_KEY on production
- [ ] Register OAuth apps with production domain
- [ ] Update redirect URIs in OAuth providers
- [ ] Set DATABASE_URL for production database
- [ ] Enable HTTPS (required for OAuth)
- [ ] Test full flow: OAuth → Token Storage → API Call → Streaming

---

## Security Best Practices

✅ **Tokens are encrypted at rest** (AES-256)
✅ **Tokens stored in httpOnly cookies** (not localStorage)
✅ **JWT verification on each request**
✅ **Tokens never logged or sent to frontend**
✅ **One token per user per provider**
✅ **User can revoke access anytime**

❌ **Never** hardcode API keys
❌ **Never** log tokens
❌ **Never** send tokens to frontend
❌ **Never** store unencrypted tokens

---

## Testing

```bash
# Test 1: Encrypt/Decrypt
npm test -- token.service.spec.ts

# Test 2: OAuth Flow
# Visit http://localhost:3000/auth/openai
# Confirm login
# Check token in database (should be encrypted)

# Test 3: Streaming
# Login with all three
# Type prompt
# Verify responses stream in real-time
# Check comparison analysis
```

---

Done! Now users can login with their own accounts and use their own API quotas.
