"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Landmark, Mic, MicOff, Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
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
      content: "Hello! Please upload a banking policy document to get started. Once uploaded, I can help you with any questions!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasPolicy, setHasPolicy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US'; // Default, but can be dynamic

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleSend = async (messageOverride?: string) => {
    const messageToSend = messageOverride || input;
    if (!messageToSend.trim() || isLoading || !hasPolicy) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageToSend,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: messageToSend }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to get response.");
      }

      const data = await response.json();
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: data.answer,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "bot",
          content: `Error: ${error.message}. Please make sure the backend is running and the policy is ingested.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsIngesting(true);
    setUploadError(null);

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Upload failed.");
      }

      setHasPolicy(true);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "bot",
          content: `Great! I've successfully ingested "${file.name}". You can now ask me questions about this policy in any language.`,
        },
      ]);
    } catch (error: any) {
      setUploadError(error.message);
    } finally {
      setIsIngesting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setIsRecording(true);
      recognitionRef.current.start();
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
          {/* File Upload Button */}
          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.txt,.doc,.docx,.csv,.xls,.xlsx"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isIngesting}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                hasPolicy
                  ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
              )}
            >
              {isIngesting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : hasPolicy ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {isIngesting ? "Ingesting..." : hasPolicy ? "Policy Loaded" : "Upload Policy"}
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 font-sans">
            <div className={cn("h-2 w-2 rounded-full", hasPolicy ? "bg-emerald-500" : "bg-amber-500")} />
            {hasPolicy ? "Ready" : "Awaiting Policy"}
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

            {(isLoading || isIngesting) && (
              <div className="flex w-full gap-3 flex-row">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                  <Bot size={16} />
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-slate-500 rounded-tl-none">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isIngesting ? "Analyzing policy document..." : "Consulting policy data..."}
                </div>
              </div>
            )}

            {uploadError && (
              <div className="flex w-full justify-center">
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 dark:bg-red-950/30 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  Upload Error: {uploadError}
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-100 dark:border-zinc-800 p-4 md:p-6">
            {!hasPolicy && (
              <div className="mb-4 rounded-xl bg-amber-50 p-4 text-center dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                  Please upload a banking policy document to enable the chatbot.
                </p>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-3"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={!hasPolicy || isLoading}
                  placeholder={hasPolicy ? "Ask about banking policies..." : "Awaiting policy upload..."}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm ring-blue-600 focus:outline-none focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={!hasPolicy || isLoading}
                  className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 transition-colors",
                    isRecording
                      ? "bg-red-100 text-red-600 animate-pulse"
                      : "text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-800"
                  )}
                >
                  {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading || !hasPolicy}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send size={20} />}
              </button>
            </form>
            <p className="mt-3 text-center text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-semibold">
              Proprietary Banking Policy Data Protection • v1.1.0
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
