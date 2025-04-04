import * as React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./scroll-area";
import { Card } from "./card";
import { Lightbulb } from "lucide-react";
import { MathFormatter } from "@/components/math-formatter";

interface ChatProps extends React.HTMLAttributes<HTMLDivElement> {
  messages: {
    content: string;
    role: "assistant" | "user";
    timestamp?: Date;
  }[];
  title?: string;
}

export function Chat({ messages, title = "Hints", className, ...props }: ChatProps) {
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <Card className={cn("flex flex-col", className)} {...props}>
      <div className="flex items-center p-4 border-b">
        <Lightbulb className="w-5 h-5 mr-2 text-amber-500" />
        <h3 className="font-medium">{title}</h3>
      </div>
      <ScrollArea className="h-[300px] p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex flex-col max-w-[80%] rounded-lg p-3",
                message.role === "assistant"
                  ? "bg-muted self-start"
                  : "bg-primary text-primary-foreground self-end"
              )}
            >
              <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                {message.role === "assistant" ? (
                  <MathFormatter content={message.content} />
                ) : (
                  message.content
                )}
              </div>
              {message.timestamp && (
                <div className="text-xs mt-1 opacity-70 self-end">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
} 