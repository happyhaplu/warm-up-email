import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../lib/auth-context';
import { useEffect } from 'react';

// Initialize scalable warmup system (production only, not during build)
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
  // Server-side only
  import('../lib/warmup-init-v3').then(({ initializeScalableWarmup }) => {
    initializeScalableWarmup();
  }).catch(err => {
    console.error('Failed to initialize warmup:', err);
  });
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
