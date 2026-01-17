import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Clock, CheckCircle, XCircle, Truck, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { orderAPI } from '../../lib/api';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await orderAPI.getAll();
        setOrders(response.data);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending_payment':
        return <Clock className="h-4 w-4" />;
      case 'paid':
      case 'processing':
        return <Package className="h-4 w-4" />;
      case 'shipped':
        return <Truck className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending_payment':
        return 'Pending Payment';
      case 'paid':
        return 'Paid';
      case 'processing':
        return 'Processing';
      case 'shipped':
        return 'Shipped';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending_payment':
        return 'status-pending';
      case 'paid':
      case 'processing':
        return 'status-processing';
      case 'shipped':
        return 'status-processing';
      case 'completed':
        return 'status-completed';
      case 'failed':
        return 'status-failed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
            My Orders
          </h1>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8" data-testid="orders-page">
        <div className="max-w-3xl mx-auto px-4 text-center py-16">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            No orders yet
          </h1>
          <p className="text-gray-600 mb-8">Start shopping to see your orders here</p>
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
    <div className="min-h-screen bg-gray-50 py-8" data-testid="orders-page">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
          My Orders
        </h1>

        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl p-6"
              data-testid={`order-${order.id}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500">
                    Order #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(order.created_at).toLocaleDateString('en-KE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <span className={`order-status-badge flex items-center gap-1 ${getStatusClass(order.status)}`}>
                  {getStatusIcon(order.status)}
                  {getStatusLabel(order.status)}
                </span>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex -space-x-2">
                  {order.items.slice(0, 3).map((item, idx) => (
                    <img
                      key={idx}
                      src={item.product_image || 'https://placehold.co/40x40/f3f4f6/9ca3af?text=P'}
                      alt={item.product_name}
                      className="w-10 h-10 rounded-full border-2 border-white object-cover"
                    />
                  ))}
                  {order.items.length > 3 && (
                    <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                      +{order.items.length - 3}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <p className="font-semibold text-gray-900">
                  KES {order.total_amount.toLocaleString()}
                </p>
              </div>

              {order.status === 'pending_payment' && (
                <Link to={`/payment/${order.id}`}>
                  <Button className="w-full rounded-full bg-emerald-500 hover:bg-emerald-600 text-white">
                    Complete Payment
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
