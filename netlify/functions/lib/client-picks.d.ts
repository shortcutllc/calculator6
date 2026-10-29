// Types for client-picks.js, so the staff screens share the server's rules.

export const OPTION_FIELDS: string[];
export function effectiveService<T extends Record<string, any>>(service: T): T;
export function clientIncluded(data: any, location: string, date: string, index: number, service: any): boolean;
