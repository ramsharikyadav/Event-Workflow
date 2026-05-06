import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, setDoc, collection, onSnapshot, query, addDoc, deleteDoc } from 'firebase/firestore';
import { User, Users, LogOut, Shield, Mail, Check, Plus, UserCog, ChevronDown, PackagePlus, Trash2, Tag, Box, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { AppUser, UserRole, Material } from '../types';

export const Settings: React.FC = () => {
  const { profile, user, refreshProfile } = useAuth();
  const [newTeamName, setNewTeamName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);

  // New Product State
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    unit: 'pcs',
    minStockLevel: 0,
    currentStock: 0,
    imageUrl: '',
    description: '',
    purchasePrice: 0,
    sellingPrice: 0
  });

  // Admin: Fetch all users
  useEffect(() => {
    if (profile?.role !== 'admin') return;

    setLoadingUsers(true);
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userList: AppUser[] = snapshot.docs.map(doc => {
        const data = doc.data() as AppUser;
        return { ...data, uid: data.uid || doc.id }; // Use doc ID (email or UID) if uid is missing
      });
      setUsers(userList);
      setLoadingUsers(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoadingUsers(false);
    });

    return () => unsubscribe();
  }, [profile?.role]);

  const [editingProduct, setEditingProduct] = useState<Material | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    displayName: '',
    role: 'endUser' as UserRole
  });

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.displayName) return;
    setSubmitting(true);
    try {
      // Use email as doc ID for pre-created users to avoid duplicates and allow lookup
      // But UID is better if we have it. Since we don't, we'll use email as ID.
      // Our AuthProvider is updated to handle this.
      await setDoc(doc(db, 'users', newUser.email), {
        uid: '', // Placeholder, will be linked on first login
        email: newUser.email,
        displayName: newUser.displayName,
        role: newUser.role,
        updatedAt: new Date().toISOString()
      });
      setNewUser({ email: '', displayName: '', role: 'endUser' });
      setShowAddUser(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'users');
    } finally {
      setSubmitting(false);
    }
  };


  const canSeePurchasePrice = profile?.role && ['admin', 'vendor', 'accounts'].includes(profile.role);
  const canSeeSellingPrice = profile?.role && ['admin', 'orderer', 'accounts'].includes(profile.role);

  // Fetch Materials
  useEffect(() => {
    if (!profile?.role || !['admin', 'vendor', 'accounts'].includes(profile.role)) return;

    const q = query(collection(db, 'materials'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mats: Material[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Material));
      setMaterials(mats);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'materials'));

    return () => unsubscribe();
  }, [profile?.role]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.category) return;
    setSubmitting(true);
    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'materials', editingProduct.id), {
          ...newProduct,
          updatedAt: new Date().toISOString()
        });
        setEditingProduct(null);
      } else {
        await addDoc(collection(db, 'materials'), {
          ...newProduct,
          updatedAt: new Date().toISOString()
        });
      }
      setNewProduct({ 
        name: '', 
        category: '', 
        unit: 'pcs', 
        minStockLevel: 0, 
        currentStock: 0, 
        imageUrl: '',
        description: '',
        purchasePrice: 0,
        sellingPrice: 0
      });
      setShowAddProduct(false);
    } catch (error) {
      handleFirestoreError(error, editingProduct ? OperationType.UPDATE : OperationType.CREATE, 'materials');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (m: Material) => {
    setEditingProduct(m);
    setNewProduct({
      name: m.name,
      category: m.category,
      unit: m.unit,
      currentStock: m.currentStock,
      minStockLevel: m.minStockLevel || 0,
      imageUrl: m.imageUrl || '',
      description: m.description || '',
      purchasePrice: m.purchasePrice || 0,
      sellingPrice: m.sellingPrice || 0
    });
    setShowAddProduct(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product? This will orphan related records.')) return;
    try {
      await deleteDoc(doc(db, 'materials', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `materials/${id}`);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName || !user) return;
    setSubmitting(true);
    
    try {
      const teamId = `team-${Date.now()}`;
      // 1. Create Team
      await setDoc(doc(db, 'teams', teamId), {
        name: newTeamName,
        members: [user.uid]
      });

      // 2. Update User Profile
      await updateDoc(doc(db, 'users', user.uid), {
        teamId: teamId
      });

      await refreshProfile();
      setNewTeamName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'teams/users');
    } finally {
      setSubmitting(false);
    }
  };

  const updateUserRole = async (targetUid: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', targetUid), {
        role: newRole
      });
      // snapshot will update automatically
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <header>
        <h2 className="text-3xl font-serif font-bold text-natural-dark">Profile</h2>
        <p className="text-natural-muted text-sm font-medium">System configuration</p>
      </header>

      {/* Profile Info */}
      <section className="bg-white p-8 rounded-[2.5rem] border border-natural-accent shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-natural-accent/30 rounded-full -mr-20 -mt-20 -z-0" />
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-20 h-20 bg-natural-darker rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl">
            {profile?.displayName?.charAt(0)}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-natural-text tracking-tight">{profile?.displayName}</h2>
            <p className="text-[10px] text-natural-muted font-black uppercase tracking-[0.15em] flex items-center gap-1.5 mt-1">
              <Mail size={12} className="opacity-50" /> {profile?.email}
            </p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4">
          <div className="p-5 bg-natural-bg rounded-2xl flex flex-col justify-between h-24 border border-natural-accent/50">
            <Shield className="text-natural-dark opacity-40" size={18} />
            <div>
              <p className="text-[9px] text-natural-muted font-black uppercase tracking-widest">Authority</p>
              <p className="font-bold text-natural-dark capitalize">{profile?.role}</p>
            </div>
          </div>
          <div className="p-5 bg-natural-bg rounded-2xl flex flex-col justify-between h-24 border border-natural-accent/50">
            <Users className="text-natural-dark opacity-40" size={18} />
            <div>
              <p className="text-[9px] text-natural-muted font-black uppercase tracking-widest">Division</p>
              <p className="font-bold text-natural-dark truncate">
                {profile?.teamId ? profile.teamId.split('-')[1] : 'Unassigned'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Product Management */}
      {(profile?.role === 'admin' || profile?.role === 'vendor' || profile?.role === 'accounts') && (
        <section className="bg-white p-8 rounded-[2.5rem] border border-natural-accent shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Box className="text-natural-dark" size={24} />
              <h3 className="text-xl font-serif font-bold text-natural-dark">
                {editingProduct ? 'Edit Product' : 'Product Management'}
              </h3>
            </div>
            <button 
              onClick={() => {
                setShowAddProduct(!showAddProduct);
                if (showAddProduct) setEditingProduct(null);
              }}
              className="w-10 h-10 rounded-2xl bg-natural-bg border border-natural-accent flex items-center justify-center text-natural-dark hover:bg-natural-accent transition-colors"
            >
              <Plus size={20} className={cn("transition-transform", (showAddProduct || editingProduct) && "rotate-45")} />
            </button>
          </div>

          <AnimatePresence>
            {showAddProduct && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddProduct}
                className="mb-8 p-6 bg-natural-bg/50 rounded-3xl border border-natural-accent space-y-4 overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-natural-muted px-1">Product Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. Red Rose Vermala"
                      className="w-full bg-white border border-natural-accent rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-natural-dark"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-natural-muted px-1">Category</label>
                    <input 
                      type="text"
                      placeholder="e.g. Floral"
                      className="w-full bg-white border border-natural-accent rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-natural-dark"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-natural-muted px-1">Unit</label>
                    <input 
                      type="text"
                      placeholder="pcs"
                      className="w-full bg-white border border-natural-accent rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-natural-dark"
                      value={newProduct.unit}
                      onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {canSeePurchasePrice && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-natural-muted px-1">Purchase Price</label>
                        <input 
                          type="number"
                          placeholder="0.00"
                          className="w-full bg-white border border-natural-accent rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-natural-dark"
                          value={newProduct.purchasePrice}
                          onChange={(e) => setNewProduct({...newProduct, purchasePrice: parseFloat(e.target.value) || 0})}
                          required
                        />
                      </div>
                    )}
                    {canSeeSellingPrice && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-natural-muted px-1">Selling Price</label>
                        <input 
                          type="number"
                          placeholder="0.00"
                          className="w-full bg-white border border-natural-accent rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-natural-dark"
                          value={newProduct.sellingPrice}
                          onChange={(e) => setNewProduct({...newProduct, sellingPrice: parseFloat(e.target.value) || 0})}
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-natural-muted px-1">Description</label>
                  <textarea 
                    placeholder="Describe the product details..."
                    rows={3}
                    className="w-full bg-white border border-natural-accent rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-natural-dark resize-none"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-natural-muted px-1">Product Visual</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-white border-2 border-dashed border-natural-accent rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
                      {newProduct.imageUrl ? (
                        <img src={newProduct.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <Tag className="text-natural-accent" size={24} />
                      )}
                    </div>
                    <label className="flex-1 cursor-pointer">
                      <div className="bg-white border border-natural-accent rounded-xl px-4 py-3 text-xs font-bold text-natural-muted text-center hover:bg-natural-accent transition-colors">
                        Select Image File
                      </div>
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-natural-dark text-white font-black uppercase tracking-[0.2em] py-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : editingProduct ? 'Update Ledger' : 'Add Product to Ledger'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {materials.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-4 bg-natural-bg/50 rounded-2xl border border-natural-accent/30 group">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white border border-natural-accent overflow-hidden shrink-0">
                    {m.imageUrl ? (
                      <img src={m.imageUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-natural-accent text-xs font-black">
                        {m.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 pr-4">
                    <p className="text-sm font-bold text-natural-dark truncate">{m.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[9px] text-natural-muted font-black uppercase tracking-widest">{m.category} • {m.unit}</p>
                      {canSeePurchasePrice && m.purchasePrice && (
                        <span className="text-[9px] text-natural-dark font-bold bg-natural-accent/50 px-1.5 rounded">P: ₹{m.purchasePrice}</span>
                      )}
                      {canSeeSellingPrice && m.sellingPrice && (
                        <span className="text-[9px] text-natural-dark font-bold bg-green-100 px-1.5 rounded">S: ₹{m.sellingPrice}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => startEdit(m)}
                    className="p-2 text-natural-muted hover:text-natural-dark transition-colors"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteProduct(m.id)}
                    className="p-2 text-natural-muted hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Admin User Management */}
      {profile?.role === 'admin' && (
        <section className="bg-white p-8 rounded-[2.5rem] border border-natural-accent shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <UserCog className="text-natural-dark" size={24} />
              <h3 className="text-xl font-serif font-bold text-natural-dark">User Management</h3>
            </div>
            <button 
              onClick={() => setShowAddUser(!showAddUser)}
              className="w-10 h-10 rounded-2xl bg-natural-bg border border-natural-accent flex items-center justify-center text-natural-dark hover:bg-natural-accent transition-colors"
            >
              <Plus size={20} className={cn("transition-transform", showAddUser && "rotate-45")} />
            </button>
          </div>

          <AnimatePresence>
            {showAddUser && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddUser}
                className="mb-8 p-6 bg-natural-bg/50 rounded-3xl border border-natural-accent space-y-4 overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-natural-muted px-1">Email Address</label>
                    <input 
                      type="email"
                      placeholder="user@example.com"
                      className="w-full bg-white border border-natural-accent rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-natural-dark"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-natural-muted px-1">Display Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. John Doe"
                      className="w-full bg-white border border-natural-accent rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-natural-dark"
                      value={newUser.displayName}
                      onChange={(e) => setNewUser({...newUser, displayName: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-natural-muted px-1">Assigned Role</label>
                  <div className="relative">
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value as UserRole})}
                      className="w-full bg-white border border-natural-accent rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-natural-dark appearance-none"
                    >
                      <option value="endUser">End User</option>
                      <option value="orderer">Orderer</option>
                      <option value="vendor">Vendor</option>
                      <option value="storeManager">Store Manager</option>
                      <option value="accounts">Accounts</option>
                      <option value="admin">Admin</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-natural-muted pointer-events-none" />
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-natural-dark text-white font-black uppercase tracking-[0.2em] py-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating Profile...' : 'Authorize Team Member'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
          
          <div className="space-y-4">

            {loadingUsers ? (
              <div className="h-20 bg-natural-bg animate-pulse rounded-2xl" />
            ) : (
              users.map((u) => (
                <div key={u.uid || u.email} className="flex items-center justify-between p-4 bg-natural-bg/50 rounded-2xl border border-natural-accent/30">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                       <p className="text-sm font-bold text-natural-dark truncate">{u.displayName}</p>
                       {(!u.uid || u.uid === u.email) && <span className="bg-amber-100 text-amber-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">Invited</span>}
                    </div>
                    <p className="text-[10px] text-natural-muted font-medium truncate">{u.email}</p>
                  </div>
                  
                  <div className="relative">
                    <select
                      value={u.role}
                      disabled={u.uid === profile.uid} // Can't change own role
                      onChange={(e) => updateUserRole(u.uid, e.target.value as UserRole)}
                      className={cn(
                        "appearance-none bg-white border border-natural-accent rounded-xl py-2 pl-4 pr-10 text-[10px] font-black uppercase tracking-tighter text-natural-dark focus:outline-none focus:ring-2 focus:ring-natural-dark transition-all shadow-sm",
                        u.uid === profile.uid && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <option value="endUser">End User</option>
                      <option value="orderer">Orderer</option>
                      <option value="vendor">Vendor</option>
                      <option value="storeManager">Store Manager</option>
                      <option value="accounts">Accounts</option>
                      <option value="admin">Admin</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-natural-muted pointer-events-none" />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Team Management */}
      {!profile?.teamId ? (
        <section className="bg-natural-dark p-10 rounded-[3rem] text-white shadow-3xl shadow-natural-dark/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]" />
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-white/10 p-3 rounded-2xl">
                <Plus className="text-white" size={32} />
              </div>
              <h3 className="text-3xl font-serif font-bold tracking-tight text-white/95">Forge a Team</h3>
            </div>
            <p className="text-white/70 text-sm mb-10 leading-relaxed font-serif italic">
              "Individually, we are a drop. Together, we are an ocean."
            </p>
            <div className="space-y-4">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 block mb-2 px-1">Designate Team Name</label>
              <input 
                type="text" 
                placeholder="e.g. North Site Logistics"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all font-bold text-lg shadow-inner"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
              <button 
                disabled={submitting}
                onClick={handleCreateTeam}
                className="w-full bg-white text-natural-darker font-black py-5 rounded-[1.5rem] shadow-xl active:scale-95 disabled:opacity-50 transition-all uppercase tracking-[0.2em] text-xs mt-6"
              >
                {submitting ? 'Constructing...' : 'Provision Team'}
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-white p-8 rounded-[2.5rem] border border-natural-accent shadow-sm">
          <h3 className="text-[10px] font-black text-natural-muted/50 uppercase tracking-[0.2em] mb-6">Division Control</h3>
          <div className="flex items-center justify-between p-6 bg-natural-bg/50 rounded-3xl border border-natural-accent/30">
            <div className="flex items-center gap-4">
              <div className="bg-natural-dark text-white p-2 rounded-lg shadow-md lg:shadow-none">
                <Users size={20} />
              </div>
              <div>
                <span className="font-bold text-natural-dark block">Active Deployment</span>
                <span className="text-[10px] font-medium text-natural-muted uppercase tracking-wider">{profile.teamId}</span>
              </div>
            </div>
            <div className="bg-green-100 p-1.5 rounded-full">
              <Check size={18} className="text-green-600" strokeWidth={3} />
            </div>
          </div>
        </section>
      )}

      {/* Logout */}
      <div className="px-4">
        <button 
          onClick={() => auth.signOut()}
          className="w-full py-4 flex items-center justify-center gap-3 text-natural-muted hover:text-red-500 font-black uppercase tracking-[0.15em] text-[10px] transition-colors border border-natural-accent/50 rounded-2xl hover:bg-red-50 hover:border-red-100"
        >
          <LogOut size={16} />
          Terminate Session
        </button>
      </div>

      <p className="text-center text-natural-muted/30 text-[9px] font-black uppercase tracking-[0.3em] font-mono mt-4">
        MatFlow Engine v1.0.4-SEA1
      </p>
    </div>
  );
};
