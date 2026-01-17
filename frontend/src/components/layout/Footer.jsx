import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Mail, Phone } from 'lucide-react';
import api from '../../lib/api';

export const Footer = () => {
  const [storeSettings, setStoreSettings] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/store-settings');
        setStoreSettings(response.data);
      } catch (error) {
        console.error('Error fetching store settings:', error);
      }
    };
    fetchSettings();
  }, []);

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">
              {storeSettings?.store_name || 'Wacka Accessories'}
            </h3>
            <p className="text-sm text-gray-400">
              Premium accessories crafted for the modern you. Quality products with secure M-Pesa payments.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/products" className="text-sm hover:text-white transition-colors">
                  Shop
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-sm hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-sm hover:text-white transition-colors">
                  Cart
                </Link>
              </li>
              <li>
                <Link to="/orders" className="text-sm hover:text-white transition-colors">
                  My Orders
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Contact</h3>
            <ul className="space-y-2">
              {storeSettings?.contact_email && (
                <li className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${storeSettings.contact_email}`} className="hover:text-white transition-colors">
                    {storeSettings.contact_email}
                  </a>
                </li>
              )}
              {storeSettings?.contact_phone && (
                <li className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${storeSettings.contact_phone}`} className="hover:text-white transition-colors">
                    {storeSettings.contact_phone}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Follow Us</h3>
            <div className="flex gap-4">
              {storeSettings?.facebook_url && (
                <a
                  href={storeSettings.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {storeSettings?.instagram_url && (
                <a
                  href={storeSettings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {storeSettings?.twitter_url && (
                <a
                  href={storeSettings.twitter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} {storeSettings?.store_name || 'Wacka Accessories'}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
