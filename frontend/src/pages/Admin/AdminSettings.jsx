import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Settings, Save, Upload } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    store_name: '',
    logo_url: '',
    contact_email: '',
    contact_phone: '',
    whatsapp_number: '',
    facebook_url: '',
    instagram_url: '',
    twitter_url: '',
    primary_color: '#10B981',
    secondary_color: '#3B82F6',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/store-settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSettings({ ...settings, logo_url: response.data.url });
      toast.success('Logo uploaded');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      await api.patch('/admin/store-settings', settings);
      toast.success('Settings saved successfully');
      fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-7 w-7" />
            Store Settings
          </h1>
          <p className="text-gray-600 mt-1">Customize your store's appearance and contact information</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
            
            <div>
              <Label htmlFor="store_name">Store Name</Label>
              <Input
                id="store_name"
                value={settings.store_name}
                onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                placeholder="Wacka Accessories"
                className="mt-2"
              />
            </div>

            <div>
              <Label>Store Logo</Label>
              <div className="mt-2 flex items-center gap-4">
                {settings.logo_url && (
                  <img
                    src={settings.logo_url}
                    alt="Store Logo"
                    className="h-16 w-auto object-contain border rounded"
                  />
                )}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
                    <Upload className="h-4 w-4" />
                    Upload Logo
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={settings.contact_email}
                  onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                  placeholder="info@wacka.co.ke"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  value={settings.contact_phone}
                  onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                  placeholder="+254 700 000 000"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="whatsapp_number">WhatsApp Number</Label>
                <Input
                  id="whatsapp_number"
                  value={settings.whatsapp_number}
                  onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                  placeholder="254700000000"
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">Include country code without + (e.g., 254...)</p>
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Social Media Links</h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="facebook_url">Facebook URL</Label>
                <Input
                  id="facebook_url"
                  value={settings.facebook_url}
                  onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })}
                  placeholder="https://facebook.com/yourpage"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="instagram_url">Instagram URL</Label>
                <Input
                  id="instagram_url"
                  value={settings.instagram_url}
                  onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })}
                  placeholder="https://instagram.com/yourpage"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="twitter_url">Twitter URL</Label>
                <Input
                  id="twitter_url"
                  value={settings.twitter_url}
                  onChange={(e) => setSettings({ ...settings, twitter_url: e.target.value })}
                  placeholder="https://twitter.com/yourpage"
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          {/* Theme Colors */}
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Theme Colors</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primary_color">Primary Color</Label>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    id="primary_color"
                    type="color"
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="h-10 w-20 rounded border cursor-pointer"
                  />
                  <Input
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    placeholder="#10B981"
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="secondary_color">Secondary Color</Label>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    id="secondary_color"
                    type="color"
                    value={settings.secondary_color}
                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                    className="h-10 w-20 rounded border cursor-pointer"
                  />
                  <Input
                    value={settings.secondary_color}
                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-3">Color Preview:</p>
              <div className="flex gap-3">
                <div
                  className="flex-1 h-16 rounded-lg flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: settings.primary_color }}
                >
                  Primary
                </div>
                <div
                  className="flex-1 h-16 rounded-lg flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: settings.secondary_color }}
                >
                  Secondary
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={saving} size="lg">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
