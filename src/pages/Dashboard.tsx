import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Material } from '../types';
import { Search, AlertTriangle, Plus, ChevronRight, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../components/AuthProvider';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { ImageViewer } from '../components/ImageViewer';

export const Dashboard: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingImage, setViewingImage] = useState<{ url: string, name: string } | null>(null);
  const { profile } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'materials'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mats: Material[] = [];
      snapshot.forEach((doc) => {
        mats.push({ id: doc.id, ...doc.data() } as Material);
      });
      setMaterials(mats);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'materials');
    });

    return () => unsubscribe();
  }, []);

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = materials.filter(m => m.currentStock <= (m.minStockLevel || 0));

  // Function to seed initial data if empty
  const seedData = async () => {
    const path = 'materials';
    const initialMats = [
      { name: 'Red Rose Vermala', category: 'Floral', unit: 'pcs', currentStock: 20, minStockLevel: 5 },
      { name: 'White Lily Vermala', category: 'Floral', unit: 'pcs', currentStock: 15, minStockLevel: 5 },
      { name: 'Pink Rose Vermala', category: 'Floral', unit: 'pcs', currentStock: 10, minStockLevel: 2 },
      { name: 'Marigold Vermala', category: 'Floral', unit: 'pcs', currentStock: 50, minStockLevel: 10 },
      { name: 'Red Brick', category: 'Masonry', unit: 'pcs', currentStock: 250, minStockLevel: 50 },
      { name: 'Portland Cement', category: 'Concrete', unit: 'bags', currentStock: 15, minStockLevel: 20 },
      { name: 'Steel Rebar 12mm', category: 'Metal', unit: 'meters', currentStock: 100, minStockLevel: 30 },
      { name: 'Electrical Wire 2.5mm', category: 'Electrical', unit: 'rolls', currentStock: 4, minStockLevel: 5 },
    ];

    try {
      for (const mat of initialMats) {
        await addDoc(collection(db, path), {
          ...mat,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-serif font-bold text-natural-dark">Inventory</h2>
        <p className="text-natural-muted text-sm font-medium">Real-time stock monitoring</p>
      </header>

      <section>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-natural-muted" size={18} />
          <input 
            type="text" 
            placeholder="Search catalog..."
            className="w-full bg-white border border-natural-accent rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-natural-dark transition-all shadow-sm placeholder:text-natural-muted/50 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </section>

      {lowStockItems.length > 0 && (
        <section>
          <div className="bg-red-50 border border-red-100 rounded-3xl p-5 flex items-start gap-4">
            <div className="bg-white p-2.5 rounded-xl text-red-600 shadow-sm">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-red-900">Low Stock Warning</h3>
              <p className="text-red-700/80 text-xs mt-1 font-medium leading-relaxed">
                {lowStockItems.length} items require immediate reordering to prevent site delays.
              </p>
            </div>
          </div>
        </section>
      )}

      {materials.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[32px] border border-natural-accent border-dashed">
          <p className="text-natural-muted font-medium mb-6">Your inventory is currently empty.</p>
          <button 
            onClick={seedData}
            className="bg-natural-dark text-white px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 mx-auto active:scale-95 transition-all shadow-lg shadow-natural-dark/20"
          >
            <Plus size={16} /> Seed Catalog
          </button>
        </div>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-natural-muted opacity-60 uppercase tracking-[0.2em]">Material List</h3>
            <span className="text-[10px] font-bold text-natural-dark bg-natural-accent px-2 py-0.5 rounded-md">{filteredMaterials.length} Units</span>
          </div>
          
          <div className="grid gap-4">
            <AnimatePresence>
              {filteredMaterials.map((mat) => (
                <Link key={mat.id} to={`/material/${mat.id}`} className="block">
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white border border-natural-accent p-5 rounded-3xl flex items-center justify-between shadow-sm hover:shadow-md transition-all group overflow-hidden relative"
                  >
                    <div className="flex items-center gap-4 relative z-10">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner overflow-hidden shrink-0",
                        mat.currentStock <= (mat.minStockLevel || 0) 
                          ? "bg-red-50 text-red-600" 
                          : "bg-natural-bg text-natural-dark"
                      )}>
                        {mat.imageUrl ? (
                          <div 
                            className="relative group/zoom cursor-zoom-in w-full h-full"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setViewingImage({ url: mat.imageUrl!, name: mat.name });
                            }}
                          >
                            <img src={mat.imageUrl} className="w-full h-full object-cover group-hover/zoom:scale-110 transition-transform" alt={mat.name} />
                            <div className="absolute inset-0 bg-black/0 group-hover/zoom:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover/zoom:opacity-100">
                              <ZoomIn className="text-white" size={16} />
                            </div>
                          </div>
                        ) : (
                          mat.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-natural-text text-lg tracking-tight leading-tight">{mat.name}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] font-black uppercase tracking-widest bg-natural-accent/40 text-natural-muted px-2 py-0.5 rounded">
                            {mat.category}
                          </span>
                          <span className="text-[9px] font-bold text-natural-muted">
                            UNIT: {mat.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right flex items-center gap-4 relative z-10">
                      <div>
                        <div className={cn(
                          "text-2xl font-black font-mono tracking-tighter leading-none mb-1",
                          mat.currentStock <= (mat.minStockLevel || 0) ? "text-red-600" : "text-natural-dark"
                        )}>
                          {mat.currentStock}
                        </div>
                        <div className="w-16 bg-natural-accent h-1 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-1000",
                              mat.currentStock <= (mat.minStockLevel || 0) ? "bg-red-400" : "bg-natural-dark"
                            )} 
                            style={{ width: `${Math.min(100, (mat.currentStock / (mat.minStockLevel || 100)) * 50)}%` }}
                          />
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-natural-accent group-hover:text-natural-dark transition-colors" />
                    </div>
                  </motion.div>
                </Link>
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {viewingImage && (
        <ImageViewer 
          src={viewingImage.url} 
          isOpen={!!viewingImage} 
          onClose={() => setViewingImage(null)} 
          alt={viewingImage.name} 
        />
      )}
    </div>
  );
};
