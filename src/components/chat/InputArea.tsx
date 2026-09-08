import React, { useRef, useEffect } from 'react';
import { ArrowUp, Loader2, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { E2EEStatus, SensitiveInputType } from '../../types/index';

interface InputAreaProps {
    onSendMessage: (message: string) => void;
    isLoading: boolean;
    /** Current conversation step returned by the backend (e.g. 'terms_pending') */
    currentStep: string | null;
    /** Sensitive input expected by the backend for the next user message */
    expectedInputType?: SensitiveInputType | null;
    /** Availability of the public key required for sensitive inputs */
    e2eeStatus: E2EEStatus;
    /** Retries public-key creation after an E2EE initialization error */
    onRetryE2EE: () => void;
    /** Survey options provided by backend when step is bot_survey */
    surveyOptions?: Record<string, string> | null;
    /** Called when the user responds to the T&C prompt */
    onTermsResponse: (answer: 'acepto' | 'rechazo') => void;
}

const InputArea: React.FC<InputAreaProps> = ({
    onSendMessage,
    isLoading,
    currentStep,
    expectedInputType,
    e2eeStatus,
    onRetryE2EE,
    surveyOptions,
    onTermsResponse,
}) => {
    const [input, setInput] = React.useState('');
    const [selectedDocumentType, setSelectedDocumentType] = React.useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const passwordInputRef = useRef<HTMLInputElement>(null);
    const isPasswordExpected = expectedInputType === 'bv_password';
    const isSensitiveInput = Boolean(expectedInputType);
    const isSensitiveInputBlocked = isSensitiveInput && e2eeStatus !== 'ready';
    const isInputDisabled = isLoading || isSensitiveInputBlocked;

    const documentTypeOptions = [
        { value: '1', label: 'Cédula de ciudadanía' },
        { value: '2', label: 'Tarjeta de identidad' },
        { value: '3', label: 'Cédula de extranjería' },
        { value: '4', label: 'Pasaporte' },
        { value: '5', label: 'Registro civil' },
        { value: '6', label: 'NIT' },
    ];

    const handleSend = () => {
        if (input.trim() && !isInputDisabled) {
            onSendMessage(isSensitiveInput ? input : input.trim());
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
        if (!isPasswordExpected && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input, isPasswordExpected]);

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

    // ── Survey mode ────────────────────────────────────────────────────────
    if (currentStep === 'bot_survey') {
        const surveyEntries = Object.entries(surveyOptions ?? {})
            .filter(([key]) => {
                const value = Number(key);
                return Number.isInteger(value) && value >= 0 && value <= 10;
            })
            .sort((a, b) => Number(a[0]) - Number(b[0]));

        // Detect followup mode: few options with non-numeric labels (e.g. "Si"/"No")
        const isFollowup = surveyEntries.length > 0
            && surveyEntries.length <= 4
            && surveyEntries.some(([, label]) => !/^\d+$/.test(label.trim()));

        if (isFollowup) {
            return (
                <div className="p-6 md:pb-10 bg-[var(--surface-base)]">
                    <div className="max-w-3xl mx-auto flex flex-col gap-4">
                        <div className={cn(
                            'grid gap-3',
                            surveyEntries.length === 2 && 'grid-cols-2',
                            surveyEntries.length === 3 && 'grid-cols-3',
                            surveyEntries.length === 4 && 'grid-cols-2 sm:grid-cols-4'
                        )}>
                            {surveyEntries.map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => onSendMessage(key)}
                                    disabled={isLoading}
                                    className={cn(
                                        'min-h-14 rounded-2xl border border-[var(--border-soft)] px-4 py-3',
                                        'text-base font-semibold transition-all duration-200',
                                        'bg-[var(--surface-elevated)] text-[var(--text-primary)]',
                                        'hover:border-[var(--interactive-primary)] hover:bg-[var(--surface-accent-soft)]',
                                        'focus:outline-none focus:ring-2 focus:ring-[var(--interactive-primary)] focus:ring-offset-1 focus:ring-offset-[var(--surface-base)]',
                                        'active:scale-[0.98]',
                                        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <p className="text-center text-[11px] text-[var(--text-muted)]">
                            Usa los botones para responder la encuesta.
                        </p>
                    </div>
                </div>
            );
        }

        const fallbackEntries: Array<[string, string]> = Array.from(
            { length: 10 },
            (_, index) => {
                const n = (index + 1).toString();
                return [n, n];
            }
        );

        const entriesToRender = surveyEntries.length > 0 ? surveyEntries : fallbackEntries;

        return (
            <div className="p-6 md:pb-10 bg-[var(--surface-base)]">
                <div className="max-w-3xl mx-auto flex flex-col gap-4">
                    <p className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">
                        Selecciona una calificación del 1 al 10
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        {entriesToRender.map(([value, label]) => (
                            <button
                                key={value}
                                onClick={() => onSendMessage(value)}
                                disabled={isLoading}
                                className={cn(
                                    'min-h-12 rounded-2xl border border-[var(--border-soft)] px-3 py-2',
                                    'text-sm font-bold tracking-tight transition-all duration-200',
                                    'bg-[var(--surface-elevated)] text-[var(--text-primary)]',
                                    'hover:border-[var(--interactive-primary)] hover:bg-[var(--surface-accent-soft)]',
                                    'focus:outline-none focus:ring-2 focus:ring-[var(--interactive-primary)] focus:ring-offset-1 focus:ring-offset-[var(--surface-base)]',
                                    'active:scale-[0.98]',
                                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'
                                )}
                                title={label}
                            >
                                {value}
                            </button>
                        ))}
                    </div>

                    <p className="text-center text-[11px] text-[var(--text-muted)]">
                        Usa los botones para responder la encuesta.
                    </p>
                </div>
            </div>
        );
    }

    // ── Bot active with options (e.g. "Si"/"No" buttons) ─────────────────────
    if (currentStep === 'bot_active' && surveyOptions && Object.keys(surveyOptions).length > 0) {
        const activeEntries = Object.entries(surveyOptions).sort((a, b) => Number(a[0]) - Number(b[0]));

        return (
            <div className="p-6 md:pb-10 bg-[var(--surface-base)]">
                <div className="max-w-3xl mx-auto flex flex-col gap-4">
                    <div className={cn(
                        'grid gap-3',
                        activeEntries.length === 2 && 'grid-cols-2',
                        activeEntries.length === 3 && 'grid-cols-3',
                        activeEntries.length >= 4 && 'grid-cols-2 sm:grid-cols-4'
                    )}>
                        {activeEntries.map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => onSendMessage(key)}
                                disabled={isLoading}
                                className={cn(
                                    'min-h-14 rounded-2xl border border-[var(--border-soft)] px-4 py-3',
                                    'text-base font-semibold transition-all duration-200',
                                    'bg-[var(--surface-elevated)] text-[var(--text-primary)]',
                                    'hover:border-[var(--interactive-primary)] hover:bg-[var(--surface-accent-soft)]',
                                    'focus:outline-none focus:ring-2 focus:ring-[var(--interactive-primary)] focus:ring-offset-1 focus:ring-offset-[var(--surface-base)]',
                                    'active:scale-[0.98]',
                                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <p className="text-center text-[11px] text-[var(--text-muted)]">
                        Usa los botones para responder.
                    </p>
                </div>
            </div>
        );
    }

    // ── Human hand-off mode ─────────────────────────────────────────────────
    if (currentStep === 'hand-off') {
        return (
            <div className="p-6 md:pb-10 bg-[var(--surface-base)]">
                <div className="max-w-3xl mx-auto rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-elevated)] px-5 py-4 text-center">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                        La conversacion fue transferida. El chat se cerrara automaticamente en unos segundos.
                    </p>
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
                    {isPasswordExpected ? (
                        <input
                            ref={passwordInputRef}
                            type="password"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ingresa la informacion solicitada..."
                            disabled={isInputDisabled}
                            autoComplete="off"
                            className={cn(
                                'w-full bg-transparent py-4 pl-5 pr-14 text-sm font-medium focus:outline-none',
                                'placeholder:text-[var(--text-muted)] text-[var(--text-primary)]',
                                'disabled:opacity-50'
                            )}
                        />
                    ) : (
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Pregunta a Anita..."
                            disabled={isInputDisabled}
                            rows={1}
                            className={cn(
                                'w-full resize-none bg-transparent py-4 pl-5 pr-14 text-sm font-medium focus:outline-none',
                                'placeholder:text-[var(--text-muted)] text-[var(--text-primary)]',
                                'disabled:opacity-50'
                            )}
                        />
                    )}
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isInputDisabled}
                        className={cn(
                            'absolute right-3 bottom-3 p-2 rounded-xl transition-all duration-200',
                            'bg-[var(--interactive-primary)] text-[var(--interactive-contrast)] hover:bg-[var(--interactive-primary-hover)] active:scale-95',
                            'disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:active:scale-100'
                        )}
                    >
                        {isLoading || (isSensitiveInput && e2eeStatus === 'loading') ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <ArrowUp size={16} strokeWidth={3} />
                        )}
                    </button>
                </div>
                {isSensitiveInput && e2eeStatus === 'loading' && (
                    <p className="text-center text-xs text-[var(--text-muted)]" role="status">
                        Preparando conexion segura...
                    </p>
                )}
                {isSensitiveInput && e2eeStatus === 'error' && (
                    <div className="flex items-center justify-center gap-2 text-xs text-[var(--interactive-danger)]" role="alert">
                        <span>No fue posible habilitar el cifrado seguro.</span>
                        <button
                            type="button"
                            onClick={onRetryE2EE}
                            className="inline-flex items-center gap-1 font-bold text-[var(--interactive-primary)] hover:underline"
                        >
                            <RefreshCw size={13} />
                            Reintentar
                        </button>
                    </div>
                )}
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
