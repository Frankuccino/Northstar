import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Send, Bot, User, Loader2, CheckCircle2, XCircle, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { executeAiIntent, type AiMessage } from "../api/ai.api";

interface Position {
  x: number;
  y: number;
}

type DockPosition = "right" | "left" | "bottom" | "top" | "floating";

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
  const [dockPosition, setDockPosition] = useState<DockPosition>("right");
  const [floatingPos, setFloatingPos] = useState<Position>({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef<Position>({ x: 0, y: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Drag handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (dockPosition !== "floating") return;
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - floatingPos.x,
      y: e.clientY - floatingPos.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setFloatingPos({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleDockToggle = (position: DockPosition) => {
    setDockPosition(position);
  };

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

  const parseIntent = (text: string): { intent: string; payload: Record<string, unknown> } | null => {
    const lower = text.toLowerCase().trim();

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

    // Add user message
    const userMessage: AiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: userInput,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Check for commands first
    if (userInput.startsWith("/")) {
      if (handleCommand(userInput)) return;
    }

    setIsLoading(true);

    const parsed = parseIntent(userInput);

    if (!parsed) {
      addAssistantMessage(
        "I didn't understand that. Try:\n" +
        "\"Create a task called 'Fix bug'\"\n" +
        "\"Move 'Fix bug' to in_progress\"\n" +
        "\"Assign 'Fix bug' to John\"\n" +
        "Or type /help for all commands."
      );
      setIsLoading(false);
      return;
    }

    try {
      const result = await executeAiIntent(id, parsed);
      addAssistantMessage(
        `Done! ${parsed.intent.replace("_", " ")} completed successfully.`,
        { type: parsed.intent, result: result.ok ? "success" : "failed" }
      );
      onTasksChanged();
    } catch (err: any) {
      addAssistantMessage(
        err?.response?.data?.error ?? "Something went wrong. Please try again.",
        { type: parsed.intent, result: "error" }
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

  if (!open) return null;

  const getDockStyles = () => {
    switch (dockPosition) {
      case "right":
        return "inset-y-0 right-0 w-full sm:w-96 border-l";
      case "left":
        return "inset-y-0 left-0 w-full sm:w-96 border-r";
      case "bottom":
        return "inset-x-0 bottom-0 h-[400px] border-t";
      case "top":
        return "inset-x-0 top-0 h-[400px] border-b";
      case "floating":
        return "absolute h-[450px] w-[380px] shadow-2xl ring-1 ring-border/50 rounded-xl overflow-hidden";
      default:
        return "";
    }
  };

  return (
    <div
      ref={dragRef}
      className={`z-50 flex flex-col bg-background ${getDockStyles()} ${
        dockPosition === "floating" ? "" : "fixed"
      } ${isDragging ? "cursor-grabbing select-none" : ""}`}
      style={
        dockPosition === "floating"
          ? { left: floatingPos.x, top: floatingPos.y }
          : undefined
      }
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-4 py-3 bg-muted/30"
        onMouseDown={handleMouseDown}
        style={{ cursor: dockPosition === "floating" ? "grab" : "default" }}
      >
        <div className="flex items-center gap-2">
          {dockPosition === "floating" && (
            <GripVertical className="h-4 w-4 text-muted-foreground/50" />
          )}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">AI Assistant</h2>
            <p className="text-xs text-muted-foreground">Manage tasks with natural language</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setMessages([])}
            title="Clear chat"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          {/* Dock controls */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleDockToggle("left")}
            title="Dock left"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleDockToggle("right")}
            title="Dock right"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleDockToggle("bottom")}
            title="Dock bottom"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="15" x2="21" y2="15" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleDockToggle("floating")}
            title="Float"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenChange(false)}>
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
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
              <p className="mt-2 font-medium">Type /help for all commands</p>
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
            placeholder="Ask AI to manage tasks... (type /help for commands)"
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
