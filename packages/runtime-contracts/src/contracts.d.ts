export declare const RUNTIME_CONTRACTS_VERSION: "1.0.0";
export declare const DEFAULT_RUNTIME_CORRELATION_ID: "runtime-correlation-unspecified";
export declare const DEFAULT_RUNTIME_REQUEST_ID: "runtime-request-unspecified";
export declare const DEFAULT_RUNTIME_TIMESTAMP: "1970-01-01T00:00:00.000Z";
export type RuntimeRole = string;
export type RuntimeClaims = Readonly<Record<string, unknown>>;
export type RuntimeAuthenticationMethod = 'anonymous' | 'bearer' | 'session' | 'api-key' | 'mutual-tls' | 'custom';
export type RuntimeLogLevel = 'debug' | 'info' | 'warn' | 'error';
export type RuntimeMetricKind = 'counter' | 'gauge' | 'histogram';
export type RuntimeSpanStatus = 'ok' | 'error';
export interface RuntimePrincipal {
    readonly id: string;
    readonly type?: string | undefined;
}
export interface RuntimeSubject {
    readonly id: string;
    readonly type?: string | undefined;
}
export interface RuntimeTenant {
    readonly id: string;
}
export interface RuntimeAuthenticationMetadata {
    readonly issuer?: string | undefined;
    readonly authenticated_at?: string | undefined;
    readonly session_id?: string | undefined;
    readonly attributes: Readonly<Record<string, unknown>>;
}
export interface RuntimeAuthenticationContext {
    readonly authenticated: boolean;
    readonly principal: RuntimePrincipal;
    readonly subject: RuntimeSubject;
    readonly tenant?: RuntimeTenant | undefined;
    readonly roles: readonly RuntimeRole[];
    readonly claims: RuntimeClaims;
    readonly method: RuntimeAuthenticationMethod;
    readonly metadata: RuntimeAuthenticationMetadata;
}
export interface RuntimeCorrelationContext {
    readonly correlation_id: string;
    readonly request_id: string;
    readonly trace_id?: string | undefined;
    readonly span_id?: string | undefined;
    readonly timestamp: string;
}
export interface RuntimeRequestContext {
    readonly authentication: RuntimeAuthenticationContext;
    readonly correlation: RuntimeCorrelationContext;
    readonly attributes: Readonly<Record<string, unknown>>;
}
export interface RuntimeLogEntry {
    readonly level: RuntimeLogLevel;
    readonly message: string;
    readonly component: string;
    readonly context?: RuntimeRequestContext | undefined;
    readonly attributes?: Readonly<Record<string, unknown>> | undefined;
}
export interface RuntimeLogger {
    log(entry: RuntimeLogEntry): void | Promise<void>;
}
export interface RuntimeMetricRecord {
    readonly name: string;
    readonly kind: RuntimeMetricKind;
    readonly value: number;
    readonly unit?: string | undefined;
    readonly context?: RuntimeRequestContext | undefined;
    readonly attributes?: Readonly<Record<string, unknown>> | undefined;
}
export interface RuntimeMetrics {
    record(metric: RuntimeMetricRecord): void | Promise<void>;
}
export interface RuntimeSpanEvent {
    readonly name: string;
    readonly timestamp?: string | undefined;
    readonly attributes?: Readonly<Record<string, unknown>> | undefined;
}
export interface RuntimeSpanStart {
    readonly name: string;
    readonly context?: RuntimeRequestContext | undefined;
    readonly attributes?: Readonly<Record<string, unknown>> | undefined;
}
export interface RuntimeSpanEnd {
    readonly status: RuntimeSpanStatus;
    readonly attributes?: Readonly<Record<string, unknown>> | undefined;
}
export interface RuntimeSpan {
    addEvent(event: RuntimeSpanEvent): void | Promise<void>;
    end(result: RuntimeSpanEnd): void | Promise<void>;
}
export interface RuntimeTracer {
    startSpan(span: RuntimeSpanStart): RuntimeSpan | Promise<RuntimeSpan>;
}
export interface RuntimeObservability {
    readonly logger?: RuntimeLogger | undefined;
    readonly metrics?: RuntimeMetrics | undefined;
    readonly tracer?: RuntimeTracer | undefined;
}
//# sourceMappingURL=contracts.d.ts.map