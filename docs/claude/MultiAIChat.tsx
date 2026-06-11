// MultiAIChat.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload } from 'lucide-react';
import axios from 'axios';

interface AIResponse {
  source: 'claude' | 'chatgpt' | 'gemini';
  model: string;
  response?: string; // Chat mode
  analysis?: string; // Commissioning mode
  tokensUsed: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const MultiAIChat = () => {
  const [mode, setMode] = useState<'chat' | 'commissioning'>('chat');
  const [prompt, setPrompt] = useState('');
  const [document, setDocument] = useState<File | null>(null);
  const [documentContent, setDocumentContent] = useState('');
  const [question, setQuestion] = useState('');
  const [responses, setResponses] = useState<AIResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [sessionId] = useState(crypto.randomUUID());

  const API_BASE = '/api/ai';

  // ============ CHAT MODE ============

  const handleChatSubmit = async () => {
    if (!prompt.trim()) return;

    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/chat`, {
        prompt,
        history: chatHistory,
        sessionId,
      });

      if (response.data.success) {
        const aiResponses = response.data.data.responses;
        setResponses(aiResponses);

        // Add to chat history
        setChatHistory([
          ...chatHistory,
          { role: 'user', content: prompt },
          // Store last assistant message (can use any AI's response or merge)
          {
            role: 'assistant',
            content: `Claude: ${aiResponses.find((r) => r.source === 'claude')?.response || ''}`,
          },
        ]);

        setPrompt('');
      }
    } catch (error) {
      console.error('Chat error:', error);
      alert('Failed to get responses from AI models');
    } finally {
      setLoading(false);
    }
  };

  // ============ COMMISSIONING MODE ============

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocument(file);

      // Read file content (assumes text/pdf/docx)
      // For production, use pdfjs or mammoth for PDF/DOCX parsing
      const reader = new FileReader();
      reader.onload = (event) => {
        setDocumentContent(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleDocumentAnalysis = async () => {
    if (!documentContent.trim() || !question.trim()) {
      alert('Please upload a document and ask a question');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/analyze-document`, {
        documentContent,
        userQuestion: question,
        fileName: document?.name,
        sessionId,
      });

      if (response.data.success) {
        const aiResponses = response.data.data.responses;
        setResponses(aiResponses);
        setQuestion('');
      }
    } catch (error) {
      console.error('Document analysis error:', error);
      alert('Failed to analyze document');
    } finally {
      setLoading(false);
    }
  };

  // ============ RENDER ============

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg">
      {/* Mode Toggle */}
      <div className="mb-8">
        <div className="flex gap-4 mb-6">
          <Button
            variant={mode === 'chat' ? 'default' : 'outline'}
            onClick={() => {
              setMode('chat');
              setResponses([]);
            }}
          >
            💬 Chat Mode
          </Button>
          <Button
            variant={mode === 'commissioning' ? 'default' : 'outline'}
            onClick={() => {
              setMode('commissioning');
              setResponses([]);
            }}
          >
            📄 Commissioning Mode
          </Button>
        </div>

        {/* CHAT MODE INPUT */}
        {mode === 'chat' && (
          <div className="space-y-4">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask anything... All three AIs will respond with their authentic personalities"
              className="h-24 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              disabled={loading}
            />
            <Button
              onClick={handleChatSubmit}
              disabled={loading || !prompt.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Waiting for all 3 AIs...
                </>
              ) : (
                'Send to All 3 AIs'
              )}
            </Button>
          </div>
        )}

        {/* COMMISSIONING MODE INPUT */}
        {mode === 'commissioning' && (
          <div className="space-y-4">
            {/* Document Upload */}
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".txt,.pdf,.docx"
                className="hidden"
                id="doc-upload"
                disabled={loading}
              />
              <label htmlFor="doc-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-6 w-6 text-slate-400" />
                  <span className="text-sm text-slate-300">
                    {document
                      ? `Uploaded: ${document.name}`
                      : 'Click to upload project document (PDF, DOCX, TXT)'}
                  </span>
                </div>
              </label>
            </div>

            {/* Question */}
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about the document... All three AIs will analyze and respond"
              className="h-24 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              disabled={loading || !documentContent}
            />

            <Button
              onClick={handleDocumentAnalysis}
              disabled={loading || !documentContent || !question.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing with all 3 AIs...
                </>
              ) : (
                'Analyze Document'
              )}
            </Button>
          </div>
        )}
      </div>

      {/* RESPONSES - Three-Column View */}
      {responses.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            {mode === 'chat' ? 'AI Responses' : 'Document Analysis'}
          </h2>

          <Tabs defaultValue="claude" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-700">
              <TabsTrigger value="claude" className="text-white">
                🔴 Claude (Anthropic)
              </TabsTrigger>
              <TabsTrigger value="chatgpt" className="text-white">
                🟢 ChatGPT (OpenAI)
              </TabsTrigger>
              <TabsTrigger value="gemini" className="text-white">
                🔵 Gemini (Google)
              </TabsTrigger>
            </TabsList>

            {/* Claude Tab */}
            <TabsContent value="claude">
              <ResponseCard
                response={responses.find((r) => r.source === 'claude')}
                mode={mode}
              />
            </TabsContent>

            {/* ChatGPT Tab */}
            <TabsContent value="chatgpt">
              <ResponseCard
                response={responses.find((r) => r.source === 'chatgpt')}
                mode={mode}
              />
            </TabsContent>

            {/* Gemini Tab */}
            <TabsContent value="gemini">
              <ResponseCard
                response={responses.find((r) => r.source === 'gemini')}
                mode={mode}
              />
            </TabsContent>
          </Tabs>

          {/* Side-by-Side View (Alternative) */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-white mb-4">
              Side-by-Side View
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['claude', 'chatgpt', 'gemini'].map((source) => {
                const response = responses.find(
                  (r) => r.source === (source as any)
                );
                return (
                  <ResponseCard
                    key={source}
                    response={response}
                    mode={mode}
                    compact
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Chat History (Chat Mode) */}
      {mode === 'chat' && chatHistory.length > 0 && (
        <div className="mt-8 border-t border-slate-700 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Conversation History
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-900 text-blue-100'
                    : 'bg-slate-700 text-slate-100'
                }`}
              >
                <strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong>{' '}
                {msg.content.substring(0, 100)}...
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============ SUB-COMPONENTS ============

interface ResponseCardProps {
  response?: AIResponse;
  mode: 'chat' | 'commissioning';
  compact?: boolean;
}

const ResponseCard = ({ response, mode, compact }: ResponseCardProps) => {
  if (!response) {
    return (
      <Card className="bg-slate-700 border-slate-600">
        <CardContent className="p-6 text-slate-400">
          No response from this AI
        </CardContent>
      </Card>
    );
  }

  const content = response.response || response.analysis || '';

  return (
    <Card
      className={`bg-slate-700 border-slate-600 ${compact ? 'h-full' : ''}`}
    >
      <CardHeader>
        <CardTitle className="text-white flex justify-between items-center">
          <span>{response.source.toUpperCase()}</span>
          <span className="text-sm text-slate-400">
            {response.model} • {response.tokensUsed} tokens
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`text-slate-100 whitespace-pre-wrap leading-relaxed ${
            compact ? 'text-sm line-clamp-[10]' : ''
          }`}
        >
          {content}
        </div>
      </CardContent>
    </Card>
  );
};
