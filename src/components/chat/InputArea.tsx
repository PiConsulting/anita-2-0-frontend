import React, { useRef, useEffect } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface InputAreaProps {
    onSendMessage: (message: string) => void;
    isLoading: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({ onSendMessage, isLoading }) => {
    const [input, setInput] = React.useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = () => {
        if (input.trim() && !isLoading) {
            onSendMessage(input.trim());
            setInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    return (
        <div className="p-6 md:pb-10 bg-white dark:bg-black">
            <div className="max-w-3xl mx-auto relative flex flex-col gap-2">
                <div className={cn(
                    "relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 transition-all duration-300",
                    "focus-within:border-neutral-400 dark:focus-within:border-neutral-600 focus-within:shadow-[0_0_0_4px_rgba(0,0,0,0.03)] dark:focus-within:shadow-[0_0_0_4px_rgba(255,255,255,0.03)]",
                    "bg-neutral-50/30 dark:bg-neutral-900/10"
                )}>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Pregunta a Anita..."
                        disabled={isLoading}
                        rows={1}
                        className={cn(
                            'w-full resize-none bg-transparent py-4 pl-5 pr-14 text-sm font-medium focus:outline-none',
                            'placeholder:text-neutral-400 dark:placeholder:text-neutral-600 text-neutral-900 dark:text-neutral-100',
                            'disabled:opacity-50'
                        )}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className={cn(
                            'absolute right-3 bottom-3 p-2 rounded-xl transition-all duration-200',
                            'bg-black text-white dark:bg-white dark:text-black hover:opacity-80 active:scale-95',
                            'disabled:bg-neutral-100 dark:disabled:bg-neutral-900 disabled:text-neutral-300 dark:disabled:text-neutral-700 disabled:cursor-not-allowed disabled:active:scale-100'
                        )}
                    >
                        {isLoading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <ArrowUp size={16} strokeWidth={3} />
                        )}
                    </button>
                </div>
                <div className="flex justify-center gap-4 text-[10px] font-bold text-neutral-300 dark:text-neutral-700 uppercase tracking-[0.2em] px-2">
                    {/* <span>Clean</span>
                    <span>•</span>
                    <span>Minimal</span>
                    <span>•</span>
                    <span>Fast</span> */}
                </div>
            </div>
        </div>
    );
};

export default InputArea;
