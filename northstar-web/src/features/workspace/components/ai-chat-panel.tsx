import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Send, Bot, User, Loader2, CheckCircle2, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { aiChat } from "../api/ai.api";
import { type AiMessage } from "../api/ai.api";

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

  const addAssistantMessage = (content: string, action?: { type: string; result: string }) => {
    const msg: AiMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content,
      timestamp: new Date(),
      action,
    };
    setMessages((prev) => [...prev, msg]);
  };

  const handleCommand = (cmd: string): boolean => {
    const command = cmd.toLowerCase().trim();

    if (command === "/clear") {
      setMessages([]);
      return true;
    }

    if (command === "/help") {
      addAssistantMessage(
        "Here's what I can do:\n\n" +
        "📋 **Create tasks**\n" +
        "\"Create a task called 'Fix bug'\"\n" +
        "\"Add new task 'Update docs' in backlog\"\n\n" +
        "🔄 **Move tasks**\n" +
        "\"Move 'Fix bug' to in_progress\"\n" +
        "\"Set task 'Update docs' to done\"\n\n" +
        "👤 **Assign tasks**\n" +
        "\"Assign 'Fix bug' to John\"\n\n" +
        "⌨️ **Commands**\n" +
        "/clear - Clear chat history\n" +
        "/help - Show this help message"
      );
      return true;
    }

    return false;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    setInput("");

    const userMessage: AiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: userInput,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    if (userInput.startsWith("/")) {
      if (handleCommand(userInput)) return;
    }

    setIsLoading(true);
    try {
      const res = await aiChat(id, userInput);

      addAssistantMessage(
        res.content || res.message,
        { type: res.intent, result: res.executed ? "success" : "error" }
      );

      if (res.executed) {
        onTasksChanged();
      }
    } catch (err: any) {
      addAssistantMessage(
        err.message ?? "Something went wrong. Please try again.",
        { type: "error", result: "error" }
      );
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col p-0 sm:w-[480px]">
        <SheetHeader className="px-4 pb-3 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <SheetTitle>AI Assistant</SheetTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => setMessages([])} title="Clear">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)} title="Close">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Bot className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                Ask me to create, move, or assign tasks
              </p>
              <div className="mt-4 space-y-2 text-xs text-muted-foreground/70">
                <p>"Create a task called 'Fix bug'"</p>
                <p>"Move 'Fix bug' to in_progress"</p>
                <p>"Assign 'Fix bug' to John"</p>
                <p className="mt-3 font-medium text-muted-foreground">Type /help for all commands</p>
              </div>
            </div>
          )}

          <div className="space-y-3 py-4">
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
                  {msg.role === "assistant" ? (
                    <MarkdownText content={msg.content} />
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                  {msg.action && (
                    <div className="mt-1.5 flex items-center gap-1 text-xs opacity-70">
                      {msg.action.result === "success" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-4" />
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
          </div>
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t p-3">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI... (/help for commands)"
              disabled={isLoading}
            />
            <Button onClick={handleSend} disabled={!input.trim() || isLoading} size="icon">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

function MarkdownText({ content }: { content: string }) {
  const renderLine = (line: string): React.ReactNode => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      return <span key={j}>{part}</span>;
    });
  };

  const lines = content.split("\n");

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.trim() === "") return <br key={i} />;
        if (line.match(/^[📋🔄👤⌨️]/)) {
          return <p key={i} className="font-semibold mt-2 first:mt-0">{renderLine(line)}</p>;
        }
        if (line.startsWith('"') || line.startsWith("-")) {
          return <p key={i} className="text-muted-foreground pl-2">{renderLine(line)}</p>;
        }
        return <p key={i}>{renderLine(line)}</p>;
      })}
    </div>
  );
}
