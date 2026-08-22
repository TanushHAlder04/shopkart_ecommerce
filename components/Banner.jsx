'use client'
import React, { useState } from 'react'
import toast from 'react-hot-toast';
import { X, Sparkles } from 'lucide-react';

export default function Banner({ isOpen: controlledIsOpen, setIsOpen: controlledSetIsOpen }) {
    const [internalIsOpen, setInternalIsOpen] = useState(true);

    const isControlled = controlledIsOpen !== undefined && controlledSetIsOpen !== undefined;
    const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
    const setIsOpen = isControlled ? controlledSetIsOpen : setInternalIsOpen;

    const handleClaim = () => {
        setIsOpen(false);
        toast.success('Coupon NEW20 copied to clipboard!');
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText('NEW20');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="w-full px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm text-white bg-gradient-to-r from-violet-600 via-purple-600 to-orange-500 rounded-2xl shadow-lg shadow-purple-950/15 border border-white/20 transition-all duration-300 pointer-events-auto animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
                <div className="flex items-center gap-2 text-left">
                    <span className="hidden sm:flex p-1 bg-white/20 rounded-lg shrink-0">
                        <Sparkles size={14} className="text-yellow-200" />
                    </span>
                    <p className="font-medium tracking-tight">
                        🎉 Get <span className="underline decoration-yellow-300 decoration-2 font-bold">20% OFF</span> on Your First Order with code <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded text-white">NEW20</span>!
                    </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <button
                        onClick={handleClaim}
                        type="button"
                        className="font-semibold text-neutral-900 bg-white hover:bg-neutral-100 active:scale-95 transition-all px-3 py-1 sm:px-4 sm:py-1 rounded-xl text-xs shadow-sm cursor-pointer"
                    >
                        Claim Offer
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        type="button"
                        aria-label="Dismiss notification"
                        className="p-1 hover:bg-white/20 rounded-lg text-white/90 hover:text-white transition-colors cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}