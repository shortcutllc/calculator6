import { config } from '../config';

export const getBaseUrl = () => {
  if (typeof window === 'undefined') return config.app.baseUrl;
  return window.location.origin;
};

export const createUrl = (path: string, params?: Record<string, string>) => {
  const url = new URL(path, getBaseUrl());
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  return url.toString();
};

export const getProposalUrl = (id: string, shared = false) => {
  const path = `/proposal/${id}`;
  return createUrl(path, shared ? { shared: 'true' } : undefined);
};