import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, ChevronDown, ArrowUp, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
// NOTE: For local syntax highlighting, uncomment these lines after installing 'react-syntax-highlighter'
// import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Message } from '../hooks/useJarvis';
import Spinner from './Spinner';

interface ChatProps {
  messages: Message[];
  onClear?: () => void;
  onSendMessage?: (message: string) => void;
  isConnected?: boolean;
}

export default function Chat({ messages, onSendMessage, isConnected = true }: ChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [expandedThoughts, setExpandedThoughts] = useState<Set<string>>(new Set());

  const handleToggleThought = (msgId: string) => {
    setExpandedThoughts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(msgId)) {
        newSet.delete(msgId);
      } else {
        newSet.add(msgId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 200; // Max height for textarea
      if (scrollHeight > maxHeight) {
        textareaRef.current.style.height = `${maxHeight}px`;
        textareaRef.current.style.overflowY = 'auto';
      } else {
        textareaRef.current.style.height = `${scrollHeight}px`;
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  }, [input]);

  // Helper to copy code to clipboard with visual feedback
  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && onSendMessage) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex-1 w-full max-w-2xl flex flex-col overflow-hidden relative z-10 rounded-3xl bg-white/60 mb-4 ring-1 ring-white/50">

      {/* Visual Fade Overlay */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white to-transparent z-20 pointer-events-none rounded-t-3xl" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6 mask-fade-top no-scrollbar">

        {/* Empty State */}
        {messages.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full flex flex-col items-center justify-center space-y-8"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-200/30 via-purple-200/30 to-pink-200/30 blur-3xl rounded-full opacity-60" />
              <div className="relative space-y-4 text-center">
                <h1 className="text-7xl font-thin tracking-tight text-gray-800">Jarvis</h1>
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-2 h-2 rounded-full transition-colors ${isConnected ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`} />
                  <p className="text-xs text-gray-400 font-mono tracking-wider uppercase">
                    {isConnected ? 'Online' : 'Connecting...'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="max-w-md space-y-4 text-center px-6">
              <p className="text-sm text-gray-500 leading-relaxed">
                Your intelligent assistant powered by advanced AI. Ask questions, get insights, or have a conversation.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-gray-400">
                <span className="px-3 py-1 rounded-full bg-gray-100">Web Search</span>
                <span className="px-3 py-1 rounded-full bg-gray-100">Code Analysis</span>
                <span className="px-3 py-1 rounded-full bg-gray-100">Real-time Info</span>
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false} mode='popLayout'>
          {messages.map((msg, index) => {
            const isUser = msg.source === 'user';

            let thinkingContent: string | null = null;
            let mainContent = msg.text;
            let isThinkingComplete = false;

            if (!isUser && msg.text) {
              // Extract all <think> content
              const thinkMatches = msg.text.match(/<think>([\s\S]*?)(<\/think>|$)/g);
              
              if (thinkMatches) {
                // Extract thinking content
                thinkingContent = thinkMatches.map(match => 
                  match.replace(/<\/?think>/g, '').trim()
                ).filter(content => content).join('\n');
                
                // Check if thinking is complete (has closing tag)
                isThinkingComplete = msg.text.includes('</think>');
                
                // Remove all <think> blocks from main content
                mainContent = msg.text.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim();
              }
            }

            const isThoughtExpanded = expandedThoughts.has(msg.id);

            return (
              <motion.div
                key={msg.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} ${isUser ? 'max-w-[85%]' : 'max-w-full'}`}>

                  {thinkingContent && (
                    <div className="w-full text-sm font-mono text-gray-600 mb-2">
                      <button
                        onClick={() => handleToggleThought(msg.id)}
                        className="w-full flex items-center py-2 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {isThinkingComplete ? (
                            <Zap size={14} className="text-cyan-500" />
                          ) : (
                            <Spinner />
                          )}
                          <span className="italic text-gray-500">Thought Process</span>
                          <motion.div animate={{ rotate: isThoughtExpanded ? 180 : 0 }}>
                            <ChevronDown size={16} className="text-gray-500" />
                          </motion.div>
                        </div>

                      </button>
                      <AnimatePresence>
                        {isThoughtExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-3 pt-1 pl-4 border-l-2 border-gray-300 text-gray-600 whitespace-pre-wrap">
                              {thinkingContent}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Message Content */}
                  <div
                    className={`
                      relative text-[15px] leading-7 transition-all duration-300
                      ${isUser
                        ? 'bg-[#F2F2F2]/80 backdrop-blur-sm text-gray-900 px-5 py-3 rounded-2xl rounded-tr-sm' // User Bubble
                        : 'text-gray-700 px-0 py-0 w-full' // Assistant Plain Text
                      }
                    `}
                  >
                    <div 
                      className={`font-serif ${isUser ? 'font-medium' : 'font-normal'} ${
                        !isUser && mainContent ? 'animate-text-reveal' : ''
                      }`}
                      style={{
                        '--text-reveal-duration': '0.8s'
                      } as React.CSSProperties}
                    >
                      {mainContent && (
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            // --- Claude-Style Code Block (Native Implementation) ---
                            code({ node, inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              const codeString = String(children).replace(/\n$/, '');
                              const isBlock = !inline && match;
                              const uniqueId = index;

                              return isBlock ? (
                                <div className="rounded-lg overflow-hidden my-5 bg-[#1e1e1e] border border-gray-800 shadow-sm font-mono text-sm group">
                                  {/* Minimal Header */}
                                  <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-white/5 text-gray-400">
                                    <span className="text-xs lowercase select-none">
                                      {match && match[1] ? match[1] : 'code'}
                                    </span>
                                    <button
                                      onClick={() => handleCopy(codeString, uniqueId)}
                                      className="flex items-center gap-1.5 text-xs hover:text-white transition-colors p-1 rounded hover:bg-white/10"
                                      title="Copy code"
                                    >
                                      {copiedIndex === uniqueId ? (
                                        <>
                                          <Check className="w-3.5 h-3.5 text-green-400" />
                                          <span>Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3.5 h-3.5" />
                                          <span>Copy</span>
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  {/* Code Content Container */}
                                  <div className="overflow-x-auto p-4 bg-[#1e1e1e]">
                                    <pre className="margin-0">
                                      <code
                                        className="font-mono text-[13px] leading-6 text-[#d4d4d4] block min-w-full"
                                        {...props}
                                      >
                                        {codeString}
                                      </code>
                                    </pre>
                                  </div>
                                </div>
                              ) : (
                                // --- Inline Code ---
                                <code className="bg-gray-100 border border-gray-200 text-pink-600 rounded-md px-1.5 py-0.5 text-[0.9em] font-mono font-medium" {...props}>
                                  {children}
                                </code>
                              );
                            },
                            // Styled Markdown Elements
                            ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1 marker:text-gray-400" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-1 marker:text-gray-400" {...props} />,
                            li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                            p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
                            a: ({ node, ...props }) => <a className="text-indigo-500 hover:text-indigo-600 underline underline-offset-4 decoration-indigo-200" target="_blank" rel="noopener noreferrer" {...props} />,
                            blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-indigo-200 pl-4 italic text-gray-500 my-4" {...props} />,
                          }}
                        >
                          {isUser ? msg.text : mainContent}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <div ref={bottomRef} className="h-4" />
      </div>

      {onSendMessage && (
        <div className="p-4 bg-white/60">
          <form
            onSubmit={handleFormSubmit}
            className="relative bg-white/80 backdrop-blur-sm rounded-xl py-2 border border-gray-300/50 shadow-sm transition-all duration-300"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!isConnected}
              placeholder={isConnected ? "Ask Jarvis anything..." : "Connecting to server..."}
              className="w-full bg-transparent border-0 resize-none pl-5 pr-14 pt-2 text-[14px] focus:outline-none focus:ring-0 font-serif disabled:opacity-50 disabled:cursor-not-allowed"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleFormSubmit(e);
                }
              }}
            />
            <motion.button
              type="submit"
              disabled={!input.trim() || !isConnected}
              animate={{
                scale: input.trim() && isConnected ? 1 : 0.9,
                opacity: input.trim() && isConnected ? 1 : 0.5,
                backgroundColor: input.trim() && isConnected ? '#2d2d2dff' : '#d1d5db',
              }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-md text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:cursor-not-allowed"
            >
              <ArrowUp size={16} />
            </motion.button>
          </form>
        </div>
      )}
    </div>
  );
}