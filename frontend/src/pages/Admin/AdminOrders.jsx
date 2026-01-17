import React, { useEffect, useState } from 'react';
import { Loader2, Eye } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';

const ORDER_STATUSES = [
  { value: 'pending_payment', label: 'Pending Payment', color: 'status-pending' },
  { value: 'paid', label: 'Paid', color: 'status-paid' },
  { value: 'processing', label: 'Processing', color: 'status-processing' },
  { value: 'shipped', label: 'Shipped', color: 'status-processing' },
  { value: 'completed', label: 'Completed', color: 'status-completed' },
  { value: 'failed', label: 'Failed', color: 'status-failed' },
  { value: 'cancelled', label: 'Cancelled', color: 'status-cancelled' },
];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await adminAPI.getOrders(params);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdating(true);
    try {
      await adminAPI.updateOrderStatus(orderId, newStatus);
      toast.success('Order status updated');
      fetchOrders();
      setDialogOpen(false);
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusInfo = (status) => {
    return ORDER_STATUSES.find(s => s.value === status) || ORDER_STATUSES[0];
  };

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div data-testid="admin-orders">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Orders
          </h1>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48" data-testid="status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              {ORDER_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No orders found.
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const statusInfo = getStatusInfo(order.status);
                  return (
                    <tr key={order.id} data-testid={`order-row-${order.id}`}>
                      <td>
                        <span className="font-medium text-gray-900">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div>
                          <p className="text-gray-900">{order.phone_number}</p>
                          <p className="text-xs text-gray-500">
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </td>
                      <td className="font-medium text-gray-900">
                        KES {order.total_amount.toLocaleString()}
                      </td>
                      <td>
                        <Select
                          value={order.status}
                          onValueChange={(newStatus) => handleStatusUpdate(order.id, newStatus)}
                          disabled={updating}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ORDER_STATUSES.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="text-gray-600">
                        {new Date(order.created_at).toLocaleDateString('en-KE', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewOrderDetails(order)}
                          data-testid={`view-order-${order.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Order Details Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Order #{selectedOrder?.id.slice(0, 8).toUpperCase()}
              </DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                {/* Status Update */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <Select
                    value={selectedOrder.status}
                    onValueChange={(v) => handleStatusUpdate(selectedOrder.id, v)}
                    disabled={updating}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Customer Info */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Customer Info</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
                    <p><span className="text-gray-500">Phone:</span> {selectedOrder.phone_number}</p>
                    {selectedOrder.address_snapshot && (
                      <>
                        <p><span className="text-gray-500">Address:</span> {selectedOrder.address_snapshot.address_line}</p>
                        <p><span className="text-gray-500">City:</span> {selectedOrder.address_snapshot.city}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Items</h4>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.product_image || 'https://placehold.co/40x40/f3f4f6/9ca3af?text=P'}
                            alt={item.product_name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{item.product_name}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <span className="font-medium text-gray-900">
                          KES {(item.price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-semibold pt-4 border-t mt-4">
                    <span>Total</span>
                    <span>KES {selectedOrder.total_amount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Created: {new Date(selectedOrder.created_at).toLocaleString('en-KE')}</p>
                  <p>Updated: {new Date(selectedOrder.updated_at).toLocaleString('en-KE')}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
