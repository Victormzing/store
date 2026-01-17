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

const PAYMENT_STATUSES = [
  { value: 'initiated', label: 'Initiated', color: 'bg-gray-100 text-gray-700' },
  { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  { value: 'success', label: 'Success', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-700' },
];

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await adminAPI.getPayments(params);
      setPayments(response.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    return PAYMENT_STATUSES.find(s => s.value === status) || PAYMENT_STATUSES[0];
  };

  const viewPaymentDetails = (payment) => {
    setSelectedPayment(payment);
    setDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div data-testid="admin-payments">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Payments
          </h1>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48" data-testid="payment-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              {PAYMENT_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
            </div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No payments found.
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Amount</th>
                  <th>Phone</th>
                  <th>Result</th>
                  <th>Receipt</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const statusInfo = getStatusInfo(payment.status);
                  return (
                    <tr key={payment.id} data-testid={`payment-row-${payment.id}`}>
                      <td>
                        <span className="font-medium text-gray-900">
                          #{payment.order_id?.slice(0, 8).toUpperCase() || 'N/A'}
                        </span>
                      </td>
                      <td className="font-medium text-gray-900">
                        KES {payment.amount?.toLocaleString() || 0}
                      </td>
                      <td className="text-gray-600">{payment.phone || 'N/A'}</td>
                      <td>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="text-gray-600">
                        {payment.mpesa_receipt || '—'}
                      </td>
                      <td className="text-gray-600">
                        {payment.created_at ? new Date(payment.created_at).toLocaleDateString('en-KE', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : 'N/A'}
                      </td>
                      <td>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewPaymentDetails(payment)}
                          data-testid={`view-payment-${payment.id}`}
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

        {/* Payment Details Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Payment Details
              </DialogTitle>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Order ID</p>
                    <p className="font-medium">#{selectedPayment.order_id?.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="font-medium">KES {selectedPayment.amount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{selectedPayment.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusInfo(selectedPayment.status).color}`}>
                      {getStatusInfo(selectedPayment.status).label}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Method</p>
                    <p className="font-medium">{selectedPayment.method || 'M-Pesa'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">M-Pesa Receipt</p>
                    <p className="font-medium">{selectedPayment.mpesa_receipt || '—'}</p>
                  </div>
                </div>
                
                {selectedPayment.checkout_request_id && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Checkout Request ID</p>
                    <p className="font-mono text-xs break-all">{selectedPayment.checkout_request_id}</p>
                  </div>
                )}

                {selectedPayment.result_description && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Result Description</p>
                    <p className="text-sm">{selectedPayment.result_description}</p>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  <p>Created: {selectedPayment.created_at ? new Date(selectedPayment.created_at).toLocaleString('en-KE') : 'N/A'}</p>
                  {selectedPayment.completed_at && (
                    <p>Completed: {new Date(selectedPayment.completed_at).toLocaleString('en-KE')}</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
