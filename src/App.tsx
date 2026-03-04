import { useState, useEffect } from 'react';
import { Github, Moon, Sun } from 'lucide-react';
import ChatWindow from './components/chat/ChatWindow';
import InputArea from './components/chat/InputArea';
import type { Message } from './types/index';
import { startChatSession, sendChatMessage, closeChatSession } from './services/api';

const CACHE_KEY = 'rag_chat_state';
const EXPIRY_TIME = 48 * 60 * 60 * 1000; // 48 horas en milisegundos

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

      if (!sessionId) {
        const response = await startChatSession(content);
        setSessionId(response.session_id);
        responseText = response.reply;
      } else {
        const response = await sendChatMessage(sessionId, content);
        responseText = response.reply;

        // Si la sesión terminó, limpiamos caché y mandamos a borrar
        if (response.finished) {
          console.log('[App.tsx] Sesión finalizada por el backend. Limpiando caché y cerrando sesión remota...');
          await closeChatSession(sessionId);
          setSessionId(null);
          localStorage.removeItem(CACHE_KEY);
        }
      }

      console.log('[App.tsx] Respuesta recibida de la API:', responseText);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
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

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black transition-colors duration-300 selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-transparent dark:border-neutral-900">
        <div className="flex items-center gap-3 text-black dark:text-white">
          <div className="w-6 h-6 bg-black dark:bg-white rounded-sm rotate-45 flex items-center justify-center overflow-hidden">
            <span className="text-white dark:text-black font-bold text-[10px] -rotate-45">A2</span>
          </div>
          <h1 className="font-extrabold text-lg tracking-tight">Anita 2.0</h1>
        </div>

        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
            <span className="text-black dark:text-white pointer-events-none">Assistant</span>
            <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Documentation</a>
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 text-black dark:text-white transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <a
              href="#"
              className="text-black dark:text-white hover:opacity-50 transition-opacity"
              aria-label="GitHub Repository"
            >
              <Github size={18} />
            </a>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col overflow-hidden max-w-5xl mx-auto w-full">
        <ChatWindow messages={messages} isLoading={isLoading} />
        <InputArea onSendMessage={handleSendMessage} isLoading={isLoading} />
      </main>
    </div>
  );
}

export default App;
