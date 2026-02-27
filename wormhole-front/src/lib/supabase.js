import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not found. Running in demo mode.');
}

export const supabase = createClient(
    supabaseUrl || 'https://demo.supabase.co',
    supabaseAnonKey || 'demo-key'
);

// ==========================================
// AUTH HELPERS
// ==========================================

export const signUp = async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { username }
        }
    });
    if (error) throw error;
    return data;
};

export const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    if (error) throw error;
    return data;
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

// OAuth providers
export const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
    return data;
};

export const signInWithGitHub = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
    return data;
};

// ==========================================
// SUBSCRIPTION HELPERS
// ==========================================

export const PLANS = {
    STARTER: {
        id: 'starter',
        name: 'Starter',
        price: 0,
        period: 'forever',
        features: [
            '1 live drone stream',
            '480p streaming quality',
            'Basic telemetry dashboard',
            '7-day recording history',
            'Up to 3 team members',
            'Community support',
        ],
        badge: 'FREE FOREVER',
        color: 'gray',
    },
    PROFESSIONAL: {
        id: 'professional',
        name: 'Professional',
        price: 25000,
        period: '/month per seat',
        features: [
            'Up to 5 simultaneous streams',
            '1080p HD quality',
            'Full telemetry + analytics',
            'Airspace radar (100km range)',
            '30-day recording archive',
            'Up to 15 team members',
            'Industry-specific dashboards',
            'Priority email support',
        ],
        badge: 'MOST POPULAR',
        color: 'primary',
    },
    ENTERPRISE: {
        id: 'enterprise',
        name: 'Enterprise',
        price: null,
        period: 'custom',
        features: [
            'Unlimited streams & 4K quality',
            'Full radar (200km+)',
            'Unlimited recording & archive',
            'Custom API & webhook integration',
            'White-label & custom branding',
            'Dedicated account manager',
            '99.9% SLA guarantee',
            'Unlimited team members',
            'SSO & advanced security',
            'On-premise deployment option',
        ],
        badge: 'CUSTOM PRICING',
        color: 'accent',
    },
};

// Get subscription for a user
export const getSubscription = async (userId) => {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.warn('Subscription fetch error (table may not exist yet):', error.message);
        return null;
    }
    return data;
};

// Create or update subscription
export const upsertSubscription = async (userId, planId, stripeData = {}) => {
    const now = new Date().toISOString();
    // Starter plan: generous 1-year expiry (effectively free forever, renews)
    // Professional: 30 days
    // Enterprise: 365 days
    const expiresAt = planId === 'enterprise' || planId === 'annual'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : planId === 'starter' || planId === 'free_trial'
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('subscriptions')
        .upsert({
            user_id: userId,
            plan_id: planId,
            status: 'active',
            started_at: now,
            expires_at: expiresAt,
            stripe_customer_id: stripeData.customerId || null,
            stripe_subscription_id: stripeData.subscriptionId || null,
            updated_at: now,
        }, { onConflict: 'user_id' })
        .select()
        .single();

    if (error) {
        console.warn('Subscription upsert error:', error.message);
        return null;
    }
    return data;
};

// Check if subscription is active
export const isSubscriptionActive = (subscription) => {
    if (!subscription) return false;
    if (subscription.status !== 'active') return false;
    if (new Date(subscription.expires_at) < new Date()) return false;
    return true;
};

// ==========================================
// STREAM HELPERS
// ==========================================

export const saveStreamKey = async (userId, streamKey, title) => {
    const { data, error } = await supabase
        .from('streams')
        .upsert({
            user_id: userId,
            stream_key: streamKey,
            title: title || 'Untitled Stream',
            is_live: false
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const getUserStreams = async (userId) => {
    const { data, error } = await supabase
        .from('streams')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

export const updateStreamStatus = async (streamId, isLive) => {
    const { data, error } = await supabase
        .from('streams')
        .update({ is_live: isLive })
        .eq('id', streamId)
        .select()
        .single();

    if (error) throw error;
    return data;
};
