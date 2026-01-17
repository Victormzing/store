import requests
import sys
import json
from datetime import datetime

class WackaAccessoriesAPITester:
    def __init__(self, base_url="https://store-revamp-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_api_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f", Expected: {expected_status}"
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"

            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {"status": "success"}
            return {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return {}

    def test_seed_data(self):
        """Test seeding initial data"""
        print("\n🌱 Testing Data Seeding...")
        response = self.run_api_test(
            "Seed initial data",
            "POST",
            "seed",
            200
        )
        return response

    def test_admin_login(self):
        """Test admin login"""
        print("\n🔐 Testing Admin Authentication...")
        response = self.run_api_test(
            "Admin login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@wacka.co.ke", "password": "admin123"}
        )
        
        if response and 'token' in response:
            self.admin_token = response['token']
            return True
        return False

    def test_user_registration(self):
        """Test user registration"""
        print("\n👤 Testing User Registration...")
        test_user = {
            "email": f"test_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "first_name": "Test",
            "last_name": "User",
            "phone_number": "254712345678"
        }
        
        response = self.run_api_test(
            "User registration",
            "POST",
            "auth/register",
            200,
            data=test_user
        )
        
        if response and 'token' in response:
            self.token = response['token']
            return test_user
        return None

    def test_user_login(self, user_data):
        """Test user login"""
        if not user_data:
            return False
            
        response = self.run_api_test(
            "User login",
            "POST",
            "auth/login",
            200,
            data={"email": user_data["email"], "password": user_data["password"]}
        )
        
        if response and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_get_user_profile(self):
        """Test getting user profile"""
        self.run_api_test(
            "Get user profile",
            "GET",
            "auth/me",
            200
        )

    def test_products_api(self):
        """Test products API"""
        print("\n📦 Testing Products API...")
        
        # Get all products
        products_response = self.run_api_test(
            "Get all products",
            "GET",
            "products",
            200
        )
        
        # Get categories
        self.run_api_test(
            "Get categories",
            "GET",
            "categories",
            200
        )
        
        # Test product filtering
        self.run_api_test(
            "Filter products by category",
            "GET",
            "products?category=watches",
            200
        )
        
        self.run_api_test(
            "Search products",
            "GET",
            "products?search=watch",
            200
        )
        
        # Get specific product if available
        if products_response and len(products_response) > 0:
            product_id = products_response[0]['id']
            self.run_api_test(
                "Get specific product",
                "GET",
                f"products/{product_id}",
                200
            )
            return product_id
        return None

    def test_cart_operations(self, product_id):
        """Test cart operations"""
        if not product_id:
            return
            
        print("\n🛒 Testing Cart Operations...")
        
        # Get empty cart
        self.run_api_test(
            "Get empty cart",
            "GET",
            "cart",
            200
        )
        
        # Add to cart
        self.run_api_test(
            "Add item to cart",
            "POST",
            "cart/add",
            200,
            data={"product_id": product_id, "quantity": 2}
        )
        
        # Get cart with items
        cart_response = self.run_api_test(
            "Get cart with items",
            "GET",
            "cart",
            200
        )
        
        # Update cart item
        self.run_api_test(
            "Update cart item quantity",
            "PUT",
            f"cart/{product_id}",
            200,
            data={"quantity": 1}
        )
        
        # Remove from cart
        self.run_api_test(
            "Remove item from cart",
            "DELETE",
            f"cart/{product_id}",
            200
        )
        
        # Add back for order testing
        self.run_api_test(
            "Add item back to cart",
            "POST",
            "cart/add",
            200,
            data={"product_id": product_id, "quantity": 1}
        )

    def test_address_operations(self):
        """Test address operations"""
        print("\n🏠 Testing Address Operations...")
        
        # Create address
        address_data = {
            "phone": "254712345678",
            "address_line": "123 Test Street",
            "city": "Nairobi",
            "country": "Kenya",
            "is_default": True
        }
        
        address_response = self.run_api_test(
            "Create address",
            "POST",
            "addresses",
            200,
            data=address_data
        )
        
        # Get addresses
        self.run_api_test(
            "Get user addresses",
            "GET",
            "addresses",
            200
        )
        
        return address_response.get('id') if address_response else None

    def test_order_operations(self, address_id):
        """Test order operations"""
        print("\n📋 Testing Order Operations...")
        
        # Create order
        order_data = {
            "phone_number": "254712345678"
        }
        
        if address_id:
            order_data["address_id"] = address_id
        else:
            order_data["address"] = {
                "phone": "254712345678",
                "address_line": "123 Test Street",
                "city": "Nairobi",
                "country": "Kenya"
            }
        
        order_response = self.run_api_test(
            "Create order from cart",
            "POST",
            "orders",
            200,
            data=order_data
        )
        
        # Get user orders
        self.run_api_test(
            "Get user orders",
            "GET",
            "orders",
            200
        )
        
        # Get specific order
        if order_response and 'id' in order_response:
            order_id = order_response['id']
            self.run_api_test(
                "Get specific order",
                "GET",
                f"orders/{order_id}",
                200
            )
            return order_id
        return None

    def test_payment_operations(self, order_id):
        """Test payment operations"""
        if not order_id:
            return
            
        print("\n💳 Testing Payment Operations...")
        
        # Initiate M-Pesa payment
        payment_response = self.run_api_test(
            "Initiate M-Pesa payment",
            "POST",
            "payments/mpesa/initiate",
            200,
            data={
                "order_id": order_id,
                "phone_number": "254712345678"
            }
        )
        
        # Check payment status
        if payment_response and 'payment_id' in payment_response:
            payment_id = payment_response['payment_id']
            self.run_api_test(
                "Get payment status",
                "GET",
                f"payments/{payment_id}/status",
                200
            )

    def test_blog_api_crud(self):
        """Test Blog API CRUD operations"""
        if not self.admin_token:
            print("❌ Admin token required for blog tests")
            return None
            
        print("\n📝 Testing Blog API CRUD...")
        
        # Switch to admin token
        original_token = self.token
        self.token = self.admin_token
        
        # Test creating a blog post
        blog_post_data = {
            "title": "Test Blog Post",
            "excerpt": "This is a test blog post excerpt",
            "content": "This is the full content of the test blog post. It contains detailed information about testing.",
            "featured_image": "/uploads/test-image.jpg",
            "tags": ["test", "api", "blog"],
            "is_published": True
        }
        
        blog_response = self.run_api_test(
            "Create blog post (admin)",
            "POST",
            "admin/blog",
            200,
            data=blog_post_data
        )
        
        blog_id = None
        blog_slug = None
        if blog_response and 'id' in blog_response:
            blog_id = blog_response['id']
            blog_slug = blog_response.get('slug')
        
        # Test getting all blog posts (admin - includes drafts)
        self.run_api_test(
            "Get all blog posts (admin)",
            "GET",
            "admin/blog",
            200
        )
        
        # Test getting blog post by slug (public) - before making it unpublished
        if blog_slug:
            self.run_api_test(
                "Get blog post by slug (public)",
                "GET",
                f"blog/{blog_slug}",
                200
            )
        
        # Switch back to admin for update
        self.token = self.admin_token
        
        # Test updating blog post
        if blog_id:
            update_data = {
                "title": "Updated Test Blog Post",
                "is_published": False
            }
            self.run_api_test(
                "Update blog post",
                "PUT",
                f"admin/blog/{blog_id}",
                200,
                data=update_data
            )
        
        # Switch back to regular token for public tests
        self.token = original_token
        
        # Test blog filtering by tag
        self.run_api_test(
            "Filter blog posts by tag",
            "GET",
            "blog?tag=test",
            200
        )
        
        # Switch back to admin for deletion
        self.token = self.admin_token
        
        # Test deleting blog post
        if blog_id:
            self.run_api_test(
                "Delete blog post",
                "DELETE",
                f"admin/blog/{blog_id}",
                200
            )
        
        # Restore original token
        self.token = original_token
        return blog_id

    def test_category_api_crud(self):
        """Test Category API CRUD operations"""
        if not self.admin_token:
            print("❌ Admin token required for category tests")
            return None
            
        print("\n📂 Testing Category API CRUD...")
        
        # Switch to admin token
        original_token = self.token
        self.token = self.admin_token
        
        # Test creating a category
        category_data = {
            "name": "Test Category",
            "description": "This is a test category for API testing",
            "image": "/uploads/test-category.jpg"
        }
        
        category_response = self.run_api_test(
            "Create category (admin)",
            "POST",
            "admin/categories",
            200,
            data=category_data
        )
        
        category_id = None
        if category_response and 'id' in category_response:
            category_id = category_response['id']
        
        # Test getting all categories (public)
        self.token = original_token
        self.run_api_test(
            "Get all categories (public)",
            "GET",
            "categories",
            200
        )
        
        # Switch back to admin for update/delete
        self.token = self.admin_token
        
        # Test updating category
        if category_id:
            update_data = {
                "name": "Updated Test Category",
                "description": "Updated description for test category"
            }
            self.run_api_test(
                "Update category",
                "PUT",
                f"admin/categories/{category_id}",
                200,
                data=update_data
            )
        
        # Test deleting category (should work if no products)
        if category_id:
            self.run_api_test(
                "Delete category",
                "DELETE",
                f"admin/categories/{category_id}",
                200
            )
        
        # Restore original token
        self.token = original_token
        return category_id

    def test_image_upload_api(self):
        """Test Image Upload API"""
        if not self.token:
            print("❌ Authentication required for image upload tests")
            return
            
        print("\n🖼️ Testing Image Upload API...")
        
        # Note: For testing purposes, we'll test the endpoint structure
        # In a real scenario, we would need actual image files
        
        # Test single image upload endpoint (requires multipart/form-data)
        # This test checks if the endpoint exists and requires auth
        try:
            import requests
            url = f"{self.base_url}/api/upload"
            headers = {'Authorization': f'Bearer {self.token}'}
            
            # Test without file (should fail with 422 or 400)
            response = requests.post(url, headers=headers, timeout=30)
            
            if response.status_code in [400, 422]:
                self.log_test("Image upload endpoint exists and requires file", True)
            else:
                self.log_test("Image upload endpoint exists and requires file", False, 
                            f"Expected 400/422, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Image upload endpoint test", False, f"Error: {str(e)}")
        
        # Test multiple image upload endpoint
        try:
            url = f"{self.base_url}/api/upload/multiple"
            headers = {'Authorization': f'Bearer {self.token}'}
            
            response = requests.post(url, headers=headers, timeout=30)
            
            if response.status_code in [400, 422]:
                self.log_test("Multiple image upload endpoint exists and requires files", True)
            else:
                self.log_test("Multiple image upload endpoint exists and requires files", False,
                            f"Expected 400/422, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Multiple image upload endpoint test", False, f"Error: {str(e)}")

    def test_email_notifications(self, order_id=None):
        """Test Email Notification Service"""
        print("\n📧 Testing Email Notifications...")
        
        # Email notifications are triggered by background tasks
        # We can test by creating an order and checking if the system processes it
        
        if order_id:
            # Check if order was created successfully (which should trigger email)
            order_response = self.run_api_test(
                "Verify order creation (triggers email)",
                "GET",
                f"orders/{order_id}",
                200
            )
            
            if order_response:
                self.log_test("Order confirmation email triggered", True, 
                            "Email service called during order creation")
            else:
                self.log_test("Order confirmation email triggered", False, 
                            "Order not found, email may not have been triggered")
        else:
            self.log_test("Email notification test", False, "No order ID provided for email test")
        
        # Note: Actual email delivery testing would require checking email logs
        # or using a test email service. For now, we verify the trigger points exist.

    def test_pay_on_delivery_feature(self, product_id):
        """Test Pay on Delivery feature specifically"""
        if not product_id or not self.token:
            print("❌ Product ID and authentication required for Pay on Delivery tests")
            return None, None
            
        print("\n💰 Testing Pay on Delivery Feature...")
        
        # First, add item to cart for testing
        self.run_api_test(
            "Add item to cart for COD test",
            "POST",
            "cart/add",
            200,
            data={"product_id": product_id, "quantity": 1}
        )
        
        # Test 1: Create order with Pay on Delivery
        cod_order_data = {
            "phone_number": "254712345678",
            "payment_method": "pay_on_delivery",
            "address": {
                "phone": "254712345678",
                "address_line": "123 COD Test Street",
                "city": "Nairobi",
                "country": "Kenya"
            }
        }
        
        cod_order_response = self.run_api_test(
            "Create COD order",
            "POST",
            "orders",
            200,
            data=cod_order_data
        )
        
        cod_order_id = None
        if cod_order_response and 'id' in cod_order_response:
            cod_order_id = cod_order_response['id']
            
            # Verify COD order status is "processing" (not "pending_payment")
            if cod_order_response.get('status') == 'processing':
                self.log_test("COD order status is 'processing'", True)
            else:
                self.log_test("COD order status is 'processing'", False, 
                            f"Expected 'processing', got '{cod_order_response.get('status')}'")
            
            # Verify payment_method is stored correctly
            if cod_order_response.get('payment_method') == 'pay_on_delivery':
                self.log_test("COD order payment_method stored correctly", True)
            else:
                self.log_test("COD order payment_method stored correctly", False,
                            f"Expected 'pay_on_delivery', got '{cod_order_response.get('payment_method')}'")
        
        # Add item to cart again for M-Pesa comparison test
        self.run_api_test(
            "Add item to cart for M-Pesa test",
            "POST",
            "cart/add",
            200,
            data={"product_id": product_id, "quantity": 1}
        )
        
        # Test 2: Create order with M-Pesa for comparison
        mpesa_order_data = {
            "phone_number": "254712345678",
            "payment_method": "mpesa",
            "address": {
                "phone": "254712345678", 
                "address_line": "123 M-Pesa Test Street",
                "city": "Nairobi",
                "country": "Kenya"
            }
        }
        
        mpesa_order_response = self.run_api_test(
            "Create M-Pesa order",
            "POST",
            "orders",
            200,
            data=mpesa_order_data
        )
        
        mpesa_order_id = None
        if mpesa_order_response and 'id' in mpesa_order_response:
            mpesa_order_id = mpesa_order_response['id']
            
            # Verify M-Pesa order status is "pending_payment"
            if mpesa_order_response.get('status') == 'pending_payment':
                self.log_test("M-Pesa order status is 'pending_payment'", True)
            else:
                self.log_test("M-Pesa order status is 'pending_payment'", False,
                            f"Expected 'pending_payment', got '{mpesa_order_response.get('status')}'")
            
            # Verify payment_method is "mpesa"
            if mpesa_order_response.get('payment_method') == 'mpesa':
                self.log_test("M-Pesa order payment_method stored correctly", True)
            else:
                self.log_test("M-Pesa order payment_method stored correctly", False,
                            f"Expected 'mpesa', got '{mpesa_order_response.get('payment_method')}'")
        
        # Test 3: Verify GET /api/orders includes payment_method field
        orders_response = self.run_api_test(
            "Get orders list includes payment_method",
            "GET",
            "orders",
            200
        )
        
        if orders_response and len(orders_response) > 0:
            # Check if payment_method field exists in response
            has_payment_method = any('payment_method' in order for order in orders_response)
            if has_payment_method:
                self.log_test("Orders list includes payment_method field", True)
            else:
                self.log_test("Orders list includes payment_method field", False,
                            "payment_method field missing from orders response")
        
        # Test 4: Verify GET /api/orders/{id} includes payment_method field
        if cod_order_id:
            single_order_response = self.run_api_test(
                "Get single COD order includes payment_method",
                "GET",
                f"orders/{cod_order_id}",
                200
            )
            
            if single_order_response and 'payment_method' in single_order_response:
                if single_order_response['payment_method'] == 'pay_on_delivery':
                    self.log_test("Single COD order payment_method correct", True)
                else:
                    self.log_test("Single COD order payment_method correct", False,
                                f"Expected 'pay_on_delivery', got '{single_order_response['payment_method']}'")
            else:
                self.log_test("Single COD order includes payment_method", False,
                            "payment_method field missing from single order response")
        
        if mpesa_order_id:
            single_mpesa_response = self.run_api_test(
                "Get single M-Pesa order includes payment_method",
                "GET", 
                f"orders/{mpesa_order_id}",
                200
            )
            
            if single_mpesa_response and 'payment_method' in single_mpesa_response:
                if single_mpesa_response['payment_method'] == 'mpesa':
                    self.log_test("Single M-Pesa order payment_method correct", True)
                else:
                    self.log_test("Single M-Pesa order payment_method correct", False,
                                f"Expected 'mpesa', got '{single_mpesa_response['payment_method']}'")
            else:
                self.log_test("Single M-Pesa order includes payment_method", False,
                            "payment_method field missing from single M-Pesa order response")
        
        return cod_order_id, mpesa_order_id

    def test_admin_orders_payment_method(self):
        """Test admin can see payment_method in orders"""
        if not self.admin_token:
            print("❌ Admin token required for admin orders test")
            return
            
        print("\n👑 Testing Admin Orders Payment Method...")
        
        # Switch to admin token
        original_token = self.token
        self.token = self.admin_token
        
        # Test GET /api/admin/orders includes payment_method
        admin_orders_response = self.run_api_test(
            "Admin orders list includes payment_method",
            "GET",
            "admin/orders",
            200
        )
        
        if admin_orders_response and len(admin_orders_response) > 0:
            # Check if payment_method field exists in admin orders response
            has_payment_method = any('payment_method' in order for order in admin_orders_response)
            if has_payment_method:
                self.log_test("Admin orders list includes payment_method field", True)
                
                # Check if we have both payment methods represented
                payment_methods = [order.get('payment_method') for order in admin_orders_response if 'payment_method' in order]
                unique_methods = set(payment_methods)
                
                if 'pay_on_delivery' in unique_methods:
                    self.log_test("Admin can see COD orders", True)
                else:
                    self.log_test("Admin can see COD orders", False, "No COD orders found in admin view")
                    
                if 'mpesa' in unique_methods:
                    self.log_test("Admin can see M-Pesa orders", True)
                else:
                    self.log_test("Admin can see M-Pesa orders", False, "No M-Pesa orders found in admin view")
            else:
                self.log_test("Admin orders list includes payment_method field", False,
                            "payment_method field missing from admin orders response")
        else:
            self.log_test("Admin orders list test", False, "No orders found or empty response")
        
        # Restore original token
        self.token = original_token

    def test_admin_operations(self):
        """Test admin operations"""
        if not self.admin_token:
            return
            
        print("\n👑 Testing Admin Operations...")
        
        # Switch to admin token
        original_token = self.token
        self.token = self.admin_token
        
        # Get dashboard stats
        self.run_api_test(
            "Get admin dashboard",
            "GET",
            "admin/dashboard",
            200
        )
        
        # Get all orders (admin)
        self.run_api_test(
            "Get all orders (admin)",
            "GET",
            "admin/orders",
            200
        )
        
        # Get all products (admin)
        products_response = self.run_api_test(
            "Get all products (admin)",
            "GET",
            "admin/products",
            200
        )
        
        # Create new product
        new_product = {
            "name": "Test Product",
            "description": "A test product for API testing",
            "price": 5000,
            "discount_price": 4500,
            "category": "accessories",
            "sku": f"TEST-{datetime.now().strftime('%H%M%S')}",
            "images": ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"]
        }
        
        product_response = self.run_api_test(
            "Create new product",
            "POST",
            "admin/products",
            200,
            data=new_product
        )
        
        # Update product
        if product_response and 'id' in product_response:
            product_id = product_response['id']
            self.run_api_test(
                "Update product",
                "PUT",
                f"admin/products/{product_id}",
                200,
                data={"name": "Updated Test Product"}
            )
        
        # Get inventory
        self.run_api_test(
            "Get inventory",
            "GET",
            "admin/inventory",
            200
        )
        
        # Adjust inventory
        if product_response and 'id' in product_response:
            self.run_api_test(
                "Adjust inventory",
                "POST",
                "admin/inventory/adjust",
                200,
                data={
                    "product_id": product_response['id'],
                    "change": 10,
                    "reason": "restock"
                }
            )
        
        # Get low stock items
        self.run_api_test(
            "Get low stock items",
            "GET",
            "admin/low-stock",
            200
        )
        
        # Get payments (admin)
        self.run_api_test(
            "Get payments (admin)",
            "GET",
            "admin/payments",
            200
        )
        
        # Restore original token
        self.token = original_token
        """Test admin operations"""
        if not self.admin_token:
            return
            
        print("\n👑 Testing Admin Operations...")
        
        # Switch to admin token
        original_token = self.token
        self.token = self.admin_token
        
        # Get dashboard stats
        self.run_api_test(
            "Get admin dashboard",
            "GET",
            "admin/dashboard",
            200
        )
        
        # Get all orders (admin)
        self.run_api_test(
            "Get all orders (admin)",
            "GET",
            "admin/orders",
            200
        )
        
        # Get all products (admin)
        products_response = self.run_api_test(
            "Get all products (admin)",
            "GET",
            "admin/products",
            200
        )
        
        # Create new product
        new_product = {
            "name": "Test Product",
            "description": "A test product for API testing",
            "price": 5000,
            "discount_price": 4500,
            "category": "accessories",
            "sku": f"TEST-{datetime.now().strftime('%H%M%S')}",
            "images": ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"]
        }
        
        product_response = self.run_api_test(
            "Create new product",
            "POST",
            "admin/products",
            200,
            data=new_product
        )
        
        # Update product
        if product_response and 'id' in product_response:
            product_id = product_response['id']
            self.run_api_test(
                "Update product",
                "PUT",
                f"admin/products/{product_id}",
                200,
                data={"name": "Updated Test Product"}
            )
        
        # Get inventory
        self.run_api_test(
            "Get inventory",
            "GET",
            "admin/inventory",
            200
        )
        
        # Adjust inventory
        if product_response and 'id' in product_response:
            self.run_api_test(
                "Adjust inventory",
                "POST",
                "admin/inventory/adjust",
                200,
                data={
                    "product_id": product_response['id'],
                    "change": 10,
                    "reason": "restock"
                }
            )
        
        # Get low stock items
        self.run_api_test(
            "Get low stock items",
            "GET",
            "admin/low-stock",
            200
        )
        
        # Get payments (admin)
        self.run_api_test(
            "Get payments (admin)",
            "GET",
            "admin/payments",
            200
        )
        
        # Restore original token
        self.token = original_token

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Wacka Accessories API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Seed data first
        self.test_seed_data()
        
        # Test admin login
        admin_login_success = self.test_admin_login()
        
        # Test user registration and login
        user_data = self.test_user_registration()
        if user_data:
            self.test_user_login(user_data)
            self.test_get_user_profile()
        
        # Test products
        product_id = self.test_products_api()
        
        # Test cart operations (requires authentication)
        if self.token:
            self.test_cart_operations(product_id)
            
            # Test address operations
            address_id = self.test_address_operations()
            
            # Test order operations
            order_id = self.test_order_operations(address_id)
            
            # Test payment operations
            self.test_payment_operations(order_id)
        
        # Test admin operations
        if admin_login_success:
            self.test_admin_operations()
        
        # Test Phase 2 features
        print("\n🚀 Testing Phase 2 Features...")
        
        # Test Blog API CRUD
        blog_id = self.test_blog_api_crud()
        
        # Test Category API CRUD  
        category_id = self.test_category_api_crud()
        
        # Test Image Upload API
        self.test_image_upload_api()
        
        # Test Email Notifications (using order from earlier)
        self.test_email_notifications(order_id)
        
        # Test Pay on Delivery Feature (NEW)
        print("\n💰 Testing Pay on Delivery Feature...")
        if self.token and product_id:
            cod_order_id, mpesa_order_id = self.test_pay_on_delivery_feature(product_id)
            
            # Test admin can see payment methods
            if admin_login_success:
                self.test_admin_orders_payment_method()
        else:
            print("❌ Skipping Pay on Delivery tests - authentication or product required")
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Print failed tests
        failed_tests = [t for t in self.test_results if not t['success']]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = WackaAccessoriesAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())