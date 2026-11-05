// Core exports
export * from './interfaces';
export * from './properties';
export * from './vault';

export { EmailThreadParser, parseEmailDate } from './utils/Email/EmailThreadParser';
export type { ParsedEmail } from './utils/Email/EmailThreadParser';
export { EmailIngestionService } from './utils/Email/EmailIngestion';
export type { IngestOptions, IngestResult } from './utils/Email/EmailIngestion';
