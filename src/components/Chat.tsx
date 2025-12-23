import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, ChevronDown, ArrowUp, Zap, Mic, Paperclip } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Message, Task } from '../hooks/useJarvis';
import Spinner from './Spinner';
import GeometricCore from './GeometricCore';
import TaskQueue from './TaskQueue';
import BouncingDots from './BouncingDots';

interface ChatProps {
  messages: Message[];
  tasks?: Task[];
  onClear?: () => void;
  onSendMessage?: (message: string) => void;
  isConnected?: boolean;
  isListening?: boolean;
  isProcessing?: boolean;
  isSpeaking?: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
}

export default function Chat({
  messages,
  onSendMessage,
  isConnected = true,
  isListening = false,
  isProcessing = false,
  isSpeaking = false,
  onStartRecording,
  onStopRecording
}: ChatProps) {
  // ... (hooks and handlers remain the same)
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [expandedThoughts, setExpandedThoughts] = useState<Set<string>>(new Set());

  const handleToggleThought = (msgId: string) => {
    setExpandedThoughts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(msgId)) newSet.delete(msgId);
      else newSet.add(msgId);
      return newSet;
    });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing, isSpeaking]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 300;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      textareaRef.current.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, [input]);

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
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFormSubmit(e);
    }
  };

  const processMessageContent = (content: string) => {
    return content.replace(
      /\[PLOT:([^\]]+)\]([\s\S]*?)\[\/PLOT:\1\]/g, 
      (match, filename, base64Content) => {
        const cleanContent = base64Content.trim();
        
        if (!cleanContent) return match;
        
        const imageSrc = cleanContent.startsWith('data:') 
          ? cleanContent 
          : `data:image/png;base64,${cleanContent}`;

        // --- FIX: Added \n\n before and after the image tag ---
        return `\n\n![${filename}](${imageSrc})\n\n`;
      }
    );
  };

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto relative bg-[#FAF9F6]">

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-6 pb-4 scroll-smooth no-scrollbar">

        {/* Empty State */}
        {messages.length === 0 && !isProcessing && (
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6 }}
            className="h-full flex flex-col items-center justify-center -mt-20 relative z-10"
          >
            <div className="w-64 h-64 mb-4 relative overflow-visible">
              <GeometricCore isConnected={isConnected} />
            </div>

            <h2 className="text-3xl font-serif font-medium text-[#1a1a1a] mb-3 tracking-tight relative z-20">
              Jarvis
            </h2>
            <p className="text-stone-500 text-[15px] font-sans relative z-20">
              {isConnected ? "System Online. How can I help you?" : "Establishing Connection..."}
            </p>
          </motion.div>
        )}

        {/* Messages */}
        <AnimatePresence initial={false} mode='popLayout'>
          {messages.map((msg, index) => {
            const isUser = msg.source === 'user';
            let thinkingContent: string | null = null;
            let mainContent = msg.text;
            let isThinkingComplete = false;

            if (!isUser && msg.text) {
              const thinkMatches = msg.text.match(/<think>([\s\S]*?)(<\/think>|$)/g);
              if (thinkMatches) {
                thinkingContent = thinkMatches.map(m => m.replace(/<\/?think>/g, '').trim()).join('\n');
                isThinkingComplete = msg.text.includes('</think>');
                mainContent = msg.text.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim();
              }
            }

            if (mainContent) {
              mainContent = processMessageContent(mainContent);
            }

            const isThoughtExpanded = expandedThoughts.has(msg.id);

            // Check if we should show the loading animation for this specific message
            // Only if it's the last message, belongs to assistant, and we are currently speaking/streaming
            const showLoading = !mainContent && !isUser && isSpeaking && index === messages.length - 1;

            return (
              <motion.div
                key={msg.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`flex w-full mb-8 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex flex-col ${isUser ? 'items-end max-w-[85%]' : 'items-start w-full'}`}>

                  {isUser ? (
                    <div className="bg-[#F0F0F0] text-[#1a1a1a] px-5 py-3 rounded-2xl text-[15px] leading-relaxed font-serif tracking-wide">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="w-full space-y-2">
                      {/* Show task queue if this message has tasks */}
                      {msg.tasks && msg.tasks.length > 0 && (
                        <TaskQueue tasks={msg.tasks} />
                      )}

                      {thinkingContent && (
                        <div className="mb-4">
                          <button
                            onClick={() => handleToggleThought(msg.id)}
                            className="group flex items-center gap-2 text-xs font-mono text-stone-400 hover:text-stone-600 transition-colors cursor-pointer select-none"
                          >
                            {isThinkingComplete ? (
                              <div className="w-4 h-4 flex items-center justify-center rounded bg-stone-100 group-hover:bg-stone-200">
                                <Zap size={10} className="text-stone-500" />
                              </div>
                            ) : (
                              <Spinner />
                            )}
                            <span className="uppercase tracking-wider">Reasoning Process</span>
                            <ChevronDown
                              size={12}
                              className={`transform transition-transform duration-200 ${isThoughtExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>

                          <AnimatePresence>
                            {isThoughtExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-2 pl-3 border-l-2 border-stone-200 text-stone-500 text-sm font-mono whitespace-pre-wrap leading-6 py-1">
                                  {thinkingContent}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      <div className="text-[16px] leading-7 text-[#1a1a1a] font-serif markdown-content break-words overflow-wrap-anywhere">
                        {mainContent ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              code({ inline, className, children, ...props }: any) {
                                const match = /language-(\w+)/.exec(className || '');
                                const codeString = String(children).replace(/\n$/, '');
                                const isBlock = !inline && match;

                                return isBlock ? (
                                  <div className="my-6 rounded-xl overflow-hidden border border-stone-200/50 bg-[#1e1e1e] shadow-sm group">
                                    <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-white/5">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-stone-300 font-sans lowercase">
                                          {match[1]}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => handleCopy(codeString, index)}
                                        className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        aria-label="Copy code"
                                      >
                                        {copiedIndex === index ? <Check size={13} /> : <Copy size={13} />}
                                        <span className="font-sans">{copiedIndex === index ? 'Copied' : 'Copy'}</span>
                                      </button>
                                    </div>
                                    <div className="text-[13px] leading-6 font-mono">
                                      <SyntaxHighlighter
                                        style={vscDarkPlus}
                                        language={match[1]}
                                        PreTag="div"
                                        customStyle={{
                                          margin: 0,
                                          padding: '1rem',
                                          background: 'transparent',
                                          fontSize: '13px',
                                          lineHeight: '1.5'
                                        }}
                                        wrapLongLines={true}
                                        {...props}
                                      >
                                        {codeString}
                                      </SyntaxHighlighter>
                      
                                    </div>
                                  </div>
                                ) : (
                                  <code className="bg-stone-100 text-[#D95757] px-1.5 py-0.5 rounded-md text-[0.9em] font-mono font-medium border border-stone-200/50">
                                    {children}
                                  </code>
                                );
                              },
                              p: ({ ...props }) => <p className="mb-4 last:mb-0 break-words" {...props} />,
                              ul: ({ ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
                              ol: ({ ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
                              blockquote: ({ ...props }) => <blockquote className="border-l-4 border-orange-200 pl-4 italic text-stone-600 my-4" {...props} />,
                              hr: ({ ...props }) => <hr className="my-8 border-t border-stone-300" {...props} />,
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              img: ({ ...props }: any) => (
                                <img
                                  {...props}
                                  className="max-w-full h-auto rounded-lg shadow-sm border border-stone-200 my-4"
                                  loading="lazy"
                                />
                              )
                            }}
                          >
                            {mainContent}
                          </ReactMarkdown>
                        ) : (
                          showLoading ? <BouncingDots /> : null
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isProcessing && (
          <motion.div
            initial={{ opacity: 1, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full mb-8 justify-start"
          >
            <div className="flex flex-col items-start w-full">
              <div className="w-full space-y-2">
                <div className="text-[16px] leading-7 text-[#1a1a1a] font-serif markdown-content">
                  <BouncingDots />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} className="h-4" />
      </div>

      {/* --- INPUT AREA (No changes here) --- */}
      {onSendMessage && (
        <div className="w-full px-4 pb-6 pt-2 bg-[#FAF9F6] z-20">
          <motion.div
            layout
            className={`
              relative flex flex-col bg-white border border-stone-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl overflow-hidden
              ${isListening ? 'border-red-200 ring-1 ring-red-100' : ''}
            `}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!isConnected || isListening || isProcessing}
              placeholder={isListening ? "Listening..." : (isProcessing ? "Jarvis is thinking..." : "How can I help you?")}
              className="w-full max-h-[300px] py-4 px-4 bg-transparent border-none resize-none text-[16px] text-[#1a1a1a] placeholder:text-stone-400 focus:ring-0 focus:outline-none font-serif leading-relaxed custom-scrollbar"
              rows={1}
            />

            <div className="flex items-center justify-between px-3 pb-3 pt-1">
              <div className="flex items-center gap-2">
                <button className="p-2 text-stone-400 hover:bg-stone-100 rounded-lg transition-colors" title="Attach file">
                  <Paperclip size={18} />
                </button>
                {onStartRecording && (
                  <button
                    type="button"
                    onClick={isListening ? onStopRecording : onStartRecording}
                    disabled={isProcessing}
                    className={`p-2 rounded-lg transition-all ${isListening ? 'text-red-500 bg-red-50' : 'text-stone-400 hover:bg-stone-100 hover:text-stone-600'
                      }`}
                  >
                    <Mic size={18} className={isListening ? 'animate-pulse' : ''} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-xs text-stone-300 font-sans">
                  {input.trim().length > 0 ? 'Return to send' : ''}
                </span>
                <button
                  onClick={handleFormSubmit}
                  disabled={!input.trim() || !isConnected || isListening || isProcessing}
                  className={`
                    p-2 rounded-lg transition-all duration-200 flex items-center justify-center
                    ${input.trim() && isConnected
                      ? 'bg-[#0F9D58] text-white shadow-sm hover:bg-[#0F9D58]/60'
                      : 'bg-stone-100 text-stone-300 cursor-not-allowed'}
                  `}
                >
                  <ArrowUp size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </motion.div>

          <div className="text-center mt-3">
            <p className="text-[11px] text-stone-400 font-sans">
              Jarvis can make mistakes. Please verify important information.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
