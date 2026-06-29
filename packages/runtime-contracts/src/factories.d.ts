import type { RuntimeAuthenticationContext, RuntimeAuthenticationMetadata, RuntimeClaims, RuntimeCorrelationContext, RuntimeObservability, RuntimePrincipal, RuntimeRequestContext, RuntimeSubject, RuntimeTenant } from './contracts.js';
export interface RuntimeAuthenticationMetadataInput {
    readonly issuer?: string | undefined;
    readonly authenticated_at?: string | undefined;
    readonly session_id?: string | undefined;
    readonly attributes?: Readonly<Record<string, unknown>> | undefined;
}
export interface RuntimeAuthenticationContextInput {
    readonly authenticated?: boolean | undefined;
    readonly principal?: RuntimePrincipal | string | undefined;
    readonly subject?: RuntimeSubject | string | undefined;
    readonly tenant?: RuntimeTenant | string | undefined;
    readonly roles?: readonly string[] | undefined;
    readonly claims?: RuntimeClaims | undefined;
    readonly method?: RuntimeAuthenticationContext['method'] | undefined;
    readonly metadata?: RuntimeAuthenticationMetadataInput | undefined;
}
export interface RuntimeCorrelationContextInput {
    readonly correlation_id?: string | undefined;
    readonly request_id?: string | undefined;
    readonly trace_id?: string | undefined;
    readonly span_id?: string | undefined;
    readonly timestamp?: string | undefined;
}
export interface RuntimeRequestContextInput {
    readonly authentication?: RuntimeAuthenticationContextInput | undefined;
    readonly correlation?: RuntimeCorrelationContextInput | undefined;
    readonly attributes?: Readonly<Record<string, unknown>> | undefined;
}
export declare const createRuntimeAuthenticationMetadata: (input?: RuntimeAuthenticationMetadataInput) => RuntimeAuthenticationMetadata;
export declare const createRuntimeAuthenticationContext: (input?: RuntimeAuthenticationContextInput) => RuntimeAuthenticationContext;
export declare const createRuntimeCorrelationContext: (input?: RuntimeCorrelationContextInput) => RuntimeCorrelationContext;
export declare const createRuntimeRequestContext: (input?: RuntimeRequestContextInput) => RuntimeRequestContext;
export declare const createRuntimeObservability: (input?: RuntimeObservability) => RuntimeObservability;
//# sourceMappingURL=factories.d.ts.map