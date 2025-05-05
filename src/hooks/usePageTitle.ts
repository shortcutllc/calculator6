import { useEffect } from 'react';
import { config } from '../config';

export function usePageTitle(title: string) {
  useEffect(() => {
    const baseTitle = config.app.name;
    document.title = title ? `${title} | ${baseTitle}` : baseTitle;

    return () => {
      document.title = baseTitle;
    };
  }, [title]);
}