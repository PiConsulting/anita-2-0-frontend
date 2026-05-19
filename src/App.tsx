import { useState, useEffect, useRef } from 'react';
import { Building2, Moon, Sun } from 'lucide-react';
import ChatWindow from './components/chat/ChatWindow';
import InputArea from './components/chat/InputArea';
import type { Message } from './types/index';
import { startChatSession, sendChatMessage, closeChatSession } from './services/api';

const CACHE_KEY = 'rag_chat_state';
const EXPIRY_TIME = 48 * 60 * 60 * 1000; // 48 horas en milisegundos

// Idle timeout: minutes from env var, default 15.
const IDLE_TIMEOUT_MS =
  Number(import.meta.env.VITE_SESSION_IDLE_TIMEOUT_MINUTES ?? 15) * 60 * 1000;

interface ChatState {
  sessionId: string;
  messages: Message[];
  timestamp: number;
}

function getCachedState(): ChatState | null {
  if (typeof window === 'undefined') return null;
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;

  try {
    const parsed: ChatState = JSON.parse(cached);
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

  // Ref to keep sessionId always current inside async timeouts (avoid stale closures)
  const sessionIdRef = useRef<string | null>(sessionId);
  sessionIdRef.current = sessionId;

  // Idle session timer: fires when the last message is from the bot and user is inactive
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Efecto para guardar la sesión y mensajes actualizados en caché
  useEffect(() => {
    if (sessionId) {
      const stateToSave: ChatState = {
        sessionId,
        messages,
        timestamp: Date.now() // Renueva el tiempo de vida con cada mensaje
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(stateToSave));

      // Limpiar sessionStorage viejo por si acaso existía de pruebas anteriores
      sessionStorage.removeItem('rag_session_id');
    }
  }, [sessionId, messages]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const clearSession = async (sid: string | null) => {
    if (sid) {
      try { await closeChatSession(sid); } catch { /* silent */ }
    }
    setSessionId(null);
    setMessages([]);
    localStorage.removeItem(CACHE_KEY);
  };

  const handleSendMessage = async (content: string) => {
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
      } else {
        const response = await sendChatMessage(sessionId, content);
        responseText = response.reply;
        responseStep = response.step;

        // Si la sesión terminó (finished o rechazo), limpiar caché y sesión remota
        if (response.finished || response.step === 'finished') {
          console.log('[App.tsx] Sesión finalizada por el backend.');
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: responseText,
            step: responseStep,
            timestamp: new Date().toISOString(),
          };
          setMessages(prev => [...prev, assistantMessage]);
          await clearSession(sessionId);
          return; // early return para no volver a añadir el mensaje abajo
        }
      }

      console.log('[App.tsx] Respuesta recibida de la API:', { responseText, responseStep });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        step: responseStep,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error.message || 'Lo siento, ocurrió un error inesperado.',
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
          <div className="h-[45px] min-w-[45px] px-2 rounded-2xl bg-[var(--interactive-primary)] text-[var(--interactive-contrast)] flex items-center justify-center shadow-[0_10px_24px_rgba(65,143,222,0.3)]">
            <span className="text-sm font-bold tracking-wide">BAC</span>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Anita 2.0</h1>
            <p className="text-xs text-[var(--text-muted)]">Asistente virtual - Banca Empresarial</p>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-5">
          <nav className="hidden md:flex items-center gap-3 text-xs font-bold tracking-wide text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface-accent-soft)] text-[var(--color-primary-cafe)] border border-[var(--border-soft)]">
              <Building2 size={14} />
              Banca Empresarial
            </span>
          </nav>

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
          isLoading={isLoading}
          currentStep={currentStep}
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
