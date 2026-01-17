import React, { useEffect, useState, useRef } from 'react';
import { Plus, Edit, Trash2, Loader2, Eye, EyeOff, Upload, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
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

export default function AdminBlog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    featured_image: '',
    tags: '',
    is_published: false,
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await adminAPI.getBlogPosts();
      setPosts(response.data);
    } catch (error) {
      console.error('Error fetching posts:', error);
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
      setFormData(prev => ({ ...prev, featured_image: imageUrl }));
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
        title: formData.title,
        excerpt: formData.excerpt,
        content: formData.content,
        featured_image: formData.featured_image || null,
        tags: formData.tags.split(',').map(s => s.trim()).filter(Boolean),
        is_published: formData.is_published,
      };

      if (editingPost) {
        await adminAPI.updateBlogPost(editingPost.id, data);
        toast.success('Post updated successfully');
      } else {
        await adminAPI.createBlogPost(data);
        toast.success('Post created successfully');
      }

      setDialogOpen(false);
      resetForm();
      fetchPosts();
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to save post';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      featured_image: post.featured_image || '',
      tags: post.tags?.join(', ') || '',
      is_published: post.is_published,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await adminAPI.deleteBlogPost(postId);
      toast.success('Post deleted');
      fetchPosts();
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  const resetForm = () => {
    setEditingPost(null);
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      featured_image: '',
      tags: '',
      is_published: false,
    });
  };

  const handleDialogChange = (open) => {
    setDialogOpen(open);
    if (!open) resetForm();
  };

  return (
    <AdminLayout>
      <div data-testid="admin-blog">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Blog Posts
          </h1>
          <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600" data-testid="add-post-btn">
                <Plus className="h-4 w-4 mr-2" />
                New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPost ? 'Edit Post' : 'Create New Post'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="mt-1"
                    data-testid="post-title-input"
                  />
                </div>

                <div>
                  <Label htmlFor="excerpt">Excerpt *</Label>
                  <Textarea
                    id="excerpt"
                    name="excerpt"
                    value={formData.excerpt}
                    onChange={handleInputChange}
                    required
                    className="mt-1"
                    rows={2}
                    placeholder="Short description for preview"
                    data-testid="post-excerpt-input"
                  />
                </div>

                <div>
                  <Label>Featured Image</Label>
                  <div className="mt-1 space-y-2">
                    {formData.featured_image && (
                      <div className="relative inline-block">
                        <img
                          src={formData.featured_image}
                          alt="Preview"
                          className="h-32 rounded-lg object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, featured_image: '' }))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        name="featured_image"
                        value={formData.featured_image}
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

                <div>
                  <Label htmlFor="content">Content * (HTML supported)</Label>
                  <Textarea
                    id="content"
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    required
                    className="mt-1 font-mono text-sm"
                    rows={10}
                    placeholder="<p>Your blog content here...</p>"
                    data-testid="post-content-input"
                  />
                </div>

                <div>
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    placeholder="fashion, tips, watches"
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_published"
                      checked={formData.is_published}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
                    />
                    <Label htmlFor="is_published" className="cursor-pointer">
                      {formData.is_published ? 'Published' : 'Draft'}
                    </Label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {editingPost ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Posts Table */}
        <div className="bg-white rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
            </div>
          ) : posts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No blog posts yet. Create your first post!
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Author</th>
                  <th>Status</th>
                  <th>Views</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} data-testid={`post-row-${post.id}`}>
                    <td>
                      <div className="flex items-center gap-3">
                        {post.featured_image && (
                          <img
                            src={post.featured_image}
                            alt={post.title}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 line-clamp-1">{post.title}</p>
                          <p className="text-xs text-gray-500 line-clamp-1">{post.excerpt}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-gray-600">{post.author_name}</td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        post.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {post.is_published ? (
                          <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Published</span>
                        ) : (
                          <span className="flex items-center gap-1"><EyeOff className="h-3 w-3" /> Draft</span>
                        )}
                      </span>
                    </td>
                    <td className="text-gray-600">{post.views}</td>
                    <td className="text-gray-600">
                      {new Date(post.created_at).toLocaleDateString('en-KE', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(post)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          data-testid={`edit-post-${post.id}`}
                        >
                          <Edit className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          data-testid={`delete-post-${post.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
