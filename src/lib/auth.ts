export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  getIdToken: () => Promise<string>;
}

type AuthStateListener = (user: AuthUser | null) => void;

class LocalAuthClient {
  private _currentUser: AuthUser | null = null;
  private token: string | null = null;
  private listeners: Set<AuthStateListener> = new Set();
  private initialized: boolean = false;

  constructor() {
    this.token = localStorage.getItem('aurum_session_token');
    // Asynchronously initialize session check on app start
    this.initSession();
  }

  private wrapUser(userData: { id: string; email: string; displayName?: string; photoURL?: string }): AuthUser {
    const token = this.token || '';
    return {
      uid: userData.id,
      email: userData.email,
      displayName: userData.displayName || 'Aurum Seeker',
      photoURL: userData.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userData.displayName || userData.email)}`,
      getIdToken: async () => this.token || token
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this._currentUser);
      } catch (err) {
        console.error('[AuthClient] Listener notification error:', err);
      }
    }
  }

  public async initSession(): Promise<AuthUser | null> {
    if (this.initialized) return this._currentUser;

    const storedToken = localStorage.getItem('aurum_session_token');
    if (!storedToken) {
      this._currentUser = null;
      this.initialized = true;
      this.notifyListeners();
      return null;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${storedToken}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          this.token = storedToken;
          this._currentUser = this.wrapUser(data.user);
          this.initialized = true;
          this.notifyListeners();
          return this._currentUser;
        }
      }
    } catch (err) {
      console.warn('[AuthClient] Session verification error:', err);
    }

    // Token invalid or expired
    this.token = null;
    this._currentUser = null;
    localStorage.removeItem('aurum_session_token');
    this.initialized = true;
    this.notifyListeners();
    return null;
  }

  public async register(email: string, password: string, displayName: string): Promise<AuthUser> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password, displayName: displayName.trim() })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to register account.');
    }

    this.token = data.token;
    localStorage.setItem('aurum_session_token', data.token);
    this._currentUser = this.wrapUser(data.user);
    this.notifyListeners();
    return this._currentUser;
  }

  public async login(email: string, password: string): Promise<AuthUser> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid credentials.');
    }

    this.token = data.token;
    localStorage.setItem('aurum_session_token', data.token);
    this._currentUser = this.wrapUser(data.user);
    this.notifyListeners();
    return this._currentUser;
  }

  public async logout(): Promise<void> {
    if (this.token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
      } catch {}
    }

    this.token = null;
    this._currentUser = null;
    localStorage.removeItem('aurum_session_token');
    this.notifyListeners();
  }

  public get currentUser(): AuthUser | null {
    return this._currentUser;
  }

  public getCurrentUser(): AuthUser | null {
    return this._currentUser;
  }

  public async signOut(): Promise<void> {
    return this.logout();
  }

  public getToken(): string | null {
    return this.token;
  }

  public onAuthStateChanged(callback: AuthStateListener): () => void {
    this.listeners.add(callback);
    // If already initialized, fire immediately with current state
    if (this.initialized) {
      callback(this._currentUser);
    }
    return () => {
      this.listeners.delete(callback);
    };
  }
}

export const auth = new LocalAuthClient();

export async function signOut(authClient: LocalAuthClient = auth): Promise<void> {
  return authClient.logout();
}
