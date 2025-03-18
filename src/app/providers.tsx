'use client';

import { ReactNode, useEffect } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import PostHogPageView from './PostHogPageView';

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!posthog.__loaded) {
      try {
        posthog.init(
          process.env.NEXT_PUBLIC_POSTHOG_KEY || '',
          {
            api_host: '/ingest',
            ui_host: 'https://eu.posthog.com',
            loaded: (posthog) => {
              if (process.env.NODE_ENV === 'development') posthog.debug();
            },
            capture_pageview: false,
            capture_pageleave: true,
            persistence: 'localStorage+cookie',
            disable_session_recording: false,
            autocapture: true,
            disable_compression: false,
            request_batching: true
          }
        );
      } catch (error) {
        console.error('PostHog initialization error:', error);
      }
    }
  }, []);

  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PHProvider>
  );
} 