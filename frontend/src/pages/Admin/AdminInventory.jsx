import React, { useEffect, useState } from 'react';
import { Plus, Minus, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';

export default function AdminInventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustmentForm, setAdjustmentForm] = useState({
    change: '',
    reason: 'adjustment',
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await adminAPI.getInventory();
      setInventory(response.data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !adjustmentForm.change) return;

    setAdjusting(true);
    try {
      await adminAPI.adjustInventory({
        product_id: selectedProduct.product_id,
        change: parseInt(adjustmentForm.change),
        reason: adjustmentForm.reason,
      });
      toast.success('Inventory adjusted successfully');
      setDialogOpen(false);
      setSelectedProduct(null);
      setAdjustmentForm({ change: '', reason: 'adjustment' });
      fetchInventory();
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to adjust inventory';
      toast.error(message);
    } finally {
      setAdjusting(false);
    }
  };

  const openAdjustDialog = (item) => {
    setSelectedProduct(item);
    setAdjustmentForm({ change: '', reason: 'adjustment' });
    setDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div data-testid="admin-inventory">
        <h1 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Inventory Management
        </h1>

        {/* Inventory Table */}
        <div className="bg-white rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
            </div>
          ) : inventory.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No inventory data available.
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>In Stock</th>
                  <th>Low Stock Threshold</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item.product_id} data-testid={`inventory-row-${item.product_id}`}>
                    <td>
                      <span className="font-medium text-gray-900">{item.product_name}</span>
                    </td>
                    <td>
                      <span className={`font-medium ${item.is_low_stock ? 'text-amber-600' : 'text-gray-900'}`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="text-gray-600">{item.low_stock_threshold}</td>
                    <td>
                      {item.is_low_stock ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          Low Stock
                        </span>
                      ) : item.quantity === 0 ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Out of Stock
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          OK
                        </span>
                      )}
                    </td>
                    <td>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAdjustDialog(item)}
                        data-testid={`adjust-stock-${item.product_id}`}
                      >
                        Adjust Stock
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Adjust Stock Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Stock</DialogTitle>
            </DialogHeader>
            {selectedProduct && (
              <form onSubmit={handleAdjust} className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium text-gray-900">{selectedProduct.product_name}</p>
                  <p className="text-sm text-gray-500">Current stock: {selectedProduct.quantity}</p>
                </div>

                <div>
                  <Label htmlFor="change">Adjustment (+/-)</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setAdjustmentForm(p => ({
                        ...p,
                        change: (parseInt(p.change || 0) - 1).toString()
                      }))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      id="change"
                      type="number"
                      value={adjustmentForm.change}
                      onChange={(e) => setAdjustmentForm(p => ({ ...p, change: e.target.value }))}
                      className="text-center"
                      placeholder="0"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setAdjustmentForm(p => ({
                        ...p,
                        change: (parseInt(p.change || 0) + 1).toString()
                      }))}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Use positive numbers to add stock, negative to remove.
                  </p>
                </div>

                <div>
                  <Label htmlFor="reason">Reason</Label>
                  <Select 
                    value={adjustmentForm.reason} 
                    onValueChange={(v) => setAdjustmentForm(p => ({ ...p, reason: v }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restock">Restock</SelectItem>
                      <SelectItem value="adjustment">Manual Adjustment</SelectItem>
                      <SelectItem value="return">Customer Return</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {adjustmentForm.change && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-700">
                      New stock level will be: <strong>{selectedProduct.quantity + parseInt(adjustmentForm.change || 0)}</strong>
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={adjusting || !adjustmentForm.change}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    {adjusting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Confirm Adjustment
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
