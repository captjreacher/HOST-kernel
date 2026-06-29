import type { ContextRuntime, ContextRuntimeKind, ContextRuntimeValue } from '@host/context-persistence';
import type { DurableExecutionRecordKind } from './contracts.js';
import { ExecutionPersistenceError } from './contracts.js';

interface DurableExecutionRuntimeValue {
  readonly runtime_kind: ContextRuntimeKind;
  readonly runtime_version: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly payload: unknown;
}

const durableKinds = new Set<DurableExecutionRecordKind>([
  'execution-workflow-definition',
  'execution-workflow-instance',
  'execution-instance',
  'execution-dispatch-record',
  'execution-event-history',
]);

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const notBlank = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const stable = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => stable(entry));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stable(entry)]),
    );
  }

  return value;
};

const deepFreeze = <TValue>(value: TValue): TValue => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    if (nested && typeof nested === 'object') {
      deepFreeze(nested);
    }
  }

  return value;
};

const unsupported = (operation: string): never => {
  throw new ExecutionPersistenceError(
    'execution-persistence.provider-failure',
    `Durable execution persistence runtime does not support ${operation}; persistence is limited to serialization, deserialization, cloning, and equality.`,
  );
};

class DurableExecutionPersistenceRuntime implements ContextRuntime {
  readonly kernel = {} as ContextRuntime['kernel'];
  readonly #version: string;

  constructor(version = '1.0.0') {
    this.#version = version;
  }

  get version() {
    return {
      name: 'context-runtime',
      version: this.#version,
    } as const;
  }

  createReference(): never {
    return unsupported('createReference(...)');
  }

  createConfidence(): never {
    return unsupported('createConfidence(...)');
  }

  createFreshness(): never {
    return unsupported('createFreshness(...)');
  }

  createProvenance(): never {
    return unsupported('createProvenance(...)');
  }

  createRecord(): never {
    return unsupported('createRecord(...)');
  }

  createSnapshot(): never {
    return unsupported('createSnapshot(...)');
  }

  validateReference(): never {
    return unsupported('validateReference(...)');
  }

  validateConfidence(): never {
    return unsupported('validateConfidence(...)');
  }

  validateFreshness(): never {
    return unsupported('validateFreshness(...)');
  }

  validateProvenance(): never {
    return unsupported('validateProvenance(...)');
  }

  validateRecord(): never {
    return unsupported('validateRecord(...)');
  }

  validateSnapshot(): never {
    return unsupported('validateSnapshot(...)');
  }

  isReferenceKind(_kind: string): _kind is never {
    return false;
  }

  serialize(value: ContextRuntimeValue): string {
    return JSON.stringify(stable(value));
  }

  deserialize(value: string | Record<string, unknown>): ContextRuntimeValue {
    const parsed = typeof value === 'string' ? JSON.parse(value) : structuredClone(value);
    if (!isRecord(parsed) || !notBlank(parsed.runtime_kind)) {
      throw new ExecutionPersistenceError('execution-persistence.invalid-record', 'Persisted durable execution records require a runtime_kind discriminator.');
    }

    if (!durableKinds.has(parsed.runtime_kind as DurableExecutionRecordKind)) {
      throw new ExecutionPersistenceError(
        'execution-persistence.invalid-record',
        `Unsupported durable execution runtime kind: ${String(parsed.runtime_kind)}`,
      );
    }

    if (!notBlank(parsed.runtime_version) || !notBlank(parsed.created_at) || !notBlank(parsed.updated_at) || !('payload' in parsed)) {
      throw new ExecutionPersistenceError('execution-persistence.invalid-record', 'Persisted durable execution records require version, timestamps, and payload.');
    }

    return deepFreeze(parsed as unknown as ContextRuntimeValue);
  }

  clone<TValue extends ContextRuntimeValue>(value: TValue): TValue {
    return this.deserialize(this.serialize(value)) as TValue;
  }

  equals(left: ContextRuntimeValue, right: ContextRuntimeValue): boolean {
    return this.serialize(left) === this.serialize(right);
  }

  createValue<TPayload>(
    kind: DurableExecutionRecordKind,
    payload: TPayload,
    timestamps: {
      readonly created_at: string;
      readonly updated_at: string;
    },
  ): DurableExecutionRuntimeValue {
    return deepFreeze({
      runtime_kind: kind as unknown as ContextRuntimeKind,
      runtime_version: this.#version,
      created_at: timestamps.created_at,
      updated_at: timestamps.updated_at,
      payload: structuredClone(payload),
    });
  }
}

export type { DurableExecutionRuntimeValue };

export const createDurableExecutionPersistenceRuntime = (version?: string): DurableExecutionPersistenceRuntime =>
  new DurableExecutionPersistenceRuntime(version);
