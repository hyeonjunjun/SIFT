import Sidebar from '@/components/Sidebar';

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-canvas">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-5xl mx-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
