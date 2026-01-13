/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from "react";
import { sendMessageStream } from "../services/gemini";
import { ChatMessageItem } from "./ChatMessageItem";
import { ChatInput } from "./ChatInput";
import { Sparkles, Lightbulb, ArrowLeft, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { Part, Content } from "@google/genai";
import { ChatMessage, ExamplePrompt } from "../types";

const DEFAULT_EXAMPLES: ExamplePrompt[] = [
  {
    title: "Visual Thinking",
    prompt: "Crop out all the animals, and use them as icons in a matplotlib plot showing the lifespan of those animals. Sort by lifespan.",
    image: "https://raw.githubusercontent.com/fxia22/img_assets/refs/heads/main/animals.jpg"
  },
  {
    title: "Visual Thinking",
    prompt: "Analyze where the mug, glass, and bowl will go? Annotate them on the image with boxes and arrows and save the image.",
    image: "https://raw.githubusercontent.com/fxia22/img_assets/refs/heads/main/spatial2_min.jpeg"
  },
  {
    title: "Visual Thinking",
    prompt: "How many gears are there? Zoom in to see.",
    image: "https://raw.githubusercontent.com/fxia22/img_assets/refs/heads/main/spatial3_orig_min.jpeg"
  }
];

interface ExampleCardProps {
  example: ExamplePrompt;
  onClick: () => void;
}

const ExampleCard: React.FC<ExampleCardProps> = ({ example, onClick }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    const fetchImage = async () => {
      try {
        const response = await fetch(example.image);
        if (!response.ok) throw new Error("Failed to load image");
        
        const blob = await response.blob();
        
        // Fix for mime type if application/octet-stream
        let mimeType = blob.type;
        if (!mimeType || mimeType === 'application/octet-stream') {
          const ext = example.image.split('.').pop()?.toLowerCase();
          if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
          else if (ext === 'png') mimeType = 'image/png';
          else if (ext === 'webp') mimeType = 'image/webp';
          else if (ext === 'heic') mimeType = 'image/heic';
          else mimeType = 'image/jpeg';
        }

        // Create blob with correct type
        const finalBlob = blob.slice(0, blob.size, mimeType);
        objectUrl = URL.createObjectURL(finalBlob);
        
        if (isMounted) {
          setImageSrc(objectUrl);
        }
      } catch (err) {
        console.error("Thumbnail load error:", err);
        if (isMounted) setError(true);
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [example.image]);

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex flex-col items-start p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all text-left group"
    >
      <div className="w-full h-32 mb-3 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 relative">
        <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-gray-600">
          <Sparkles size={32} />
        </div>
        {imageSrc && !error && (
          <img
            src={imageSrc}
            alt={example.title}
            className="w-full h-full object-cover relative z-10 group-hover:scale-105 transition-transform duration-500"
            onError={() => setError(true)}
          />
        )}
      </div>
      <div className="flex items-center gap-2 text-blue-600 font-medium mb-1">
        <Lightbulb size={16} />
        <span className="text-sm">{example.title}</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{example.prompt}</p>
    </motion.button>
  );
};

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [examples, setExamples] = useState<ExamplePrompt[]>(DEFAULT_EXAMPLES);
  
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches))) {
      return 'dark';
    }
    return 'light';
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Apply theme class to document
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      root.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }, [theme]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetch("/examples/prompts.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch examples");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setExamples(data);
        }
      })
      .catch((err) => console.log("Using default examples due to load error:", err));
  }, []);

  const handleExampleClick = async (example: ExamplePrompt) => {
    try {
      const response = await fetch(example.image);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const blob = await response.blob();
      
      // Fix for mime type if application/octet-stream
      let mimeType = blob.type;
      if (!mimeType || mimeType === 'application/octet-stream') {
        const ext = example.image.split('.').pop()?.toLowerCase();
        if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'webp') mimeType = 'image/webp';
        else if (ext === 'heic') mimeType = 'image/heic';
        else mimeType = 'image/jpeg'; // Default fallback
      }

      // Create a new blob with the correct type
      const finalBlob = blob.slice(0, blob.size, mimeType);

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        handleSendMessage(example.prompt, base64data);
      };
      reader.readAsDataURL(finalBlob);
    } catch (error) {
      console.error("Error loading example image:", error);
      // Fallback: Send message without image
      handleSendMessage(example.prompt);
    }
  };

  const handleSendMessage = async (text: string, image?: string) => {
    setIsLoading(true);
    
    // Construct user message parts
    const userParts: Part[] = [{ text }];
    if (image) {
      const match = image.match(/^data:(.+);base64,(.+)$/);
      if (match) {
        userParts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      parts: userParts,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      // Prepare history for the API
      const history: Content[] = messages.map((msg) => ({
        role: msg.role,
        parts: msg.parts.map(p => {
             // Create a clean part object for the API
             const part: Part = {};
             if (p.text) part.text = p.text;
             if (p.inlineData) part.inlineData = p.inlineData;
             if (p.functionCall) part.functionCall = p.functionCall;
             if (p.functionResponse) part.functionResponse = p.functionResponse;
             // @ts-ignore
             if (p.executableCode) part.executableCode = p.executableCode;
             // @ts-ignore
             if (p.codeExecutionResult) part.codeExecutionResult = p.codeExecutionResult;
             return part;
        }),
      }));

      const streamResult = await sendMessageStream(text, history, image);

      // Create a placeholder for the model response
      const modelMessageId = (Date.now() + 1).toString();
      const modelMessage: ChatMessage = {
        id: modelMessageId,
        role: "model",
        parts: [],
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, modelMessage]);

      for await (const chunk of streamResult) {
        const newParts = chunk.candidates?.[0]?.content?.parts || [];
        
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg.id !== modelMessageId) return prev;

          const currentParts = [...lastMsg.parts];

          for (const newPart of newParts) {
            const lastPartIndex = currentParts.length - 1;
            const lastPart = currentParts[lastPartIndex];

            // Helper to check if parts are mergeable
            const isMergeableText = (p1: Part, p2: Part) => {
                // @ts-ignore
                const p1Thought = !!p1.thought;
                // @ts-ignore
                const p2Thought = !!p2.thought;

                return p1.text !== undefined && p2.text !== undefined &&
                       !p1.executableCode && !p2.executableCode &&
                       !p1.codeExecutionResult && !p2.codeExecutionResult &&
                       !p1.inlineData && !p2.inlineData &&
                       p1Thought === p2Thought;
            };

            if (newPart.text) {
              if (lastPart && isMergeableText(lastPart, newPart)) {
                currentParts[lastPartIndex] = {
                  ...lastPart,
                  text: (lastPart.text || "") + newPart.text
                };
              } else {
                // @ts-ignore
                currentParts.push({ text: newPart.text, thought: newPart.thought });
              }
            }
            else if (newPart.executableCode) {
               if (lastPart && lastPart.executableCode && lastPart.executableCode.language === newPart.executableCode.language) {
                 currentParts[lastPartIndex] = {
                   ...lastPart,
                   executableCode: {
                     ...lastPart.executableCode,
                     code: (lastPart.executableCode.code || "") + newPart.executableCode.code
                   }
                 };
               } else {
                 currentParts.push({ executableCode: { ...newPart.executableCode } });
               }
            }
            else if (newPart.codeExecutionResult) {
               currentParts.push({ codeExecutionResult: { ...newPart.codeExecutionResult } });
            }
            else if (newPart.inlineData) {
               currentParts.push({ inlineData: { ...newPart.inlineData } });
            }
            // @ts-ignore
            else if (newPart.thought) {
               // @ts-ignore
               currentParts.push({ thought: newPart.thought, text: newPart.text || "" });
            }
          }

          return [...prev.slice(0, -1), { ...lastMsg, parts: currentParts }];
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: "model",
        parts: [{ text: "Sorry, I encountered an error. Please try again." }],
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setMessages([]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Header */}
      <header className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 md:px-6 py-3 md:py-4 flex items-center gap-3 relative z-10 shadow-sm transition-all pt-[calc(0.75rem+env(safe-area-inset-top))] md:pt-4">
        {messages.length > 0 ? (
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors mr-1"
            title="Back to Start"
          >
            <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
          </button>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Sparkles size={24} />
          </div>
        )}
        
        <div>
          <h1 className="font-bold text-lg md:text-xl text-gray-800 dark:text-gray-100">Gemini Chat with Visual Thinking</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Powered by Gemini 3.0 Flash.</p>
        </div>

        <div className="flex-1"></div>

        <button 
          onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors mr-1"
          title={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth custom-scrollbar relative">
        <div className={`max-w-3xl mx-auto w-full ${messages.length === 0 ? "min-h-full flex flex-col justify-center" : "space-y-6"}`}>
          {messages.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center py-10"
            >
              <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-blue-100 dark:shadow-black/20 flex items-center justify-center mb-6 text-blue-500">
                <Sparkles size={40} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Welcome to Gemini Chat with Visual Thinking!</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
                Explore the thinking-with-images feature of Gemini 3.0 Flash Preview.
              </p>

              {examples.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
                  {examples.map((example, index) => (
                    <ExampleCard 
                      key={index} 
                      example={example} 
                      onClick={() => handleExampleClick(example)} 
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            messages.map((msg, index) => (
              <ChatMessageItem 
                key={msg.id} 
                message={msg} 
                isStreaming={isLoading && index === messages.length - 1}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 relative z-10">
        <div className="max-w-3xl mx-auto">
          <ChatInput onSend={handleSendMessage} disabled={isLoading} />
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
            Gemini may display inaccurate info, including about people, so double-check its responses. By using this feature, you confirm that you have the necessary rights to any content that you upload. Do not generate content that infringes on others’ intellectual property or privacy rights. Your use of this generative AI service is subject to our Prohibited Use Policy.
          </p>
        </div>
      </div>
    </div>
  );
};