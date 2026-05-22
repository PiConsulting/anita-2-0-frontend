import React, { useRef, useEffect } from 'react';
import { ArrowUp, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface InputAreaProps {
    onSendMessage: (message: string) => void;
    isLoading: boolean;
    /** Current conversation step returned by the backend (e.g. 'terms_pending') */
    currentStep: string | null;
    /** Called when the user responds to the T&C prompt */
    onTermsResponse: (answer: 'acepto' | 'rechazo') => void;
}

const InputArea: React.FC<InputAreaProps> = ({
    onSendMessage,
    isLoading,
    currentStep,
    onTermsResponse,
}) => {
    const [input, setInput] = React.useState('');
    const [selectedDocumentType, setSelectedDocumentType] = React.useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const documentTypeOptions = [
        { value: '1', label: 'Cédula de ciudadanía' },
        { value: '2', label: 'Tarjeta de identidad' },
        { value: '3', label: 'Cédula de extranjería' },
        { value: '4', label: 'Pasaporte' },
        { value: '5', label: 'Registro civil' },
        { value: '6', label: 'NIT' },
    ];

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

    useEffect(() => {
        if (currentStep !== 'id_type') {
            setSelectedDocumentType('');
        }
    }, [currentStep]);

    const handleDocumentTypeSubmit = () => {
        if (!selectedDocumentType || isLoading) return;
        onSendMessage(selectedDocumentType);
        setSelectedDocumentType('');
    };

    // ── Terms & Conditions mode ───────────────────────────────────────────────
    if (currentStep === 'terms_pending') {
        return (
            <div className="p-6 md:pb-10 bg-[var(--surface-base)]">
                <div className="max-w-3xl mx-auto flex flex-col gap-3">
                    <p className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">
                        Elige una opción para continuar
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Accept button */}
                        <button
                            id="btn-terms-accept"
                            onClick={() => onTermsResponse('acepto')}
                            disabled={isLoading}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl',
                                'font-bold text-sm tracking-tight transition-all duration-200',
                                'bg-[var(--interactive-success)] hover:brightness-105 active:scale-[0.98] text-[var(--interactive-success-contrast)]',
                                'shadow-[0_0_0_0_rgba(91,197,0,0)] hover:shadow-[0_0_0_4px_rgba(91,197,0,0.2)]',
                                'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'
                            )}
                        >
                            {isLoading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <CheckCircle2 size={17} strokeWidth={2.5} />
                            )}
                            Acepto los terminos y condiciones
                        </button>

                        {/* Reject button */}
                        <button
                            id="btn-terms-reject"
                            onClick={() => onTermsResponse('rechazo')}
                            disabled={isLoading}
                            className={cn(
                                'flex items-center justify-center gap-2 py-4 px-5 rounded-2xl',
                                'font-bold text-sm tracking-tight transition-all duration-200',
                                'border border-[var(--border-soft)]',
                                'bg-[var(--surface-elevated)] text-[var(--text-secondary)]',
                                'hover:border-[var(--interactive-danger)] hover:text-[var(--interactive-danger)]',
                                'hover:bg-[color-mix(in_srgb,var(--interactive-danger)_8%,transparent)]',
                                'active:scale-[0.98]',
                                'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'
                            )}
                        >
                            {isLoading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <XCircle size={17} strokeWidth={2.5} />
                            )}
                            Rechazo
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Document type selection mode ─────────────────────────────────────────
    if (currentStep === 'id_type') {
        return (
            <div className="p-6 md:pb-10 bg-[var(--surface-base)]">
                <div className="max-w-3xl mx-auto flex flex-col gap-3">
                    <p className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">
                        Selecciona tu tipo de documento
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                        <select
                            value={selectedDocumentType}
                            onChange={(e) => setSelectedDocumentType(e.target.value)}
                            disabled={isLoading}
                            className={cn(
                                'w-full rounded-2xl border border-[var(--border-soft)] px-4 py-3.5',
                                'bg-[var(--surface-elevated)] text-[var(--text-primary)] text-sm font-medium',
                                'focus:outline-none focus:border-[var(--border-strong)]',
                                'disabled:opacity-50 disabled:cursor-not-allowed'
                            )}
                        >
                            <option value="">Selecciona una opción...</option>
                            {documentTypeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.value}. {option.label}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={handleDocumentTypeSubmit}
                            disabled={!selectedDocumentType || isLoading}
                            className={cn(
                                'inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl',
                                'font-bold text-sm transition-all duration-200',
                                'bg-[var(--interactive-primary)] text-[var(--interactive-contrast)] hover:bg-[var(--interactive-primary-hover)]',
                                'active:scale-[0.98]',
                                'disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:active:scale-100'
                            )}
                        >
                            {isLoading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                'Continuar'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Normal textarea mode ──────────────────────────────────────────────────
    return (
        <div className="p-6 md:pb-10 bg-[var(--surface-base)]">
            <div className="max-w-3xl mx-auto relative flex flex-col gap-2">
                <div className={cn(
                    "relative overflow-hidden rounded-2xl border border-[var(--border-soft)] transition-all duration-300",
                    "focus-within:border-[var(--border-strong)] focus-within:shadow-[0_0_0_4px_rgba(65,143,222,0.18)]",
                    "bg-[var(--surface-elevated)]"
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
                            'placeholder:text-[var(--text-muted)] text-[var(--text-primary)]',
                            'disabled:opacity-50'
                        )}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className={cn(
                            'absolute right-3 bottom-3 p-2 rounded-xl transition-all duration-200',
                            'bg-[var(--interactive-primary)] text-[var(--interactive-contrast)] hover:bg-[var(--interactive-primary-hover)] active:scale-95',
                            'disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:active:scale-100'
                        )}
                    >
                        {isLoading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <ArrowUp size={16} strokeWidth={3} />
                        )}
                    </button>
                </div>
                <div className="flex justify-center gap-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] px-2">
                    <span>Seguro</span>
                    <span>•</span>
                    <span>Confiable</span>
                    <span>•</span>
                    <span>Cercano</span>
                </div>
            </div>
        </div>
    );
};

export default InputArea;
