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

    // Remove inline option text added by the backend for T&C step (buttons replace them)
    const cleanContent = (text: string) =>
        text.replace(/\s*\[Acepto\]\s*\|\s*\[Rechazo\]/gi, '').trimEnd();

    // Sanitize content before rendering (if any raw HTML is present)
    const sanitizedContent = DOMPurify.sanitize(cleanContent(message.content));


    return (
        <div
            className={cn(
                'flex w-full gap-5 py-10 px-6 transition-all duration-500',
                isAssistant ? 'bg-[var(--surface-muted)]/70' : 'bg-[var(--surface-elevated)]/70'
            )}
        >
            <div className="flex-shrink-0 mt-1">
                <div className={cn(
                    'w-9 h-9 flex items-center justify-center rounded-full transition-transform hover:scale-105 border',
                    isAssistant
                        ? 'bg-[var(--interactive-primary)] text-[var(--interactive-contrast)] border-[var(--border-strong)]'
                        : 'bg-[var(--surface-elevated)] text-[var(--text-primary)] border-[var(--border-soft)]'
                )}>
                    {isAssistant ? <Bot size={18} strokeWidth={2.5} /> : <User size={18} strokeWidth={2.5} />}
                </div>
            </div>

            <div className="flex-1 overflow-hidden space-y-2">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold tracking-tight text-[var(--text-primary)] uppercase">
                        {isAssistant ? 'Anita' : 'Cliente'}
                    </span>
                    <span className="text-[10px] font-medium text-[var(--text-muted)]">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                <div className="prose prose-sm max-w-none text-[var(--text-primary)] leading-relaxed font-normal">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            a: ({ node, ...props }) => (
                                <a {...props} target="_blank" rel="noopener noreferrer" className="text-[var(--color-secondary-blue)] hover:text-[var(--color-sub-blue-dark)] underline break-words" />
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
