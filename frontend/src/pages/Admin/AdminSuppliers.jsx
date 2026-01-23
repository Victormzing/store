import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { Truck, Plus, Edit2, Trash2, Phone, Mail, MapPin, User } from 'lucide-react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';

export default function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    contact_person: '',
    notes: '',
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await adminAPI.getSuppliers();
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingSupplier) {
        await adminAPI.updateSupplier(editingSupplier.id, formData);
        toast.success('Supplier updated');
      } else {
        await adminAPI.createSupplier(formData);
        toast.success('Supplier created');
      }
      
      setDialogOpen(false);
      setEditingSupplier(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        contact_person: '',
        notes: '',
      });
      fetchSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error('Failed to save supplier');
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      contact_person: supplier.contact_person || '',
      notes: supplier.notes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (supplierId) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    
    try {
      await adminAPI.deleteSupplier(supplierId);
      toast.success('Supplier deleted');
      fetchSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('Failed to delete supplier');
    }
  };

  const openCreateDialog = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      contact_person: '',
      notes: '',
    });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6" data-testid="admin-suppliers">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Truck className="h-7 w-7" />
              Supplier Management
            </h1>
            <p className="text-gray-600 mt-1">Manage your product suppliers</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} data-testid="add-supplier-btn">
                <Plus className="h-4 w-4 mr-2" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Supplier Company Ltd"
                    required
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="supplier@company.com"
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+254 700 000 000"
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="John Doe"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Business St, Nairobi"
                    rows={2}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes about this supplier..."
                    rows={2}
                    className="mt-2"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingSupplier ? 'Update' : 'Add'} Supplier
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Suppliers Grid */}
        {suppliers.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No suppliers yet. Add your first supplier!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="bg-white rounded-lg border p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(supplier)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(supplier.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  {supplier.contact_person && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      {supplier.contact_person}
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      {supplier.email}
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      {supplier.phone}
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      {supplier.address}
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-3 border-t">
                  <span className="text-xs text-gray-500">
                    {supplier.products_count} products
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
