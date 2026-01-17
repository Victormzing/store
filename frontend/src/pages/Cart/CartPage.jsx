import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Minus, Plus, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

export default function CartPage() {
  const { cart, loading, updateQuantity, removeFromCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-8" data-testid="cart-page">
        <div className="max-w-3xl mx-auto px-4 text-center py-16">
          <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Your cart is waiting
          </h1>
          <p className="text-gray-600 mb-8">Login to view your cart and checkout</p>
          <Link to="/login">
            <Button className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white px-8">
              Login to Continue
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8" data-testid="cart-page">
        <div className="max-w-3xl mx-auto px-4 text-center py-16">
          <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Your cart is empty
          </h1>
          <p className="text-gray-600 mb-8">Start shopping to add items to your cart</p>
          <Link to="/products">
            <Button className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white px-8">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" data-testid="cart-page">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/products')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Continue Shopping
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Shopping Cart
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <div
                key={item.product_id}
                className="bg-white rounded-xl p-4 flex gap-4"
                data-testid={`cart-item-${item.product_id}`}
              >
                <img
                  src={item.product_image || 'https://placehold.co/100x100/f3f4f6/9ca3af?text=No+Image'}
                  alt={item.product_name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{item.product_name}</h3>
                  <p className="text-emerald-600 font-medium">
                    KES {item.price.toLocaleString()}
                  </p>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border rounded-full">
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        className="qty-btn m-0.5"
                        disabled={loading || item.quantity <= 1}
                        data-testid={`cart-qty-decrease-${item.product_id}`}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        className="qty-btn m-0.5"
                        disabled={loading}
                        data-testid={`cart-qty-increase-${item.product_id}`}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    
                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-2"
                      disabled={loading}
                      data-testid={`cart-remove-${item.product_id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className="font-semibold text-gray-900">
                    KES {item.subtotal.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Order Summary
              </h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({cart.item_count} items)</span>
                  <span>KES {cart.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span className="text-emerald-600">Free</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-semibold text-gray-900">
                  <span>Total</span>
                  <span>KES {cart.total.toLocaleString()}</span>
                </div>
              </div>

              <Link to="/checkout" data-testid="checkout-button">
                <Button className="w-full rounded-full bg-emerald-500 hover:bg-emerald-600 text-white py-6">
                  Proceed to Checkout
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>

              <p className="text-xs text-gray-500 text-center mt-4">
                Secure checkout with M-Pesa
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
