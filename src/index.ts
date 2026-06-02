// Public surface of telegram-bot-kit: the cross-bot kernel.
//
// Pure utilities (no network, no clock of their own): types, days, schedule,
// arabic. Side-effecting helpers: env (.env loader), logger (console), send
// (grammy plain-text wrapper). Bots consume this as TypeScript source through
// tsx, exactly like their own code.

export * from './types';
export * from './days';
export * from './schedule';
export * from './arabic';
export * from './env';
export * from './logger';
export * from './send';
