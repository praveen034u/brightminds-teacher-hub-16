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
  const preWarmedRef = useRef(false);

  const initLock = useCallback(() => {
    if (!containerRef.current) return;

    const configKey = `${screenHint ?? 'login'}::${loginHint ?? ''}`;
    if (lockRef.current && lockConfigKeyRef.current === configKey) {
      return;
    }

    if (lockRef.current) {
      try { lockRef.current.hide(); } catch {}
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
        params: { scope: 'openid profile email' },
      },
      initialScreen: screenHint === 'signup' ? 'signUp' : 'login',
      prefill: loginHint ? { email: loginHint } : undefined,
      theme: {
        primaryColor: '#7c3aed',
        logo: '/brightminds-logo1.png',
      },
      languageDictionary: { title: '' },
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

  // Pre-warm: init + show the widget hidden on mount so it's fully cached
  useEffect(() => {
    if (preWarmedRef.current) return;
    preWarmedRef.current = true;

    // Small delay to not block initial page render
    const timer = window.setTimeout(() => {
      initLock();
      try {
        lockRef.current?.show();
      } catch {}
    }, 100);

    return () => window.clearTimeout(timer);
  }, [initLock]);

  // When modal opens, widget is already rendered — just mark ready or re-show
  useEffect(() => {
    if (open) {
      if (lockRef.current && lockConfigKeyRef.current === `${screenHint ?? 'login'}::${loginHint ?? ''}`) {
        // Already pre-warmed with same config — mark ready immediately
        setIsWidgetReady(true);
        try { lockRef.current?.show(); } catch {}
      } else {
        setIsWidgetReady(false);
        requestAnimationFrame(() => {
          initLock();
          try { lockRef.current?.show(); } catch {}
        });
      }
    } else {
      // Don't hide/destroy — keep cached. Just reset ready state for next open.
    }
  }, [open, initLock, screenHint, loginHint]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (lockRef.current) {
        try { lockRef.current.hide(); } catch {}
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
          className={`w-full min-h-[400px] ${!open ? 'opacity-0 h-0 overflow-hidden pointer-events-none' : !isWidgetReady ? 'opacity-0 absolute' : ''}`}
        />
      </DialogContent>
    </Dialog>
  );
};

export default Auth0LockModal;
