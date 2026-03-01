import { useEffect, useRef, useCallback, useState } from 'react';
import Auth0Lock from 'auth0-lock';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

const AUTH0_DOMAIN = 'dev-jbrriuc5vyjmiwtx.us.auth0.com';
const AUTH0_CLIENT_ID = 'hRgZXlSYVCedu8jYuTWadyoTA3T8EISD';

interface Auth0LockModalProps {
  open: boolean;
  onClose: () => void;
  screenHint?: 'signup' | 'login';
  loginHint?: string;
}

const Auth0LockModal = ({ open, onClose, screenHint, loginHint }: Auth0LockModalProps) => {
  const lockRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lockConfigKeyRef = useRef('');
  const [isWidgetReady, setIsWidgetReady] = useState(false);

  const initLock = useCallback(() => {
    if (!containerRef.current) return;

    const configKey = `${screenHint ?? 'login'}::${loginHint ?? ''}`;
    if (lockRef.current && lockConfigKeyRef.current === configKey) {
      return;
    }

    // Recreate only when mode/prefill changes
    if (lockRef.current) {
      try {
        lockRef.current.hide();
      } catch {}
      lockRef.current = null;
    }

    const lock = new (Auth0Lock as any)(AUTH0_CLIENT_ID, AUTH0_DOMAIN, {
      container: 'auth0-lock-container',
      closable: false,
      sso: false,
      auth: {
        redirect: false,
        responseType: 'token id_token',
        audience: `https://${AUTH0_DOMAIN}/userinfo`,
        params: {
          scope: 'openid profile email',
        },
      },
      initialScreen: screenHint === 'signup' ? 'signUp' : 'login',
      prefill: loginHint ? { email: loginHint } : undefined,
      theme: {
        primaryColor: '#7c3aed',
        logo: '/brightminds-logo1.png',
      },
      languageDictionary: {
        title: '',
      },
    });

    lock.on('show', () => {
      setIsWidgetReady(true);
    });

    lock.on('authenticated', (authResult: any) => {
      console.log('✅ Auth0 Lock authenticated');
      lock.hide();
      onClose();
      window.location.reload();
    });

    lock.on('authorization_error', (err: any) => {
      console.error('❌ Auth0 Lock auth error:', err);
    });

    lockRef.current = lock;
    lockConfigKeyRef.current = configKey;
  }, [screenHint, loginHint, onClose]);

  useEffect(() => {
    if (open) {
      setIsWidgetReady(false);
      const raf = requestAnimationFrame(() => {
        initLock();
        try {
          lockRef.current?.show();
        } catch {}
      });
      return () => cancelAnimationFrame(raf);
    }

    const raf = requestAnimationFrame(() => {
      try {
        lockRef.current?.hide();
      } catch {}
    });
    return () => cancelAnimationFrame(raf);
  }, [open, initLock]);

  // Warm up Lock instance on mount so first open is faster
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!open) {
        initLock();
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initLock, open]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (lockRef.current) {
        try {
          lockRef.current.hide();
        } catch {}
        lockRef.current = null;
      }
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent forceMount className="sm:max-w-[450px] p-0 overflow-hidden border-none bg-transparent shadow-none [&>button]:hidden">
        <DialogTitle className="sr-only">Sign In</DialogTitle>
        <DialogDescription className="sr-only">
          Sign in to your BrightMinds account
        </DialogDescription>
        {!isWidgetReady && open && (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading sign-in…</p>
          </div>
        )}
        <div
          id="auth0-lock-container"
          ref={containerRef}
          className={`w-full min-h-[400px] ${!isWidgetReady && open ? 'opacity-0 absolute' : ''}`}
        />
      </DialogContent>
    </Dialog>
  );
};

export default Auth0LockModal;
