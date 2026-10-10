import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Navbar from '../components/Navbar.jsx';
import { Plus, Search, ChevronLeft, ChevronRight, Eye, X, PackagePlus, ShieldAlert } from 'lucide-react';
import {
  DEFAULT_INVENTORY,
  SEASONS,
  isOverstocked,
  abcBadge,
  classifyABC,
  formatPeso,
  getATP,
  getBatchesDb,
  getCurrentUser,
  getExpiryInfo,
  getStatus,
  statusBadge,
} from '../utils/inventory.js';

export default function Inventory() {
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Role Check
  const [userRole] = useState(() => getCurrentUser().role);

  const isWarehouseStaff = userRole === 'Warehouse Staff';

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Add Product Modal State (Including receivedDate and expiryDate)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const emptyProduct = () => ({
    sku: '',
    name: '',
    category: 'Generators',
    price: '',
    supplier: '',
    onHand: '',
    reserved: '',
    threshold: '5',
    dailyUsage: '2',
    leadTime: '7',
    safetyStock: '5',
    seasonPeak: 'none',
    seasonMultiplier: '1.5',
    location: '',
    receivedDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  });
  const [newProduct, setNewProduct] = useState(emptyProduct);



  // Load from localStorage or initialize defaults
  const [inventoryData, setInventoryData] = useState(() => {
    const saved = localStorage.getItem('inventory_db');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_INVENTORY;
  });

  // Sync dataset changes to localStorage & update FIFO batches database
  useEffect(() => {
    localStorage.setItem('inventory_db', JSON.stringify(inventoryData));

    // Also synchronize fifo_batches_db so FIFO Backtracking recognizes the new product and dates
    const savedBatches = localStorage.getItem('fifo_batches_db');
    let batchesDb = savedBatches ? JSON.parse(savedBatches) : {};

    inventoryData.forEach(item => {
      if (item && item.sku) {
        const onHand = Number(item.onHand) || 0;
        const formatDateDisplay = (dateStr) => {
          if (!dateStr) return 'Aug 01, 2026';
          try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
          } catch {
            return dateStr;
          }
        };

        if (!batchesDb[item.sku]) {
          batchesDb[item.sku] = [
            {
              batchNo: `BAT-${item.sku.replace(/[^a-zA-Z0-9]/g, '')}-01`,
              receivedDate: formatDateDisplay(item.receivedDate),
              expiryDate: formatDateDisplay(item.expiryDate),
              initialQty: onHand > 0 ? onHand : 25,
              remainingQty: onHand,
              location: item.location || 'Warehouse Main',
              status: onHand === 0 ? 'Depleted' : 'Full Batch'
            }
          ];
        }
      }
    });

    localStorage.setItem('fifo_batches_db', JSON.stringify(batchesDb));
  }, [inventoryData]);

  // Bulletproof Normalized Multi-Filter Logic
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(inventoryData)) return [];
    
    return inventoryData.filter(item => {
      const sku = item?.sku || '';
      const name = item?.name || '';
      const location = item?.location || '';
      const category = item?.category || '';
      const status = getStatus(item || {});

      const matchesSearch = 
        sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === '' || category.toLowerCase() === selectedCategory.toLowerCase();
      
      const normalizedItemStatus = status.toLowerCase().replace(/\s+/g, '-');
      const normalizedSelectedStatus = selectedStatus.toLowerCase().replace(/\s+/g, '-');
      const matchesStatus = selectedStatus === '' || normalizedItemStatus === normalizedSelectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [inventoryData, searchTerm, selectedCategory, selectedStatus]);

  // Paginated Slice
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  // Handle Adding New Product
  const handleAddProduct = (e) => {
    e.preventDefault();
    if (isWarehouseStaff) {
      alert('Access Denied: Warehouse Staff cannot add new products.');
      setIsModalOpen(false);
      return;
    }

    if (!newProduct.sku.trim() || !newProduct.name.trim()) {
      alert('Please fill out the required SKU and Product Name.');
      return;
    }

    const sku = newProduct.sku.trim().toUpperCase();
    if (inventoryData.some((i) => i.sku.toLowerCase() === sku.toLowerCase())) {
      alert(`SKU ${sku} already exists. Each product needs a unique SKU.`);
      return;
    }

    const onHand = Math.max(Number(newProduct.onHand) || 0, 0);
    const reserved = Math.min(Math.max(Number(newProduct.reserved) || 0, 0), onHand);

    const createdItem = {
      sku,
      name: newProduct.name.trim(),
      fullName: newProduct.name.trim(),
      category: newProduct.category,
      price: formatPeso(newProduct.price),
      supplier: newProduct.supplier.trim() || 'Unassigned supplier',
      desc: 'Added from the inventory page.',
      location: newProduct.location.trim() || 'Warehouse Main',
      onHand,
      reserved,
      available: onHand - reserved,
      threshold: Number(newProduct.threshold) || 5,
      dailyUsage: Number(newProduct.dailyUsage) || 2,
      leadTime: Number(newProduct.leadTime) || 7,
      safetyStock: Number(newProduct.safetyStock) || 0,
      seasonPeak: newProduct.seasonPeak,
      seasonMultiplier: Number(newProduct.seasonMultiplier) || 1,
      receivedDate: newProduct.receivedDate,
      expiryDate: newProduct.expiryDate,
    };
    createdItem.status = getStatus(createdItem);
    createdItem.badgeClass = statusBadge(createdItem.status);

    setInventoryData(prev => [createdItem, ...prev]);
    setIsModalOpen(false);
    setNewProduct(emptyProduct());
  };

  // ABC class of every product (by annual usage value) and batch data for expiry checks
  const abcMap = useMemo(() => classifyABC(inventoryData), [inventoryData]);
  const batchesDb = getBatchesDb();

  return (
    <div className="bg-slate-100 text-slate-900 font-sans antialiased min-h-screen flex flex-col overflow-x-hidden w-full">
      <Navbar isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} />
      <Header title="Inventory" onMenuOpen={() => setIsNavOpen(true)} />

      <main className="w-full max-w-full px-4 sm:px-6 lg:px-10 py-6 space-y-6 flex-1">
        
        {isWarehouseStaff && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-2 text-xs font-bold text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Warehouse Staff Account: Adding new products is restricted to Administrators and Managers.</span>
          </div>
        )}

        {/* Header Title & Primary Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inventory List</h1>
            <p className="text-xs font-semibold text-slate-600 mt-0.5">Manage, search, and monitor active stock SKUs.</p>
          </div>

          {!isWarehouseStaff && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-xs transition duration-150 flex items-center justify-center space-x-2 cursor-pointer self-start sm:self-auto active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          )}
        </div>

        {/* Filters Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            
            {/* Search Input */}
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by SKU, product name, or location..." 
                className="w-full pl-10 pr-8 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            <div className="sm:col-span-3">
              <select 
                value={selectedCategory} 
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="">Category: All</option>
                <option value="Generators">Generators</option>
                <option value="Solar Systems">Solar Systems</option>
                <option value="Batteries">Batteries</option>
                <option value="Switches">Switches</option>
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="sm:col-span-3">
              <select 
                value={selectedStatus} 
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="">Status: All</option>
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>

          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[980px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase text-[10px] font-black tracking-wider">
                  <th className="py-3.5 px-4">SKU</th>
                  <th className="py-3.5 px-4">Product Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-center">ABC</th>
                  <th className="py-3.5 px-4 text-center">On Hand</th>
                  <th className="py-3.5 px-4 text-center">Allocated</th>
                  <th className="py-3.5 px-4 text-center">Available (ATP)</th>
                  <th className="py-3.5 px-4">Expiry</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {paginatedProducts.length > 0 ? (
                  paginatedProducts.map((item) => {
                    const status = getStatus(item);
                    const abc = abcMap[item.sku]?.class || 'C';
                    const expiry = getExpiryInfo(item, batchesDb);
                    return (
                    <tr key={item.sku} className="hover:bg-sky-50/40 transition">
                      <td className="py-3.5 px-4 font-mono font-black text-sky-700">{item.sku}</td>
                      <td className="py-3.5 px-4 font-black text-slate-900">{item.name}</td>
                      <td className="py-3.5 px-4 text-slate-600">{item.category}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block border font-black px-2.5 py-0.5 rounded-full text-[10px] ${abcBadge(abc)}`}>{abc}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700">{item.onHand}</td>
                      <td className="py-3.5 px-4 text-center text-slate-600">{Number(item.reserved) || 0}</td>
                      <td className="py-3.5 px-4 text-center font-black text-slate-900">{getATP(item)}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {expiry.state === 'expired' && <span className="font-bold text-rose-700">Expired</span>}
                        {expiry.state === 'expiring' && <span className="font-bold text-amber-700">{expiry.days} days left</span>}
                        {expiry.state !== 'expired' && expiry.state !== 'expiring' && (
                          <span className="text-slate-500">{item.expiryDate || 'N/A'}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{item.location}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block border font-black px-2.5 py-0.5 rounded-full text-[10px] ${statusBadge(status)}`}>
                          {status}
                        </span>
                        {isOverstocked(item) && (
                          <span className="ml-1.5 inline-block border font-black px-2 py-0.5 rounded-full text-[10px] bg-indigo-50 text-indigo-800 border-indigo-300">Overstock</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Link 
                          to={`/product-details?sku=${item.sku}`} 
                          className="inline-flex items-center space-x-1.5 bg-slate-100 hover:bg-sky-100 text-slate-800 hover:text-sky-800 font-extrabold px-3 py-1.5 rounded-xl border border-slate-200 transition text-[11px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </Link>
                      </td>
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="11" className="py-8 text-center text-xs font-bold text-slate-400">
                      No products found matching your search and filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50">
            <p className="text-xs text-slate-600 font-bold">
              Showing <span className="text-slate-900">{filteredProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span> of <span className="text-slate-900">{filteredProducts.length}</span> products
            </p>
            <div className="flex items-center space-x-1">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white transition disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
                    currentPage === pageNum 
                      ? 'bg-sky-600 text-white shadow-2xs' 
                      : 'text-slate-700 hover:bg-white border border-slate-200'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button 
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white transition disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* ADD PRODUCT MODAL (Restricted to non-Warehouse Staff) */}
      {isModalOpen && !isWarehouseStaff && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <PackagePlus className="w-5 h-5 text-sky-600" />
                <h3 className="text-base font-black text-slate-900">Add New Product</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-3 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1 uppercase tracking-wider text-[10px] font-black">SKU Code *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. SKU-1111"
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block mb-1 uppercase tracking-wider text-[10px] font-black">Product Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Inverter Battery v3"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 uppercase tracking-wider text-[10px] font-black">Category</label>
                  <select 
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="Generators">Generators</option>
                    <option value="Solar Systems">Solar Systems</option>
                    <option value="Batteries">Batteries</option>
                    <option value="Switches">Switches</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 uppercase tracking-wider text-[10px] font-black">Unit Price (₱)</label>
                  <input type="number" min="0" step="0.01" placeholder="12500" value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold" />
                </div>
              </div>

              <div>
                <label className="block mb-1 uppercase tracking-wider text-[10px] font-black">Supplier</label>
                <input type="text" placeholder="e.g. SolarTech Energy Supplies" value={newProduct.supplier}
                  onChange={(e) => setNewProduct({ ...newProduct, supplier: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 uppercase tracking-wider text-[10px] font-black">On Hand Qty</label>
                  <input type="number" min="0" placeholder="10" value={newProduct.onHand}
                    onChange={(e) => setNewProduct({ ...newProduct, onHand: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold" />
                </div>
                <div>
                  <label className="block mb-1 uppercase tracking-wider text-[10px] font-black">Allocated</label>
                  <input type="number" min="0" placeholder="0" value={newProduct.reserved}
                    onChange={(e) => setNewProduct({ ...newProduct, reserved: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold" />
                </div>
                <div>
                  <label className="block mb-1 uppercase tracking-wider text-[10px] font-black">Low Stock At</label>
                  <input type="number" min="0" placeholder="5" value={newProduct.threshold}
                    onChange={(e) => setNewProduct({ ...newProduct, threshold: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold" />
                </div>
              </div>

              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 pt-1">Reorder point inputs</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 uppercase tracking-wider text-[10px] font-black">Daily Demand</label>
                  <input type="number" min="0" placeholder="2" value={newProduct.dailyUsage}
                    onChange={(e) => setNewProduct({ ...newProduct, dailyUsage: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold" />
                </div>
                <div>
                  <label className="block mb-1 uppercase tracking-wider text-[10px] font-black">Lead Time (days)</label>
                  <input type="number" min="0" placeholder="7" value={newProduct.leadTime}
                    onChange={(e) => setNewProduct({ ...newProduct, leadTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold" />
                </div>
                <div>
                  <label className="block mb-1 uppercase tracking-wider text-[10px] font-black">Safety Stock</label>
                  <input type="number" min="0" placeholder="5" value={newProduct.safetyStock}
                    onChange={(e) => setNewProduct({ ...newProduct, safetyStock: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold" />
                </div>
              </div>

              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 pt-1">Seasonal demand</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 uppercase tracking-wider text-[10px] font-black">Peak Season</label>
                  <select value={newProduct.seasonPeak}
                    onChange={(e) => setNewProduct({ ...newProduct, seasonPeak: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold">
                    {Object.entries(SEASONS).map(([key, season]) => (
                      <option key={key} value={key}>{season.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 uppercase tracking-wider text-[10px] font-black">Peak Demand (x)</label>
                  <input type="number" min="1" step="0.1" placeholder="1.5" value={newProduct.seasonMultiplier}
                    disabled={newProduct.seasonPeak === 'none'}
                    onChange={(e) => setNewProduct({ ...newProduct, seasonMultiplier: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold" />
                </div>
              </div>

              {/* Received Date & Expiry Date Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 uppercase tracking-wider text-[10px] font-black">Received Date</label>
                  <input 
                    type="date"
                    required
                    value={newProduct.receivedDate}
                    onChange={(e) => setNewProduct({ ...newProduct, receivedDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block mb-1 uppercase tracking-wider text-[10px] font-black text-rose-700">Expiry Date</label>
                  <input 
                    type="date"
                    required
                    value={newProduct.expiryDate}
                    onChange={(e) => setNewProduct({ ...newProduct, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 uppercase tracking-wider text-[10px] font-black">Storage Location</label>
                <input 
                  type="text" 
                  placeholder="Warehouse A Shelf 3"
                  value={newProduct.location}
                  onChange={(e) => setNewProduct({ ...newProduct, location: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}