import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Check, Loader2, CreditCard, Truck, Package, Ticket, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { orderAPI, couponAPI, shippingAPI } from '../../lib/api';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [deliveryMethod, setDeliveryMethod] = useState('delivery');
  const [formData, setFormData] = useState({
    phone: user?.phone_number || '',
    address_line: '',
    city: 'Nairobi',
    country: 'Kenya',
  });
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [discount, setDiscount] = useState(0);
  
  // Shipping state
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingLoading, setShippingLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (cart.items.length === 0 && !loading) {
      navigate('/cart');
    }
  }, [isAuthenticated, cart.items.length, loading, navigate]);

  if (!isAuthenticated || (cart.items.length === 0 && !loading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.phone || !formData.address_line || !formData.city) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Format phone number
    let phone = formData.phone.replace(/\s/g, '').replace('+', '');
    if (phone.startsWith('0')) {
      phone = '254' + phone.slice(1);
    } else if (!phone.startsWith('254')) {
      phone = '254' + phone;
    }

    setLoading(true);
    try {
      const response = await orderAPI.create({
        phone_number: phone,
        payment_method: paymentMethod,
        delivery_method: deliveryMethod,
        address: {
          phone: phone,
          address_line: formData.address_line,
          city: formData.city,
          country: formData.country,
        },
      });

      toast.success('Order created successfully');
      
      // Redirect based on payment method
      if (paymentMethod === 'pay_on_delivery') {
        // For COD, go directly to orders page
        clearCart();
        navigate('/orders');
      } else {
        // For M-Pesa, go to payment page
        navigate(`/payment/${response.data.id}`);
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to create order';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8" data-testid="checkout-page">
      <div className="max-w-3xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate('/cart')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cart
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Checkout
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-500" />
                Delivery Information
              </h2>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="0712345678"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="pl-10"
                      required
                      data-testid="phone-input"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This will be used for delivery updates
                  </p>
                </div>

                <div>
                  <Label htmlFor="address_line">Delivery Address *</Label>
                  <Input
                    id="address_line"
                    name="address_line"
                    placeholder="Building name, Street, Area"
                    value={formData.address_line}
                    onChange={handleInputChange}
                    className="mt-1"
                    required
                    data-testid="address-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      name="city"
                      placeholder="City"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="mt-1"
                      required
                      data-testid="city-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      name="country"
                      value={formData.country}
                      disabled
                      className="mt-1 bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Method Selection */}
              <div className="mt-8 pt-6 border-t">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-emerald-500" />
                  Delivery Method
                </h2>
                
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('delivery')}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      deliveryMethod === 'delivery'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      deliveryMethod === 'delivery' ? 'border-emerald-500' : 'border-gray-300'
                    }`}>
                      {deliveryMethod === 'delivery' && (
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">Home Delivery</p>
                      <p className="text-sm text-gray-500">We'll deliver to your address</p>
                    </div>
                    <Truck className="w-8 h-8 text-emerald-600" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('pickup')}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      deliveryMethod === 'pickup'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      deliveryMethod === 'pickup' ? 'border-emerald-500' : 'border-gray-300'
                    }`}>
                      {deliveryMethod === 'pickup' && (
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">Store Pickup</p>
                      <p className="text-sm text-gray-500">Pick up from our store</p>
                    </div>
                    <Package className="w-8 h-8 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="mt-8 pt-6 border-t">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-500" />
                  Payment Method
                </h2>
                
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mpesa')}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === 'mpesa'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'mpesa' ? 'border-emerald-500' : 'border-gray-300'
                    }`}>
                      {paymentMethod === 'mpesa' && (
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">M-Pesa</p>
                      <p className="text-sm text-gray-500">Pay instantly via M-Pesa STK Push</p>
                    </div>
                    <div className="w-12 h-8 bg-green-600 rounded flex items-center justify-center text-white text-xs font-bold">
                      M
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pay_on_delivery')}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === 'pay_on_delivery'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'pay_on_delivery' ? 'border-emerald-500' : 'border-gray-300'
                    }`}>
                      {paymentMethod === 'pay_on_delivery' && (
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">Pay on Delivery</p>
                      <p className="text-sm text-gray-500">Pay cash when your order arrives</p>
                    </div>
                    <Truck className="w-8 h-8 text-gray-400" />
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full mt-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white py-6"
                data-testid="place-order-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Order...
                  </>
                ) : paymentMethod === 'mpesa' ? (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Place Order & Pay with M-Pesa
                  </>
                ) : (
                  <>
                    <Truck className="mr-2 h-4 w-4" />
                    Place Order - Pay on Delivery
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Order Summary
              </h2>

              <div className="space-y-4 mb-6">
                {cart.items.map((item) => (
                  <div key={item.product_id} className="flex gap-3">
                    <img
                      src={item.product_image || 'https://placehold.co/60x60/f3f4f6/9ca3af?text=No+Image'}
                      alt={item.product_name}
                      className="w-14 h-14 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-1">
                        {item.product_name}
                      </h4>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      KES {item.subtotal.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>KES {cart.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span className="text-emerald-600">Free</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold text-gray-900 text-lg">
                  <span>Total</span>
                  <span>KES {cart.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
