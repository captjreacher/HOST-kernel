import type { RegistryRecord } from '@host/kernel-types';

export const createRecordSnapshot = <T extends RegistryRecord>(record: T): T => structuredClone(record);
