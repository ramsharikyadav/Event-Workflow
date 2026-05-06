import React from 'react';
import { Package, LogIn } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';
import { motion } from 'motion/react';

export const Login: React.FC = () => {
  return (
    <div className="min-h-screen bg-natural-bg flex flex-col items-center justify-center p-8 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-12"
      >
        <div className="w-24 h-24 bg-natural-accent rounded-[2rem] flex items-center justify-center mb-6 mx-auto shadow-sm">
          <Package className="text-natural-dark" size={48} />
        </div>
        <h1 className="text-5xl font-serif font-bold text-natural-dark mb-3">MatFlow</h1>
        <p className="text-natural-muted max-w-xs mx-auto leading-relaxed">
          Crafting balance in your material logistics and site management.
        </p>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={signInWithGoogle}
        className="w-full max-w-xs flex items-center justify-center gap-3 bg-natural-dark text-white py-4 px-8 rounded-2xl font-bold hover:bg-natural-darker transition-all active:scale-95 shadow-xl shadow-natural-dark/10"
      >
        <LogIn size={20} />
        Continue with Google
      </motion.button>

      <div className="mt-12 flex flex-col gap-1 items-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-natural-muted opacity-40">
          Enterprise Logistics Solution
        </p>
        <div className="w-8 h-1 bg-natural-accent rounded-full" />
      </div>
    </div>
  );
};
