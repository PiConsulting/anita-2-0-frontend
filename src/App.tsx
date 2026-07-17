import { useState, useEffect, useRef, useCallback } from 'react';
import { Moon, Sun } from 'lucide-react';
import ChatWindow from './components/chat/ChatWindow';
import InputArea from './components/chat/InputArea';
import type { InactivityStatus, Message } from './types/index';
import {
  startChatSession,
  sendChatMessage,
  closeChatSession,
  verifySessionInactivity,
} from './services/api';

const CACHE_KEY = 'rag_chat_state';
const EXPIRY_TIME = 6 * 60 * 60 * 1000; // 6 horas en milisegundos

// Idle timeout: minutes from env var, default 15.
const IDLE_TIMEOUT_MS =
  Number(import.meta.env.VITE_SESSION_IDLE_TIMEOUT_MINUTES ?? 15) * 60 * 1000;
const INACTIVITY_VERIFY_INTERVAL_MS = 60 * 1000;
const FINISH_GRACE_PERIOD_MS = 12 * 1000;

interface ChatState {
  sessionId: string;
  messages: Message[];
  timestamp: number;
}

function getLastMessageTimestampMs(messages: Message[]): number | null {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage?.timestamp) return null;

  const parsedTs = Date.parse(lastMessage.timestamp);
  return Number.isNaN(parsedTs) ? null : parsedTs;
}

function getCachedState(): ChatState | null {
  if (typeof window === 'undefined') return null;
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;

  try {
    const parsed: ChatState = JSON.parse(cached);
    const lastMessageTimestamp = getLastMessageTimestampMs(parsed.messages);
    const referenceTimestamp = lastMessageTimestamp ?? parsed.timestamp;

    // Verificar si la sesión ha expirado
    if (Number.isFinite(referenceTimestamp) && Date.now() - referenceTimestamp < EXPIRY_TIME) {
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
  const [isClosingGracePeriod, setIsClosingGracePeriod] = useState(false);
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

  // Ref to keep sessionId always current inside async timeouts (avoid stale closures)
  const sessionIdRef = useRef<string | null>(sessionId);
  sessionIdRef.current = sessionId;

  // Idle session timer: fires when the last message is from the bot and user is inactive
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Polling timer that asks backend if inactivity warning should be emitted
  const inactivityVerifyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishCleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInactivityStatusRef = useRef<InactivityStatus | null>(null);

  const clearInactivityVerifyInterval = () => {
    if (inactivityVerifyIntervalRef.current) {
      clearInterval(inactivityVerifyIntervalRef.current);
      inactivityVerifyIntervalRef.current = null;
    }
  };

  const startGracefulConversationCleanup = useCallback(async (
    sid: string,
    clearSessionMemoryNow: boolean,
  ) => {
    setIsClosingGracePeriod(true);
    clearInactivityVerifyInterval();

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    try { await closeChatSession(sid); } catch { /* silent */ }

    if (clearSessionMemoryNow) {
      setSessionId(null);
      localStorage.removeItem(CACHE_KEY);
    }

    if (finishCleanupTimerRef.current) {
      clearTimeout(finishCleanupTimerRef.current);
    }

    finishCleanupTimerRef.current = setTimeout(() => {
      setMessages([]);
      setSessionId(null);
      setIsClosingGracePeriod(false);
      lastInactivityStatusRef.current = null;
      localStorage.removeItem(CACHE_KEY);
    }, FINISH_GRACE_PERIOD_MS);
  }, []);

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
      sessionIdRef.current !== null;

    if (shouldStartTimer) {
      console.log(`[App.tsx] Idle timer iniciado: ${IDLE_TIMEOUT_MS / 60000} min`);
      idleTimerRef.current = setTimeout(async () => {
        const sid = sessionIdRef.current;
        console.log('[App.tsx] Sesión expirada por inactividad. Limpiando...');
        if (sid) {
          try { await closeChatSession(sid); } catch { /* silent */ }
        }
        setSessionId(null);
        setMessages([]);
        localStorage.removeItem(CACHE_KEY);
      }, IDLE_TIMEOUT_MS);
    }

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [messages]);

  useEffect(() => {
    clearInactivityVerifyInterval();

    const lastMessage = messages[messages.length - 1];
    const shouldVerifyInactivity =
      Boolean(lastMessage) &&
      lastMessage?.role === 'assistant' &&
      sessionIdRef.current !== null &&
      !isClosingGracePeriod;

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

        const shouldAppendWarningMessage =
          Boolean(response.reply) &&
          nextStatus !== 'pending' &&
          nextStatus !== prevStatus;

        if (shouldAppendWarningMessage) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.reply ?? '',
            step: response.step ?? 'bot_active',
            options: response.options,
            inactivity_status: response.inactivity_status,
            timestamp: new Date().toISOString(),
          };
          setMessages(prev => [...prev, assistantMessage]);
        }

        // Al alcanzar el segundo warning de inactividad se finaliza la conversación.
        if (nextStatus === 'inactivity_warned_2' && nextStatus !== prevStatus) {
          console.log('[App.tsx] inactivity_warned_2 detectado. Cerrando sesión y aplicando espera de 12s.');
          await startGracefulConversationCleanup(sid, true);
          return;
        }
      } catch (error) {
        // Silent to user by requirement: only technical logging.
        console.error('[App.tsx] verifySessionInactivity failed:', error);
      }
    };

    inactivityVerifyIntervalRef.current = setInterval(runVerify, INACTIVITY_VERIFY_INTERVAL_MS);

    return () => {
      clearInactivityVerifyInterval();
    };
  }, [messages, isClosingGracePeriod, startGracefulConversationCleanup]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Efecto para guardar la sesión y mensajes actualizados en caché
  useEffect(() => {
    if (sessionId) {
      const lastMessageTimestamp = getLastMessageTimestampMs(messages);
      const stateToSave: ChatState = {
        sessionId,
        messages,
        // Persistimos como referencia el ultimo mensaje real.
        timestamp: lastMessageTimestamp ?? Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(stateToSave));

      // Limpiar sessionStorage viejo por si acaso existía de pruebas anteriores
      sessionStorage.removeItem('rag_session_id');
    }
  }, [sessionId, messages]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleSendMessage = async (content: string) => {
    if (isClosingGracePeriod) {
      return;
    }

    lastInactivityStatusRef.current = null;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    console.log('[App.tsx] Enviando mensaje a la API...', { sessionId, content });

    try {
      let responseText = '';
      let responseStep: string | undefined;

      if (!sessionId) {
        const response = await startChatSession(content);
        setSessionId(response.session_id);
        responseText = response.reply;
        responseStep = response.step;

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseText,
          step: responseStep,
          options: response.options,
          inactivity_status: response.inactivity_status,
          timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const response = await sendChatMessage(sessionId, content);
        responseText = response.reply;
        responseStep = response.step;

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseText,
          step: responseStep,
          options: response.options,
          inactivity_status: response.inactivity_status,
          timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Si la sesión terminó por respuesta del usuario, mantener UI 12 segundos para lectura.
        if (response.finished || response.step === 'finished') {
          console.log('[App.tsx] Sesión finalizada por el backend. Se mantiene UI 12s.');
          await startGracefulConversationCleanup(sessionId, false);

          return;
        }
      }

      console.log('[App.tsx] Respuesta recibida de la API:', { responseText, responseStep });
    } catch (error: unknown) {
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
          isLoading={isLoading || isClosingGracePeriod}
          currentStep={currentStep}
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
