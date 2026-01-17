import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Mail, Send, Users } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

export default function AdminEmailComposer() {
  const [customers, setCustomers] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [sending, setSending] = useState(false);
  const [recipientType, setRecipientType] = useState('custom');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/admin/users', { params: { role: 'customer' } });
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleRecipientTypeChange = (type) => {
    setRecipientType(type);
    if (type === 'all') {
      setSelectedEmails(customers.map(c => c.email));
    } else {
      setSelectedEmails([]);
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    
    if (selectedEmails.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    try {
      setSending(true);
      const response = await api.post('/admin/send-custom-email', {
        recipient_emails: selectedEmails,
        subject,
        html_content: htmlContent,
      });
      
      toast.success(`Email sent to ${response.data.success_count} recipients`);
      
      if (response.data.failed_count > 0) {
        toast.warning(`${response.data.failed_count} emails failed to send`);
      }
      
      // Reset form
      setSubject('');
      setHtmlContent('');
      setSelectedEmails([]);
      setRecipientType('custom');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleEmailToggle = (email) => {
    if (selectedEmails.includes(email)) {
      setSelectedEmails(selectedEmails.filter(e => e !== email));
    } else {
      setSelectedEmails([...selectedEmails, email]);
    }
  };

  const getEmailTemplate = () => {
    return `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; background: #f9f9f9; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .button { background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Wacka Accessories</h1>
        </div>
        <div class="content">
            <h2>Hello!</h2>
            <p>Your message content goes here...</p>
            <a href="https://wacka.co.ke" class="button">Visit Our Store</a>
        </div>
        <div class="footer">
            <p>Wacka Accessories - Premium Accessories for the Modern You</p>
            <p>Questions? Contact us at info@wacka.co.ke</p>
        </div>
    </div>
</body>
</html>`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Composer</h1>
          <p className="text-gray-600 mt-1">Send custom emails to your customers</p>
        </div>

        <form onSubmit={handleSendEmail} className="space-y-6">
          {/* Recipient Selection */}
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recipients
            </h2>
            
            <div>
              <Label>Recipient Type</Label>
              <Select value={recipientType} onValueChange={handleRecipientTypeChange}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Select Specific Customers</SelectItem>
                  <SelectItem value="all">All Customers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recipientType === 'custom' && (
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4">
                {customers.map((customer) => (
                  <label key={customer.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEmails.includes(customer.email)}
                      onChange={() => handleEmailToggle(customer.email)}
                      className="rounded"
                    />
                    <div>
                      <p className="text-sm font-medium">{customer.first_name} {customer.last_name}</p>
                      <p className="text-xs text-gray-600">{customer.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                {selectedEmails.length} recipient(s) selected
              </p>
            </div>
          </div>

          {/* Email Content */}
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Content
            </h2>

            <div>
              <Label htmlFor="subject">Subject Line</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
                required
                className="mt-2"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="content">HTML Content</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setHtmlContent(getEmailTemplate())}
                >
                  Use Template
                </Button>
              </div>
              <Textarea
                id="content"
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="Enter HTML email content..."
                required
                rows={15}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                You can use HTML tags to style your email. Click "Use Template" for a starter template.
              </p>
            </div>
          </div>

          {/* Preview */}
          {htmlContent && (
            <div className="bg-white rounded-lg border p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
              <div className="border rounded-lg p-4 bg-gray-50">
                <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
              </div>
            </div>
          )}

          {/* Send Button */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSubject('');
                setHtmlContent('');
                setSelectedEmails([]);
                setRecipientType('custom');
              }}
            >
              Clear
            </Button>
            <Button type="submit" disabled={sending}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
