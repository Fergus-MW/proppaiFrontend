// Type declarations for PostHog
interface Window {
  posthog?: {
    identify: (id: string, traits?: Record<string, unknown>) => void;
    reset: () => void;
    __loaded?: boolean;
    debug?: () => void;
    capture?: (event: string, properties?: Record<string, unknown>) => void;
  };
}

// No export needed 