import React, { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Order, Material, OrderStatus } from '../types';
import { PackageOpen, Camera, Check, AlertCircle, ChevronRight, X, ZoomIn, Clock, Truck, UserCheck, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../components/AuthProvider';
import { cn } from '../lib/utils';
import { ImageViewer } from '../components/ImageViewer';

export const Receive: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [handoverDetails, setHandoverDetails] = useState({ name: '', remarks: '' });
  const [submitting, setSubmitting] = useState(false);
  const [viewingImage, setViewingImage] = useState<{ url: string, name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile } = useAuth();

  const isVendor = profile?.role === 'admin' || profile?.role === 'vendor';
  const isStoreManager = profile?.role === 'admin' || profile?.role === 'storeManager';

  useEffect(() => {
    if (!profile) return;
    
    // Fetch relevant orders based on role
    let filterStatuses: OrderStatus[] = [];
    if (profile.role === 'admin') filterStatuses = ['pending', 'approved', 'ordered', 'received'];
    else if (profile.role === 'vendor') filterStatuses = ['pending', 'approved'];
    else if (profile.role === 'storeManager') filterStatuses = ['ordered', 'received'];

    if (filterStatuses.length === 0) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'orders'),
      where('status', 'in', filterStatuses)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ords: Order[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ords);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
  }, [profile]);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const updateOrderStatus = async (orderId: string, nextStatus: OrderStatus, additionalData: any = {}) => {
    setSubmitting(true);
    try {
      if (nextStatus === 'received') {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          // 1. Create Receipt Record
          await addDoc(collection(db, 'receipts'), {
            orderId: order.id,
            materialId: order.materialId,
            quantityReceived: order.quantity,
            photoUrl: photo || '',
            receivedBy: profile?.uid,
            receivedAt: new Date().toISOString(),
          });
          // 2. Update Stock
          await updateDoc(doc(db, 'materials', order.materialId), {
            currentStock: increment(order.quantity),
            updatedAt: new Date().toISOString()
          });
        }
      }

      await updateDoc(doc(db, 'orders', orderId), {
        status: nextStatus,
        updatedAt: new Date().toISOString(),
        ...additionalData
      });

      setSelectedOrder(null);
      setPhoto(null);
      setHandoverDetails({ name: '', remarks: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'orders');
    } finally {
      setSubmitting(false);
    }
  };

  const getActionConfig = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return { label: 'Acknowledge', icon: <CheckCircle2 />, color: 'bg-amber-600', next: 'approved' as OrderStatus };
      case 'approved': return { label: 'Dispatch', icon: <Truck />, color: 'bg-blue-600', next: 'ordered' as OrderStatus };
      case 'ordered': return { label: 'Receive Intake', icon: <PackageOpen />, color: 'bg-green-600', next: 'received' as OrderStatus, needsPhoto: true };
      case 'received': return { label: 'Handover', icon: <UserCheck />, color: 'bg-purple-600', next: 'delivered' as OrderStatus, needsHandover: true };
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[2.5rem] border border-natural-accent shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-natural-accent rounded-2xl text-natural-dark">
            <PackageOpen size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold text-natural-dark">Inventory</h2>
            <p className="text-[10px] text-natural-muted uppercase tracking-[0.2em] font-black">Fulfillment Desk</p>
          </div>
        </div>

        {!selectedOrder ? (
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-natural-muted/60 uppercase tracking-[0.2em]">Pending Actions</h3>
            {loading ? (
              <div className="h-24 bg-natural-bg animate-pulse rounded-3xl" />
            ) : orders.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-natural-accent rounded-[2rem] bg-natural-bg/30">
                <p className="text-natural-muted text-sm font-serif italic">Your desk is clear.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {orders.map(order => {
                  const config = getActionConfig(order.status);
                  return (
                    <button
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="w-full text-left bg-natural-bg/50 p-5 rounded-[1.5rem] flex items-center justify-between group hover:bg-natural-accent/30 transition-all border border-transparent hover:border-natural-accent"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white border border-natural-accent overflow-hidden shrink-0">
                          {order.materialImageUrl ? <img src={order.materialImageUrl} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold">{order.materialName.charAt(0)}</div>}
                        </div>
                        <div>
                          <h4 className="font-bold text-natural-dark text-sm">{order.materialName}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded", 
                              order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              order.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                              order.status === 'ordered' ? 'bg-green-100 text-green-700' :
                              'bg-purple-100 text-purple-700'
                            )}>
                              {order.status}
                            </span>
                            <span className="text-[8px] text-natural-muted font-bold uppercase">REQ: {order.quantity}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <div className={cn("p-2 rounded-full text-white", config?.color)}>
                           {config?.icon && React.cloneElement(config.icon as React.ReactElement, { size: 14 })}
                         </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-natural-bg p-5 rounded-2xl border border-natural-accent relative flex items-center gap-4">
              <button 
                onClick={() => setSelectedOrder(null)}
                className="absolute -top-3 -right-3 bg-white text-natural-muted hover:text-natural-dark rounded-full p-2 shadow-md border border-natural-accent transition-colors"
              >
                <X size={16} strokeWidth={3} />
              </button>
              <div className="w-14 h-14 rounded-xl bg-white border border-natural-accent overflow-hidden shrink-0">
                {selectedOrder.materialImageUrl ? <img src={selectedOrder.materialImageUrl} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center font-black">{selectedOrder.materialName.charAt(0)}</div>}
              </div>
              <div>
                <h4 className="font-bold text-natural-dark text-lg leading-tight mb-0.5">{selectedOrder.materialName}</h4>
                <p className="text-xs text-natural-muted font-medium">Quantity: <span className="text-natural-dark font-black">{selectedOrder.quantity} Units</span></p>
                <p className="text-[9px] text-natural-muted font-black uppercase tracking-widest mt-1">Requested by {selectedOrder.orderedByName}</p>
              </div>
            </div>

            {getActionConfig(selectedOrder.status)?.needsPhoto && (
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-natural-muted uppercase tracking-[0.2em]">Visual Evidence (Product Photo)</label>
                {!photo ? (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-square bg-natural-bg rounded-[2rem] border-2 border-dashed border-natural-accent flex flex-col items-center justify-center gap-3 text-natural-muted hover:bg-natural-accent/20 transition-all group"
                  >
                    <Camera size={32} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Capture Product</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleCapture} />
                  </button>
                ) : (
                  <div className="relative rounded-[2rem] overflow-hidden aspect-square border-4 border-white shadow-lg">
                    <img src={photo} className="w-full h-full object-cover" alt="Capture" />
                    <button onClick={() => setPhoto(null)} className="absolute top-4 right-4 bg-white/90 p-2 rounded-full shadow-lg"><X size={16} /></button>
                  </div>
                )}
              </div>
            )}

            {getActionConfig(selectedOrder.status)?.needsHandover && (
              <div className="space-y-4 bg-natural-bg/50 p-6 rounded-3xl border border-natural-accent">
                <label className="block text-[10px] font-black text-natural-muted uppercase tracking-[0.2em]">Handover Details</label>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="Receiver Name" 
                    className="w-full bg-white border border-natural-accent rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-natural-dark"
                    value={handoverDetails.name}
                    onChange={(e) => setHandoverDetails({...handoverDetails, name: e.target.value})}
                  />
                  <textarea 
                    placeholder="Remarks / Identification info" 
                    className="w-full bg-white border border-natural-accent rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-natural-dark h-24 resize-none"
                    value={handoverDetails.remarks}
                    onChange={(e) => setHandoverDetails({...handoverDetails, remarks: e.target.value})}
                  />
                </div>
              </div>
            )}

            <button
              disabled={submitting || (getActionConfig(selectedOrder.status)?.needsPhoto && !photo) || (getActionConfig(selectedOrder.status)?.needsHandover && !handoverDetails.name)}
              onClick={() => {
                const config = getActionConfig(selectedOrder.status);
                if (config) {
                  updateOrderStatus(selectedOrder.id, config.next, 
                    config.next === 'delivered' ? { deliveredTo: handoverDetails.name, handoverRemarks: handoverDetails.remarks } : {}
                  );
                }
              }}
              className={cn(
                "w-full py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 transition-all",
                submitting ? "opacity-50" : getActionConfig(selectedOrder.status)?.color + " text-white shadow-xl active:scale-95"
              )}
            >
              {submitting ? 'Processing...' : (
                <>
                  {getActionConfig(selectedOrder.status)?.icon && React.cloneElement(getActionConfig(selectedOrder.status)?.icon as React.ReactElement, { size: 18 })}
                  {getActionConfig(selectedOrder.status)?.label}
                </>
              )}
            </button>
          </motion.div>
        )}
      </div>

      <div className="bg-natural-accent/30 p-5 rounded-3xl flex items-start gap-4 border border-natural-accent">
        <AlertCircle size={20} className="text-natural-dark shrink-0 mt-0.5" />
        <p className="text-[10px] text-natural-muted leading-relaxed font-bold uppercase tracking-tight">
          Each action updates the system ledger. Please verify physical assets before digital authorization.
        </p>
      </div>

      {viewingImage && (
        <ImageViewer src={viewingImage.url} isOpen={!!viewingImage} onClose={() => setViewingImage(null)} alt={viewingImage.name} />
      )}
    </div>
  );
};

