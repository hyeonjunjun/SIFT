import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    return (
        <div className="space-y-6 pb-12 max-w-2xl">
            <header>
                <h1 className="text-4xl font-serif font-bold text-ink">Settings</h1>
                <p className="text-stone mt-2 text-lg">Manage your account and preferences.</p>
            </header>

            <div className="space-y-4 pt-4">
                {/* Account Information */}
                <section className="bg-paper border border-separator rounded-2xl p-6">
                    <h2 className="text-lg font-bold font-serif text-ink mb-4">Account Information</h2>
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm font-medium text-stone">Email</p>
                            <p className="text-ink">{user.email}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-stone">User ID</p>
                            <p className="text-ink text-sm font-mono tracking-tighter truncate">{user.id}</p>
                        </div>
                    </div>
                </section>

                {/* Placeholder Options */}
                <section className="bg-paper border border-separator rounded-2xl p-6">
                    <h2 className="text-lg font-bold font-serif text-ink mb-4">Preferences</h2>
                    <div className="flex items-center justify-between py-3 border-b border-separator text-stone">
                        <span>Appearance</span>
                        <span className="text-sm bg-subtle px-2 py-1 rounded-md">System Default</span>
                    </div>
                    <div className="flex items-center justify-between py-3 text-stone">
                        <span>Notifications</span>
                        <span className="text-sm bg-subtle px-2 py-1 rounded-md">Manage on Mobile</span>
                    </div>
                </section>

                {/* Logout Button */}
                <form action="/auth/signout" method="post">
                    <button
                        type="submit"
                        className="w-full mt-6 flex justify-center py-3 px-4 border border-danger/30 rounded-xl text-danger hover:bg-danger/10 transition-colors bg-paper font-medium"
                    >
                        Sign Out
                    </button>
                </form>

            </div>
        </div>
    );
}
