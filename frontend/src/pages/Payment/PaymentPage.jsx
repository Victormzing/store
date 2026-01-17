import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Phone, Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { orderAPI, paymentAPI } from '../../lib/api';
import { useCart } from '../../context/CartContext';
import { toast } from 'sonner';

export default function PaymentPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { clearCart, fetchCart } = useCart();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, pending, success, failed
  const [paymentId, setPaymentId] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await orderAPI.getOne(orderId);
        setOrder(response.data);
        setPhoneNumber(response.data.phone_number);
        
        // If order is already paid, show success
        if (response.data.status === 'paid') {
          setPaymentStatus('success');
        }
      } catch (error) {
        toast.error('Order not found');
        navigate('/orders');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrder();
  }, [orderId, navigate]);

  const pollPaymentStatus = useCallback(async (pId) => {
    if (!pId) return;
    
    try {
      const response = await paymentAPI.getStatus(pId);
      
      if (response.data.status === 'success') {
        setPaymentStatus('success');
        setPolling(false);
        clearCart();
        fetchCart();
        toast.success('Payment successful!');
      } else if (response.data.status === 'failed') {
        setPaymentStatus('failed');
        setPolling(false);
        toast.error('Payment failed. Please try again.');
      }
      // If still pending, continue polling
    } catch (error) {
      console.error('Error polling status:', error);
    }
  }, [clearCart, fetchCart]);

  useEffect(() => {
    let interval;
    
    if (polling && paymentId) {
      interval = setInterval(() => {
        pollPaymentStatus(paymentId);
      }, 5000); // Poll every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [polling, paymentId, pollPaymentStatus]);

  const initiatePayment = async () => {
    // Format phone number
    let phone = phoneNumber.replace(/\s/g, '').replace('+', '');
    if (phone.startsWith('0')) {
      phone = '254' + phone.slice(1);
    } else if (!phone.startsWith('254')) {
      phone = '254' + phone;
    }

    setInitiating(true);
    try {
      const response = await paymentAPI.initiate(orderId, phone);
      setPaymentId(response.data.payment_id);
      setPaymentStatus('pending');
      setPolling(true);
      toast.success('STK Push sent! Check your phone.');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to initiate payment';
      toast.error(message);
    } finally {
      setInitiating(false);
    }
  };

  const handleRetry = () => {
    setPaymentStatus('idle');
    setPaymentId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8" data-testid="payment-page">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="h-8 w-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Pay with M-Pesa
            </h1>
            <p className="text-gray-600 mt-2">
              Order Total: <span className="font-semibold">KES {order.total_amount.toLocaleString()}</span>
            </p>
          </div>

          {/* Idle State - Enter Phone */}
          {paymentStatus === 'idle' && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="phone">M-Pesa Phone Number</Label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    +254
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="712345678"
                    value={phoneNumber.replace('254', '')}
                    onChange={(e) => setPhoneNumber('254' + e.target.value.replace(/\D/g, ''))}
                    className="pl-14 h-12 text-lg mpesa-phone-input"
                    data-testid="mpesa-phone-input"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Enter the phone number registered with M-Pesa
                </p>
              </div>

              <Button
                onClick={initiatePayment}
                disabled={initiating || !phoneNumber || phoneNumber.length < 12}
                className="w-full rounded-full bg-emerald-500 hover:bg-emerald-600 text-white py-6 text-lg"
                data-testid="pay-now-btn"
              >
                {initiating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Sending STK Push...
                  </>
                ) : (
                  `Pay KES ${order.total_amount.toLocaleString()}`
                )}
              </Button>
            </div>
          )}

          {/* Pending State */}
          {paymentStatus === 'pending' && (
            <div className="text-center space-y-6">
              <div className="animate-pulse">
                <Loader2 className="h-16 w-16 text-emerald-500 mx-auto animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Check Your Phone
                </h3>
                <p className="text-gray-600">
                  Enter your M-Pesa PIN to complete the payment
                </p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4">
                <p className="text-sm text-emerald-700">
                  An STK Push has been sent to <strong>{phoneNumber}</strong>
                </p>
              </div>
              <p className="text-xs text-gray-500">
                Waiting for payment confirmation...
              </p>
            </div>
          )}

          {/* Success State */}
          {paymentStatus === 'success' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-12 w-12 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Payment Successful!
                </h3>
                <p className="text-gray-600">
                  Your order has been confirmed and is being processed.
                </p>
              </div>
              <Button
                onClick={() => navigate('/orders')}
                className="w-full rounded-full bg-emerald-500 hover:bg-emerald-600 text-white py-6"
                data-testid="view-orders-btn"
              >
                View My Orders
              </Button>
            </div>
          )}

          {/* Failed State */}
          {paymentStatus === 'failed' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="h-12 w-12 text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Payment Failed
                </h3>
                <p className="text-gray-600">
                  The payment could not be completed. Please try again.
                </p>
              </div>
              <Button
                onClick={handleRetry}
                className="w-full rounded-full bg-gray-900 hover:bg-gray-800 text-white py-6"
                data-testid="retry-payment-btn"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          )}

          {/* Order Summary */}
          <div className="mt-8 pt-6 border-t">
            <h4 className="text-sm font-medium text-gray-500 mb-3">Order Summary</h4>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.product_name} × {item.quantity}
                  </span>
                  <span className="text-gray-900">
                    KES {(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total</span>
                <span>KES {order.total_amount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
