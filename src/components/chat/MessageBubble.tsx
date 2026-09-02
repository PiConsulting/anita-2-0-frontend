import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import type { Message } from '../../types/index';
import { cn } from '../../utils/cn';
import { Bot, LockKeyhole, User } from 'lucide-react';

interface MessageBubbleProps {
    message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
    const isAssistant = message.role === 'assistant';
    const isSensitiveUserMessage = !isAssistant && message.isSensitive;

    // Remove inline option text added by the backend for T&C step (buttons replace them)
    const cleanContent = (messageToClean: Message) => {
        let text = messageToClean.content.replace(/\s*\[Acepto\]\s*\|\s*\[Rechazo\]/gi, '');

        if (messageToClean.step === 'id_type') {
            text = text.replace(
                /\n\s*1\.\s*C[ée]dula de ciudadan[íi]a\s*\n\s*2\.\s*Tarjeta de identidad\s*\n\s*3\.\s*C[ée]dula de extranjer[íi]a\s*\n\s*4\.\s*Pasaporte\s*\n\s*5\.\s*Registro civil\s*\n\s*6\.\s*NIT\s*/i,
                ''
            );
        }

        return text.trimEnd();
    };

    // Sanitize content before rendering (if any raw HTML is present)
    const sanitizedContent = isSensitiveUserMessage
        ? ''
        : DOMPurify.sanitize(cleanContent(message));


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
                        ? 'bg-[var(--color-secondary-green)] text-[var(--color-white)] border-[var(--color-secondary-green)]'
                        : 'bg-[var(--color-secondary-yellow)] text-[var(--color-primary-cafe)] border-[var(--color-secondary-yellow)]'
                )}>
                    {isAssistant ? <Bot size={18} strokeWidth={2.5} /> : <User size={18} strokeWidth={2.5} />}
                </div>
            </div>

            <div className="flex-1 overflow-hidden space-y-2">
                <div className="flex items-center gap-2">
                    <span className={cn(
                        'text-[11px] font-bold tracking-tight uppercase',
                        isAssistant ? 'text-[var(--color-secondary-green)]' : 'text-[var(--color-secondary-yellow)]'
                    )}>
                        {isAssistant ? 'Anita' : 'Cliente'}
                    </span>
                    <span className="text-[10px] font-medium text-[var(--text-muted)]">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                {isSensitiveUserMessage ? (
                    <div
                        className="inline-flex max-w-full select-none items-center gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)]/80 px-4 py-3 text-[var(--text-secondary)] shadow-inner pointer-events-none"
                        aria-label="Información privada"
                    >
                        <LockKeyhole size={16} strokeWidth={2.4} className="shrink-0 text-[var(--color-primary-cafe)] dark:text-[var(--color-secondary-yellow)]" />
                        <span className="text-sm font-semibold tracking-normal">Información privada</span>
                        <span className="sensitive-redaction-stack" aria-hidden="true">
                            <span className="sensitive-redaction-line sensitive-redaction-line-long" />
                            <span className="sensitive-redaction-line sensitive-redaction-line-short" />
                        </span>
                    </div>
                ) : (
                    <div className="prose prose-sm max-w-none text-[var(--text-primary)] leading-relaxed font-normal">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                a: ({ ...props }) => (
                                    <a {...props} target="_blank" rel="noopener noreferrer" className="text-[var(--color-secondary-blue)] hover:text-[var(--color-sub-blue-dark)] underline break-words" />
                                ),
                                ul: ({ ...props }) => (
                                    <ul {...props} className="list-disc list-inside my-4 space-y-2" />
                                ),
                                ol: ({ ...props }) => (
                                    <ol {...props} className="list-decimal list-inside my-4 space-y-2" />
                                ),
                                li: ({ ...props }) => (
                                    <li {...props} className="ml-2" />
                                )
                            }}
                        >
                            {sanitizedContent}
                        </ReactMarkdown>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessageBubble;
