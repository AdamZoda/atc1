import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 4000 }) => {
    useEffect(() => {
        if (duration) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const variants = {
        initial: { opacity: 0, y: 50, scale: 0.9 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 20, scale: 0.95 }
    };

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle size={20} className="text-green-400" />;
            case 'error': return <AlertCircle size={20} className="text-red-400" />;
            default: return <Info size={20} className="text-blue-400" />;
        }
    };

    const getBorderColor = () => {
        switch (type) {
            case 'success': return 'border-green-500/20';
            case 'error': return 'border-red-500/20';
            default: return 'border-blue-500/20';
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[200] pointer-events-none flex flex-col items-end gap-2">
            <motion.div
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={`pointer-events-auto min-w-[300px] max-w-md bg-[#0a0a0a]/95 backdrop-blur-xl border ${getBorderColor()} p-4 rounded-xl shadow-2xl flex items-start gap-4`}
            >
                <div className={`mt-0.5 p-1.5 rounded-lg bg-white/5`}>
                    {getIcon()}
                </div>
                <div className="flex-1">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
                        {type === 'error' ? 'Erreur' : (type === 'success' ? 'Succès' : 'Information')}
                    </h4>
                    <p className="text-xs text-gray-400 leading-relaxed font-medium">
                        {message}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors"
                >
                    <X size={16} />
                </button>
            </motion.div>
        </div>
    );
};

export default Toast;
