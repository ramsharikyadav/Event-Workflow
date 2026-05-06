import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, addDoc, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Order, Material, OrderStatus, PaymentStatus } from '../types';
import { ShoppingCart, Plus, Clock, CheckCircle2, XCircle, ChevronDown, ZoomIn, Search, CreditCard, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../components/AuthProvider';
import { cn } from '../lib/utils';
import { ImageViewer } from '../components/ImageViewer';

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [viewingImage, setViewingImage] = useState<{ url: string, name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { profile } = useAuth();

  // New Order State
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [requiredDate, setRequiredDate] = useState('');
  const [requiredTime, setRequiredTime] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canCreateOrder = profile?.role === 'admin' || profile?.role === 'orderer';
  const canManagePayment = profile?.role === 'admin' || profile?.role === 'accounts';
  const canSeeSellingPrice = ['admin', 'orderer', 'accounts', 'endUser'].includes(profile?.role || '');
  const canSeePurchasePrice = ['admin', 'accounts'].includes(profile?.role || '');

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    // Fetch Materials for selection
    const unsubscribeMats = onSnapshot(collection(db, 'materials'), (snapshot) => {
      const mats: Material[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Material));
      setMaterials(mats);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'materials');
    });

    if (!profile) return unsubscribeMats;

    const ordersQuery = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const ords: Order[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ords);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => {
      unsubscribeMats();
      unsubscribeOrders();
    };
  }, [profile]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedMaterialId || quantity <= 0) return;

    setSubmitting(true);
    const material = materials.find(m => m.id === selectedMaterialId);
    const path = 'orders';
    
    try {
      await addDoc(collection(db, path), {
        materialId: selectedMaterialId,
        materialName: material?.name || 'Unknown',
        materialImageUrl: material?.imageUrl || '',
        requiredDate: requiredDate || new Date().toISOString().split('T')[0],
        requiredTime: requiredTime || '12:00',
        quantity,
        status: 'pending',
        paymentStatus: 'pending',
        orderedBy: profile.uid,
        orderedByName: profile.displayName,
        teamId: profile.teamId || 'no-team',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      setShowOrderModal(false);
      setSelectedMaterialId('');
      setQuantity(1);
      setRequiredDate('');
      setRequiredTime('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setSubmitting(false);
    }
  };

  const togglePaymentStatus = async (orderId: string, currentStatus?: PaymentStatus) => {
    if (!canManagePayment) return;
    setActionLoading(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        paymentStatus: currentStatus === 'completed' ? 'pending' : 'completed',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'orders');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return <Clock className="text-amber-500" size={16} />;
      case 'received': return <CheckCircle2 className="text-green-500" size={16} />;
      case 'delivered': return <CreditCard className="text-purple-500" size={16} />;
      case 'cancelled': return <XCircle className="text-red-500" size={16} />;
      default: return <ShoppingCart className="text-blue-500" size={16} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold text-natural-dark">Ledger</h2>
          <p className="text-natural-muted text-sm font-medium">Order procurement log</p>
        </div>
        {canCreateOrder && (
          <button 
            onClick={() => setShowOrderModal(true)}
            className="bg-natural-dark text-white rounded-full p-4 shadow-xl shadow-natural-dark/20 active:scale-95 transition-all"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white rounded-3xl" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[32px] border border-natural-accent">
            <ShoppingCart size={48} className="text-natural-accent mx-auto mb-4" />
            <p className="text-natural-muted font-serif italic">The order book is quiet today.</p>
          </div>
        ) : (
          orders.map((order) => {
            const material = materials.find(m => m.id === order.materialId);
            return (
            <motion.div
              layout
              key={order.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white border border-natural-accent p-6 rounded-[2rem] shadow-sm relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-4 items-start">
                  <div 
                    className="w-12 h-12 rounded-xl bg-natural-bg border border-natural-accent overflow-hidden shrink-0 cursor-zoom-in group relative"
                    onClick={() => order.materialImageUrl && setViewingImage({ url: order.materialImageUrl, name: order.materialName })}
                  >
                    {order.materialImageUrl ? (
                      <>
                        <img src={order.materialImageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <ZoomIn className="text-white" size={14} />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-natural-accent text-xs font-black">
                        {order.materialName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-natural-text text-lg leading-tight">{order.materialName}</h4>
                    <p className="text-[10px] text-natural-muted font-bold uppercase tracking-widest mt-1">ID: {order.id.slice(0, 8)}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                    order.status === 'pending' ? "bg-amber-100 text-amber-700" :
                    order.status === 'received' ? "bg-green-100 text-green-700" :
                    order.status === 'delivered' ? "bg-purple-100 text-purple-700" :
                    "bg-natural-accent text-natural-muted"
                  )}>
                    {getStatusIcon(order.status)}
                    {order.status}
                  </div>
                  {canManagePayment && (
                    <button
                      onClick={() => togglePaymentStatus(order.id, order.paymentStatus)}
                      disabled={actionLoading === order.id}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                        order.paymentStatus === 'completed' 
                          ? "bg-green-600 text-white" 
                          : "bg-white border border-natural-accent text-natural-muted hover:border-natural-dark"
                      )}
                    >
                      {order.paymentStatus === 'completed' ? <Check size={10} /> : <CreditCard size={10} />}
                      {order.paymentStatus === 'completed' ? 'Paid' : 'Pending Payment'}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-black text-natural-dark tracking-tighter">{order.quantity}</span>
                  <span className="text-xs text-natural-muted font-bold uppercase tracking-wide">Units</span>
                </div>
                <div className="text-right">
                  {canSeeSellingPrice && material?.sellingPrice && (
                    <p className="text-xs font-bold text-natural-dark">Total: ₹{(material.sellingPrice * order.quantity).toLocaleString()}</p>
                  )}
                  {canSeePurchasePrice && material?.purchasePrice && (
                    <p className="text-[9px] text-natural-muted font-bold uppercase tracking-widest">Cost: ₹{(material.purchasePrice * order.quantity).toLocaleString()}</p>
                  )}
                </div>
              </div>

              {order.requiredDate && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-natural-bg/50 rounded-xl border border-natural-accent/30">
                  <Clock className="text-natural-muted" size={14} />
                  <span className="text-[10px] font-black text-natural-dark uppercase tracking-widest">
                    Due: {new Date(order.requiredDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} @ {order.requiredTime || 'TBD'}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-natural-bg">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-natural-accent rounded-full flex items-center justify-center text-[10px] font-bold text-natural-dark">
                    {order.orderedByName?.charAt(0) || '?'}
                  </div>
                  <span className="text-[10px] font-bold text-natural-muted uppercase">{order.orderedByName}</span>
                </div>
                <span className="text-[10px] font-bold text-natural-muted/60">{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
            </motion.div>
          )})
        )}
      </div>


      {/* New Order Modal */}
      <AnimatePresence>
        {showOrderModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOrderModal(false)}
              className="absolute inset-0 bg-natural-darker/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative bg-natural-bg w-full max-w-xl max-h-[90vh] rounded-t-[40px] sm:rounded-[40px] p-8 sm:p-10 shadow-3xl overflow-hidden flex flex-col"
            >
              <div className="w-16 h-1 bg-natural-accent rounded-full mx-auto mb-8 sm:hidden shrink-0" />
              
              <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-natural-accent overflow-hidden shrink-0 shadow-sm">
                    {materials.find(m => m.id === selectedMaterialId)?.imageUrl ? (
                      <img src={materials.find(m => m.id === selectedMaterialId)?.imageUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-natural-accent text-lg font-black">
                        {selectedMaterialId ? materials.find(m => m.id === selectedMaterialId)?.name.charAt(0) : '?'}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-natural-dark">
                      {selectedMaterialId ? 'Order Details' : 'Select Product'}
                    </h3>
                    <p className="text-[10px] text-natural-muted font-black uppercase tracking-widest font-sans">Inventory Acquisition</p>
                  </div>
                </div>
                {selectedMaterialId && (
                  <button 
                    onClick={() => setSelectedMaterialId('')}
                    className="text-[10px] font-black uppercase tracking-widest text-natural-muted hover:text-natural-dark"
                  >
                    Change Item
                  </button>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {!selectedMaterialId ? (
                  <div className="space-y-6">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-natural-muted" size={18} />
                      <input 
                        type="text"
                        placeholder="Search products..."
                        className="w-full bg-white border border-natural-accent rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-natural-dark"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {filteredMaterials.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setSelectedMaterialId(m.id)}
                          className="group bg-white border border-natural-accent p-3 rounded-2xl text-left hover:border-natural-dark transition-all hover:shadow-lg active:scale-[0.98]"
                        >
                          <div className="aspect-square bg-natural-bg rounded-xl mb-3 overflow-hidden border border-natural-accent/30">
                            {m.imageUrl ? (
                              <img src={m.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={m.name} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-natural-accent font-black text-2xl">
                                {m.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <p className="font-bold text-natural-dark text-sm leading-tight truncate">{m.name}</p>
                          <p className="text-[9px] text-natural-muted font-black uppercase tracking-widest mt-1">{m.category}</p>
                        </button>
                      ))}
                    </div>

                    {filteredMaterials.length === 0 && (
                      <div className="text-center py-12">
                        <p className="text-natural-muted font-serif italic text-sm">No materials matching your search.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleCreateOrder} className="space-y-6 py-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-natural-muted uppercase tracking-[0.2em] px-1">Required Date</label>
                        <input 
                          type="date" 
                          required
                          value={requiredDate}
                          onChange={(e) => setRequiredDate(e.target.value)}
                          className="w-full bg-white border border-natural-accent rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-natural-dark"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-natural-muted uppercase tracking-[0.2em] px-1">Required Time</label>
                        <input 
                          type="time" 
                          required
                          value={requiredTime}
                          onChange={(e) => setRequiredTime(e.target.value)}
                          className="w-full bg-white border border-natural-accent rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-natural-dark"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black text-natural-muted uppercase tracking-[0.2em] px-1">Order Quantity</label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        placeholder="Qty"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-full bg-white border border-natural-accent rounded-2xl py-6 px-6 focus:ring-2 focus:ring-natural-dark font-black text-3xl text-natural-dark text-center shadow-inner"
                      />
                    </div>

                    <div className="pt-4">
                      <button 
                        disabled={submitting}
                        className="w-full bg-natural-dark text-white font-bold py-5 rounded-2xl shadow-2xl shadow-natural-dark/30 active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest text-xs"
                      >
                        {submitting ? 'Processing...' : 'Authorize Purchase'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
