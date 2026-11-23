export interface MockDocRef {
  readonly __mockType: 'doc';
  readonly collectionName: string;
  readonly id: string;
}

export interface MockCollectionRef {
  readonly __mockType: 'collection';
  readonly collectionName: string;
}

export interface MockOrderByConstraint {
  readonly __constraintType: 'orderBy';
  readonly field: string;
  readonly direction: 'asc' | 'desc';
}

export interface MockWhereConstraint {
  readonly __constraintType: 'where';
  readonly field: string;
  readonly op: string;
  readonly value: unknown;
}

export type MockQueryConstraint = MockOrderByConstraint | MockWhereConstraint;

export interface MockQueryRef {
  readonly __mockType: 'query';
  readonly collectionName: string;
  readonly constraints: MockQueryConstraint[];
}

export interface MockDocSnapshot {
  readonly id: string;
  readonly ref: MockDocRef;
  exists: () => boolean;
  data: () => Record<string, unknown> | undefined;
}

export interface MockQueryDocSnapshot {
  readonly id: string;
  readonly ref: MockDocRef;
  data: () => Record<string, unknown>;
}

export interface MockQuerySnapshot {
  readonly docs: MockQueryDocSnapshot[];
  readonly empty: boolean;
  readonly size: number;
  forEach: (callback: (docSnap: MockQueryDocSnapshot) => void) => void;
}

export interface MockWriteBatch {
  set: <T extends object>(ref: MockDocRef, data: T, options?: { merge?: boolean }) => void;
  delete: (ref: MockDocRef) => void;
  commit: () => Promise<void>;
}

/**
 * Checks if running in Playwright E2E test environment
 * (via injected __PLAYWRIGHT_TEST__, port 5177, or navigator.webdriver).
 */
export const isTestEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.__PLAYWRIGHT_TEST__ ||
      (window.location && window.location.port === '5177') ||
      (typeof navigator !== 'undefined' && navigator.webdriver)
  );
};

const getMockStore = (): Record<string, Record<string, unknown>[]> => {
  if (!window.__MOCK_DB_DATA__) {
    window.__MOCK_DB_DATA__ = {};
  }
  return window.__MOCK_DB_DATA__;
};

const getCollectionData = (collectionName: string): Record<string, unknown>[] => {
  const store = getMockStore();
  if (!Array.isArray(store[collectionName])) {
    store[collectionName] = [];
  }
  return store[collectionName];
};

const setCollectionData = (collectionName: string, data: Record<string, unknown>[]): void => {
  const store = getMockStore();
  store[collectionName] = data;
};

export const mockCollection = (collectionName: string): MockCollectionRef => ({
  __mockType: 'collection',
  collectionName,
});

export const mockDoc = (collectionName: string, docId: string): MockDocRef => ({
  __mockType: 'doc',
  collectionName,
  id: docId,
});

export const mockOrderBy = (
  field: string,
  direction: 'asc' | 'desc' = 'asc'
): MockOrderByConstraint => ({
  __constraintType: 'orderBy',
  field,
  direction,
});

export const mockWhere = (
  field: string,
  op: string,
  value: unknown
): MockWhereConstraint => ({
  __constraintType: 'where',
  field,
  op,
  value,
});

export const mockQuery = (
  colRef: MockCollectionRef,
  ...constraints: MockQueryConstraint[]
): MockQueryRef => ({
  __mockType: 'query',
  collectionName: colRef.collectionName,
  constraints,
});

function compareFieldValues(valA: unknown, valB: unknown): number {
  if (typeof valA === 'number' && typeof valB === 'number') {
    return valA - valB;
  }
  if (typeof valA === 'string' && typeof valB === 'string') {
    return valA.localeCompare(valB);
  }
  const strA = valA === undefined || valA === null ? '' : String(valA);
  const strB = valB === undefined || valB === null ? '' : String(valB);
  return strA < strB ? -1 : strA > strB ? 1 : 0;
}

const buildQuerySnapshot = (
  collectionName: string,
  constraints: MockQueryConstraint[] = []
): MockQuerySnapshot => {
  let items = [...getCollectionData(collectionName)];

  for (const constraint of constraints) {
    if (constraint.__constraintType === 'where') {
      if (constraint.op === '==') {
        items = items.filter((item) => item[constraint.field] === constraint.value);
      }
    } else if (constraint.__constraintType === 'orderBy') {
      const { field, direction } = constraint;
      items.sort((a, b) => {
        const cmp = compareFieldValues(a[field], b[field]);
        return direction === 'asc' ? cmp : -cmp;
      });
    }
  }

  const docs: MockQueryDocSnapshot[] = items.map((item) => {
    const docId = String(item.id ?? '');
    return {
      id: docId,
      ref: mockDoc(collectionName, docId),
      data: () => item,
    };
  });

  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (cb: (docSnap: MockQueryDocSnapshot) => void) => {
      docs.forEach(cb);
    },
  };
};

export const mockGetDoc = async (docRef: MockDocRef): Promise<MockDocSnapshot> => {
  const found = getCollectionData(docRef.collectionName).find((d) => d.id === docRef.id);
  return {
    id: docRef.id,
    ref: docRef,
    exists: () => !!found,
    data: () => found,
  };
};

export const mockSetDoc = async <T extends object>(
  docRef: MockDocRef,
  data: T,
  options?: { merge?: boolean }
): Promise<void> => {
  const current = [...getCollectionData(docRef.collectionName)];
  const index = current.findIndex((d) => d.id === docRef.id);
  const existing = index >= 0 ? current[index] : {};
  const payload = data as Record<string, unknown>;
  const nextDoc: Record<string, unknown> =
    options?.merge && index >= 0
      ? { ...existing, ...payload, id: docRef.id }
      : { ...payload, id: docRef.id };

  if (index >= 0) {
    current[index] = nextDoc;
  } else {
    current.push(nextDoc);
  }
  setCollectionData(docRef.collectionName, current);
};

export const mockDeleteDoc = async (docRef: MockDocRef): Promise<void> => {
  const current = getCollectionData(docRef.collectionName);
  setCollectionData(
    docRef.collectionName,
    current.filter((d) => d.id !== docRef.id)
  );
};

export const mockGetDocs = async (
  target: MockCollectionRef | MockQueryRef
): Promise<MockQuerySnapshot> => {
  const constraints = target.__mockType === 'query' ? target.constraints : [];
  return buildQuerySnapshot(target.collectionName, constraints);
};

export function mockOnSnapshot(
  target: MockDocRef,
  onNext: (snapshot: MockDocSnapshot) => void,
  onError?: (error: unknown) => void
): () => void;
export function mockOnSnapshot(
  target: MockCollectionRef | MockQueryRef,
  onNext: (snapshot: MockQuerySnapshot) => void,
  onError?: (error: unknown) => void
): () => void;
export function mockOnSnapshot(
  target: MockDocRef | MockCollectionRef | MockQueryRef,
  onNext: ((snapshot: MockDocSnapshot) => void) | ((snapshot: MockQuerySnapshot) => void),
  onError?: (error: unknown) => void
): () => void {
  try {
    if (target.__mockType === 'doc') {
      const found = getCollectionData(target.collectionName).find((d) => d.id === target.id);
      (onNext as (snapshot: MockDocSnapshot) => void)({
        id: target.id,
        ref: target,
        exists: () => !!found,
        data: () => found,
      });
    } else {
      const constraints = target.__mockType === 'query' ? target.constraints : [];
      (onNext as (snapshot: MockQuerySnapshot) => void)(
        buildQuerySnapshot(target.collectionName, constraints)
      );
    }
  } catch (err) {
    if (onError) onError(err);
  }
  return () => {};
}

export const mockWriteBatch = (): MockWriteBatch => {
  const operations: Array<
    | { type: 'set'; ref: MockDocRef; data: Record<string, unknown>; options?: { merge?: boolean } }
    | { type: 'delete'; ref: MockDocRef }
  > = [];

  return {
    set: (ref, data, options) => {
      operations.push({ type: 'set', ref, data: data as Record<string, unknown>, options });
    },
    delete: (ref) => {
      operations.push({ type: 'delete', ref });
    },
    commit: async () => {
      for (const op of operations) {
        if (op.type === 'set') {
          await mockSetDoc(op.ref, op.data, op.options);
        } else {
          await mockDeleteDoc(op.ref);
        }
      }
    },
  };
};
