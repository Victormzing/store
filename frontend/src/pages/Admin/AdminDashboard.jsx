import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  DollarSign, 
  ShoppingCart, 
  AlertTriangle, 
  Package,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { adminAPI } from '../../lib/api';
import { AdminLayout } from '../../components/admin/AdminLayout';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, ordersRes, lowStockRes] = await Promise.all([
          adminAPI.getDashboard(),
          adminAPI.getOrders({ limit: 5 }),
          adminAPI.getLowStock(),
        ]);
        setStats(statsRes.data);
        setRecentOrders(ordersRes.data);
        setLowStock(lowStockRes.data);
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending_payment': return 'status-pending';
      case 'paid': return 'status-paid';
      case 'processing': return 'status-processing';
      case 'completed': return 'status-completed';
      case 'failed': return 'status-failed';
      default: return 'status-pending';
    }
  };

  return (
    <AdminLayout>
      <div data-testid="admin-dashboard">
        <h1 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Dashboard
        </h1>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="stat-card animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="stat-card" data-testid="stat-sales">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Today's Sales</p>
                    <p className="text-2xl font-bold text-gray-900">
                      KES {stats?.today_sales?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-full">
                    <DollarSign className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </div>

              <div className="stat-card" data-testid="stat-orders">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Orders Today</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.orders_today || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <ShoppingCart className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="stat-card" data-testid="stat-failed-payments">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Failed Payments</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.failed_payments || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </div>

              <div className="stat-card" data-testid="stat-low-stock">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Low Stock Items</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.low_stock_count || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-full">
                    <Package className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Low Stock Alerts */}
              <div className="bg-white rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Low Stock Alerts</h2>
                  <Link to="/admin/inventory" className="text-emerald-600 hover:text-emerald-700 text-sm flex items-center gap-1">
                    View All <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                
                {lowStock.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4">No low stock items</p>
                ) : (
                  <div className="space-y-3">
                    {lowStock.slice(0, 5).map((item) => (
                      <div key={item.product_id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-gray-900">{item.product_name}</span>
                        <span className="text-amber-600 font-medium">{item.quantity} left</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Orders */}
              <div className="bg-white rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                  <Link to="/admin/orders" className="text-emerald-600 hover:text-emerald-700 text-sm flex items-center gap-1">
                    View All <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                
                {recentOrders.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4">No orders yet</p>
                ) : (
                  <div className="space-y-3">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="text-gray-900 font-medium">#{order.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-xs text-gray-500">KES {order.total_amount.toLocaleString()}</p>
                        </div>
                        <span className={`order-status-badge ${getStatusClass(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
