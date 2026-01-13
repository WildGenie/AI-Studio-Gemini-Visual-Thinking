/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Terminal, Code2, ChevronRight, Brain } from "lucide-react";
import { Part } from "@google/genai";

interface ChatMessageProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

interface CollapsiblePartProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  headerClassName: string;
  contentClassName: string;
  status?: string;
}

const CollapsiblePart: React.FC<CollapsiblePartProps> = ({
  title,
  icon: Icon,
  children,
  headerClassName,
  contentClassName,
  status,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-2 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm bg-white dark:bg-gray-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${headerClassName}`}
      >
        <div className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}>
          <ChevronRight size={14} />
        </div>
        <Icon size={14} />
        <span>{title}</span>
        {status && (
          <span
            className={`ml-auto text-[10px] uppercase px-1.5 py-0.5 rounded font-bold ${
              status === "OUTCOME_OK"
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/20 text-red-600 dark:text-red-400"
            }`}
          >
            {status === "OUTCOME_OK" ? "Success" : "Error"}
          </span>
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className={contentClassName}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ChatMessageItem: React.FC<ChatMessageProps> = ({ message, isStreaming }) => {
  const isUser = message.role === "user";

  const renderPart = (part: Part, index: number) => {
    // Check for 'thought' property
    // @ts-ignore
    if (part.thought === true || (typeof part.thought === 'string' && part.thought.length > 0)) {
      let title = "Thought Process";
      
      // Dynamic title update during streaming
      if (isStreaming && index === message.parts.length - 1) {
        // @ts-ignore
        const thoughtContent = typeof part.thought === 'string' ? part.thought : (part.text || "");
        // Find the last occurrence of bold text to use as the current thinking step
        const boldMatches = [...thoughtContent.matchAll(/\*\*([^*]+)\*\*/g)];
        if (boldMatches.length > 0) {
           const lastTitle = boldMatches[boldMatches.length - 1][1];
           title = `Thinking - ${lastTitle}`;
        }
      }

      return (
        <CollapsiblePart
          key={index}
          title={title}
          icon={Brain}
          headerClassName="bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
          contentClassName="p-3 bg-purple-50/50 text-purple-800 dark:bg-purple-900/10 dark:text-purple-200"
        >
          <div className="prose prose-sm max-w-none prose-purple dark:prose-invert">
             {/* @ts-ignore */}
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{typeof part.thought === 'string' ? part.thought : (part.text || "")}</ReactMarkdown>
          </div>
        </CollapsiblePart>
      );
    }

    if (part.executableCode) {
      return (
        <CollapsiblePart
          key={index}
          title={`Executable Code (${part.executableCode.language})`}
          icon={Code2}
          headerClassName="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
          contentClassName="p-0 bg-[#1e1e1e]"
        >
          <div className="p-3 overflow-x-auto">
             <pre className="text-xs text-white font-mono">
                 <code>{part.executableCode.code}</code>
             </pre>
          </div>
        </CollapsiblePart>
      );
    }

    if (part.codeExecutionResult) {
       const isSuccess = part.codeExecutionResult.outcome === "OUTCOME_OK";
       return (
         <CollapsiblePart
           key={index}
           title="Execution Result"
           icon={Terminal}
           headerClassName={isSuccess 
             ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50" 
             : "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"}
           contentClassName="p-3 bg-gray-50 text-gray-800 font-mono text-xs overflow-x-auto dark:bg-gray-900 dark:text-gray-300"
           status={part.codeExecutionResult.outcome}
         >
            <div className="whitespace-pre-wrap">
                {part.codeExecutionResult.output}
            </div>
         </CollapsiblePart>
       );
    }

    if (part.text) {
      return (
        <div key={index} className="prose prose-sm max-w-none dark:prose-invert break-words">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
        </div>
      );
    }

    if (part.inlineData) {
      return (
        <div key={index} className="mt-2 mb-2">
            <img
            src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`}
            alt="Uploaded content"
            className="max-w-full rounded-lg border border-gray-200 dark:border-gray-700"
            />
        </div>
      );
    }

    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
          isUser ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"
        }`}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      <div
        className={`flex flex-col gap-2 max-w-[85%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`px-4 py-3 rounded-2xl shadow-sm overflow-hidden ${
            isUser
              ? "bg-blue-100 text-gray-900 dark:bg-blue-600 dark:text-white rounded-tr-sm"
              : "bg-white dark:bg-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-tl-sm"
          }`}
        >
          {message.parts.map((part, i) => renderPart(part, i))}
        </div>
        <span className="text-xs text-gray-400 px-1">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </motion.div>
  );
};