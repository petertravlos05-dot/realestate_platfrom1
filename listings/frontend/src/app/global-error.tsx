/**
 * Global Error Handler for Next.js App Router
 * 
 * This file catches React rendering errors and reports them to Sentry.
 * Required for proper error tracking in Next.js App Router.
 */

'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1>Something went wrong!</h1>
          <p>An error occurred. Please try again.</p>
          <button
            onClick={reset}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}




