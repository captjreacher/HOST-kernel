import type {
  KernelConfidenceInput,
  KernelContextRecordInput,
  KernelContextRuntimeAdapter,
  KernelContextRuntimeCreateError,
  KernelContextRuntimeKind,
  KernelContextRuntimeMetadata,
  KernelContextRuntimeValidationResult,
  KernelContextRuntimeValue,
  KernelContextRuntimeVersion,
  KernelContextReferenceInput,
  KernelFreshnessInput,
  KernelProvenanceInput,
  KernelRuntimeAdapterHost,
  KernelRuntimeConfidence,
  KernelRuntimeContextRecord,
  KernelRuntimeContextReference,
  KernelRuntimeContextSnapshot,
  KernelRuntimeFreshness,
  KernelRuntimeProvenance,
  KernelContextSnapshotInput,
} from '@host/kernel-core';
import type { ValidationIssue, ValidationReferenceKind } from '@host/kernel-types';

export type ContextRuntimeKind = KernelContextRuntimeKind;
export type ContextRuntimeMetadata = KernelContextRuntimeMetadata;
export type RuntimeContextReference = KernelRuntimeContextReference;
export type RuntimeConfidence = KernelRuntimeConfidence;
export type RuntimeFreshness = KernelRuntimeFreshness;
export type RuntimeProvenance = KernelRuntimeProvenance;
export type RuntimeContextRecord = KernelRuntimeContextRecord;
export type RuntimeContextSnapshot = KernelRuntimeContextSnapshot;
export type ContextRuntimeValue = KernelContextRuntimeValue;
export type ContextRuntimeVersion = KernelContextRuntimeVersion;

export interface ContextRuntimeOptions {
  readonly now?: (() => string) | undefined;
  readonly version?: string | undefined;
}

export type ContextReferenceInput = KernelContextReferenceInput;
export type ConfidenceInput = KernelConfidenceInput;
export type FreshnessInput = KernelFreshnessInput;
export type ProvenanceInput = KernelProvenanceInput;
export type ContextRecordInput = KernelContextRecordInput;
export type ContextSnapshotInput = KernelContextSnapshotInput;
export type ContextRuntimeValidationResult = KernelContextRuntimeValidationResult;

export interface ContextRuntimeErrorOptions {
  readonly issues?: readonly ValidationIssue[] | undefined;
}

export class ContextRuntimeError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(message: string, options: ContextRuntimeErrorOptions = {}) {
    super(message);
    this.name = 'ContextRuntimeError';
    this.issues = options.issues ?? [];
  }
}

export interface ContextRuntime extends KernelContextRuntimeAdapter {
  readonly kernel: KernelRuntimeAdapterHost;
}

export type ContextRuntimeCreateError = KernelContextRuntimeCreateError;
