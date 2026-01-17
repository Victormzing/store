import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartAPI } from '../lib/api';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], total: 0, item_count: 0 });
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart({ items: [], total: 0, item_count: 0 });
      return;
    }
    
    try {
      setLoading(true);
      const response = await cartAPI.get();
      setCart(response.data);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId, quantity = 1) => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      return false;
    }
    
    try {
      setLoading(true);
      const response = await cartAPI.add(productId, quantity);
      setCart(response.data);
      toast.success('Added to cart');
      return true;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to add to cart';
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    try {
      setLoading(true);
      const response = await cartAPI.update(productId, quantity);
      setCart(response.data);
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update quantity';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (productId) => {
    try {
      setLoading(true);
      const response = await cartAPI.remove(productId);
      setCart(response.data);
      toast.success('Removed from cart');
    } catch (error) {
      toast.error('Failed to remove item');
    } finally {
      setLoading(false);
    }
  };

  const clearCart = () => {
    setCart({ items: [], total: 0, item_count: 0 });
  };

  return (
    <CartContext.Provider value={{
      cart,
      loading,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      fetchCart,
      itemCount: cart.item_count,
    }}>
      {children}
    </CartContext.Provider>
  );
};
