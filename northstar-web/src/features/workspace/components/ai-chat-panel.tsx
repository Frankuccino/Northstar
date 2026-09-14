import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Send, Bot, User, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { executeAiIntent, type AiMessage } from "../api/ai.api";

interface AiChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTasksChanged: () => void;
}

export const AiChatPanel = ({ open, onOpenChange, onTasksChanged }: AiChatPanelProps) => {
  const { projectId } = useParams();
  const id = Number(projectId);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const parseIntent = (text: string): { intent: string; payload: Record<string, unknown> } | null => {
    const lower = text.toLowerCase().trim();

    // Create task
    if (lower.includes("create") || lower.includes("add") || lower.includes("new")) {
      const titleMatch = text.match(/(?:called|named|titled|task)\s+["']?([^"']+?)["']?(?:\s+(?:in|to)|$)/i) ||
                         text.match(/(?:create|add|new)\s+(?:a\s+)?(?:task\s+)?["']?([^"']+?)["']?(?:\s+(?:in|to)|$)/i);
      const statusMatch = text.match(/\b(backlog|ai_drafting|ready|in_progress|needs_revision|validated|done)\b/i);

      if (titleMatch) {
        return {
          intent: "create_task",
          payload: {
            title: titleMatch[1].trim(),
            status: statusMatch ? statusMatch[1] : undefined,
          },
        };
      }
    }

    // Move task
    if (lower.includes("move") || lower.includes("set") || lower.includes("change")) {
      const taskMatch = text.match(/(?:task|card)\s+["']?([^"']+?)["']?\s+(?:to|into|in)\s+(\w+)/i) ||
                        text.match(/move\s+["']?([^"']+?)["']?\s+to\s+(\w+)/i);
      const statusMatch = text.match(/\b(backlog|ai_drafting|ready|in_progress|needs_revision|validated|done)\b/i);

      if (taskMatch || statusMatch) {
        return {
          intent: "move_task",
          payload: {
            taskId: taskMatch ? taskMatch[1] : undefined,
            status: statusMatch ? statusMatch[1] : undefined,
          },
        };
      }
    }

    // Assign task
    if (lower.includes("assign")) {
      const assignMatch = text.match(/assign\s+["']?([^"']+?)["']?\s+to\s+(\w+)/i);
      if (assignMatch) {
        return {
          intent: "assign_task",
          payload: {
            taskId: assignMatch[1],
            assigneeId: assignMatch[2],
          },
        };
      }
    }

    return null;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: AiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const parsed = parseIntent(input);

    if (!parsed) {
      const errorMessage: AiMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I can help you create, move, and assign tasks. Try saying:\n- \"Create a task called 'Fix bug' in backlog\"\n- \"Move task 'Fix bug' to in_progress\"\n- \"Assign task 'Fix bug' to John\"",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
      return;
    }

    try {
      const result = await executeAiIntent(id, parsed);

      const assistantMessage: AiMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Done! ${parsed.intent.replace("_", " ")} completed successfully.`,
        timestamp: new Date(),
        action: {
          type: parsed.intent,
          result: result.ok ? "success" : "failed",
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);
      onTasksChanged();
    } catch (err: any) {
      const errorMessage: AiMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: err?.response?.data?.error ?? "Something went wrong. Please try again.",
        timestamp: new Date(),
        action: {
          type: parsed.intent,
          result: "error",
        },
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l bg-background shadow-xl sm:w-96">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">AI Assistant</h2>
            <p className="text-xs text-muted-foreground">Manage tasks with natural language</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
          <XCircle className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Bot className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Ask me to create, move, or assign tasks.</p>
            <div className="mt-4 space-y-2 text-xs text-muted-foreground/70">
              <p>"Create a task called 'Fix bug'"</p>
              <p>"Move 'Fix bug' to in_progress"</p>
              <p>"Assign 'Fix bug' to John"</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-3 w-3 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.action && (
                <div className="mt-1 flex items-center gap-1 text-xs opacity-70">
                  {msg.action.result === "success" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  <span>{msg.action.type}</span>
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary">
                <User className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-3 w-3 text-primary" />
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI to manage tasks..."
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={!input.trim() || isLoading} size="icon">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
