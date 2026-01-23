import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Minus, Plus, Package, Truck, Shield, Heart, Star, Send } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { productAPI, reviewAPI, wishlistAPI, relatedAPI, recentlyViewedAPI } from '../../lib/api';
import { toast } from 'sonner';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, loading: cartLoading } = useCart();
  const { isAuthenticated } = useAuth();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  
  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await productAPI.getOne(id);
        setProduct(response.data);
        
        // Record view if authenticated
        if (isAuthenticated) {
          try {
            await recentlyViewedAPI.record(id);
          } catch (e) {
            // Ignore view recording errors
          }
        }
        
        // Fetch reviews
        try {
          const reviewsRes = await reviewAPI.getByProduct(id);
          setReviews(reviewsRes.data);
        } catch (e) {
          // Ignore if no reviews
        }
        
        // Fetch related products
        try {
          const relatedRes = await relatedAPI.getByProduct(id);
          setRelatedProducts(relatedRes.data);
        } catch (e) {
          // Ignore if no related products
        }
        
        // Check wishlist status
        if (isAuthenticated) {
          try {
            const wishlistRes = await wishlistAPI.getAll();
            setIsInWishlist(wishlistRes.data.some(item => item.product_id === id));
          } catch (e) {
            // Ignore
          }
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        navigate('/products');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProduct();
  }, [id, navigate, isAuthenticated]);

  const handleAddToCart = async () => {
    const success = await addToCart(product.id, quantity);
    if (success) {
      setQuantity(1);
    }
  };

  const toggleWishlist = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to wishlist');
      navigate('/login');
      return;
    }
    
    setWishlistLoading(true);
    try {
      if (isInWishlist) {
        await wishlistAPI.remove(id);
        setIsInWishlist(false);
        toast.success('Removed from wishlist');
      } else {
        await wishlistAPI.add(id);
        setIsInWishlist(true);
        toast.success('Added to wishlist');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update wishlist');
    } finally {
      setWishlistLoading(false);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please login to submit a review');
      navigate('/login');
      return;
    }
    
    setSubmittingReview(true);
    try {
      await reviewAPI.create({
        product_id: id,
        rating: reviewRating,
        title: reviewTitle || null,
        comment: reviewComment || null,
      });
      
      toast.success('Review submitted successfully!');
      setShowReviewForm(false);
      setReviewRating(5);
      setReviewTitle('');
      setReviewComment('');
      
      // Refresh reviews
      const reviewsRes = await reviewAPI.getByProduct(id);
      setReviews(reviewsRes.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) 
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="aspect-square bg-gray-200 rounded-2xl animate-pulse" />
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse" />
              <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse" />
              <div className="h-24 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const hasDiscount = product.discount_price && product.discount_price < product.price;
  const displayPrice = hasDiscount ? product.discount_price : product.price;
  const isOutOfStock = product.stock_quantity === 0;
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;

  return (
    <div className="min-h-screen bg-gray-50 py-8" data-testid="product-detail-page">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          data-testid="back-button"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to products
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div>
            <div className="aspect-square rounded-2xl overflow-hidden bg-white mb-4">
              <img
                src={product.images?.[selectedImage] || 'https://placehold.co/600x600/f3f4f6/9ca3af?text=No+Image'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
                      selectedImage === index ? 'border-emerald-500' : 'border-transparent'
                    }`}
                  >
                    <img src={image} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <p className="text-sm text-emerald-600 uppercase tracking-wide font-medium mb-2">
              {product.category}
            </p>
            
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {product.name}
            </h1>

            {/* Price */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-3xl font-bold text-emerald-600">
                KES {displayPrice.toLocaleString()}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-xl text-gray-400 line-through">
                    KES {product.price.toLocaleString()}
                  </span>
                  <span className="bg-red-100 text-red-600 text-sm font-semibold px-2 py-1 rounded-full">
                    {Math.round((1 - product.discount_price / product.price) * 100)}% OFF
                  </span>
                </>
              )}
            </div>

            {/* Stock Status */}
            <div className="mb-6">
              {isOutOfStock ? (
                <span className="stock-out font-medium">Out of Stock</span>
              ) : isLowStock ? (
                <span className="stock-low font-medium">
                  Only {product.stock_quantity} left in stock
                </span>
              ) : (
                <span className="stock-ok font-medium">In Stock</span>
              )}
            </div>

            {/* Description */}
            <p className="text-gray-600 mb-8 leading-relaxed">
              {product.description}
            </p>

            {/* Quantity & Add to Cart */}
            {!isOutOfStock && (
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="flex items-center border rounded-full">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="qty-btn m-1"
                    disabled={quantity <= 1}
                    data-testid="qty-decrease"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center font-medium" data-testid="qty-display">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                    className="qty-btn m-1"
                    disabled={quantity >= product.stock_quantity}
                    data-testid="qty-increase"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                
                <Button
                  onClick={handleAddToCart}
                  disabled={cartLoading}
                  className="flex-1 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white py-6"
                  data-testid="add-to-cart-btn"
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Add to Cart - KES {(displayPrice * quantity).toLocaleString()}
                </Button>
              </div>
            )}

            {/* Features */}
            <div className="border-t pt-8 space-y-4">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-gray-400" />
                <span className="text-gray-600">SKU: {product.sku}</span>
              </div>
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-gray-400" />
                <span className="text-gray-600">Free delivery on orders over KES 5,000</span>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-gray-400" />
                <span className="text-gray-600">Secure M-Pesa payment</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
