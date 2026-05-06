import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Material, Order, Receipt } from '../types';
import { ArrowLeft, Clock, ShoppingBag, Receipt as ReceiptIcon, Package, AlertCircle, ChevronRight, ZoomIn } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { ImageViewer } from '../components/ImageViewer';
import { useAuth } from '../components/AuthProvider';

export const MaterialDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [material, setMaterial] = useState<Material | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'receipts'>('orders');
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchMaterial = async () => {
      try {
        const docRef = doc(db, 'materials', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setMaterial({ id: docSnap.id, ...docSnap.data() } as Material);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `materials/${id}`);
      }
    };

    fetchMaterial();

    // Live Orders
    const ordersQ = query(
      collection(db, 'orders'),
      where('materialId', '==', id),
      orderBy('createdAt', 'desc')
    );
    const unsubOrders = onSnapshot(ordersQ, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'orders'));

    // Live Receipts
    const receiptsQ = query(
      collection(db, 'receipts'),
      where('materialId', '==', id),
      orderBy('receivedAt', 'desc')
    );
    const unsubReceipts = onSnapshot(receiptsQ, (snap) => {
      setReceipts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Receipt)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'receipts'));

    return () => {
      unsubOrders();
      unsubReceipts();
    };
  }, [id]);

  if (loading || !material) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-natural-dark"></div>
      </div>
    );
  }

  const isLowStock = material.currentStock <= (material.minStockLevel || 0);

  const canSeePurchasePrice = profile?.role && ['admin', 'vendor', 'accounts'].includes(profile.role);
  const canSeeSellingPrice = profile?.role && ['admin', 'orderer', 'accounts'].includes(profile.role);

  return (
    <div className="space-y-8 pb-12">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-natural-muted hover:text-natural-dark font-bold text-[10px] uppercase tracking-[0.2em] transition-colors"
      >
        <ArrowLeft size={16} /> Back to Stock
      </button>

      {/* Hero Card */}
      <section className="bg-white p-8 rounded-[2.5rem] border border-natural-accent shadow-sm relative overflow-hidden">
        {material.imageUrl ? (
          <div className="absolute top-0 right-0 w-64 h-full">
            <img src={material.imageUrl} className="w-full h-full object-cover opacity-20 mask-linear-to-l from-black to-transparent" alt="" />
          </div>
        ) : (
          <div className="absolute top-0 right-0 w-48 h-48 bg-natural-accent/20 rounded-full -mr-24 -mt-24" />
        )}
        
        <div className="flex items-start justify-between mb-8 relative z-10">
          <div className="flex gap-6 items-start">
            {material.imageUrl && (
              <div 
                className="relative group cursor-zoom-in shrink-0"
                onClick={() => setIsViewerOpen(true)}
              >
                <img src={material.imageUrl} className="w-24 h-24 rounded-3xl object-cover border-4 border-natural-accent/20 shadow-md group-hover:scale-[1.02] transition-transform" alt={material.name} />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <ZoomIn className="text-white drop-shadow-md" size={20} />
                </div>
              </div>
            )}
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-natural-muted bg-natural-accent/50 px-3 py-1 rounded-lg mb-3 inline-block">
                {material.category}
              </span>
              <h2 className="text-4xl font-serif font-bold text-natural-dark leading-tight">{material.name}</h2>
              <p className="text-natural-muted text-sm mt-1">Ref ID: {material.id.slice(0, 8)}</p>
            </div>
          </div>
          <div className={cn(
            "w-20 h-20 rounded-3xl flex flex-col items-center justify-center shadow-lg border-4 border-white",
            isLowStock ? "bg-red-50 text-red-600" : "bg-natural-bg text-natural-dark"
          )}>
            <span className="text-2xl font-black">{material.currentStock}</span>
            <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">{material.unit}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10 mt-8">
          {canSeePurchasePrice && (
            <div className="bg-natural-bg/50 p-5 rounded-2xl border border-natural-accent/30">
              <p className="text-[9px] font-black text-natural-muted uppercase tracking-widest mb-1">Purchase Price</p>
              <p className="font-bold text-natural-dark">₹{material.purchasePrice || 0}</p>
            </div>
          )}
          {canSeeSellingPrice && (
            <div className="bg-natural-bg/50 p-5 rounded-2xl border border-natural-accent/30">
              <p className="text-[9px] font-black text-natural-muted uppercase tracking-widest mb-1">Selling Price</p>
              <p className="font-bold text-natural-dark">₹{material.sellingPrice || 0}</p>
            </div>
          )}
          <div className="bg-natural-bg/50 p-5 rounded-2xl border border-natural-accent/30">
            <p className="text-[9px] font-black text-natural-muted uppercase tracking-widest mb-1">Stock Threshold</p>
            <p className="font-bold text-natural-dark">{material.minStockLevel || 0} units</p>
          </div>
          {canSeePurchasePrice && canSeeSellingPrice && (
            <div className="bg-natural-bg/50 p-5 rounded-2xl border border-natural-accent/30">
              <p className="text-[9px] font-black text-natural-muted uppercase tracking-widest mb-1">Margin</p>
              <p className="font-bold text-natural-dark">
                {material.purchasePrice && material.sellingPrice 
                  ? `₹${material.sellingPrice - material.purchasePrice}` 
                  : 'N/A'}
              </p>
            </div>
          )}
        </div>

        {material.description && (
          <div className="mt-8 relative z-10">
            <p className="text-[9px] font-black text-natural-muted uppercase tracking-widest mb-2">Description</p>
            <p className="text-sm text-natural-muted leading-relaxed font-serif italic bg-natural-bg/30 p-4 rounded-2xl">
              "{material.description}"
            </p>
          </div>
        )}

        {isLowStock && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-2xl flex items-center gap-3 border border-red-100">
            <AlertCircle size={18} />
            <span className="text-xs font-bold uppercase tracking-tight">Replenishment Required Immediately</span>
          </div>
        )}
      </section>

      {/* History Tabs */}
      <section className="space-y-4">
        <div className="flex p-1 bg-natural-accent/30 rounded-2xl">
          <button 
            onClick={() => setActiveTab('orders')}
            className={cn(
              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'orders' ? "bg-white text-natural-dark shadow-sm" : "text-natural-muted hover:text-natural-dark"
            )}
          >
            Orders ({orders.length})
          </button>
          <button 
            onClick={() => setActiveTab('receipts')}
            className={cn(
              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'receipts' ? "bg-white text-natural-dark shadow-sm" : "text-natural-muted hover:text-natural-dark"
            )}
          >
            Receipts ({receipts.length})
          </button>
        </div>

        <div className="space-y-3">
          {activeTab === 'orders' ? (
            orders.length === 0 ? (
              <div className="py-12 bg-white rounded-3xl border border-natural-accent border-dashed text-center">
                <ShoppingBag className="mx-auto text-natural-accent mb-2" size={32} />
                <p className="text-natural-muted text-sm font-serif italic">No purchase history found.</p>
              </div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="bg-white p-5 rounded-3xl border border-natural-accent flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      order.status === 'pending' ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"
                    )}>
                      <Clock size={20} />
                    </div>
                    <div>
                       <p className="font-bold text-natural-dark">{order.quantity} {material.unit}</p>
                       <p className="text-[10px] text-natural-muted font-bold uppercase tracking-tight">
                         By {order.orderedByName}
                         {order.requiredDate && ` • Required: ${new Date(order.requiredDate).toLocaleDateString()} @ ${order.requiredTime}`}
                       </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-natural-muted mb-1">{order.status}</p>
                    <p className="text-[10px] text-natural-muted/60">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )
          ) : (
            receipts.length === 0 ? (
              <div className="py-12 bg-white rounded-3xl border border-natural-accent border-dashed text-center">
                <ReceiptIcon className="mx-auto text-natural-accent mb-2" size={32} />
                <p className="text-natural-muted text-sm font-serif italic">No arrival logs detected.</p>
              </div>
            ) : (
              receipts.map(receipt => (
                <div key={receipt.id} className="bg-white p-5 rounded-3xl border border-natural-accent flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    {receipt.photoUrl ? (
                      <img src={receipt.photoUrl} className="w-12 h-12 rounded-xl object-cover border border-natural-accent shadow-sm" alt="Receipt" />
                    ) : (
                      <div className="w-12 h-12 bg-natural-bg rounded-xl flex items-center justify-center text-natural-muted">
                        <Package size={20} />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-natural-dark">Received {receipt.quantityReceived} units</p>
                      <p className="text-[10px] text-natural-muted font-bold uppercase tracking-tight">By {receipt.receivedBy === 'Unknown' ? 'System' : 'Staff'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-natural-muted/60">{new Date(receipt.receivedAt).toLocaleDateString()}</p>
                    <ChevronRight size={14} className="text-natural-accent ml-auto mt-1" />
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </section>

      <section className="bg-natural-dark p-8 rounded-[2.5rem] text-white/90 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-2">Master Ledger Entry</p>
        <p className="text-xs font-serif italic mb-6">"Precision in logistics is the foundation of structural excellence."</p>
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto" />
      </section>

      {material.imageUrl && (
        <ImageViewer 
          src={material.imageUrl} 
          isOpen={isViewerOpen} 
          onClose={() => setIsViewerOpen(false)} 
          alt={material.name} 
        />
      )}
    </div>
  );
};
