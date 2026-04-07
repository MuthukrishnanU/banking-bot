"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Landmark } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "bot",
      content: "Hello! I am your Banking Policy Assistant. How can I help you today? (You can ask me in any language!)",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001"}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from the assistant.");
      }

      const data = await response.json();
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: data.answer,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "bot",
          content: "Sorry, I'm having trouble connecting to the server. Please make sure the backend is running and your API key is configured.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none">
            <Landmark size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-zinc-100">BankAssist</h1>
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">Multilingual Policy Chatbot</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 font-sans">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            System Online
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-hidden p-4 md:p-6 lg:p-8">
        <div className="mx-auto flex h-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none font-sans">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-6 md:p-6"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex w-full gap-3",
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full shadow-md",
                    message.role === "user" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300"
                  )}
                >
                  {message.role === "user" ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                    message.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-slate-50 dark:bg-zinc-800/50 text-slate-800 dark:text-zinc-200 border border-slate-100 dark:border-zinc-800 rounded-tl-none"
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex w-full gap-3 flex-row">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                  <Bot size={16} />
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-slate-500 rounded-tl-none">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-100 dark:border-zinc-800 p-4 md:p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about banking policies in any language..."
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm ring-blue-600 focus:outline-none focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
              >
                <Send size={20} />
              </button>
            </form>
            <p className="mt-3 text-center text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-semibold">
              Proprietary Banking Policy Data Protection • v1.0.0
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
