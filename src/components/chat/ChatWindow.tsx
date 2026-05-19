import React, { useRef, useEffect } from 'react';
import type { Message } from '../../types/index';
import MessageBubble from './MessageBubble';

interface ChatWindowProps {
    messages: Message[];
    isLoading: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    return (
        <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto bg-[var(--surface-base)] px-3 md:px-4"
        >
            <div className="max-w-4xl mx-auto border-x border-[var(--border-soft)] min-h-full py-5 md:py-6 bg-[linear-gradient(180deg,var(--surface-base)_0%,var(--surface-base)_70%,var(--surface-muted)_100%)]">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-20 text-center animate-in fade-in duration-1000">
                        <div className="relative mb-8">
                            <div className="w-14 h-14 bg-[var(--surface-accent-soft)] rounded-full transform -rotate-6 absolute -inset-1 opacity-80"></div>
                            <div className="w-14 h-14 bg-[var(--interactive-primary)] border border-[var(--border-strong)] shadow-[0_10px_24px_rgba(65,143,222,0.3)] rounded-full flex items-center justify-center font-bold text-sm relative z-10 text-[var(--interactive-contrast)]">
                                BAC
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight mb-3 text-[var(--text-primary)]">Bienvenido a Anita 2.0</h2>
                        <p className="text-sm font-normal text-[var(--text-muted)] max-w-sm leading-relaxed">
                            Escríbeme tu consulta sobre procesos, productos o soporte de Banca Empresarial y te responderé paso a paso.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-[var(--border-soft)]/90">
                        {messages.map((msg) => (
                            <MessageBubble key={msg.id} message={msg} />
                        ))}
                    </div>
                )}

                {isLoading && (
                    <div className="py-10 px-6 flex gap-5 animate-pulse">
                        <div className="w-9 h-9 rounded-xl bg-[var(--surface-muted)]" />
                        <div className="flex-1 space-y-4">
                            <div className="h-2 w-16 bg-[var(--surface-muted)] rounded-full" />
                            <div className="space-y-3">
                                <div className="h-2 w-full bg-[var(--surface-muted)] rounded-full" />
                                <div className="h-2 w-1/2 bg-[var(--surface-muted)] rounded-full" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatWindow;
