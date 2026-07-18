import { CaptureSearchContext, SearchableField, SearchableScalar } from '../types/capture-search';

export const CAPTURE_SEARCHABLE_FIELDS: SearchableField[] = [
  {
    id: 'title',
    sqlColumn: 'title',
    getValue: ({ capture }) => capture.title
  },
  {
    id: 'content',
    sqlColumn: 'content',
    getValue: ({ capture }) => capture.content
  },
  {
    id: 'url',
    sqlColumn: 'url',
    getValue: ({ capture }) => capture.url
  },
  {
    id: 'source',
    sqlColumn: 'source',
    getValue: ({ capture }) => capture.source
  },
  {
    id: 'summary',
    getValue: ({ understand }) => understand?.summary
  },
  {
    id: 'topics',
    getValue: ({ understand }) => understand?.topics
  },
  {
    id: 'targetAudience',
    getValue: ({ understand }) => understand?.targetAudience
  },
  {
    id: 'lens',
    getValue: ({ classify }) => classify?.lens
  },
  {
    id: 'contentType',
    getValue: ({ classify }) => classify?.contentType
  },
  {
    id: 'viewerExpectation',
    getValue: ({ enrich }) => {
      if (!enrich) {
        return null;
      }
      return [...enrich.viewerExpectation.youWillGet, ...enrich.viewerExpectation.youWillNotGet];
    }
  },
  {
    id: 'recommendation',
    getValue: ({ evaluate }) => evaluate?.recommendation
  }
];

export const normalizeSearchQuery = (query: string): string => query.trim().toLowerCase();

export const flattenSearchableValue = (value: SearchableScalar): string[] => {
  if (value == null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenSearchableValue(item));
  }

  const text = String(value).trim();
  return text ? [text.toLowerCase()] : [];
};

export const getSearchableFieldValues = (
  context: CaptureSearchContext,
  fields: SearchableField[] = CAPTURE_SEARCHABLE_FIELDS
): string[] =>
  fields.flatMap((field) => flattenSearchableValue(field.getValue(context)));

export const matchesCaptureSearch = (
  context: CaptureSearchContext,
  query: string,
  fields: SearchableField[] = CAPTURE_SEARCHABLE_FIELDS
): boolean => {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) {
    return true;
  }

  return getSearchableFieldValues(context, fields).some((value) => value.includes(normalizedQuery));
};

export const getSqlCaptureSearchColumns = (
  fields: SearchableField[] = CAPTURE_SEARCHABLE_FIELDS
): Array<keyof CaptureSearchContext['capture']> =>
  fields.flatMap((field) => (field.sqlColumn ? [field.sqlColumn] : []));

export const buildCaptureSqlSearchClause = (
  fields: SearchableField[] = CAPTURE_SEARCHABLE_FIELDS
): string => {
  const columns = getSqlCaptureSearchColumns(fields);
  if (columns.length === 0) {
    return '1 = 0';
  }

  return columns.map((column) => `LOWER(${column}) LIKE ?`).join(' OR ');
};

export const buildCaptureSqlSearchParams = (
  query: string,
  status?: string,
  fields: SearchableField[] = CAPTURE_SEARCHABLE_FIELDS
): unknown[] => {
  const normalizedQuery = normalizeSearchQuery(query);
  const likeQuery = `%${normalizedQuery}%`;
  const columnCount = getSqlCaptureSearchColumns(fields).length;
  const likeParams = Array.from({ length: columnCount }, () => likeQuery);
  return status != null ? [status, ...likeParams] : likeParams;
};

export const buildCaptureSearchContext = (context: CaptureSearchContext): CaptureSearchContext => context;
