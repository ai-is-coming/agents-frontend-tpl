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
import { CheckIcon, GlobeIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { getToken } from "@/lib/api-client";
import { chatStream } from "@/lib/api";

export type MessageType = { key: string; from: "user" | "assistant"; sources?: { href: string; title: string }[]; versions: { id: string; content?: string; contentPre?: string; contentPost?: string }[]; reasoning?: { content: string; duration: number }; tools?: { toolCallId: string; name: string; description?: string; status: ToolUIPart["state"]; parameters?: Record<string, unknown> | string; result?: unknown; error?: string; }[]; };

const initialMessages: MessageType[] = [];

const models = [
  { id: "deepseek/deepseek-chat", name: "deepseek-chat", chef: "deepseek", chefSlug: "deepseek", providers: ["deepseek"] },
];

const suggestions = ["What's the weather like in Beijing today?", "What's the weather like in ChongQing today?"];


export default function ClientChat() {
  const [model, setModel] = useState<string>(models[0].id);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [text, setText] = useState<string>("");
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
  const [status, setStatus] = useState<"submitted" | "streaming" | "ready" | "error">("ready");
  const [messages, setMessages] = useState<MessageType[]>(initialMessages);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const selectedModelData = models.find((m) => m.id === model);



  const addUserMessage = useCallback((content: string) => {
    const userMessage: MessageType = { key: `user-${Date.now()}`, from: "user", versions: [{ id: `user-${Date.now()}`, content }] };
    setMessages((prev) => [...prev, userMessage]);
    (async () => {
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: MessageType = { key: `assistant-${Date.now()}`, from: "assistant", versions: [{ id: assistantMessageId, contentPre: "", contentPost: "" }], tools: [] };
      setMessages((prev) => [...prev, assistantMessage]);
      try {
        const [prov, mdl] = (model && model.includes('/')) ? model.split('/') : [undefined, model];
        setStatus('streaming');
        setStreamingMessageId(assistantMessageId);

        const token = getToken();
        if (!token) {
          throw new Error('Not authenticated');
        }

        const res = await chatStream({
          prompt: content,
          stream: true,
          webSearch: Boolean(useWebSearch),
          provider: prov,
          model: mdl,
        }, token);

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
        setStatus('error');
        const errMsg = err?.message || 'Request failed';
        setMessages((prev) => prev.map((msg) =>
          msg.versions.some((v) => v.id === assistantMessageId)
            ? ({ ...msg, versions: msg.versions.map((v) => v.id === assistantMessageId ? { ...(v as any), contentPost: `Error: ${errMsg}` } : v) })
            : msg
        ));
      } finally {
        setStatus('ready');
        setStreamingMessageId(null);
      }
    })();
  }, [model, useWebSearch]);

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text && message.text.trim());
    const hasAttachments = Boolean(message.files?.length);
    if (!(hasText || hasAttachments)) return;
    setStatus("submitted"); addUserMessage(message.text || "Sent with attachments"); setText("");
  };

  const handleSuggestionClick = (suggestion: string) => { setStatus("submitted"); addUserMessage(suggestion); };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] w-full flex-col divide-y overflow-hidden rounded-lg border">
      <Conversation>
        <ConversationContent>
          {messages.map(({ versions, ...message }) => (
            <MessageBranch defaultBranch={0} key={message.key}>
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
                        <MessageResponse>
                          {streamingMessageId && versions.some((v) => v.id === streamingMessageId)
                            ? (versions.find((v) => v.id === streamingMessageId)?.contentPre ?? "")
                            : (version.contentPre ?? version.content ?? "")}
                        </MessageResponse>
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
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="grid shrink-0 gap-4 pt-4">
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
  );
}

