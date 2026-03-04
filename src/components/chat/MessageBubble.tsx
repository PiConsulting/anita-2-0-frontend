import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import type { Message } from '../../types/index';
import { cn } from '../../utils/cn';
import { Bot, User } from 'lucide-react';

interface MessageBubbleProps {
    message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
    const isAssistant = message.role === 'assistant';

    // Sanitize content before rendering (if any raw HTML is present)
    const sanitizedContent = DOMPurify.sanitize(message.content);

    return (
        <div
            className={cn(
                'flex w-full gap-5 py-10 px-6 transition-all duration-500',
                isAssistant ? 'bg-neutral-50/50 dark:bg-neutral-900/20' : 'bg-white dark:bg-black'
            )}
        >
            <div className="flex-shrink-0 mt-1">
                <div className={cn(
                    'w-9 h-9 flex items-center justify-center rounded-xl transition-transform hover:scale-105',
                    isAssistant ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white'
                )}>
                    {isAssistant ? <Bot size={18} strokeWidth={2.5} /> : <User size={18} strokeWidth={2.5} />}
                </div>
            </div>

            <div className="flex-1 overflow-hidden space-y-2">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                        {isAssistant ? 'Anita' : 'User'}
                    </span>
                    <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                <div className="prose prose-neutral dark:prose-invert prose-sm max-w-none text-neutral-800 dark:text-neutral-200 leading-relaxed font-medium">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            a: ({ node, ...props }) => (
                                <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline break-words" />
                            ),
                            ul: ({ node, ...props }) => (
                                <ul {...props} className="list-disc list-inside my-4 space-y-2" />
                            ),
                            ol: ({ node, ...props }) => (
                                <ol {...props} className="list-decimal list-inside my-4 space-y-2" />
                            ),
                            li: ({ node, ...props }) => (
                                <li {...props} className="ml-2" />
                            )
                        }}
                    >
                        {sanitizedContent}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;
