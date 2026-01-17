import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Eye, ArrowRight, Tag } from 'lucide-react';
import { blogAPI } from '../../lib/api';
import { Helmet } from 'react-helmet-async';

export default function BlogListPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await blogAPI.getAll();
        setPosts(response.data);
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  return (
    <>
      <Helmet>
        <title>Blog | Wacka Accessories</title>
        <meta name="description" content="Read the latest news, tips, and style guides from Wacka Accessories. Stay updated with fashion trends and accessory care tips." />
        <meta property="og:title" content="Blog | Wacka Accessories" />
        <meta property="og:description" content="Latest news and style guides from Wacka Accessories" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 py-8" data-testid="blog-page">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Our Blog
            </h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Style tips, accessory guides, and the latest from Wacka Accessories
            </p>
          </div>

          {/* Blog Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-xl mb-4" />
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">No blog posts yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <article key={post.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow" data-testid={`blog-post-${post.id}`}>
                  <Link to={`/blog/${post.slug}`}>
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={post.featured_image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600'}
                        alt={post.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </Link>
                  
                  <div className="p-6">
                    {/* Tags */}
                    {post.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {post.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <Link to={`/blog/${post.slug}`}>
                      <h2 className="text-xl font-semibold text-gray-900 mb-2 hover:text-emerald-600 transition-colors line-clamp-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {post.title}
                      </h2>
                    </Link>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {post.excerpt}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(post.created_at).toLocaleDateString('en-KE', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {post.views} views
                        </span>
                      </div>
                      <Link to={`/blog/${post.slug}`} className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                        Read <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
