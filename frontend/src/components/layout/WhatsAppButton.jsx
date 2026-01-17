import React, { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import api from '../../lib/api';

export const WhatsAppButton = () => {
  const [storeSettings, setStoreSettings] = useState(null);
  const [isVisible, setIsVisible] = useState(true);

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

  // Don't show if no WhatsApp number is configured
  if (!storeSettings?.whatsapp_number) {
    return null;
  }

  const handleWhatsAppClick = () => {
    // Format WhatsApp number (remove non-digits)
    const number = storeSettings.whatsapp_number.replace(/\D/g, '');
    const message = encodeURIComponent('Hi! I need help with something from Wacka Accessories.');
    window.open(`https://wa.me/${number}?text=${message}`, '_blank');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* WhatsApp Button */}
      <button
        onClick={handleWhatsAppClick}
        className="bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition-all transform hover:scale-110 flex items-center justify-center group"
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute right-16 bg-gray-900 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Chat with us
        </span>
      </button>
    </div>
  );
};
