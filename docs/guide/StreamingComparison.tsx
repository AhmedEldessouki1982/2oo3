// StreamingComparison.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Lightbulb, Loader2, Send } from 'lucide-react';

interface StreamingChunk {
  source: 'claude' | 'chatgpt' | 'gemini' | 'comparison';
  token: string;
  isComplete?: boolean;
}

interface ComparisonResult {
  conflictingViews: string[];
  consensusPoints: string[];
  claudeUnique: string[];
  chatgptUnique: string[];
  geminiUnique: string[];
  summary: string;
}

interface StreamingState {
  claude: string;
  chatgpt: string;
  gemini: string;
}

export const StreamingComparison = () => {
  const [prompt, setPrompt] = useState('');
  const [responses, setResponses] = useState<StreamingState>({
    claude: '',
    chatgpt: '',
    gemini: '',
  });
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [completedAIs, setCompletedAIs] = useState<
    Set<'claude' | 'chatgpt' | 'gemini'>
  >(new Set());

  const eventSourceRef = useRef<EventSource | null>(null);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setResponses({ claude: '', chatgpt: '', gemini: '' });
    setCompletedAIs(new Set());
    setComparison(null);

    try {
      // Open Server-Sent Events connection
      const encodedPrompt = encodeURIComponent(prompt);
      const eventSource = new EventSource(`/api/compare/stream?prompt=${encodedPrompt}`);

      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const chunk: StreamingChunk = JSON.parse(event.data);

          if (chunk.source === 'comparison') {
            // Received comparison analysis
            const comparisonData = JSON.parse(chunk.token);
            setComparison(comparisonData);
            setLoading(false);
          } else if (chunk.source === 'claude' || chunk.source === 'chatgpt' || chunk.source === 'gemini') {
            // Accumulate tokens from each AI
            setResponses((prev) => ({
              ...prev,
              [chunk.source]: prev[chunk.source] + chunk.token,
            }));

            // Mark as complete when all tokens received
            if (chunk.isComplete) {
              setCompletedAIs((prev) => new Set(prev).add(chunk.source));
            }
          }
        } catch (error) {
          console.error('Error parsing SSE chunk:', error);
        }
      };

      eventSource.onerror = () => {
        console.error('EventSource error');
        setLoading(false);
        eventSource.close();
      };

      // Cleanup on unmount
      return () => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
      };
    } catch (error) {
      console.error('Stream error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg space-y-6">
      {/* Input Section */}
      <div className="space-y-4">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask your question here... All three AIs will respond and be compared."
          className="h-24 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
          disabled={loading}
        />
        <Button
          onClick={handleSubmit}
          disabled={loading || !prompt.trim()}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Streaming from all 3 AIs...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Compare All 3 AIs
            </>
          )}
        </Button>
      </div>

      {/* Streaming Responses */}
      {(responses.claude || responses.chatgpt || responses.gemini || loading) && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Live Responses</h2>

          <Tabs defaultValue="claude" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-700">
              <TabsTrigger value="claude" className="text-white relative">
                Claude
                {completedAIs.has('claude') && (
                  <CheckCircle className="ml-2 h-4 w-4 text-green-400" />
                )}
              </TabsTrigger>
              <TabsTrigger value="chatgpt" className="text-white relative">
                ChatGPT
                {completedAIs.has('chatgpt') && (
                  <CheckCircle className="ml-2 h-4 w-4 text-green-400" />
                )}
              </TabsTrigger>
              <TabsTrigger value="gemini" className="text-white relative">
                Gemini
                {completedAIs.has('gemini') && (
                  <CheckCircle className="ml-2 h-4 w-4 text-green-400" />
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="claude">
              <ResponsePanel
                response={responses.claude}
                isComplete={completedAIs.has('claude')}
                aiName="Claude"
              />
            </TabsContent>

            <TabsContent value="chatgpt">
              <ResponsePanel
                response={responses.chatgpt}
                isComplete={completedAIs.has('chatgpt')}
                aiName="ChatGPT"
              />
            </TabsContent>

            <TabsContent value="gemini">
              <ResponsePanel
                response={responses.gemini}
                isComplete={completedAIs.has('gemini')}
                aiName="Gemini"
              />
            </TabsContent>
          </Tabs>

          {/* Side-by-Side Grid View */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ResponsePanel
              response={responses.claude}
              isComplete={completedAIs.has('claude')}
              aiName="Claude"
              compact
            />
            <ResponsePanel
              response={responses.chatgpt}
              isComplete={completedAIs.has('chatgpt')}
              aiName="ChatGPT"
              compact
            />
            <ResponsePanel
              response={responses.gemini}
              isComplete={completedAIs.has('gemini')}
              aiName="Gemini"
              compact
            />
          </div>
        </div>
      )}

      {/* Comparison Analysis */}
      {comparison && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Comparison Analysis</h2>

          {/* Summary */}
          {comparison.summary && (
            <Card className="bg-slate-700 border-slate-600">
              <CardContent className="pt-6">
                <p className="text-slate-100 italic">{comparison.summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Conflicting Views */}
          {comparison.conflictingViews.length > 0 && (
            <CollapsibleSection
              title="⚠️  Conflicting Views"
              items={comparison.conflictingViews}
              color="amber"
            />
          )}

          {/* Consensus Points */}
          {comparison.consensusPoints.length > 0 && (
            <CollapsibleSection
              title="✅ Consensus Points"
              items={comparison.consensusPoints}
              color="green"
            />
          )}

          {/* Unique Findings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comparison.claudeUnique.length > 0 && (
              <CollapsibleSection
                title="🟣 Claude Unique"
                items={comparison.claudeUnique}
                color="purple"
                compact
              />
            )}
            {comparison.chatgptUnique.length > 0 && (
              <CollapsibleSection
                title="🟢 ChatGPT Unique"
                items={comparison.chatgptUnique}
                color="green"
                compact
              />
            )}
            {comparison.geminiUnique.length > 0 && (
              <CollapsibleSection
                title="🔵 Gemini Unique"
                items={comparison.geminiUnique}
                color="blue"
                compact
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component: Response Panel
interface ResponsePanelProps {
  response: string;
  isComplete: boolean;
  aiName: string;
  compact?: boolean;
}

const ResponsePanel = ({
  response,
  isComplete,
  aiName,
  compact,
}: ResponsePanelProps) => {
  return (
    <Card
      className={`bg-slate-700 border-slate-600 ${compact ? 'h-full' : ''}`}
    >
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>{aiName}</span>
          {isComplete ? (
            <CheckCircle className="h-4 w-4 text-green-400" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`text-slate-100 whitespace-pre-wrap leading-relaxed ${
            compact ? 'text-sm line-clamp-[10]' : ''
          }`}
        >
          {response || (
            <span className="text-slate-400 italic">Waiting for response...</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Sub-component: Collapsible Comparison Section
interface CollapsibleSectionProps {
  title: string;
  items: string[];
  color: 'amber' | 'green' | 'blue' | 'purple';
  compact?: boolean;
}

const CollapsibleSection = ({
  title,
  items,
  color,
  compact,
}: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(!compact);

  const colorClasses = {
    amber: 'border-l-amber-500 bg-amber-950 text-amber-100',
    green: 'border-l-green-500 bg-green-950 text-green-100',
    blue: 'border-l-blue-500 bg-blue-950 text-blue-100',
    purple: 'border-l-purple-500 bg-purple-950 text-purple-100',
  };

  return (
    <Card className={`border-l-4 ${colorClasses[color]}`}>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{title}</span>
          <span className="text-sm">{isOpen ? '▼' : '▶'}</span>
        </CardTitle>
      </CardHeader>

      {isOpen && (
        <CardContent>
          <ul className="space-y-2">
            {items.map((item, idx) => (
              <li key={idx} className="flex gap-2 text-sm">
                <span className="text-lg">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
};
