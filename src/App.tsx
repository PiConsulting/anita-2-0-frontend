import { useState, useEffect, useRef, useCallback } from 'react';
import { Moon, Sun } from 'lucide-react';
import ChatWindow from './components/chat/ChatWindow';
import InputArea from './components/chat/InputArea';
import type {
  E2EEConfig,
  E2EEStatus,
  InactivityStatus,
  Message,
  SensitiveInputType,
} from './types/index';
import {
  startChatSession,
  sendChatMessage,
  createSessionE2EEKeyPair,
  closeChatSession,
  verifySessionInactivity,
} from './services/api';
import { trackErrorTrace, trackException } from './services/telemetry';
import { encryptE2EEMessage } from './utils/e2ee';

const CACHE_KEY = 'rag_chat_state';
const EXPIRY_TIME = 48 * 60 * 60 * 1000; // 48 horas en milisegundos

// Idle timeout: minutes from env var, default 15.
const IDLE_TIMEOUT_MS =
  Number(import.meta.env.VITE_SESSION_IDLE_TIMEOUT_MINUTES ?? 15) * 60 * 1000;
const INACTIVITY_VERIFY_INTERVAL_MS = 60 * 1000;
const FINISH_GRACE_PERIOD_MS = 12 * 1000;
const INACTIVITY_CLEANUP_DELAY_MS = 30 * 1000;
const SENSITIVE_MESSAGE_PLACEHOLDER = 'Información privada';

const isSensitiveInputType = (inputType: unknown): inputType is SensitiveInputType =>
  inputType === 'bv_username' || inputType === 'bv_password';

interface ChatState {
  sessionId: string;
  messages: Message[];
  e2ee?: E2EEConfig;
  timestamp: number;
}

const isValidE2EEConfig = (config: E2EEConfig | undefined): config is E2EEConfig =>
  Boolean(
    config?.public_key &&
    config.algorithm === 'RSA-OAEP-SHA256' &&
    Number.isInteger(config.max_plaintext_bytes) &&
    config.max_plaintext_bytes > 0,
  );

function getCachedState(): ChatState | null {
  if (typeof window === 'undefined') return null;
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;

  try {
    const parsed: ChatState = JSON.parse(cached);
    if (!isValidE2EEConfig(parsed.e2ee)) {
      delete parsed.e2ee;
    }
    // Verificar si la sesión ha expirado
    if (Date.now() - parsed.timestamp < EXPIRY_TIME) {
      return parsed;
    } else {
      localStorage.removeItem(CACHE_KEY); // Limpiar si expiró
      return null;
    }
  } catch {
    return null;
  }
}

function App() {
  const cachedState = getCachedState();
  const [messages, setMessages] = useState<Message[]>(cachedState?.messages || []);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(cachedState?.sessionId || null);
  const [e2eeConfig, setE2EEConfig] = useState<E2EEConfig | null>(cachedState?.e2ee ?? null);
  const [e2eeStatus, setE2EEStatus] = useState<E2EEStatus>(cachedState?.e2ee ? 'ready' : 'idle');
  const [isClosingGracePeriod, setIsClosingGracePeriod] = useState(false);
  const [isInactivityClosing, setIsInactivityClosing] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    }
    return 'light';
  });

  // Derive current step from the last bot message
  const currentStep = (() => {
    const lastBotMsg = [...messages].reverse().find(m => m.role === 'assistant');
    return lastBotMsg?.step ?? null;
  })();

  const currentSurveyOptions = (() => {
    const lastBotMsg = [...messages].reverse().find(m => m.role === 'assistant');
    return lastBotMsg?.options ?? null;
  })();

  const currentExpectedInputType = (() => {
    const lastBotMsg = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastBotMsg?.step === 'bot_active' && isSensitiveInputType(lastBotMsg.input_type)) {
      return lastBotMsg.input_type;
    }
    return null;
  })();

  const isHandOffStep = currentStep === 'hand-off';

  // Ref to keep sessionId always current inside async timeouts (avoid stale closures)
  const sessionIdRef = useRef<string | null>(sessionId);
  sessionIdRef.current = sessionId;
  const e2eeConfigRef = useRef<E2EEConfig | null>(e2eeConfig);
  e2eeConfigRef.current = e2eeConfig;
  const e2eeSessionRef = useRef<string | null>(cachedState?.e2ee ? cachedState.sessionId : null);
  const e2eeRequestRef = useRef<{ sessionId: string; promise: Promise<void> } | null>(null);

  const initializeE2EE = useCallback((sid: string): Promise<void> => {
    if (e2eeSessionRef.current === sid && e2eeConfigRef.current) {
      return Promise.resolve();
    }

    if (e2eeRequestRef.current?.sessionId === sid) {
      return e2eeRequestRef.current.promise;
    }

    setE2EEStatus('loading');
    const request = createSessionE2EEKeyPair(sid)
      .then(response => {
        if (
          response.session_id !== sid ||
          !response.public_key ||
          response.algorithm !== 'RSA-OAEP-SHA256' ||
          !Number.isInteger(response.max_plaintext_bytes) ||
          response.max_plaintext_bytes <= 0
        ) {
          throw new Error('La configuracion de cifrado recibida no es valida.');
        }

        if (sessionIdRef.current !== sid) return;

        const config: E2EEConfig = {
          public_key: response.public_key,
          algorithm: response.algorithm,
          max_plaintext_bytes: response.max_plaintext_bytes,
        };
        e2eeSessionRef.current = sid;
        e2eeConfigRef.current = config;
        setE2EEConfig(config);
        setE2EEStatus('ready');
      })
      .catch(() => {
        if (sessionIdRef.current === sid) {
          e2eeSessionRef.current = null;
          e2eeConfigRef.current = null;
          setE2EEConfig(null);
          setE2EEStatus('error');
          trackErrorTrace('E2EE public key initialization failed', {
            source: 'App.initializeE2EE',
          });
        }
      })
      .finally(() => {
        if (e2eeRequestRef.current?.sessionId === sid) {
          e2eeRequestRef.current = null;
        }
      });

    e2eeRequestRef.current = { sessionId: sid, promise: request };
    return request;
  }, []);

  // Idle session timer: fires when the last message is from the bot and user is inactive
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Polling timer that asks backend if inactivity warning should be emitted
  const inactivityVerifyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishCleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInactivityStatusRef = useRef<InactivityStatus | null>(null);
  const inactivityCleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearInactivityVerifyInterval = () => {
    if (inactivityVerifyIntervalRef.current) {
      clearInterval(inactivityVerifyIntervalRef.current);
      inactivityVerifyIntervalRef.current = null;
    }
  };

  const clearInactivityCleanupTimer = () => {
    if (inactivityCleanupTimerRef.current) {
      clearTimeout(inactivityCleanupTimerRef.current);
      inactivityCleanupTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!sessionId) return;

    if (e2eeConfig) {
      e2eeSessionRef.current = sessionId;
      setE2EEStatus('ready');
      return;
    }

    void initializeE2EE(sessionId);
  }, [sessionId, e2eeConfig, initializeE2EE]);

  useEffect(() => {
    // Clear any existing timer on each message change
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    const lastMessage = messages[messages.length - 1];
    const shouldStartTimer =
      lastMessage &&
      lastMessage.role === 'assistant' &&
      sessionIdRef.current !== null &&
      currentStep !== 'hand-off' &&
      !isClosingGracePeriod &&
      !isInactivityClosing;

    if (shouldStartTimer) {
      console.log(`[App.tsx] Idle timer iniciado: ${IDLE_TIMEOUT_MS / 60000} min`);
      idleTimerRef.current = setTimeout(async () => {
        const sid = sessionIdRef.current;
        console.log('[App.tsx] Sesión expirada por inactividad. Limpiando...');
        if (sid) {
          try { await closeChatSession(sid); } catch { /* silent */ }
        }
        setSessionId(null);
        setE2EEConfig(null);
        setE2EEStatus('idle');
        setMessages([]);
        e2eeSessionRef.current = null;
        e2eeConfigRef.current = null;
        localStorage.removeItem(CACHE_KEY);
      }, IDLE_TIMEOUT_MS);
    }

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [messages, currentStep, isClosingGracePeriod, isInactivityClosing]);

  useEffect(() => {
    clearInactivityVerifyInterval();

    const lastMessage = messages[messages.length - 1];
    const shouldVerifyInactivity =
      Boolean(lastMessage) &&
      lastMessage?.role === 'assistant' &&
      sessionIdRef.current !== null &&
      currentStep !== 'hand-off' &&
      !isClosingGracePeriod &&
      !isInactivityClosing;

    if (!shouldVerifyInactivity) {
      if (lastMessage?.role === 'user') {
        lastInactivityStatusRef.current = null;
      }
      return;
    }

    const runVerify = async () => {
      const sid = sessionIdRef.current;
      if (!sid) return;

      try {
        const response = await verifySessionInactivity(sid);
        const nextStatus = response.inactivity_status;
        const prevStatus = lastInactivityStatusRef.current;

        if (nextStatus !== prevStatus) {
          lastInactivityStatusRef.current = nextStatus;
        }

        const replyText = response.reply || response.message || '';
        const shouldAppendWarningMessage =
          Boolean(replyText) &&
          nextStatus !== 'pending' &&
          nextStatus !== prevStatus;

        if (shouldAppendWarningMessage) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: replyText,
            step: response.step ?? 'bot_active',
            input_type: response.input_type,
            options: response.options,
            inactivity_status: response.inactivity_status,
            timestamp: new Date().toISOString(),
          };
          setMessages(prev => [...prev, assistantMessage]);
        }

        // Terminal close: after the second warning, block input and schedule cleanup.
        // Runs independently of message append to handle edge cases (empty reply, repeated status).
        if (nextStatus === 'inactivity_warned_2') {
          setIsInactivityClosing(true);
          clearInactivityVerifyInterval();
          if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
          }
          try { await closeChatSession(sid); } catch { /* silent */ }
          localStorage.removeItem(CACHE_KEY);
          inactivityCleanupTimerRef.current = setTimeout(() => {
            setSessionId(null);
            setE2EEConfig(null);
            setE2EEStatus('idle');
            setMessages([]);
            e2eeSessionRef.current = null;
            e2eeConfigRef.current = null;
            setIsInactivityClosing(false);
            lastInactivityStatusRef.current = null;
          }, INACTIVITY_CLEANUP_DELAY_MS);
          return;
        }
      } catch {
        trackErrorTrace('Session inactivity verification failed', {
          source: 'App.verifySessionInactivity',
        });
      }
    };

    inactivityVerifyIntervalRef.current = setInterval(runVerify, INACTIVITY_VERIFY_INTERVAL_MS);

    return () => {
      clearInactivityVerifyInterval();
    };
  }, [messages, currentStep, isClosingGracePeriod, isInactivityClosing]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Efecto para guardar la sesión y mensajes actualizados en caché
  useEffect(() => {
    if (sessionId) {
      const stateToSave: ChatState = {
        sessionId,
        messages,
        ...(e2eeConfig ? { e2ee: e2eeConfig } : {}),
        timestamp: Date.now() // Renueva el tiempo de vida con cada mensaje
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(stateToSave));

      // Limpiar sessionStorage viejo por si acaso existía de pruebas anteriores
      sessionStorage.removeItem('rag_session_id');
    }
  }, [sessionId, messages, e2eeConfig]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const beginSessionClosing = async (sid: string, reason: 'finished' | 'hand-off') => {
    console.log(`[App.tsx] Sesión finalizada por ${reason}. Se mantiene UI 12s.`);
    trackErrorTrace('Chat session closing started', { reason });

    setIsClosingGracePeriod(true);
    clearInactivityVerifyInterval();
    lastInactivityStatusRef.current = null;

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    if (finishCleanupTimerRef.current) {
      clearTimeout(finishCleanupTimerRef.current);
      finishCleanupTimerRef.current = null;
    }

    clearInactivityCleanupTimer();
    setIsInactivityClosing(false);

    try { await closeChatSession(sid); } catch { /* silent */ }

    finishCleanupTimerRef.current = setTimeout(() => {
      setSessionId(null);
      setE2EEConfig(null);
      setE2EEStatus('idle');
      setMessages([]);
      e2eeSessionRef.current = null;
      e2eeConfigRef.current = null;
      setIsClosingGracePeriod(false);
      lastInactivityStatusRef.current = null;
      localStorage.removeItem(CACHE_KEY);
    }, FINISH_GRACE_PERIOD_MS);
  };

  const handleSendMessage = async (content: string) => {
    if (isClosingGracePeriod || isHandOffStep || isInactivityClosing) {
      return;
    }

    lastInactivityStatusRef.current = null;
    clearInactivityCleanupTimer();

    const lastBotMsg = [...messages].reverse().find(m => m.role === 'assistant');
    const sensitiveType = lastBotMsg?.step === 'bot_active' && isSensitiveInputType(lastBotMsg.input_type)
      ? lastBotMsg.input_type
      : undefined;
    const isSensitiveMessage = Boolean(sensitiveType);

    if (isSensitiveMessage && (!sessionId || e2eeStatus !== 'ready' || !e2eeConfig)) {
      return;
    }

    setIsLoading(true);

    let outboundMessage = content;
    if (isSensitiveMessage && e2eeConfig) {
      try {
        outboundMessage = await encryptE2EEMessage(content, e2eeConfig);
      } catch (error: unknown) {
        const message = error instanceof Error
          ? error.message
          : 'No fue posible cifrar la informacion de forma segura.';
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: message,
          timestamp: new Date().toISOString(),
        }]);
        setIsLoading(false);
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: isSensitiveMessage ? SENSITIVE_MESSAGE_PLACEHOLDER : content,
      isSensitive: isSensitiveMessage,
      sensitiveType,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      let responseText = '';
      let responseStep: string | undefined;

      if (!sessionId) {
        const response = await startChatSession(content);
        sessionIdRef.current = response.session_id;
        setSessionId(response.session_id);
        void initializeE2EE(response.session_id);
        responseText = response.reply;
        responseStep = response.step;

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseText,
          step: responseStep,
          input_type: response.input_type,
          options: response.options,
          inactivity_status: response.inactivity_status,
          timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, assistantMessage]);

        if (response.finished || response.step === 'finished' || response.step === 'hand-off') {
          await beginSessionClosing(response.session_id, response.step === 'hand-off' ? 'hand-off' : 'finished');
          return;
        }
      } else {
        const response = await sendChatMessage(
          sessionId,
          outboundMessage,
          isSensitiveMessage ? true : undefined,
        );
        responseText = response.reply;
        responseStep = response.step;

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseText,
          step: responseStep,
          input_type: response.input_type,
          options: response.options,
          inactivity_status: response.inactivity_status,
          timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Si la sesión terminó, mantener UI 12 segundos para lectura y reutilizar cierre.
        if (response.finished || response.step === 'finished' || response.step === 'hand-off') {
          await beginSessionClosing(sessionId, response.step === 'hand-off' ? 'hand-off' : 'finished');
          return;
        }
      }

    } catch (error: unknown) {
      trackException(error, { source: 'App.handleSendMessage' });
      const message = error instanceof Error
        ? error.message
        : 'Lo siento, ocurrió un error inesperado.';
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: message,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles the user's response to the T&C message.
   * - 'acepto'  → sends the acceptance message normally; the backend continues the flow.
   * - 'rechazo' → sends the rejection; after the bot replies, the session is cleaned up
   *               because the backend will return step='finished'.
   */
  const handleTermsResponse = (answer: 'acepto' | 'rechazo') => {
    handleSendMessage(answer);
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--surface-base)] text-[var(--text-primary)] transition-colors duration-300 selection:bg-[var(--color-secondary-yellow)] selection:text-[var(--color-primary-cafe)] dark:selection:bg-[var(--interactive-primary)] dark:selection:text-[var(--surface-base)]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-8 py-4 md:py-5 sticky top-0 z-10 bg-[var(--surface-elevated)]/90 backdrop-blur-md border-b border-[var(--border-soft)] shadow-[0_8px_30px_rgba(65,143,222,0.12)] dark:shadow-none">
        <div className="flex items-center gap-3 text-[var(--text-primary)]">
          <img
            src="/Banco_Agrario_de_Colombia_logo.png"
            alt="Banco Agrario de Colombia"
            className="h-[45px] w-auto max-w-[180px] md:max-w-[230px] object-contain"
          />
          <div className="flex h-[45px] flex-col justify-center text-[var(--color-primary-cafe)]">
            <h1 className="text-base font-bold leading-tight">Anita 2.0</h1>
            <p className="text-base leading-tight">Asistente virtual</p>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-5">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-[var(--surface-muted)] hover:bg-[var(--border-soft)] text-[var(--text-primary)] transition-colors border border-[var(--border-soft)]"
              aria-label="Cambiar tema"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col overflow-hidden max-w-6xl mx-auto w-full">
        <ChatWindow messages={messages} isLoading={isLoading} />
        <InputArea
          onSendMessage={handleSendMessage}
          isLoading={isLoading || isClosingGracePeriod || isHandOffStep || isInactivityClosing}
          currentStep={currentStep}
          expectedInputType={currentExpectedInputType}
          e2eeStatus={e2eeStatus}
          onRetryE2EE={() => {
            if (sessionId) void initializeE2EE(sessionId);
          }}
          surveyOptions={currentSurveyOptions}
          onTermsResponse={handleTermsResponse}
        />
      </main>

      <footer className="px-4 py-1.5 text-center text-[10px] text-[var(--text-muted)] border-t border-[var(--border-soft)] bg-[var(--surface-elevated)]/70">
        Version de desarrollo {__APP_VERSION__}
      </footer>
    </div>
  );
}

export default App;
