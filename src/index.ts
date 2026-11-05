// Core exports
export * from './interfaces';
export * from './properties';
export * from './vault';

export { EmailThreadParser, parseEmailDate } from './utils/EmailThreadParser';
export type { ParsedEmail } from './utils/EmailThreadParser';
export { EmailIngestionService } from './utils/EmailIngestion';
export type { IngestOptions, IngestResult } from './utils/EmailIngestion';
