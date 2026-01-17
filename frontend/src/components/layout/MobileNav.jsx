import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingCart, User, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export const MobileNav = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { itemCount } = useCart();

  // Don't show on admin pages
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="mobile-nav md:hidden" data-testid="mobile-bottom-nav">
      <div className="flex items-center justify-around py-2">
        <Link
          to="/"
          className={`mobile-nav-item ${isActive('/') ? 'active' : ''}`}
          data-testid="mobile-nav-home"
        >
          <Home className="h-5 w-5" />
          <span className="text-xs mt-1">Home</span>
        </Link>
        
        <Link
          to="/products"
          className={`mobile-nav-item ${isActive('/products') ? 'active' : ''}`}
          data-testid="mobile-nav-shop"
        >
          <Search className="h-5 w-5" />
          <span className="text-xs mt-1">Shop</span>
        </Link>
        
        <Link
          to="/cart"
          className={`mobile-nav-item relative ${isActive('/cart') ? 'active' : ''}`}
          data-testid="mobile-nav-cart"
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </div>
          <span className="text-xs mt-1">Cart</span>
        </Link>
        
        {isAuthenticated && (
          <Link
            to="/orders"
            className={`mobile-nav-item ${isActive('/orders') ? 'active' : ''}`}
            data-testid="mobile-nav-orders"
          >
            <Package className="h-5 w-5" />
            <span className="text-xs mt-1">Orders</span>
          </Link>
        )}
        
        <Link
          to={isAuthenticated ? '/orders' : '/login'}
          className={`mobile-nav-item ${isActive('/login') ? 'active' : ''}`}
          data-testid="mobile-nav-account"
        >
          <User className="h-5 w-5" />
          <span className="text-xs mt-1">Account</span>
        </Link>
      </div>
    </nav>
  );
};
