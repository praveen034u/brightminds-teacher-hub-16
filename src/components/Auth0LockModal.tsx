import { useEffect, useRef, useCallback } from 'react';
import Auth0Lock from 'auth0-lock';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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

  const initLock = useCallback(() => {
    if (!containerRef.current) return;

    // Destroy previous instance
    if (lockRef.current) {
      try { lockRef.current.hide(); } catch {}
      lockRef.current = null;
    }

    const lock = new (Auth0Lock as any)(AUTH0_CLIENT_ID, AUTH0_DOMAIN, {
      container: 'auth0-lock-container',
      closable: false,
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

    lock.on('authenticated', (authResult: any) => {
      console.log('✅ Auth0 Lock authenticated');
      lock.hide();
      onClose();
      // Reload to let Auth0React SDK pick up the session
      window.location.reload();
    });

    lock.on('authorization_error', (err: any) => {
      console.error('❌ Auth0 Lock auth error:', err);
    });

    lockRef.current = lock;
    lock.show();
  }, [screenHint, loginHint, onClose]);

  useEffect(() => {
    if (open) {
      // Small delay to ensure the container div is mounted
      const timer = setTimeout(initLock, 100);
      return () => clearTimeout(timer);
    } else {
      if (lockRef.current) {
        try { lockRef.current.hide(); } catch {}
        lockRef.current = null;
      }
    }
  }, [open, initLock]);

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
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none bg-transparent shadow-none [&>button]:hidden">
        <DialogTitle className="sr-only">Sign In</DialogTitle>
        <DialogDescription className="sr-only">
          Sign in to your BrightMinds account
        </DialogDescription>
        <div
          id="auth0-lock-container"
          ref={containerRef}
          className="w-full min-h-[400px]"
        />
      </DialogContent>
    </Dialog>
  );
};

export default Auth0LockModal;
