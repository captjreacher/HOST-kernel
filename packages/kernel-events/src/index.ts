export const kernelEventTypes = [
  'objective.created',
  'repository.registered',
  'document.updated',
  'identifier.generated',
  'validation.failed',
  'registry.updated',
] as const;

export type KernelEventType = (typeof kernelEventTypes)[number];

export interface KernelEvent<TType extends KernelEventType = KernelEventType, TPayload extends Record<string, unknown> = Record<string, unknown>> {
  type: TType;
  timestamp: string;
  payload: TPayload;
}
