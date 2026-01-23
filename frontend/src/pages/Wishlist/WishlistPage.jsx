import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, Package } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { wishlistAPI, cartAPI } from '../../lib/api';
import { useCart } from '../../context/CartContext';
import { toast } from 'sonner';

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const { refreshCart } = useCart();

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const response = await wishlistAPI.getAll();
      setWishlist(response.data);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId) => {
    try {
      await wishlistAPI.remove(productId);
      setWishlist(wishlist.filter(item => item.product_id !== productId));
      toast.success('Removed from wishlist');
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast.error('Failed to remove from wishlist');
    }
  };

  const handleAddToCart = async (productId) => {
    try {
      await cartAPI.add(productId, 1);
      refreshCart();
      toast.success('Added to cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error(error.response?.data?.detail || 'Failed to add to cart');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8" data-testid="wishlist-page">
        <div className="max-w-4xl mx-auto px-4 text-center py-16">
          <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Your wishlist is empty
          </h1>
          <p className="text-gray-600 mb-8">Save items you love to your wishlist</p>
          <Link to="/products">
            <Button className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white px-8">
              Browse Products
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" data-testid="wishlist-page">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
          <Heart className="h-8 w-8 text-red-500" />
          My Wishlist
          <span className="text-lg font-normal text-gray-500">({wishlist.length} items)</span>
        </h1>

        <div className="space-y-4">
          {wishlist.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl p-4 flex items-center gap-4"
              data-testid={`wishlist-item-${item.product_id}`}
            >
              <Link to={`/products/${item.product_id}`} className="shrink-0">
                <img
                  src={item.product_image || 'https://placehold.co/100x100/f3f4f6/9ca3af?text=P'}
                  alt={item.product_name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
              </Link>

              <div className="flex-1 min-w-0">
                <Link 
                  to={`/products/${item.product_id}`}
                  className="font-semibold text-gray-900 hover:text-emerald-600 transition-colors line-clamp-1"
                >
                  {item.product_name}
                </Link>
                
                <div className="flex items-center gap-2 mt-1">
                  {item.discount_price ? (
                    <>
                      <span className="text-lg font-bold text-emerald-600">
                        KES {item.discount_price.toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-400 line-through">
                        KES {item.price.toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-bold text-gray-900">
                      KES {item.price.toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  {item.is_in_stock ? (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      In Stock
                    </span>
                  ) : (
                    <span className="text-xs text-red-600 flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      Out of Stock
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddToCart(item.product_id)}
                  disabled={!item.is_in_stock}
                  className="rounded-full"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(item.product_id)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
