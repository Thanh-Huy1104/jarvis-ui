import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, ChevronDown, ChevronRight, ArrowUp, Zap, Mic, Paperclip } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { Message, Task } from '../hooks/useJarvis';
import Spinner from './Spinner';
import GeometricCore from './GeometricCore';
import TaskQueue from './TaskQueue';

interface ChatProps {
  messages: Message[];
  tasks?: Task[];
  onClear?: () => void;
  onSendMessage?: (message: string) => void;
  isConnected?: boolean;
  isListening?: boolean;
  isProcessing?: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
}

export default function Chat({
  messages,
  tasks = [],
  onSendMessage,
  isConnected = true,
  isListening = false,
  isProcessing = false,
  onStartRecording,
  onStopRecording
}: ChatProps) {
  // ... (hooks and handlers remain the same)
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [expandedThoughts, setExpandedThoughts] = useState<Set<string>>(new Set());
  const [expandedCodeBlocks, setExpandedCodeBlocks] = useState<Set<string>>(new Set());

  const handleToggleThought = (msgId: string) => {
      setExpandedThoughts(prev => {
          const newSet = new Set(prev);
          if (newSet.has(msgId)) newSet.delete(msgId);
          else newSet.add(msgId);
          return newSet;
      });
  };

  const handleToggleCodeBlock = (blockId: string) => {
      setExpandedCodeBlocks(prev => {
          const newSet = new Set(prev);
          if (newSet.has(blockId)) newSet.delete(blockId);
          else newSet.add(blockId);
          return newSet;
      });
  };

  useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

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

  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto relative bg-[#FAF9F6]">
      
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
 
             const isThoughtExpanded = expandedThoughts.has(msg.id);
 
             return (
               <motion.div
                 key={msg.id}
                 layout
                 initial={{ x: -20 }}
                 animate={{ x: 0 }}
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
                         {mainContent && (
                           <ReactMarkdown
                             remarkPlugins={[remarkMath]}
                             rehypePlugins={[rehypeKatex]}
                             components={{
                               code({ node, inline, className, children, ...props }: any) {
                                 const match = /language-(\w+)/.exec(className || '');
                                 const codeString = String(children).replace(/\n$/, '');
                                 const isBlock = !inline && match;
                                 
                                 const blockId = `${msg.id}-code-${index}`;
                                 const isExpanded = expandedCodeBlocks.has(blockId);
                                 
                                 return isBlock ? (
                                   <motion.div
                                     initial={{ y: 5 }}
                                     animate={{ y: 0 }}
                                     transition={{ duration: 0.2 }}
                                     className="my-6 rounded-lg overflow-hidden border border-stone-200 bg-[#1e1e1e] shadow-sm"
                                   >
                                     <div className="flex items-center justify-between px-3 py-1.5 bg-[#2d2d2d] border-b border-white/5">
                                       <button
                                         onClick={() => handleToggleCodeBlock(blockId)}
                                         className="flex items-center gap-2 text-xs text-stone-400 hover:text-white transition-colors"
                                       >
                                         {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                         <span className="font-sans lowercase">{match[1]}</span>
                                         <span className="text-stone-500">({codeString.split('\n').length} lines)</span>
                                       </button>
                                       <button
                                         onClick={() => handleCopy(codeString, index)}
                                         className="flex items-center gap-1 text-xs text-stone-400 hover:text-white transition-colors"
                                       >
                                         {copiedIndex === index ? <Check size={12}/> : <Copy size={12}/>}
                                         <span>{copiedIndex === index ? 'Copied' : 'Copy'}</span>
                                       </button>
                                     </div>
                                     {isExpanded && (
                                       <pre className="p-4 overflow-x-auto text-sm font-mono text-[#d4d4d4] leading-relaxed custom-scrollbar break-all">
                                         <code className="whitespace-pre-wrap break-words">{codeString}</code>
                                       </pre>
                                     )}
                                   </motion.div>
                                 ) : (
                                   <code className="bg-stone-100 text-[#D95757] px-1 py-0.5 rounded text-[0.9em] font-mono font-medium">
                                     {children}
                                   </code>
                                 );
                               },
                               p: ({ node, ...props }) => <p className="mb-4 last:mb-0 break-words" {...props} />,
                               ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
                               ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
                               blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-orange-200 pl-4 italic text-stone-600 my-4" {...props} />,
                             }}
                           >
                             {mainContent}
                           </ReactMarkdown>
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
            initial={{ y: 10 }}
            animate={{ y: 0 }}
            className="flex w-full mb-8 justify-start"
          >
            <div className="flex flex-col items-start w-full">
              <div className="w-full space-y-2">
                <div className="text-[16px] leading-7 text-[#1a1a1a] font-serif markdown-content">
                  <div className="bg-white px-5 py-3 rounded-2xl">
                    <Spinner />
                  </div>
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
                    className={`p-2 rounded-lg transition-all ${
                      isListening ? 'text-red-500 bg-red-50' : 'text-stone-400 hover:bg-stone-100 hover:text-stone-600'
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