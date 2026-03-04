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
            className="flex-1 overflow-y-auto bg-white dark:bg-black px-4"
        >
            <div className="max-w-3xl mx-auto border-x border-black/5 dark:border-neutral-900 min-h-full py-6">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-20 text-center animate-in fade-in duration-1000">
                        <div className="relative mb-8">
                            <div className="w-12 h-12 bg-black dark:bg-white rounded-lg transform rotate-12 absolute -inset-1 opacity-10 animate-pulse"></div>
                            <div className="w-12 h-12 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm rounded-lg flex items-center justify-center font-bold text-xl relative z-10 text-black dark:text-white">
                                A
                            </div>
                        </div>
                        <h2 className="text-3xl font-extrabold tracking-tight mb-3 text-black dark:text-white">¿Cómo puedo ayudarte?</h2>
                        <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500 max-w-xs">
                            Escribe cualquier duda sobre el sistema y Anita te responderá de forma precisa.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-100/50 dark:divide-neutral-900/50">
                        {messages.map((msg) => (
                            <MessageBubble key={msg.id} message={msg} />
                        ))}
                    </div>
                )}

                {isLoading && (
                    <div className="py-10 px-6 flex gap-5 animate-pulse">
                        <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-900" />
                        <div className="flex-1 space-y-4">
                            <div className="h-2 w-16 bg-neutral-100 dark:bg-neutral-900 rounded-full" />
                            <div className="space-y-3">
                                <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-900 rounded-full" />
                                <div className="h-2 w-1/2 bg-neutral-100 dark:bg-neutral-900 rounded-full" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatWindow;
