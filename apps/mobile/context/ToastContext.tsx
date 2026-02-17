import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast } from '../components/Toast';

type ToastType = 'success' | 'error';

interface ToastOptions {
    message: string;
    duration?: number;
    type?: ToastType;
    action?: {
        label: string;
        onPress: () => void;
    };
    secondaryAction?: {
        label: string;
        onPress: () => void;
    };
    bottomOffset?: number;
}

interface ToastContextType {
    showToast: (options: string | ToastOptions) => void;
    hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [visible, setVisible] = useState(false);
    const [options, setOptions] = useState<ToastOptions>({
        message: '',
        type: 'success',
    });

    const showToast = useCallback((params: string | ToastOptions) => {
        const newOptions = typeof params === 'string' ? { message: params } : params;
        setOptions({
            type: 'success',
            duration: 3000,
            ...newOptions,
        });
        setVisible(true);
    }, []);

    const hideToast = useCallback(() => {
        setVisible(false);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, hideToast }}>
            {children}
            <Toast
                visible={visible}
                onHide={hideToast}
                message={options.message}
                duration={options.duration}
                type={options.type}
                action={options.action}
                secondaryAction={options.secondaryAction}
                bottomOffset={options.bottomOffset}
            />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
