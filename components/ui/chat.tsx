"use client";

import { useRef, useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Separator } from "./separator";
import { cn } from "@/lib/utils";
import { SendIcon, BotIcon, UserIcon } from "lucide-react";

interface ChatMessage {
  content: string;
  role: "assistant" | "user";
  timestamp: Date;
}

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export function Chat({
  messages,
  onSendMessage,
  isLoading = false,
  placeholder = "Ask a question...",
  className,
}: ChatProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput("");
      // Scroll after a short delay to ensure the new message is rendered
      setTimeout(scrollToBottom, 100);
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <BotIcon className="h-8 w-8 mb-2" />
            <p>No messages yet. Ask a question to get started.</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className="flex flex-col">
              <div
                className={cn(
                  "flex items-start gap-2 rounded-lg p-3",
                  message.role === "assistant"
                    ? "bg-muted"
                    : "bg-primary/10"
                )}
              >
                {message.role === "assistant" ? (
                  <BotIcon className="h-5 w-5 mt-1" />
                ) : (
                  <UserIcon className="h-5 w-5 mt-1" />
                )}
                <div className="flex-1">
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              {index < messages.length - 1 && <Separator className="my-2" />}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <Separator />

      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <SendIcon className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </form>
    </div>
  );
} 