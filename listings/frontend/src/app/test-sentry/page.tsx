'use client';

import { useState, useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function TestSentryPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [sentryStatus, setSentryStatus] = useState<{
    enabled: boolean;
    dsn: boolean;
    initialized: boolean;
  }>({
    enabled: false,
    dsn: false,
    initialized: false,
  });

  useEffect(() => {
    // Check Sentry status with a delay to allow initialization
    const checkStatus = () => {
      const enabled = process.env.NEXT_PUBLIC_SENTRY_ENABLE === 'true';
      const dsn = !!process.env.NEXT_PUBLIC_SENTRY_DSN;
      // Check if Sentry client exists (client-side compatible check)
      let initialized = false;
      try {
        // Try to get client - this works in client-side
        const client = (Sentry as any).getClient?.() || (window as any).__SENTRY__?.hub?.getClient?.();
        initialized = !!client;
      } catch (e) {
        // If check fails, assume not initialized
        initialized = false;
      }
      
      setSentryStatus({ enabled, dsn, initialized });
      
      if (enabled && dsn) {
        setTestResults(prev => [...prev, `Sentry Status: Enabled=${enabled}, DSN=${dsn ? 'Set' : 'Not Set'}, Initialized=${initialized ? 'Yes' : 'No'}`]);
        if (!initialized) {
          setTestResults(prev => [...prev, `⚠️ Sentry not initialized yet. Waiting...`]);
        }
      } else {
        setTestResults(prev => [...prev, `⚠️ Sentry is disabled. Set NEXT_PUBLIC_SENTRY_ENABLE=true and NEXT_PUBLIC_SENTRY_DSN in .env.local`]);
      }
    };

    // Check immediately
    checkStatus();
    
    // Check again after a delay to allow initialization
    const timeout = setTimeout(checkStatus, 1000);
    
    return () => clearTimeout(timeout);
  }, []);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testError = () => {
    try {
      addResult('Testing error capture...');
      // Check if Sentry is initialized
      const client = (Sentry as any).getClient?.() || (window as any).__SENTRY__?.hub?.getClient?.();
      if (!client) {
        addResult('❌ Sentry client not initialized. Please refresh the page.');
        return;
      }
      
      const error = new Error('Test error for Sentry - This is intentional!');
      const eventId = Sentry.captureException(error);
      console.log('[SENTRY TEST] Error captured:', error, 'Event ID:', eventId);
      addResult(`✅ Error captured! Event ID: ${eventId || 'pending'}`);
      addResult('Check Sentry dashboard in a few seconds...');
    } catch (error) {
      console.error('[SENTRY TEST] Failed to capture error:', error);
      addResult('❌ Failed to capture error: ' + (error as Error).message);
    }
  };

  const testMessage = () => {
    try {
      addResult('Testing message capture...');
      // Check if Sentry is initialized
      const client = (Sentry as any).getClient?.() || (window as any).__SENTRY__?.hub?.getClient?.();
      if (!client) {
        addResult('❌ Sentry client not initialized. Please refresh the page.');
        return;
      }
      
      const eventId = Sentry.captureMessage('Test message for Sentry - This is intentional!', 'info');
      console.log('[SENTRY TEST] Message captured, Event ID:', eventId);
      addResult(`✅ Message captured! Event ID: ${eventId || 'pending'}`);
      addResult('Check Sentry dashboard in a few seconds...');
    } catch (error) {
      console.error('[SENTRY TEST] Failed to capture message:', error);
      addResult('❌ Failed to capture message: ' + (error as Error).message);
    }
  };

  const testBreadcrumb = () => {
    addResult('Testing breadcrumb...');
    Sentry.addBreadcrumb({
      category: 'test',
      message: 'Test breadcrumb',
      level: 'info',
    });
    addResult('✅ Breadcrumb added');
  };

  const testUserContext = () => {
    addResult('Testing user context...');
    Sentry.setUser({
      id: 'test-user-123',
      username: 'test-user',
      email: 'test@example.com',
    });
    addResult('✅ User context set');
  };

  const testTransaction = async () => {
    addResult('Testing transaction...');
    // Use startSpan for Sentry v7+ (replaces startTransaction)
    Sentry.startSpan({
      name: 'test-transaction',
      op: 'test',
    }, async () => {
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      addResult('✅ Transaction completed');
    });
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sentry Test Page</h1>
          <p className="text-gray-600 mb-8">
            Use this page to test Sentry error tracking and monitoring.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <button
              onClick={testError}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Test Error Capture
            </button>

            <button
              onClick={testMessage}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Test Message Capture
            </button>

            <button
              onClick={testBreadcrumb}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              Test Breadcrumb
            </button>

            <button
              onClick={testUserContext}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
            >
              Test User Context
            </button>

            <button
              onClick={testTransaction}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition"
            >
              Test Transaction
            </button>

            <button
              onClick={clearResults}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
            >
              Clear Results
            </button>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Results</h2>
            <div className="bg-gray-50 rounded p-4 max-h-96 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-gray-500 italic">No tests run yet. Click a button above to start testing.</p>
              ) : (
                <ul className="space-y-2">
                  {testResults.map((result, index) => (
                    <li key={index} className="text-sm font-mono text-gray-700">
                      {result}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Information</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Check your Sentry dashboard to see captured errors and messages</li>
              <li>• Errors are sent asynchronously, so they may take a few seconds to appear</li>
              <li>• Make sure Sentry is enabled in your environment variables</li>
              <li>• Check browser console (F12) for Sentry debug messages</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">🔍 Sentry Status</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Enabled: {sentryStatus.enabled ? '✅ Yes' : '❌ No'}</li>
              <li>• DSN: {sentryStatus.dsn ? '✅ Set' : '❌ Not Set'}</li>
              <li>• Initialized: {sentryStatus.initialized ? '✅ Yes' : '❌ No'}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

