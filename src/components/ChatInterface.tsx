"use client";

import { FormEvent, useState, useEffect, useRef } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getCookie } from "@/utils/cookies";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ExamplePrompt {
  prompt: string;
}

interface Props {
  propertyAnalysis?: {
    property_description: string;
    messages: Message[];
    _id: string;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Add loading spinner component
function LoadingSpinner() {
  return (
    <div className="animate-spin rounded-full h-5 w-5 border-2 border-secondary border-t-transparent" />
  );
}

// Add typing indicator component
function TypingIndicator() {
  return (
    <div className="flex space-x-2 p-3 bg-background-dark rounded-lg border border-neutral">
      <div className="w-2 h-2 bg-secondary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 bg-secondary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-secondary rounded-full animate-bounce"></div>
    </div>
  );
}

export function ChatInterface({ propertyAnalysis }: Props) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [examplePrompts, setExamplePrompts] = useState<ExamplePrompt[]>([]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set isClient to true once component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAuthError = () => {
    router.push('/login');
  };

  // Initialize chat with property analysis when available
  useEffect(() => {
    if (propertyAnalysis) {
      console.log('PropertyAnalysis received:', JSON.stringify(propertyAnalysis, null, 2));
      
      // Check if we have valid data
      if (!propertyAnalysis.property_description) {
        console.error('Missing property_description in propertyAnalysis');
      }
      
      if (!propertyAnalysis.messages) {
        console.error('Missing messages array in propertyAnalysis');
      }
      
      if (!propertyAnalysis._id) {
        console.error('Missing _id in propertyAnalysis');
      }
      
      // Create initial messages
      console.log('Setting messages with description and existing messages');
      const initialMessages: Message[] = [];
      
      // Check if there are existing messages
      const hasExistingMessages = propertyAnalysis.messages && 
                                Array.isArray(propertyAnalysis.messages) && 
                                propertyAnalysis.messages.length > 0;
      
      // Add property description as first message ONLY if there are no other messages
      if (propertyAnalysis.property_description && !hasExistingMessages) {
        initialMessages.push({
          role: "assistant" as const,
          content: propertyAnalysis.property_description,
          timestamp: new Date(),
        });
      }
      
      // Add existing messages if available
      if (propertyAnalysis.messages && Array.isArray(propertyAnalysis.messages)) {
        initialMessages.push(
          ...propertyAnalysis.messages.map(msg => ({
            ...msg,
            role: msg.role as "user" | "assistant",
            timestamp: new Date(msg.timestamp || Date.now())
          }))
        );
      }
      
      console.log('Initial messages:', initialMessages);
      setMessages(initialMessages);
    } else {
      console.log('No propertyAnalysis received');
    }
  }, [propertyAnalysis]);

  // Fetch example prompts
  useEffect(() => {
    const fetchExamplePrompts = async () => {
      try {
        const token = getCookie('token');
        const response = await fetch(`${API_URL}/api/example-prompts`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            handleAuthError();
            return;
          }
          throw new Error("Failed to fetch example prompts");
        }

        const data = await response.json();
        setExamplePrompts(data.example_prompts || []);
      } catch (error) {
        console.error("Error fetching example prompts:", error);
      }
    };

    if (isClient && propertyAnalysis) {
      fetchExamplePrompts();
    }
  }, [isClient, propertyAnalysis]);

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
    
    // Create a slight delay before submitting to allow state update
    setTimeout(() => {
      // Only auto-submit if we have a property ID and it's not already loading
      if (propertyAnalysis?._id && !isLoading) {
        const userMessage: Message = {
          role: "user",
          content: prompt,
          timestamp: new Date(),
        };
    
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);
        
        // Send the message to the API
        const token = getCookie('token');
        fetch(`${API_URL}/api/properties/${propertyAnalysis._id}/chat`, {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            content: prompt
          }),
        })
        .then(response => {
          if (!response.ok) {
            if (response.status === 401) {
              handleAuthError();
              return null;
            }
            throw new Error("Failed to get response");
          }
          return response.json();
        })
        .then(result => {
          if (result) {
            const aiMessage: Message = {
              role: "assistant",
              content: result.content || "Sorry, I couldn't process your request.",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
          }
        })
        .catch(error => {
          console.error("Error in chat:", error);
          const errorMessage: Message = {
            role: "assistant",
            content: error instanceof Error 
              ? `Error: ${error.message}` 
              : "Sorry, I encountered an error processing your request.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        })
        .finally(() => {
          setIsLoading(false);
        });
      }
    }, 100);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const token = getCookie('token');
      
      if (!propertyAnalysis || !propertyAnalysis._id) {
        throw new Error("No property found");
      }

      // Use the proper chat endpoint for sending messages
      const response = await fetch(`${API_URL}/api/properties/${propertyAnalysis._id}/chat`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          content: input
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error(errorData?.detail || errorData?.message || "Failed to get response");
      }

      const result = await response.json();
      
      // The chat endpoint returns a direct response field
      const aiMessage: Message = {
        role: "assistant",
        content: result.content || "Sorry, I couldn't process your request.",
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error in chat:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: error instanceof Error 
          ? `Error: ${error.message}` 
          : "Sorry, I encountered an error processing your request.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Only render the full component on the client side
  if (!isClient) {
    return (
      <div className="flex flex-col h-screen bg-background-light">
        <style jsx global>{`
          .scrollbar-hide {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;  /* Chrome, Safari and Opera */
          }
        `}</style>
        <div className="flex justify-center items-center py-6 bg-background-light">
          <div className="h-[40px] flex items-center justify-center">
            <Image
              src="/proppai_logo_on_null.webp"
              alt="proppai Logo"
              width={300}
              height={40}
              priority
              className="object-contain w-auto h-full"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
          <div className="flex items-center justify-center h-full text-neutral text-lg">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background-light">
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;  /* Chrome, Safari and Opera */
        }
      `}</style>
      <div className="flex justify-center items-center py-6 bg-background-light">
        <div className="h-[40px] flex items-center justify-center">
          <Image
            src="/proppai_logo_on_null.webp"
            alt="proppai Logo"
            width={300}
            height={40}
            priority
            className="object-contain w-auto h-full"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-neutral text-lg">
            Enter property details in the sidebar to start the analysis
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-lg rounded-lg px-4 py-2 ${
                    message.role === "user"
                      ? "bg-primary text-foreground-light"
                      : "bg-background-dark border border-neutral text-foreground-light"
                  }`}
                >
                  <div className="relative">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      className="text-sm whitespace-pre-wrap prose prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-neutral">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                    {message.role === "assistant" && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(message.content);
                          alert("Copied to clipboard!");
                        }}
                        className="p-1 text-neutral hover:text-primary-dark rounded-md hover:bg-background transition duration-150"
                        title="Copy to clipboard"
                      >
                        <ClipboardDocumentIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <TypingIndicator />
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Example prompts section - only show when property is loaded and no messages from user yet */}
      {examplePrompts.length > 0 && messages.length > 0 && messages.filter(m => m.role === "user").length === 0 && (
        <>
          {/* Mobile version - absolute positioned */}
          <div className="md:hidden px-4 bg-transparent absolute bottom-20 left-0 right-0 z-10 -mb-5">
            <div className="flex flex-wrap gap-3 max-h-28 overflow-y-auto scrollbar-hide mb-1">
              {examplePrompts.map((promptItem, index) => (
                <button
                  key={`mobile-${index}`}
                  onClick={() => handlePromptClick(promptItem.prompt)}
                  className="px-3 py-1.5 bg-secondary-dark text-primary-dark text-sm rounded-md border border-neutral hover:bg-neutral/20 transition-colors shadow-md backdrop-blur-sm"
                  title={promptItem.prompt}
                >
                  {promptItem.prompt.length > 30 
                    ? promptItem.prompt.substring(0, 27) + "..." 
                    : promptItem.prompt}
                </button>
              ))}
            </div>
          </div>
          
          {/* Desktop version - static positioned */}
          <div className="hidden md:block px-4 bg-transparent z-10 mb-2">
            <div className="flex flex-wrap gap-3 overflow-y-auto scrollbar-hide">
              {examplePrompts.map((promptItem, index) => (
                <button
                  key={`desktop-${index}`}
                  onClick={() => handlePromptClick(promptItem.prompt)}
                  className="px-3 py-1.5 bg-secondary-dark text-primary-dark text-xs rounded-md border border-neutral hover:bg-neutral/20 transition-colors"
                  title={promptItem.prompt}
                >
                  {promptItem.prompt.length > 30 
                    ? promptItem.prompt.substring(0, 27) + "..." 
                    : promptItem.prompt}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="pb-4 pl-4 pr-4 bg-background-light">
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={messages.length > 0 
              ? "Chat about the property or modify the description"
              : "Select or upload a property to start"}
            disabled={isLoading || messages.length === 0}
            className="flex-1 rounded-lg bg-background-light text-primary-dark px-4 py-2 placeholder-neutral border focus:outline-none border-neutral disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || messages.length === 0}
            className="rounded-lg bg-primary p-2 text-foreground-light hover:bg-opacity-90 focus:outline-none hover:bg-primary-dark focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <PaperAirplaneIcon className="h-5 w-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
} 