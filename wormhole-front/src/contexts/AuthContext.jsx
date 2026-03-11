import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, signIn, signUp, signOut, signInWithGoogle, signInWithGitHub } from '../lib/supabase';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isDemo, setIsDemo] = useState(false);
    const [demoStartTime, setDemoStartTime] = useState(null);

    useEffect(() => {
        // Check active session on mount
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setUser(session?.user ?? null);
            } catch (err) {
                console.error('Session check error:', err);
            } finally {
                setLoading(false);
            }
        };

        checkSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setUser(session?.user ?? null);
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const handleSignIn = async (email, password) => {
        try {
            setError(null);
            setLoading(true);

            // DEMO BYPASS for client presentation
            if (email === 'demo@bornebit.com' && password === 'demo123') {
                setUser({
                    id: 'demo-user-123',
                    email: 'demo@bornebit.com',
                    user_metadata: { username: 'Demo User' }
                });
                setIsDemo(true);
                setDemoStartTime(Date.now());
                return;
            }

            await signIn(email, password);
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (email, password, username) => {
        try {
            setError(null);
            setLoading(true);

            // DEMO BYPASS for client presentation
            if (email === 'demo@bornebit.com' && password === 'demo123') {
                setUser({
                    id: 'demo-user-123',
                    email: 'demo@bornebit.com',
                    user_metadata: { username: username || 'Demo User' }
                });
                return;
            }

            await signUp(email, password, username);
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        try {
            setError(null);
            setIsDemo(false);
            setDemoStartTime(null);
            await signOut();
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            setError(null);
            await signInWithGoogle();
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const handleGitHubSignIn = async () => {
        try {
            setError(null);
            await signInWithGitHub();
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const value = {
        user,
        loading,
        error,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
        signInWithGoogle: handleGoogleSignIn,
        signInWithGitHub: handleGitHubSignIn,
        isAuthenticated: !!user,
        isDemo,
        demoStartTime,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
