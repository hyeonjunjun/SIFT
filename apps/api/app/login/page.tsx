import LoginForm from '@/components/LoginForm';

export const metadata = {
    title: 'Login to SIFT',
    description: 'Access your digital mind.',
};

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-canvas flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
                <div className="w-12 h-12 bg-ink rounded-xl flex items-center justify-center mb-6 shadow-medium">
                    <span className="text-canvas font-serif font-bold text-2xl leading-none">S</span>
                </div>
                <h2 className="mt-2 text-center text-3xl font-serif font-bold tracking-tight text-ink">
                    Curate your digital mind
                </h2>
                <p className="mt-2 text-center text-sm text-stone">
                    Sign in to access your SIFT library
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-paper py-8 px-4 sm:rounded-2xl sm:px-10 border border-separator shadow-sm">
                    <LoginForm />
                </div>
            </div>
        </div>
    );
}
