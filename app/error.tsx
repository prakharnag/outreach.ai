'use client';

import { useEffect } from 'react';
import { Button } from '../components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen gradient-blue flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-white mb-4">Something went wrong!</h2>
        <p className="text-blue-100 mb-6">
          We encountered an error while loading your dashboard. Please try again.
        </p>
        <div className="space-y-3">
          <Button 
            onClick={reset}
            className="w-full bg-white text-blue-600 hover:bg-blue-50"
          >
            Try again
          </Button>
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="w-full border-white text-white hover:bg-white hover:text-blue-600"
          >
            Go to homepage
          </Button>
        </div>
      </div>
    </div>
  );
}