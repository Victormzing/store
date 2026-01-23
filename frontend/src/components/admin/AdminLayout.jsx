import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  CreditCard, 
  Boxes,
  LogOut,
  ChevronLeft,
  FileText,
  FolderTree,
  Bell,
  Users,
  Mail,
  Settings,
  Ticket,
  Star,
  Truck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/admin/products', icon: Package, label: 'Products' },
  { path: '/admin/categories', icon: FolderTree, label: 'Categories' },
  { path: '/admin/inventory', icon: Boxes, label: 'Inventory' },
  { path: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
  { path: '/admin/payments', icon: CreditCard, label: 'Payments' },
  { path: '/admin/coupons', icon: Ticket, label: 'Coupons' },
  { path: '/admin/reviews', icon: Star, label: 'Reviews' },
  { path: '/admin/suppliers', icon: Truck, label: 'Suppliers' },
  { path: '/admin/blog', icon: FileText, label: 'Blog' },
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/admin/email', icon: Mail, label: 'Email' },
  { path: '/admin/settings', icon: Settings, label: 'Settings' },
];

export const AdminLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/admin/notifications', { params: { limit: 10 } });
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/admin/notifications/unread/count');
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.patch(`/admin/notifications/${notificationId}/read`);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/admin/notifications/mark-all-read');
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order_placed':
      case 'order_updated':
        return '🛍️';
      case 'order_shipped':
        return '📦';
      case 'order_delivered':
        return '✅';
      case 'order_cancelled':
        return '❌';
      case 'payment_success':
        return '💰';
      case 'low_stock':
        return '⚠️';
      default:
        return '🔔';
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100" data-testid="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar hidden md:flex flex-col">
        <div className="p-4 border-b">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="https://customer-assets.emergentagent.com/job_3ef8db27-be3b-48f9-8e33-caffda9e78bc/artifacts/01klkygz_logos-01.png" 
              alt="Wacka Africa Solutions" 
              className="h-10 w-auto"
            />
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Admin</span>
          </Link>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`admin-nav-item ${isActive(item.path, item.exact) ? 'active' : ''}`}
              data-testid={`admin-nav-${item.label.toLowerCase()}`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t">
          <div className="mb-4 px-2">
            <p className="text-sm font-medium text-gray-900">{user?.first_name} {user?.last_name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="admin-nav-item w-full text-red-600 hover:bg-red-50 hover:text-red-700"
            data-testid="admin-logout"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Desktop Header with Notifications */}
        <header className="hidden md:flex bg-white border-b p-4 items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Bell className="h-5 w-5 text-gray-600" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500">
                    {unreadCount}
                  </Badge>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between p-3 border-b">
                <h3 className="font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-emerald-600 hover:text-emerald-700"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <ScrollArea className="h-96">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notifications</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${
                        !notification.is_read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => {
                        if (!notification.is_read) {
                          markAsRead(notification.id);
                        }
                        if (notification.related_id) {
                          navigate(`/admin/orders`);
                        }
                      }}
                    >
                      <div className="flex gap-2">
                        <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b p-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <ChevronLeft className="h-5 w-5" />
            <span className="font-semibold">Admin</span>
          </Link>
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Bell className="h-5 w-5 text-gray-600" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500">
                      {unreadCount}
                    </Badge>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between p-3 border-b">
                  <h3 className="font-semibold">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-emerald-600 hover:text-emerald-700"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <ScrollArea className="h-96">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${
                          !notification.is_read ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => {
                          if (!notification.is_read) {
                            markAsRead(notification.id);
                          }
                          if (notification.related_id) {
                            navigate(`/admin/orders`);
                          }
                        }}
                      >
                        <div className="flex gap-2">
                          <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(notification.created_at).toLocaleString()}
                            </p>
                          </div>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
            <button onClick={handleLogout} className="text-red-600">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Mobile Navigation */}
        <nav className="md:hidden bg-white border-b overflow-x-auto">
          <div className="flex p-2 gap-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap text-sm ${
                  isActive(item.path, item.exact)
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
