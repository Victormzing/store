import React, { useEffect, useState, useRef } from 'react';
import { Plus, Edit, Trash2, Loader2, Upload, X, Package } from 'lucide-react';
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
import { AdminLayout } from '../../components/admin/AdminLayout';
import { adminAPI, uploadAPI } from '../../lib/api';
import { toast } from 'sonner';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await adminAPI.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await uploadAPI.uploadImage(file);
      const imageUrl = `${process.env.REACT_APP_BACKEND_URL}${response.data.url}`;
      setFormData(prev => ({ ...prev, image: imageUrl }));
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const data = {
        name: formData.name,
        slug: formData.slug || undefined,
        description: formData.description || null,
        image: formData.image || null,
      };

      if (editingCategory) {
        await adminAPI.updateCategory(editingCategory.id, data);
        toast.success('Category updated successfully');
      } else {
        await adminAPI.createCategory(data);
        toast.success('Category created successfully');
      }

      setDialogOpen(false);
      resetForm();
      fetchCategories();
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to save category';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      image: category.image || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    if (category?.product_count > 0) {
      toast.error(`Cannot delete category with ${category.product_count} products. Move products first.`);
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    
    try {
      await adminAPI.deleteCategory(categoryId);
      toast.success('Category deleted');
      fetchCategories();
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to delete category';
      toast.error(message);
    }
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      image: '',
    });
  };

  const handleDialogChange = (open) => {
    setDialogOpen(open);
    if (!open) resetForm();
  };

  return (
    <AdminLayout>
      <div data-testid="admin-categories">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Categories
          </h1>
          <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600" data-testid="add-category-btn">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Edit Category' : 'Create New Category'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="mt-1"
                    placeholder="e.g., Watches"
                    data-testid="category-name-input"
                  />
                </div>

                <div>
                  <Label htmlFor="slug">Slug (optional)</Label>
                  <Input
                    id="slug"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    className="mt-1"
                    placeholder="e.g., watches (auto-generated if empty)"
                    data-testid="category-slug-input"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="mt-1"
                    rows={2}
                    placeholder="Brief description of this category"
                  />
                </div>

                <div>
                  <Label>Category Image</Label>
                  <div className="mt-1 space-y-2">
                    {formData.image && (
                      <div className="relative inline-block">
                        <img
                          src={formData.image}
                          alt="Preview"
                          className="h-24 rounded-lg object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        name="image"
                        value={formData.image}
                        onChange={handleInputChange}
                        placeholder="Image URL or upload"
                        className="flex-1"
                      />
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {editingCategory ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                <div className="h-24 bg-gray-200 rounded-lg mb-4" />
                <div className="h-5 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))
          ) : categories.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              No categories yet. Create your first category!
            </div>
          ) : (
            categories.map((category) => (
              <div key={category.id} className="bg-white rounded-xl overflow-hidden shadow-sm" data-testid={`category-card-${category.id}`}>
                {category.image ? (
                  <div className="h-32 overflow-hidden">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-32 bg-gray-100 flex items-center justify-center">
                    <Package className="h-12 w-12 text-gray-300" />
                  </div>
                )}
                
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {category.product_count} products
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-1">/{category.slug}</p>
                  {category.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{category.description}</p>
                  )}
                  
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(category)}
                      className="flex-1"
                      data-testid={`edit-category-${category.id}`}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(category.id)}
                      className="text-red-600 hover:bg-red-50"
                      disabled={category.product_count > 0}
                      data-testid={`delete-category-${category.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
