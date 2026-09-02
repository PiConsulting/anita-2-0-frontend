import {
    ApplicationInsights,
    DistributedTracingModes,
    SeverityLevel,
} from '@microsoft/applicationinsights-web';

type TelemetryProperties = Record<string, string | number | boolean | undefined>;

const runtimeConfig = window.__RUNTIME_CONFIG__;

const connectionString =
    runtimeConfig?.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING ||
    import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING;
const cloudRoleName =
    runtimeConfig?.VITE_APPINSIGHTS_CLOUD_ROLE_NAME ||
    import.meta.env.VITE_APPINSIGHTS_CLOUD_ROLE_NAME ||
    'anita-frontend';
const telemetryEnabled =
    (runtimeConfig?.VITE_APPINSIGHTS_ENABLED || import.meta.env.VITE_APPINSIGHTS_ENABLED || 'true') !== 'false';

let appInsights: ApplicationInsights | null = null;

const toError = (error: unknown): Error => {
    if (error instanceof Error) return error;
    if (typeof error === 'string') return new Error(error);

    try {
        return new Error(JSON.stringify(error));
    } catch {
        return new Error('Unknown frontend error');
    }
};

const cleanProperties = (properties?: TelemetryProperties): TelemetryProperties | undefined => {
    if (!properties) return undefined;

    return Object.fromEntries(
        Object.entries(properties).filter(([, value]) => value !== undefined)
    );
};

export const initializeTelemetry = () => {
    if (appInsights || !telemetryEnabled) return appInsights;

    if (!connectionString?.trim()) {
        console.warn('VITE_APPLICATIONINSIGHTS_CONNECTION_STRING no esta definido; telemetry deshabilitada.');
        return null;
    }

    appInsights = new ApplicationInsights({
        config: {
            connectionString: connectionString.trim(),
            enableAutoRouteTracking: true,
            enableCorsCorrelation: true,
            distributedTracingMode: DistributedTracingModes.W3C,
            disableAjaxTracking: false,
            disableFetchTracking: false,
        },
    });

    appInsights.loadAppInsights();
    appInsights.addTelemetryInitializer((envelope) => {
        envelope.tags = envelope.tags ?? {};
        envelope.tags['ai.cloud.role'] = cloudRoleName;
        return true;
    });
    appInsights.trackPageView();

    return appInsights;
};

export const trackException = (error: unknown, properties?: TelemetryProperties) => {
    const exception = toError(error);

    if (!appInsights) {
        return;
    }

    appInsights.trackException(
        { exception, severityLevel: SeverityLevel.Error },
        cleanProperties(properties)
    );
};

export const trackErrorTrace = (message: string, properties?: TelemetryProperties) => {
    if (!appInsights) {
        return;
    }

    appInsights.trackTrace(
        { message, severityLevel: SeverityLevel.Error },
        cleanProperties(properties)
    );
};

export const trackBackendHttpError = (properties: TelemetryProperties) => {
    trackException(new Error('Backend HTTP error'), {
        source: 'axios',
        ...properties,
    });
};