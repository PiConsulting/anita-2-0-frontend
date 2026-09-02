import { Component, type ErrorInfo, type ReactNode } from 'react';
import { trackException } from '../services/telemetry';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        trackException(error, {
            source: 'react.error_boundary',
            componentStack: errorInfo.componentStack ?? '',
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)] px-6 text-[var(--text-primary)]">
                    <div className="max-w-md rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-elevated)] p-6 text-center shadow-[0_8px_30px_rgba(65,143,222,0.12)]">
                        <h1 className="text-lg font-bold">Anita no pudo cargar correctamente</h1>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            Intenta recargar la pagina. El incidente ya fue reportado para revision tecnica.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;