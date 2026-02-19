'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setErrorMsg(error.message);
            setLoading(false);
        } else {
            router.push('/');
            router.refresh(); // Crucial for middleware to pick up new cookies instantly
        }
    };

    return (
        <form onSubmit={handleLogin} className="space-y-6">
            {errorMsg && (
                <div className="bg-danger/10 text-danger p-3 rounded-xl text-sm border border-danger/20">
                    {errorMsg}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-ink">Email address</label>
                <div className="mt-1">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="block w-full appearance-none rounded-xl border border-separator bg-canvas px-3 py-2 text-ink placeholder-stone focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink sm:text-sm"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-ink">Password</label>
                <div className="mt-1">
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="block w-full appearance-none rounded-xl border border-separator bg-canvas px-3 py-2 text-ink placeholder-stone focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink sm:text-sm"
                    />
                </div>
            </div>

            <div>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full justify-center rounded-xl border border-transparent bg-ink py-2.5 px-4 text-sm font-medium text-paper hover:bg-ink/90 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 disabled:opacity-50 transition-colors"
                >
                    {loading ? 'Signing in...' : 'Sign in'}
                </button>
            </div>
        </form>
    );
}
