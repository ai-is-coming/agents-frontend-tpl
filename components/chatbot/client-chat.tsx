"use client";

import { MessageBranch, MessageBranchContent, MessageBranchNext, MessageBranchPage, MessageBranchPrevious, MessageBranchSelector, Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { PromptInput, PromptInputBody, PromptInputButton, PromptInputFooter, type PromptInputMessage, PromptInputSubmit, PromptInputTextarea, PromptInputTools } from "@/components/ai-elements/prompt-input";
import { ModelSelector, ModelSelectorContent, ModelSelectorEmpty, ModelSelectorGroup, ModelSelectorInput, ModelSelectorItem, ModelSelectorList, ModelSelectorLogo, ModelSelectorLogoGroup, ModelSelectorName, ModelSelectorTrigger } from "@/components/ai-elements/model-selector";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ai-elements/sources";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import type { ToolUIPart } from "ai";
import { CheckIcon, GlobeIcon, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getToken } from "@/lib/api-client";
import { chatStream } from "@/lib/api/agent";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TypingIndicator } from "@/components/ui/typing-indicator";
import { createSession, listSessions, listMessages, type SessionItem, type MessageItem as ApiMessage } from "@/lib/api/session";

export type MessageType = { key: string; from: "user" | "assistant"; sources?: { href: string; title: string }[]; versions: { id: string; content?: string; contentPre?: string; contentPost?: string }[]; reasoning?: { content: string; duration: number }; tools?: { toolCallId: string; name: string; description?: string; status: ToolUIPart["state"]; parameters?: Record<string, unknown> | string; result?: unknown; error?: string; }[]; };

const initialMessages: MessageType[] = [];

const models = [
  { id: "deepseek/deepseek-chat", name: "deepseek-chat", chef: "deepseek", chefSlug: "deepseek", providers: ["deepseek"] },
];

const suggestions = ["What's the weather like in Beijing today?", "What's the weather like in ChongQing today?"];

interface ClientChatProps {
  initialSessionId: number | null;
}

export default function ClientChat({ initialSessionId }: ClientChatProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [model, setModel] = useState<string>(models[0].id);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [text, setText] = useState<string>("");
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
  const [status, setStatus] = useState<"submitted" | "streaming" | "ready" | "error">("ready");
  const [sessionId, setSessionId] = useState<number | null>(initialSessionId);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(false);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const currentAbortRef = useRef<AbortController | null>(null)
  const [sessionQuery, setSessionQuery] = useState<string>("")
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(true);


  // Map API messages to UI messages
  const mapApiMessagesToUi = (items: ApiMessage[]): MessageType[] => {
    return items.map((m) => {
      // Tool message: render as a dedicated assistant message containing a Tool block
      if (m.role === 'tool' || (m.content && typeof m.content === 'object' && m.content.type === 'tool')) {
        const c = (m.content || {}) as any
        return {
          key: `m-${m.id}`,
          from: 'assistant',
          versions: [{ id: `v-${m.id}`, content: '' }],
          tools: [{
            toolCallId: String(c.toolCallId || m.id),
            name: c.name || '',
            status: (c.status || 'input-streaming') as any,
            parameters: typeof c.input !== 'undefined' ? c.input : undefined,
            result: c.output,
            error: c.errorText,
          }],
        }
      }

      // Text message
      const text = typeof m.content === 'string' ? m.content : (m.content?.text ?? JSON.stringify(m.content))
      const from = m.role === 'user' ? 'user' : 'assistant'
      return { key: `m-${m.id}`, from, versions: [{ id: `v-${m.id}`, content: text }] }
    })
  }

  const loadMessagesForSession = useCallback(async (sid: number) => {
    setLoadingMessages(true)
    // Clear messages first to avoid showing old messages
    setMessages([])
    try {
      const res = await listMessages(sid, { limit: 200 })
      setMessages(mapApiMessagesToUi(res.messages))
    } catch (e) {
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  const refreshSessions = useCallback(async () => {
    setLoadingSessions(true)
    try {
      const res = await listSessions({ limit: 50 })
      setSessions(res.sessions)
      return res.sessions
    } finally {
      setLoadingSessions(false)
    }
  }, [])

  const ensureSessionId = useCallback(async (title?: string): Promise<number> => {
    if (sessionId && sessionId > 0) return sessionId
    const created = await createSession(title)
    setSessionId(created.sessionId)
    // Don't update URL immediately - let the caller decide when to update
    // This prevents component unmounting during streaming
    void refreshSessions()
    return created.sessionId
  }, [sessionId, refreshSessions])

  const handleNewChat = useCallback(async () => {
    setSessionId(null)
    setMessages([])
    // Navigate to home page for new chat with a query parameter
    router.push('/?new=true')
    await refreshSessions()
  }, [refreshSessions, router])

  const handleSelectSession = useCallback(async (sid: number) => {
    // Update URL to /c/{sessionId}
    // The URL change will trigger a re-render with new initialSessionId
    // which will load the messages in useEffect
    router.push(`/c/${sid}`)
  }, [router])

  // Initialize: load sessions and messages
  useEffect(() => {
    (async () => {
      const list = await refreshSessions()

      // Check if this is a "new chat" request
      const isNewChat = searchParams?.get('new') === 'true'

      // If initialSessionId is provided and valid, load that session
      if (initialSessionId !== null && initialSessionId > 0) {
        setSessionId(initialSessionId)
        await loadMessagesForSession(initialSessionId)
      } else if (initialSessionId === null && !isNewChat) {
        // If no initialSessionId (home page) and not in new chat mode, pick the latest session and redirect
        const sid = list?.[0]?.id
        if (sid) {
          setSessionId(sid)
          // Update URL to reflect the selected session
          router.push(`/c/${sid}`)
          await loadMessagesForSession(sid)
        }
      }
    })()
  }, [initialSessionId, searchParams, refreshSessions, loadMessagesForSession, router])

  const [messages, setMessages] = useState<MessageType[]>(initialMessages);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const selectedModelData = models.find((m) => m.id === model);

  const formatAgo = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };



  const addUserMessage = useCallback((content: string) => {
    const userMessage: MessageType = { key: `user-${Date.now()}`, from: "user", versions: [{ id: `user-${Date.now()}`, content }] };
    setMessages((prev) => [...prev, userMessage]);
    (async () => {
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: MessageType = { key: `assistant-${Date.now()}`, from: "assistant", versions: [{ id: assistantMessageId, contentPre: "", contentPost: "" }], tools: [] };
      setMessages((prev) => [...prev, assistantMessage]);
      let sid: number | null = null;

      let localAc: AbortController | null = null;

      try {
        const [prov, mdl] = (model && model.includes('/')) ? model.split('/') : [undefined, model];
        setStatus('streaming');
        setStreamingMessageId(assistantMessageId);

        const token = getToken();
        if (!token) {
          throw new Error('Not authenticated');
        }

        const trimmed = (content || '').trim();
        const title = trimmed ? trimmed.slice(0, 50) : undefined;
        sid = await ensureSessionId(title);
        // Cancel any in-flight stream before starting a new one
        if (currentAbortRef.current) { try { currentAbortRef.current.abort() } catch {} }
        localAc = new AbortController();
        currentAbortRef.current = localAc;
        const res = await chatStream({
          sessionId: sid,
          prompt: content,
          stream: true,
          webSearch: Boolean(useWebSearch),
          provider: prov,
          model: mdl,
        }, token, { signal: localAc.signal });

        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        const contentType = res.headers.get('content-type') || '';
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let shouldBreak = false;
        let toolStarted = false;

        const appendText = (delta: string) => {
          if (!delta) return;
          setMessages((prev) => prev.map((msg) => {
            if (!msg.versions.some((v) => v.id === assistantMessageId)) return msg;
            return {
              ...msg,
              versions: msg.versions.map((v) => {
                if (v.id !== assistantMessageId) return v as any;
                const pre = (v as any).contentPre || '';
                const post = (v as any).contentPost || '';
                return toolStarted
                  ? { ...(v as any), contentPost: post + delta }
                  : { ...(v as any), contentPre: pre + delta };
              })
            };
          }));
        };
        const upsertTool = (update: { toolCallId: string; name?: string; status?: ToolUIPart["state"]; parameters?: Record<string, unknown> | string; result?: unknown; error?: string; }) => {
          setMessages((prev) => prev.map((msg) => {
            if (!msg.versions.some((v) => v.id === assistantMessageId)) return msg;
            const tools = msg.tools ? [...msg.tools] : [];
            const idx = tools.findIndex((t) => t.toolCallId === update.toolCallId);
            if (idx === -1) {
              tools.push({ toolCallId: update.toolCallId, name: update.name || "", status: update.status || "input-streaming", parameters: update.parameters, result: update.result, error: update.error });
            } else {
              tools[idx] = { ...tools[idx], ...update } as any;
            }
            return { ...msg, tools };
          }));
        };

        while (!shouldBreak) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });

          if (contentType.includes('text/event-stream')) {
            buffer += chunk;
            let idx;
            while ((idx = buffer.indexOf('\n\n')) !== -1) {
              const frame = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 2);
              const lines = frame.split('\n');
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data:')) {
                  const data = trimmed.slice(5).trimStart();
                  if (data === '[DONE]') { shouldBreak = true; break; }
                  let piece = data;
                  try {
                    const obj = JSON.parse(data);
                    if (obj && typeof obj === 'object' && obj.type) {
                      switch (obj.type) {
                        case 'text-delta':
                          appendText(obj.delta || '');
                          break;
                        case 'tool-input-start':
                          upsertTool({ toolCallId: obj.toolCallId, name: obj.toolName, status: 'input-streaming' });
                          break;
                        case 'tool-input-delta':
                          // optional: accumulate streaming input text
                          upsertTool({ toolCallId: obj.toolCallId, parameters: (typeof obj.inputTextDelta === 'string' ? (obj.inputTextDelta) : '') });
                          break;
                        case 'tool-input-available':
                          upsertTool({ toolCallId: obj.toolCallId, name: obj.toolName, status: 'input-available', parameters: obj.input });
                          break;
                        case 'tool-input-error':
                          upsertTool({ toolCallId: obj.toolCallId, name: obj.toolName, status: 'output-error', parameters: obj.input, error: obj.errorText });
                          break;
                        case 'tool-output-available':
                          toolStarted = true;
                          upsertTool({ toolCallId: obj.toolCallId, status: 'output-available', result: obj.output });
                          break;
                        case 'tool-output-error':
                          upsertTool({ toolCallId: obj.toolCallId, status: 'output-error', error: obj.errorText });
                          break;
                        case 'finish':
                          shouldBreak = true;
                          break;
                        default:
                          // ignore other event types (reasoning, sources, etc.) for now
                          break;
                      }
                      piece = '';
                    } else {
                      if (typeof obj === 'string') piece = obj;
                      else if (obj?.text) piece = obj.text;
                      else if (obj?.delta) piece = obj.delta;
                      else if (obj?.choices?.[0]?.delta?.content) piece = obj.choices[0].delta.content;
                    }
                  } catch {}
                  if (piece) appendText(piece);
                }
              }
              if (shouldBreak) break;
            }
          } else {
            appendText(chunk);
          }
        }
      } catch (err: any) {
        // Swallow aborts as normal control flow
        if (err?.name === 'AbortError' || /aborted/i.test(String(err?.message || ''))) {
          // no-op
        } else {
          setStatus('error');
          const errMsg = err?.message || 'Request failed';
          setMessages((prev) => prev.map((msg) =>
            msg.versions.some((v) => v.id === assistantMessageId)
              ? ({ ...msg, versions: msg.versions.map((v) => v.id === assistantMessageId ? { ...(v as any), contentPost: `Error: ${errMsg}` } : v) })
              : msg
          ));
        }
      } finally {
        setStatus('ready');
        setStreamingMessageId(null);
        // Clear abort ref if it's still ours
        if (currentAbortRef.current === localAc) currentAbortRef.current = null;

        void refreshSessions();

        // Update URL after streaming completes (if we created a new session)
        // Only push if the current path is different from the target path
        // This prevents unnecessary component remounting and message reloading
        if (sid && pathname !== `/c/${sid}`) {
          router.push(`/c/${sid}`);
        }
      }
    })();
  }, [model, useWebSearch, ensureSessionId, router]);

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text && message.text.trim());
    const hasAttachments = Boolean(message.files?.length);
    if (!(hasText || hasAttachments)) return;
    setStatus("submitted"); addUserMessage(message.text || "Sent with attachments"); setText("");
  };

  const handleSuggestionClick = (suggestion: string) => { setStatus("submitted"); addUserMessage(suggestion); };

  return (
    <div className="relative flex h-[calc(100vh-4rem)] w-full overflow-hidden rounded-lg border bg-white">
      {sidebarVisible && (
        <aside className="w-[280px] shrink-0 border-r bg-white flex min-h-0 flex-col overflow-hidden">
          <div className="p-3 flex items-center justify-between">
            <span className="text-sm font-medium">History</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => setSidebarVisible(false)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="px-3 pb-2">
            <Input placeholder="Search..." value={sessionQuery} onChange={(e) => setSessionQuery(e.target.value)} />
          </div>
          <ScrollArea className="flex-1 min-h-0 overflow-hidden">
            <div className="px-3 py-1 space-y-1">
              {sessions
                .filter((s) => !sessionQuery || (s.title || `Chat ${s.id}`).toLowerCase().includes(sessionQuery.toLowerCase()))
                .map((s) => {
                  const active = s.id === sessionId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSession(s.id)}
                      className={`rounded-md px-2 py-2 text-left hover:bg-accent flex flex-col min-w-0 overflow-hidden ${active ? 'bg-accent' : ''}`}
                      style={{ width: '100%', maxWidth: '254px' }}
                      title={s.title || `Chat ${s.id}`}
                    >
                      <div className="truncate text-sm font-medium">{s.title || `Chat ${s.id}`}</div>
                      <div className="truncate text-xs text-muted-foreground">{formatAgo(s.updated_at)}</div>
                    </button>
                  );
                })}
            </div>
          </ScrollArea>
        </aside>
      )}

      {!sidebarVisible && (
        <div className="shrink-0 border-r bg-white flex flex-col p-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => setSidebarVisible(true)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex-1 flex min-h-0 flex-col">

      <Conversation>
        <ConversationContent>
          <AnimatePresence mode="popLayout" initial={false}>
            {messages.map(({ versions, ...message }, index) => (
              <motion.div
                key={message.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.05,
                  ease: [0.4, 0, 0.2, 1]
                }}
              >
                <MessageBranch defaultBranch={0}>
                  <MessageBranchContent>
                    {versions.map((version) => (
                      <Message from={message.from} key={`${message.key}-${version.id}`}>
                        <div>
                          {message.sources?.length ? (
                            <Sources>
                              <SourcesTrigger count={message.sources.length} />
                              <SourcesContent>
                                {message.sources.map((source) => (
                                  <Source href={source.href} key={source.href} title={source.title} />
                                ))}
                              </SourcesContent>
                            </Sources>
                          ) : null}

                          {message.reasoning ? (
                            <Reasoning duration={message.reasoning.duration}>
                              <ReasoningTrigger />
                              <ReasoningContent>{message.reasoning.content}</ReasoningContent>
                            </Reasoning>
                          ) : null}

                          <MessageContent>
                            {/* Show typing indicator if this is the streaming message and no content yet */}
                            {streamingMessageId && versions.some((v) => v.id === streamingMessageId) &&
                             !(versions.find((v) => v.id === streamingMessageId)?.contentPre) ? (
                              <TypingIndicator className="my-2" />
                            ) : (
                              <MessageResponse>
                                {streamingMessageId && versions.some((v) => v.id === streamingMessageId)
                                  ? (versions.find((v) => v.id === streamingMessageId)?.contentPre ?? "")
                                  : (version.contentPre ?? version.content ?? "")}
                              </MessageResponse>
                            )}
                            {message.from === 'assistant' && message.tools?.length ? (
                              <div className="my-2 space-y-2">
                                {message.tools.map((tool) => (
                                  <Tool key={tool.toolCallId} defaultOpen={false}>
                                    <ToolHeader type={`tool-${tool.name}` as any} state={tool.status} title={`Tool: ${tool.name}`} />
                                    <ToolContent>
                                      {tool.parameters ? <ToolInput input={tool.parameters as any} /> : null}
                                      <ToolOutput output={tool.result as any} errorText={tool.error} />
                                    </ToolContent>
                                  </Tool>
                                ))}
                              </div>
                            ) : null}
                            {(
                              (streamingMessageId && versions.some((v) => v.id === streamingMessageId)
                                ? (versions.find((v) => v.id === streamingMessageId)?.contentPost ?? "")
                                : (version.contentPost ?? "")
                              )
                            ) ? (
                              <MessageResponse>
                                {streamingMessageId && versions.some((v) => v.id === streamingMessageId)
                                  ? (versions.find((v) => v.id === streamingMessageId)?.contentPost ?? "")
                                  : (version.contentPost ?? "")}
                              </MessageResponse>
                            ) : null}
                          </MessageContent>
                        </div>
                      </Message>
                    ))}
                  </MessageBranchContent>
                  {versions.length > 1 ? (
                    <MessageBranchSelector from={message.from}>
                      <MessageBranchPrevious />
                      <MessageBranchPage />
                      <MessageBranchNext />
                    </MessageBranchSelector>
                  ) : null}
                </MessageBranch>
              </motion.div>
            ))}
          </AnimatePresence>
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="grid shrink-0 gap-4 pt-4">
        <div className="px-4 flex justify-center">
          <Button
            size="sm"
            variant="default"
            className="h-8 w-8 p-0 rounded-full bg-black hover:bg-gray-800 text-white"
            onClick={handleNewChat}
            disabled={status === 'streaming'}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <Suggestions className="px-4">
          {suggestions.map((suggestion) => (
            <Suggestion key={suggestion} onClick={() => handleSuggestionClick(suggestion)} suggestion={suggestion} />
          ))}
        </Suggestions>

        <div className="w-full px-4 pb-4">
          <PromptInput maxFiles={0} onSubmit={handleSubmit}>
            <PromptInputBody>
              <PromptInputTextarea value={text} onChange={(e) => setText(e.target.value)} />
            </PromptInputBody>

            <PromptInputFooter>
              <PromptInputTools>

                <PromptInputButton variant={useWebSearch ? "default" : "ghost"} onClick={() => setUseWebSearch(!useWebSearch)}>
                  <GlobeIcon size={16} />
                  <span>Search</span>
                </PromptInputButton>

                <ModelSelector open={modelSelectorOpen} onOpenChange={setModelSelectorOpen}>
                  <ModelSelectorTrigger asChild>
                    <PromptInputButton>
                      {selectedModelData?.chefSlug ? <ModelSelectorLogo provider={selectedModelData.chefSlug} /> : null}
                      {selectedModelData?.name ? <ModelSelectorName>{selectedModelData.name}</ModelSelectorName> : null}
                    </PromptInputButton>
                  </ModelSelectorTrigger>
                  <ModelSelectorContent>
                    <ModelSelectorInput placeholder="Search models..." />
                    <ModelSelectorList>
                      <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                      {Array.from(new Set(models.map((m) => m.chef))).map((chef) => (
                        <ModelSelectorGroup key={chef} heading={chef}>
                          {models.filter((m) => m.chef === chef).map((m) => (
                            <ModelSelectorItem key={m.id} value={m.id} onSelect={() => { setModel(m.id); setModelSelectorOpen(false); }}>
                              <ModelSelectorLogo provider={m.chefSlug} />
                              <ModelSelectorName>{m.name}</ModelSelectorName>
                              <ModelSelectorLogoGroup>
                                {m.providers.map((provider) => (
                                  <ModelSelectorLogo key={provider} provider={provider} />
                                ))}
                              </ModelSelectorLogoGroup>
                              {model === m.id ? <CheckIcon className="ml-auto size-4" /> : <div className="ml-auto size-4" />}
                            </ModelSelectorItem>
                          ))}
                        </ModelSelectorGroup>
                      ))}
                    </ModelSelectorList>
                  </ModelSelectorContent>
                </ModelSelector>
              </PromptInputTools>

              <PromptInputSubmit status={status} disabled={text.trim().length === 0 || status === "streaming"} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
    </div>

  );
}

