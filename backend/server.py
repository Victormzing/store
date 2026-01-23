from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request, BackgroundTasks, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
import httpx
import smtplib
import shutil
import io
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
import bcrypt
import jwt
import re
import secrets
import string

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'wacka-accessories-secret-key-2025')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# M-Pesa Configuration
MPESA_CONSUMER_KEY = os.environ.get('MPESA_CONSUMER_KEY', '')
MPESA_CONSUMER_SECRET = os.environ.get('MPESA_CONSUMER_SECRET', '')
MPESA_SHORTCODE = os.environ.get('MPESA_SHORTCODE', '174379')
MPESA_PASSKEY = os.environ.get('MPESA_PASSKEY', 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919')
MPESA_CALLBACK_URL = os.environ.get('MPESA_CALLBACK_URL', '')
MPESA_ENVIRONMENT = os.environ.get('MPESA_ENVIRONMENT', 'sandbox')

# Email Configuration
SMTP_EMAIL = os.environ.get('SMTP_EMAIL', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', SMTP_EMAIL)

# Create the main app
app = FastAPI(title="Wacka Accessories API", version="1.0.0")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Mount uploads directory for serving images
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== ENUMS ====================
class UserRole(str, Enum):
    CUSTOMER = "customer"
    ADMIN = "admin"
    STAFF = "staff"
    MANAGER = "manager"
    SUPPORT = "support"

class OrderStatus(str, Enum):
    PENDING_PAYMENT = "pending_payment"
    PAID = "paid"
    FAILED = "failed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class PaymentStatus(str, Enum):
    INITIATED = "initiated"
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"

class StockMovementReason(str, Enum):
    SALE = "sale"
    ADJUSTMENT = "adjustment"
    RETURN = "return"
    RESTOCK = "restock"

# ==================== EMAIL SERVICE ====================
class EmailService:
    def __init__(self):
        self.smtp_email = SMTP_EMAIL
        self.smtp_password = SMTP_PASSWORD
        self.smtp_host = SMTP_HOST
        self.smtp_port = SMTP_PORT
    
    def send_email(self, to_email: str, subject: str, html_content: str):
        if not self.smtp_email or not self.smtp_password:
            logger.warning("Email not configured, skipping send")
            return False
        
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"Wacka Accessories <{self.smtp_email}>"
            msg['To'] = to_email
            
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_email, self.smtp_password)
                server.sendmail(self.smtp_email, to_email, msg.as_string())
            
            logger.info(f"Email sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return False
    
    def send_order_confirmation(self, order: dict, customer_email: str):
        items_html = ""
        for item in order.get("items", []):
            items_html += f"""
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{item['product_name']}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">{item['quantity']}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">KES {item['price']:,.0f}</td>
            </tr>
            """
        
        delivery_method = order.get('delivery_method', 'delivery')
        delivery_text = "Delivery" if delivery_method == "delivery" else "Store Pickup"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #10B981; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background: #f9f9f9; }}
                .order-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                .order-table th {{ background: #f3f4f6; padding: 10px; text-align: left; }}
                .total {{ font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Order Confirmed!</h1>
                </div>
                <div class="content">
                    <p>Thank you for your order at Wacka Accessories!</p>
                    <p><strong>Order ID:</strong> #{order['id'][:8].upper()}</p>
                    <p><strong>Status:</strong> {order['status'].replace('_', ' ').title()}</p>
                    <p><strong>Delivery Method:</strong> {delivery_text}</p>
                    
                    <table class="order-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th style="text-align: center;">Qty</th>
                                <th style="text-align: right;">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items_html}
                        </tbody>
                    </table>
                    
                    <p class="total">Total: KES {order['total_amount']:,.0f}</p>
                    
                    <p>We'll notify you when your order ships.</p>
                </div>
                <div class="footer">
                    <p>Wacka Accessories - Premium Accessories for the Modern You</p>
                    <p>Questions? Contact us at {self.smtp_email}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Send to customer
        customer_result = self.send_email(customer_email, f"Order Confirmed - #{order['id'][:8].upper()}", html)
        
        # Send to admin
        if ADMIN_EMAIL and ADMIN_EMAIL != customer_email:
            admin_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: #3B82F6; color: white; padding: 20px; text-align: center; }}
                    .content {{ padding: 20px; background: #f9f9f9; }}
                    .order-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                    .order-table th {{ background: #f3f4f6; padding: 10px; text-align: left; }}
                    .total {{ font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }}
                    .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🛍️ New Order Received</h1>
                    </div>
                    <div class="content">
                        <p><strong>Order ID:</strong> #{order['id'][:8].upper()}</p>
                        <p><strong>Customer Email:</strong> {customer_email}</p>
                        <p><strong>Status:</strong> {order['status'].replace('_', ' ').title()}</p>
                        <p><strong>Payment Method:</strong> {order.get('payment_method', 'mpesa').replace('_', ' ').title()}</p>
                        <p><strong>Delivery Method:</strong> {delivery_text}</p>
                        
                        <table class="order-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th style="text-align: center;">Qty</th>
                                    <th style="text-align: right;">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items_html}
                            </tbody>
                        </table>
                        
                        <p class="total">Total: KES {order['total_amount']:,.0f}</p>
                        
                        <p>Please process this order promptly.</p>
                    </div>
                    <div class="footer">
                        <p>Wacka Accessories Admin Notification</p>
                    </div>
                </div>
            </body>
            </html>
            """
            self.send_email(ADMIN_EMAIL, f"New Order #{order['id'][:8].upper()}", admin_html)
        
        return customer_result
    
    def send_payment_success(self, order: dict, customer_email: str, receipt: str):
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #10B981; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background: #f9f9f9; }}
                .success-box {{ background: #d1fae5; border: 1px solid #10B981; padding: 15px; border-radius: 8px; margin: 20px 0; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Payment Successful!</h1>
                </div>
                <div class="content">
                    <div class="success-box">
                        <p><strong>M-Pesa Receipt:</strong> {receipt}</p>
                        <p><strong>Amount:</strong> KES {order['total_amount']:,.0f}</p>
                    </div>
                    
                    <p><strong>Order ID:</strong> #{order['id'][:8].upper()}</p>
                    <p>Your payment has been received and your order is now being processed.</p>
                    <p>We'll notify you when your order ships.</p>
                </div>
                <div class="footer">
                    <p>Wacka Accessories - Premium Accessories for the Modern You</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(customer_email, f"Payment Received - #{order['id'][:8].upper()}", html)
    
    def send_low_stock_alert(self, products: list):
        if not ADMIN_EMAIL:
            return False
        
        items_html = ""
        for p in products:
            items_html += f"""
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{p['product_name']}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; color: #f59e0b; font-weight: bold;">{p['quantity']}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">{p['threshold']}</td>
            </tr>
            """
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #f59e0b; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background: #f9f9f9; }}
                .alert-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                .alert-table th {{ background: #fef3c7; padding: 10px; text-align: left; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⚠️ Low Stock Alert</h1>
                </div>
                <div class="content">
                    <p>The following products are running low on stock:</p>
                    
                    <table class="alert-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th style="text-align: center;">Current Stock</th>
                                <th style="text-align: center;">Threshold</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items_html}
                        </tbody>
                    </table>
                    
                    <p>Please restock these items soon to avoid stockouts.</p>
                    <p><a href="#">Go to Admin Dashboard</a></p>
                </div>
                <div class="footer">
                    <p>Wacka Accessories Admin Notification</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(ADMIN_EMAIL, "Low Stock Alert - Wacka Accessories", html)

email_service = EmailService()

# ==================== MODELS ====================
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone_number: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    role: UserRole
    created_at: datetime

class AddressCreate(BaseModel):
    phone: str
    address_line: str
    city: str
    country: str = "Kenya"
    is_default: bool = False

class AddressResponse(BaseModel):
    id: str
    phone: str
    address_line: str
    city: str
    country: str
    is_default: bool

class CategoryCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None

class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    image: Optional[str] = None
    product_count: int = 0
    created_at: datetime

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    discount_price: Optional[float] = None
    category: str
    sku: str
    images: List[str] = []

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    discount_price: Optional[float] = None
    category: Optional[str] = None
    images: Optional[List[str]] = None
    is_active: Optional[bool] = None

class ProductResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: str
    price: float
    discount_price: Optional[float] = None
    category: str
    sku: str
    images: List[str]
    is_active: bool
    stock_quantity: int = 0
    created_at: datetime

class BlogPostCreate(BaseModel):
    title: str
    slug: Optional[str] = None
    excerpt: str
    content: str
    featured_image: Optional[str] = None
    tags: List[str] = []
    is_published: bool = False

class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    featured_image: Optional[str] = None
    tags: Optional[List[str]] = None
    is_published: Optional[bool] = None

class BlogPostResponse(BaseModel):
    id: str
    title: str
    slug: str
    excerpt: str
    content: str
    featured_image: Optional[str] = None
    tags: List[str]
    author_id: str
    author_name: str
    is_published: bool
    views: int = 0
    created_at: datetime
    updated_at: datetime

class CartItemAdd(BaseModel):
    product_id: str
    quantity: int = 1

class CartItemUpdate(BaseModel):
    quantity: int

class CartItemResponse(BaseModel):
    product_id: str
    product_name: str
    product_image: str
    price: float
    quantity: int
    subtotal: float

class CartResponse(BaseModel):
    items: List[CartItemResponse]
    total: float
    item_count: int

class PaymentMethod(str, Enum):
    MPESA = "mpesa"
    PAY_ON_DELIVERY = "pay_on_delivery"

class DeliveryMethod(str, Enum):
    DELIVERY = "delivery"
    PICKUP = "pickup"

class NotificationType(str, Enum):
    ORDER_PLACED = "order_placed"
    ORDER_UPDATED = "order_updated"
    ORDER_SHIPPED = "order_shipped"
    ORDER_DELIVERED = "order_delivered"
    ORDER_CANCELLED = "order_cancelled"
    PAYMENT_SUCCESS = "payment_success"
    LOW_STOCK = "low_stock"

class OrderCreate(BaseModel):
    address_id: Optional[str] = None
    address: Optional[AddressCreate] = None
    phone_number: str
    payment_method: PaymentMethod = PaymentMethod.MPESA
    delivery_method: DeliveryMethod = DeliveryMethod.DELIVERY

class OrderItemResponse(BaseModel):
    product_id: str
    product_name: str
    product_image: str
    price: float
    quantity: int

class OrderResponse(BaseModel):
    id: str
    user_id: str
    items: List[OrderItemResponse]
    total_amount: float
    status: OrderStatus
    address_snapshot: Dict[str, Any]
    phone_number: str
    payment_method: str = "mpesa"
    delivery_method: str = "delivery"
    created_at: datetime
    updated_at: datetime

class PaymentInitiate(BaseModel):
    order_id: str
    phone_number: str

class PaymentResponse(BaseModel):
    id: str
    order_id: str
    amount: float
    status: PaymentStatus
    checkout_request_id: Optional[str] = None
    mpesa_receipt: Optional[str] = None
    created_at: datetime

class InventoryAdjust(BaseModel):
    product_id: str
    change: int
    reason: StockMovementReason

class DashboardStats(BaseModel):
    today_sales: float
    orders_today: int
    failed_payments: int
    low_stock_count: int

class EnhancedDashboardStats(BaseModel):
    today_sales: float
    orders_today: int
    failed_payments: int
    low_stock_count: int
    monthly_sales: Dict[str, float]
    yearly_sales: float
    quarterly_sales: float
    most_viewed_products: List[Dict[str, Any]]
    total_customers: int
    pending_orders: int

class NotificationCreate(BaseModel):
    type: NotificationType
    title: str
    message: str
    related_id: Optional[str] = None

class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    message: str
    related_id: Optional[str] = None
    is_read: bool
    created_at: datetime

class StoreSettingsUpdate(BaseModel):
    store_name: Optional[str] = None
    logo_url: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    twitter_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None

class StoreSettingsResponse(BaseModel):
    id: str
    store_name: str
    logo_url: Optional[str] = None
    contact_email: str
    contact_phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    twitter_url: Optional[str] = None
    primary_color: str
    secondary_color: str
    updated_at: datetime

class CustomEmailRequest(BaseModel):
    recipient_emails: List[EmailStr]
    subject: str
    html_content: str

class UserCreateByAdmin(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    role: UserRole = UserRole.CUSTOMER

class OrderStatusUpdate(BaseModel):
    status: OrderStatus

# ==================== AUTH HELPERS ====================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(user: dict = Depends(get_current_user)):
    if user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def generate_slug(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug

# ==================== M-PESA SERVICE ====================
class MpesaService:
    def __init__(self):
        self.base_url = "https://sandbox.safaricom.co.ke" if MPESA_ENVIRONMENT == "sandbox" else "https://api.safaricom.co.ke"
    
    async def get_access_token(self) -> str:
        auth_string = base64.b64encode(f"{MPESA_CONSUMER_KEY}:{MPESA_CONSUMER_SECRET}".encode()).decode()
        headers = {"Authorization": f"Basic {auth_string}"}
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials",
                headers=headers,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()["access_token"]
    
    def generate_password(self) -> tuple:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        password_string = f"{MPESA_SHORTCODE}{MPESA_PASSKEY}{timestamp}"
        password = base64.b64encode(password_string.encode()).decode()
        return password, timestamp
    
    async def initiate_stk_push(self, phone: str, amount: float, reference: str, description: str) -> Dict:
        password, timestamp = self.generate_password()
        access_token = await self.get_access_token()
        
        payload = {
            "BusinessShortCode": MPESA_SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount),
            "PartyA": phone,
            "PartyB": MPESA_SHORTCODE,
            "PhoneNumber": phone,
            "CallBackURL": MPESA_CALLBACK_URL,
            "AccountReference": reference,
            "TransactionDesc": description
        }
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/mpesa/stkpush/v1/processrequest",
                json=payload,
                headers=headers,
                timeout=30.0
            )
            return response.json()

mpesa_service = MpesaService()

# ==================== BACKGROUND TASKS ====================
async def check_low_stock_and_notify():
    """Check for low stock items and send email notification"""
    low_stock_items = await db.inventory.find({
        "$expr": {"$lte": ["$quantity", "$low_stock_threshold"]}
    }, {"_id": 0}).to_list(100)
    
    if not low_stock_items:
        return
    
    products_info = []
    for inv in low_stock_items:
        product = await db.products.find_one({"id": inv["product_id"]}, {"_id": 0})
        if product:
            products_info.append({
                "product_name": product["name"],
                "quantity": inv["quantity"],
                "threshold": inv["low_stock_threshold"]
            })
    
    if products_info:
        email_service.send_low_stock_alert(products_info)

# ==================== NOTIFICATION HELPERS ====================
async def create_notification(
    type: NotificationType,
    title: str,
    message: str,
    related_id: Optional[str] = None
):
    """Create a new notification for admin"""
    notification_id = str(uuid.uuid4())
    notification = {
        "id": notification_id,
        "type": type.value,
        "title": title,
        "message": message,
        "related_id": related_id,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    return notification_id

# ==================== AUTH ROUTES ====================
@api_router.post("/auth/register", response_model=dict)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "phone_number": user_data.phone_number,
        "role": UserRole.CUSTOMER,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    await db.carts.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "items": [],
        "is_active": True,
        "updated_at": datetime.now(timezone.utc).isoformat()
    })
    
    token = create_token(user_id, UserRole.CUSTOMER)
    return {"token": token, "user": {"id": user_id, "email": user_data.email, "role": UserRole.CUSTOMER}}

@api_router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "first_name": user["first_name"],
            "last_name": user["last_name"],
            "role": user["role"]
        }
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        first_name=user["first_name"],
        last_name=user["last_name"],
        phone_number=user.get("phone_number"),
        role=user["role"],
        created_at=datetime.fromisoformat(user["created_at"]) if isinstance(user["created_at"], str) else user["created_at"]
    )

# ==================== IMAGE UPLOAD ====================
@api_router.post("/upload")
async def upload_image(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = UPLOAD_DIR / filename
    
    # Save file
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Return URL
    return {"url": f"/uploads/{filename}", "filename": filename}

@api_router.post("/upload/multiple")
async def upload_multiple_images(files: List[UploadFile] = File(...), user: dict = Depends(get_current_user)):
    urls = []
    for file in files:
        if not file.content_type.startswith("image/"):
            continue
        
        ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        filename = f"{uuid.uuid4()}.{ext}"
        filepath = UPLOAD_DIR / filename
        
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        urls.append(f"/uploads/{filename}")
    
    return {"urls": urls}

# ==================== CATEGORY ROUTES ====================
@api_router.get("/categories", response_model=List[CategoryResponse])
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    result = []
    for cat in categories:
        count = await db.products.count_documents({"category": cat["slug"], "is_active": True})
        result.append(CategoryResponse(
            id=cat["id"],
            name=cat["name"],
            slug=cat["slug"],
            description=cat.get("description"),
            image=cat.get("image"),
            product_count=count,
            created_at=datetime.fromisoformat(cat["created_at"]) if isinstance(cat["created_at"], str) else cat["created_at"]
        ))
    return result

@api_router.post("/admin/categories", response_model=CategoryResponse)
async def create_category(category: CategoryCreate, user: dict = Depends(get_admin_user)):
    slug = category.slug or generate_slug(category.name)
    
    existing = await db.categories.find_one({"slug": slug})
    if existing:
        raise HTTPException(status_code=400, detail="Category with this slug already exists")
    
    cat_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    cat_doc = {
        "id": cat_id,
        "name": category.name,
        "slug": slug,
        "description": category.description,
        "image": category.image,
        "created_at": now
    }
    await db.categories.insert_one(cat_doc)
    
    return CategoryResponse(
        id=cat_id,
        name=category.name,
        slug=slug,
        description=category.description,
        image=category.image,
        product_count=0,
        created_at=datetime.fromisoformat(now)
    )

@api_router.put("/admin/categories/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: str, update: CategoryCreate, user: dict = Depends(get_admin_user)):
    category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    slug = update.slug or generate_slug(update.name)
    
    await db.categories.update_one(
        {"id": category_id},
        {"$set": {
            "name": update.name,
            "slug": slug,
            "description": update.description,
            "image": update.image
        }}
    )
    
    # Update products with old category slug
    if category["slug"] != slug:
        await db.products.update_many(
            {"category": category["slug"]},
            {"$set": {"category": slug}}
        )
    
    count = await db.products.count_documents({"category": slug, "is_active": True})
    
    return CategoryResponse(
        id=category_id,
        name=update.name,
        slug=slug,
        description=update.description,
        image=update.image,
        product_count=count,
        created_at=datetime.fromisoformat(category["created_at"]) if isinstance(category["created_at"], str) else category["created_at"]
    )

@api_router.delete("/admin/categories/{category_id}")
async def delete_category(category_id: str, user: dict = Depends(get_admin_user)):
    category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check if category has products
    product_count = await db.products.count_documents({"category": category["slug"]})
    if product_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete category with {product_count} products. Move products first.")
    
    await db.categories.delete_one({"id": category_id})
    return {"message": "Category deleted"}

# ==================== BLOG ROUTES ====================
@api_router.get("/blog", response_model=List[BlogPostResponse])
async def get_blog_posts(skip: int = 0, limit: int = 20, tag: Optional[str] = None):
    query = {"is_published": True}
    if tag:
        query["tags"] = tag
    
    posts = await db.blog_posts.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for post in posts:
        author = await db.users.find_one({"id": post["author_id"]}, {"_id": 0})
        result.append(BlogPostResponse(
            id=post["id"],
            title=post["title"],
            slug=post["slug"],
            excerpt=post["excerpt"],
            content=post["content"],
            featured_image=post.get("featured_image"),
            tags=post.get("tags", []),
            author_id=post["author_id"],
            author_name=f"{author['first_name']} {author['last_name']}" if author else "Unknown",
            is_published=post["is_published"],
            views=post.get("views", 0),
            created_at=datetime.fromisoformat(post["created_at"]) if isinstance(post["created_at"], str) else post["created_at"],
            updated_at=datetime.fromisoformat(post["updated_at"]) if isinstance(post["updated_at"], str) else post["updated_at"]
        ))
    return result

@api_router.get("/blog/{slug}", response_model=BlogPostResponse)
async def get_blog_post(slug: str):
    post = await db.blog_posts.find_one({"slug": slug, "is_published": True}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    
    # Increment views
    await db.blog_posts.update_one({"slug": slug}, {"$inc": {"views": 1}})
    
    author = await db.users.find_one({"id": post["author_id"]}, {"_id": 0})
    
    return BlogPostResponse(
        id=post["id"],
        title=post["title"],
        slug=post["slug"],
        excerpt=post["excerpt"],
        content=post["content"],
        featured_image=post.get("featured_image"),
        tags=post.get("tags", []),
        author_id=post["author_id"],
        author_name=f"{author['first_name']} {author['last_name']}" if author else "Unknown",
        is_published=post["is_published"],
        views=post.get("views", 0) + 1,
        created_at=datetime.fromisoformat(post["created_at"]) if isinstance(post["created_at"], str) else post["created_at"],
        updated_at=datetime.fromisoformat(post["updated_at"]) if isinstance(post["updated_at"], str) else post["updated_at"]
    )

@api_router.get("/admin/blog", response_model=List[BlogPostResponse])
async def get_all_blog_posts(user: dict = Depends(get_admin_user)):
    posts = await db.blog_posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    result = []
    for post in posts:
        author = await db.users.find_one({"id": post["author_id"]}, {"_id": 0})
        result.append(BlogPostResponse(
            id=post["id"],
            title=post["title"],
            slug=post["slug"],
            excerpt=post["excerpt"],
            content=post["content"],
            featured_image=post.get("featured_image"),
            tags=post.get("tags", []),
            author_id=post["author_id"],
            author_name=f"{author['first_name']} {author['last_name']}" if author else "Unknown",
            is_published=post["is_published"],
            views=post.get("views", 0),
            created_at=datetime.fromisoformat(post["created_at"]) if isinstance(post["created_at"], str) else post["created_at"],
            updated_at=datetime.fromisoformat(post["updated_at"]) if isinstance(post["updated_at"], str) else post["updated_at"]
        ))
    return result

@api_router.post("/admin/blog", response_model=BlogPostResponse)
async def create_blog_post(post: BlogPostCreate, user: dict = Depends(get_admin_user)):
    slug = post.slug or generate_slug(post.title)
    
    # Ensure unique slug
    existing = await db.blog_posts.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"
    
    post_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    post_doc = {
        "id": post_id,
        "title": post.title,
        "slug": slug,
        "excerpt": post.excerpt,
        "content": post.content,
        "featured_image": post.featured_image,
        "tags": post.tags,
        "author_id": user["id"],
        "is_published": post.is_published,
        "views": 0,
        "created_at": now,
        "updated_at": now
    }
    await db.blog_posts.insert_one(post_doc)
    
    return BlogPostResponse(
        id=post_id,
        title=post.title,
        slug=slug,
        excerpt=post.excerpt,
        content=post.content,
        featured_image=post.featured_image,
        tags=post.tags,
        author_id=user["id"],
        author_name=f"{user['first_name']} {user['last_name']}",
        is_published=post.is_published,
        views=0,
        created_at=datetime.fromisoformat(now),
        updated_at=datetime.fromisoformat(now)
    )

@api_router.put("/admin/blog/{post_id}", response_model=BlogPostResponse)
async def update_blog_post(post_id: str, update: BlogPostUpdate, user: dict = Depends(get_admin_user)):
    post = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if "title" in update_data and not update.slug:
        update_data["slug"] = generate_slug(update_data["title"])
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.blog_posts.update_one({"id": post_id}, {"$set": update_data})
    
    updated = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    author = await db.users.find_one({"id": updated["author_id"]}, {"_id": 0})
    
    return BlogPostResponse(
        id=updated["id"],
        title=updated["title"],
        slug=updated["slug"],
        excerpt=updated["excerpt"],
        content=updated["content"],
        featured_image=updated.get("featured_image"),
        tags=updated.get("tags", []),
        author_id=updated["author_id"],
        author_name=f"{author['first_name']} {author['last_name']}" if author else "Unknown",
        is_published=updated["is_published"],
        views=updated.get("views", 0),
        created_at=datetime.fromisoformat(updated["created_at"]) if isinstance(updated["created_at"], str) else updated["created_at"],
        updated_at=datetime.fromisoformat(updated["updated_at"]) if isinstance(updated["updated_at"], str) else updated["updated_at"]
    )

@api_router.delete("/admin/blog/{post_id}")
async def delete_blog_post(post_id: str, user: dict = Depends(get_admin_user)):
    result = await db.blog_posts.delete_one({"id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blog post not found")
    return {"message": "Blog post deleted"}

# ==================== ADDRESS ROUTES ====================
@api_router.post("/addresses", response_model=AddressResponse)
async def create_address(address: AddressCreate, user: dict = Depends(get_current_user)):
    if address.is_default:
        await db.addresses.update_many({"user_id": user["id"]}, {"$set": {"is_default": False}})
    
    address_id = str(uuid.uuid4())
    address_doc = {"id": address_id, "user_id": user["id"], **address.model_dump()}
    await db.addresses.insert_one(address_doc)
    return AddressResponse(id=address_id, **address.model_dump())

@api_router.get("/addresses", response_model=List[AddressResponse])
async def get_addresses(user: dict = Depends(get_current_user)):
    addresses = await db.addresses.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return [AddressResponse(**addr) for addr in addresses]

# ==================== PRODUCT ROUTES ====================
@api_router.get("/products", response_model=List[ProductResponse])
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
):
    query = {"is_active": True}
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    products = await db.products.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for p in products:
        inventory = await db.inventory.find_one({"product_id": p["id"]}, {"_id": 0})
        stock = inventory["quantity"] if inventory else 0
        result.append(ProductResponse(
            id=p["id"],
            name=p["name"],
            slug=p["slug"],
            description=p["description"],
            price=p["price"],
            discount_price=p.get("discount_price"),
            category=p["category"],
            sku=p["sku"],
            images=p.get("images", []),
            is_active=p["is_active"],
            stock_quantity=stock,
            created_at=datetime.fromisoformat(p["created_at"]) if isinstance(p["created_at"], str) else p["created_at"]
        ))
    return result

@api_router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id, "is_active": True}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    inventory = await db.inventory.find_one({"product_id": product_id}, {"_id": 0})
    stock = inventory["quantity"] if inventory else 0
    
    return ProductResponse(
        id=product["id"],
        name=product["name"],
        slug=product["slug"],
        description=product["description"],
        price=product["price"],
        discount_price=product.get("discount_price"),
        category=product["category"],
        sku=product["sku"],
        images=product.get("images", []),
        is_active=product["is_active"],
        stock_quantity=stock,
        created_at=datetime.fromisoformat(product["created_at"]) if isinstance(product["created_at"], str) else product["created_at"]
    )

# ==================== CART ROUTES ====================
@api_router.get("/cart", response_model=CartResponse)
async def get_cart(user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"], "is_active": True}, {"_id": 0})
    if not cart:
        return CartResponse(items=[], total=0, item_count=0)
    
    items = []
    total = 0
    for item in cart.get("items", []):
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            price = product.get("discount_price") or product["price"]
            subtotal = price * item["quantity"]
            items.append(CartItemResponse(
                product_id=item["product_id"],
                product_name=product["name"],
                product_image=product["images"][0] if product.get("images") else "",
                price=price,
                quantity=item["quantity"],
                subtotal=subtotal
            ))
            total += subtotal
    
    return CartResponse(items=items, total=total, item_count=len(items))

@api_router.post("/cart/add", response_model=CartResponse)
async def add_to_cart(item: CartItemAdd, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": item.product_id, "is_active": True}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    inventory = await db.inventory.find_one({"product_id": item.product_id}, {"_id": 0})
    available_stock = inventory["quantity"] if inventory else 0
    
    cart = await db.carts.find_one({"user_id": user["id"], "is_active": True}, {"_id": 0})
    if not cart:
        cart = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "items": [],
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.carts.insert_one(cart)
    
    existing_qty = 0
    for cart_item in cart.get("items", []):
        if cart_item["product_id"] == item.product_id:
            existing_qty = cart_item["quantity"]
            break
    
    total_requested = existing_qty + item.quantity
    if total_requested > available_stock:
        raise HTTPException(status_code=400, detail=f"Not enough stock. Available: {available_stock}")
    
    cart_items = cart.get("items", [])
    found = False
    for cart_item in cart_items:
        if cart_item["product_id"] == item.product_id:
            cart_item["quantity"] += item.quantity
            found = True
            break
    
    if not found:
        cart_items.append({"product_id": item.product_id, "quantity": item.quantity})
    
    await db.carts.update_one(
        {"user_id": user["id"], "is_active": True},
        {"$set": {"items": cart_items, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return await get_cart(user)

@api_router.put("/cart/{product_id}", response_model=CartResponse)
async def update_cart_item(product_id: str, update: CartItemUpdate, user: dict = Depends(get_current_user)):
    if update.quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")
    
    inventory = await db.inventory.find_one({"product_id": product_id}, {"_id": 0})
    available_stock = inventory["quantity"] if inventory else 0
    
    if update.quantity > available_stock:
        raise HTTPException(status_code=400, detail=f"Not enough stock. Available: {available_stock}")
    
    cart = await db.carts.find_one({"user_id": user["id"], "is_active": True}, {"_id": 0})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    cart_items = cart.get("items", [])
    if update.quantity == 0:
        cart_items = [i for i in cart_items if i["product_id"] != product_id]
    else:
        for item in cart_items:
            if item["product_id"] == product_id:
                item["quantity"] = update.quantity
                break
    
    await db.carts.update_one(
        {"user_id": user["id"], "is_active": True},
        {"$set": {"items": cart_items, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return await get_cart(user)

@api_router.delete("/cart/{product_id}", response_model=CartResponse)
async def remove_from_cart(product_id: str, user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"], "is_active": True}, {"_id": 0})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    cart_items = [i for i in cart.get("items", []) if i["product_id"] != product_id]
    
    await db.carts.update_one(
        {"user_id": user["id"], "is_active": True},
        {"$set": {"items": cart_items, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return await get_cart(user)

# ==================== ORDER ROUTES ====================
@api_router.post("/orders", response_model=OrderResponse)
async def create_order(order_data: OrderCreate, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"], "is_active": True}, {"_id": 0})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    order_items = []
    total = 0
    
    for item in cart["items"]:
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {item['product_id']} not found")
        
        inventory = await db.inventory.find_one({"product_id": item["product_id"]}, {"_id": 0})
        available = inventory["quantity"] if inventory else 0
        
        if item["quantity"] > available:
            raise HTTPException(status_code=400, detail=f"Not enough stock for {product['name']}")
        
        price = product.get("discount_price") or product["price"]
        order_items.append({
            "product_id": item["product_id"],
            "product_name": product["name"],
            "product_image": product["images"][0] if product.get("images") else "",
            "price": price,
            "quantity": item["quantity"]
        })
        total += price * item["quantity"]
    
    address_snapshot = {}
    if order_data.address_id:
        address = await db.addresses.find_one({"id": order_data.address_id, "user_id": user["id"]}, {"_id": 0})
        if address:
            address_snapshot = {k: v for k, v in address.items() if k not in ["id", "user_id"]}
    elif order_data.address:
        address_snapshot = order_data.address.model_dump()
    
    order_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Determine initial status based on payment method
    initial_status = OrderStatus.PENDING_PAYMENT
    if order_data.payment_method == PaymentMethod.PAY_ON_DELIVERY:
        initial_status = OrderStatus.PROCESSING  # COD orders go straight to processing
    
    order = {
        "id": order_id,
        "user_id": user["id"],
        "items": order_items,
        "total_amount": total,
        "status": initial_status,
        "address_snapshot": address_snapshot,
        "phone_number": order_data.phone_number,
        "payment_method": order_data.payment_method,
        "delivery_method": order_data.delivery_method,
        "created_at": now,
        "updated_at": now
    }
    await db.orders.insert_one(order)
    
    # Create notification for admin
    await create_notification(
        NotificationType.ORDER_PLACED,
        "New Order Placed",
        f"Order #{order_id[:8].upper()} placed by {user['first_name']} {user['last_name']}",
        order_id
    )
    
    # Clear cart
    await db.carts.update_one(
        {"user_id": user["id"], "is_active": True},
        {"$set": {"items": [], "updated_at": now}}
    )
    
    # Send order confirmation email
    background_tasks.add_task(email_service.send_order_confirmation, order, user["email"])
    
    # For pay on delivery, deduct stock immediately
    if order_data.payment_method == PaymentMethod.PAY_ON_DELIVERY:
        for item in order_items:
            await db.inventory.update_one(
                {"product_id": item["product_id"]},
                {"$inc": {"quantity": -item["quantity"]}}
            )
            await db.inventory_logs.insert_one({
                "id": str(uuid.uuid4()),
                "product_id": item["product_id"],
                "change": -item["quantity"],
                "reason": StockMovementReason.SALE,
                "reference_id": order_id,
                "created_at": now
            })
        # Check low stock
        background_tasks.add_task(check_low_stock_and_notify)
    
    return OrderResponse(
        id=order_id,
        user_id=user["id"],
        items=[OrderItemResponse(**i) for i in order_items],
        total_amount=total,
        status=initial_status,
        address_snapshot=address_snapshot,
        phone_number=order_data.phone_number,
        payment_method=order_data.payment_method,
        delivery_method=order_data.delivery_method,
        created_at=datetime.fromisoformat(now),
        updated_at=datetime.fromisoformat(now)
    )

@api_router.get("/orders", response_model=List[OrderResponse])
async def get_orders(user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [
        OrderResponse(
            id=o["id"],
            user_id=o["user_id"],
            items=[OrderItemResponse(**i) for i in o["items"]],
            total_amount=o["total_amount"],
            status=o["status"],
            address_snapshot=o["address_snapshot"],
            phone_number=o["phone_number"],
            payment_method=o.get("payment_method", "mpesa"),
            delivery_method=o.get("delivery_method", "delivery"),
            created_at=datetime.fromisoformat(o["created_at"]) if isinstance(o["created_at"], str) else o["created_at"],
            updated_at=datetime.fromisoformat(o["updated_at"]) if isinstance(o["updated_at"], str) else o["updated_at"]
        )
        for o in orders
    ]

@api_router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_id": user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return OrderResponse(
        id=order["id"],
        user_id=order["user_id"],
        items=[OrderItemResponse(**i) for i in order["items"]],
        total_amount=order["total_amount"],
        status=order["status"],
        address_snapshot=order["address_snapshot"],
        phone_number=order["phone_number"],
        payment_method=order.get("payment_method", "mpesa"),
        delivery_method=order.get("delivery_method", "delivery"),
        created_at=datetime.fromisoformat(order["created_at"]) if isinstance(order["created_at"], str) else order["created_at"],
        updated_at=datetime.fromisoformat(order["updated_at"]) if isinstance(order["updated_at"], str) else order["updated_at"]
    )

# ==================== PAYMENT ROUTES ====================
@api_router.post("/payments/mpesa/initiate", response_model=dict)
async def initiate_mpesa_payment(payment_data: PaymentInitiate, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": payment_data.order_id, "user_id": user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["status"] != OrderStatus.PENDING_PAYMENT:
        raise HTTPException(status_code=400, detail="Order is not pending payment")
    
    existing_payment = await db.payments.find_one({
        "order_id": payment_data.order_id,
        "status": {"$in": [PaymentStatus.INITIATED, PaymentStatus.PENDING]}
    }, {"_id": 0})
    
    if existing_payment:
        return {
            "payment_id": existing_payment["id"],
            "checkout_request_id": existing_payment.get("checkout_request_id"),
            "message": "Payment already initiated"
        }
    
    phone = payment_data.phone_number.replace("+", "").replace(" ", "")
    if phone.startswith("0"):
        phone = "254" + phone[1:]
    elif not phone.startswith("254"):
        phone = "254" + phone
    
    payment_id = str(uuid.uuid4())
    payment = {
        "id": payment_id,
        "order_id": payment_data.order_id,
        "amount": order["total_amount"],
        "phone": phone,
        "status": PaymentStatus.INITIATED,
        "method": "MPESA",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    try:
        mpesa_response = await mpesa_service.initiate_stk_push(
            phone=phone,
            amount=order["total_amount"],
            reference=f"WA{order['id'][:8].upper()}",
            description="Wacka Accessories"
        )
        
        payment["checkout_request_id"] = mpesa_response.get("CheckoutRequestID")
        payment["merchant_request_id"] = mpesa_response.get("MerchantRequestID")
        payment["status"] = PaymentStatus.PENDING
        
        await db.payments.insert_one(payment)
        
        await db.mpesa_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "payment_id": payment_id,
            "checkout_request_id": mpesa_response.get("CheckoutRequestID"),
            "merchant_request_id": mpesa_response.get("MerchantRequestID"),
            "phone": phone,
            "response_code": mpesa_response.get("ResponseCode"),
            "response_description": mpesa_response.get("ResponseDescription"),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "payment_id": payment_id,
            "checkout_request_id": mpesa_response.get("CheckoutRequestID"),
            "response_code": mpesa_response.get("ResponseCode"),
            "customer_message": mpesa_response.get("CustomerMessage"),
            "message": "STK Push sent to your phone"
        }
        
    except Exception as e:
        logger.error(f"M-Pesa initiation error: {str(e)}")
        payment["status"] = PaymentStatus.FAILED
        payment["error"] = str(e)
        await db.payments.insert_one(payment)
        raise HTTPException(status_code=500, detail="Failed to initiate payment")

@api_router.post("/payments/mpesa/callback")
async def mpesa_callback(request: Request, background_tasks: BackgroundTasks):
    try:
        callback_data = await request.json()
        logger.info(f"M-Pesa callback: {callback_data}")
        
        body = callback_data.get("Body", {})
        stk_callback = body.get("stkCallback", {})
        
        checkout_request_id = stk_callback.get("CheckoutRequestID")
        result_code = stk_callback.get("ResultCode")
        result_desc = stk_callback.get("ResultDesc")
        
        payment = await db.payments.find_one({"checkout_request_id": checkout_request_id}, {"_id": 0})
        if not payment:
            logger.warning(f"Payment not found for checkout: {checkout_request_id}")
            return {"ResultCode": 0, "ResultDesc": "Accepted"}
        
        if payment["status"] in [PaymentStatus.SUCCESS, PaymentStatus.FAILED]:
            logger.info(f"Payment already processed: {checkout_request_id}")
            return {"ResultCode": 0, "ResultDesc": "Accepted"}
        
        now = datetime.now(timezone.utc).isoformat()
        
        if result_code == 0:
            metadata = stk_callback.get("CallbackMetadata", {}).get("Item", [])
            mpesa_receipt = None
            for item in metadata:
                if item.get("Name") == "MpesaReceiptNumber":
                    mpesa_receipt = item.get("Value")
            
            await db.payments.update_one(
                {"id": payment["id"]},
                {"$set": {
                    "status": PaymentStatus.SUCCESS,
                    "mpesa_receipt": mpesa_receipt,
                    "result_description": result_desc,
                    "completed_at": now
                }}
            )
            
            order = await db.orders.find_one({"id": payment["order_id"]}, {"_id": 0})
            if order:
                await db.orders.update_one(
                    {"id": order["id"]},
                    {"$set": {"status": OrderStatus.PAID, "updated_at": now}}
                )
                
                for item in order["items"]:
                    await db.inventory.update_one(
                        {"product_id": item["product_id"]},
                        {"$inc": {"quantity": -item["quantity"]}}
                    )
                    
                    await db.inventory_logs.insert_one({
                        "id": str(uuid.uuid4()),
                        "product_id": item["product_id"],
                        "change": -item["quantity"],
                        "reason": StockMovementReason.SALE,
                        "reference_id": order["id"],
                        "created_at": now
                    })
                
                await db.order_status_history.insert_one({
                    "id": str(uuid.uuid4()),
                    "order_id": order["id"],
                    "status": OrderStatus.PAID,
                    "timestamp": now
                })
                
                # Send payment success email
                user = await db.users.find_one({"id": order["user_id"]}, {"_id": 0})
                if user:
                    background_tasks.add_task(email_service.send_payment_success, order, user["email"], mpesa_receipt)
                
                # Check low stock and notify
                background_tasks.add_task(check_low_stock_and_notify)
        else:
            await db.payments.update_one(
                {"id": payment["id"]},
                {"$set": {
                    "status": PaymentStatus.FAILED,
                    "result_code": result_code,
                    "result_description": result_desc,
                    "completed_at": now
                }}
            )
            
            await db.orders.update_one(
                {"id": payment["order_id"]},
                {"$set": {"status": OrderStatus.FAILED, "updated_at": now}}
            )
        
        await db.mpesa_callback_logs.insert_one({
            "id": str(uuid.uuid4()),
            "checkout_request_id": checkout_request_id,
            "payload": callback_data,
            "received_at": now
        })
        
        return {"ResultCode": 0, "ResultDesc": "Accepted"}
        
    except Exception as e:
        logger.error(f"Callback error: {str(e)}")
        return {"ResultCode": 0, "ResultDesc": "Accepted"}

@api_router.get("/payments/{payment_id}/status", response_model=dict)
async def get_payment_status(payment_id: str, user: dict = Depends(get_current_user)):
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    order = await db.orders.find_one({"id": payment["order_id"], "user_id": user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {
        "payment_id": payment["id"],
        "status": payment["status"],
        "mpesa_receipt": payment.get("mpesa_receipt"),
        "order_status": order["status"]
    }

# ==================== ADMIN ROUTES ====================
@api_router.get("/admin/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(user: dict = Depends(get_admin_user)):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    today_orders = await db.orders.find({
        "status": {"$in": [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.COMPLETED]},
        "created_at": {"$gte": today_start.isoformat()}
    }, {"_id": 0}).to_list(1000)
    today_sales = sum(o["total_amount"] for o in today_orders)
    
    all_today_orders = await db.orders.count_documents({
        "created_at": {"$gte": today_start.isoformat()}
    })
    
    failed_payments = await db.payments.count_documents({
        "status": PaymentStatus.FAILED,
        "created_at": {"$gte": today_start.isoformat()}
    })
    
    low_stock = await db.inventory.count_documents({
        "$expr": {"$lte": ["$quantity", "$low_stock_threshold"]}
    })
    
    return DashboardStats(
        today_sales=today_sales,
        orders_today=all_today_orders,
        failed_payments=failed_payments,
        low_stock_count=low_stock
    )

@api_router.get("/admin/orders", response_model=List[OrderResponse])
async def get_all_orders(
    status: Optional[OrderStatus] = None,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_admin_user)
):
    query = {}
    if status:
        query["status"] = status
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [
        OrderResponse(
            id=o["id"],
            user_id=o["user_id"],
            items=[OrderItemResponse(**i) for i in o["items"]],
            total_amount=o["total_amount"],
            status=o["status"],
            address_snapshot=o["address_snapshot"],
            phone_number=o["phone_number"],
            payment_method=o.get("payment_method", "mpesa"),
            delivery_method=o.get("delivery_method", "delivery"),
            created_at=datetime.fromisoformat(o["created_at"]) if isinstance(o["created_at"], str) else o["created_at"],
            updated_at=datetime.fromisoformat(o["updated_at"]) if isinstance(o["updated_at"], str) else o["updated_at"]
        )
        for o in orders
    ]

@api_router.patch("/admin/orders/{order_id}/status", response_model=OrderResponse)
async def update_order_status(order_id: str, status_update: OrderStatusUpdate, background_tasks: BackgroundTasks, user: dict = Depends(get_admin_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    status = status_update.status
    now = datetime.now(timezone.utc).isoformat()
    await db.orders.update_one({"id": order_id}, {"$set": {"status": status, "updated_at": now}})
    
    await db.order_status_history.insert_one({
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "status": status,
        "timestamp": now
    })
    
    # Create notification based on status
    notification_type = NotificationType.ORDER_UPDATED
    if status == OrderStatus.SHIPPED:
        notification_type = NotificationType.ORDER_SHIPPED
    elif status == OrderStatus.COMPLETED:
        notification_type = NotificationType.ORDER_DELIVERED
    elif status == OrderStatus.CANCELLED:
        notification_type = NotificationType.ORDER_CANCELLED
    
    await create_notification(
        notification_type,
        f"Order Status Updated",
        f"Order #{order_id[:8].upper()} status changed to {status.value.replace('_', ' ').title()}",
        order_id
    )
    
    # Send email to customer
    customer = await db.users.find_one({"id": order["user_id"]}, {"_id": 0})
    if customer:
        status_messages = {
            OrderStatus.SHIPPED: "Your order has been shipped and is on its way!",
            OrderStatus.COMPLETED: "Your order has been delivered. Thank you for shopping with us!",
            OrderStatus.CANCELLED: "Your order has been cancelled. Please contact us if you have any questions."
        }
        if status in status_messages:
            # Send status update email (you can enhance this similar to order confirmation)
            pass
    
    order["status"] = status
    order["updated_at"] = now
    
    return OrderResponse(
        id=order["id"],
        user_id=order["user_id"],
        items=[OrderItemResponse(**i) for i in order["items"]],
        total_amount=order["total_amount"],
        status=status,
        address_snapshot=order["address_snapshot"],
        phone_number=order["phone_number"],
        payment_method=order.get("payment_method", "mpesa"),
        delivery_method=order.get("delivery_method", "delivery"),
        created_at=datetime.fromisoformat(order["created_at"]) if isinstance(order["created_at"], str) else order["created_at"],
        updated_at=datetime.fromisoformat(now)
    )

@api_router.get("/admin/products", response_model=List[ProductResponse])
async def get_all_products_admin(skip: int = 0, limit: int = 50, user: dict = Depends(get_admin_user)):
    products = await db.products.find({}, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for p in products:
        inventory = await db.inventory.find_one({"product_id": p["id"]}, {"_id": 0})
        stock = inventory["quantity"] if inventory else 0
        result.append(ProductResponse(
            id=p["id"],
            name=p["name"],
            slug=p["slug"],
            description=p["description"],
            price=p["price"],
            discount_price=p.get("discount_price"),
            category=p["category"],
            sku=p["sku"],
            images=p.get("images", []),
            is_active=p["is_active"],
            stock_quantity=stock,
            created_at=datetime.fromisoformat(p["created_at"]) if isinstance(p["created_at"], str) else p["created_at"]
        ))
    return result

@api_router.post("/admin/products", response_model=ProductResponse)
async def create_product(product: ProductCreate, user: dict = Depends(get_admin_user)):
    existing = await db.products.find_one({"sku": product.sku})
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")
    
    product_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    product_doc = {
        "id": product_id,
        "name": product.name,
        "slug": generate_slug(product.name),
        "description": product.description,
        "price": product.price,
        "discount_price": product.discount_price,
        "category": product.category,
        "sku": product.sku,
        "images": product.images,
        "is_active": True,
        "created_at": now
    }
    await db.products.insert_one(product_doc)
    
    await db.inventory.insert_one({
        "id": str(uuid.uuid4()),
        "product_id": product_id,
        "quantity": 0,
        "low_stock_threshold": 5,
        "updated_at": now
    })
    
    return ProductResponse(
        id=product_id,
        name=product.name,
        slug=generate_slug(product.name),
        description=product.description,
        price=product.price,
        discount_price=product.discount_price,
        category=product.category,
        sku=product.sku,
        images=product.images,
        is_active=True,
        stock_quantity=0,
        created_at=datetime.fromisoformat(now)
    )

@api_router.put("/admin/products/{product_id}", response_model=ProductResponse)
async def update_product(product_id: str, update: ProductUpdate, user: dict = Depends(get_admin_user)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if "name" in update_data:
        update_data["slug"] = generate_slug(update_data["name"])
    
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    inventory = await db.inventory.find_one({"product_id": product_id}, {"_id": 0})
    stock = inventory["quantity"] if inventory else 0
    
    return ProductResponse(
        id=updated["id"],
        name=updated["name"],
        slug=updated["slug"],
        description=updated["description"],
        price=updated["price"],
        discount_price=updated.get("discount_price"),
        category=updated["category"],
        sku=updated["sku"],
        images=updated.get("images", []),
        is_active=updated["is_active"],
        stock_quantity=stock,
        created_at=datetime.fromisoformat(updated["created_at"]) if isinstance(updated["created_at"], str) else updated["created_at"]
    )

@api_router.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(get_admin_user)):
    result = await db.products.update_one({"id": product_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deactivated"}

@api_router.get("/admin/inventory")
async def get_inventory(user: dict = Depends(get_admin_user)):
    inventory_items = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    
    result = []
    for inv in inventory_items:
        product = await db.products.find_one({"id": inv["product_id"]}, {"_id": 0})
        if product:
            result.append({
                "product_id": inv["product_id"],
                "product_name": product["name"],
                "quantity": inv["quantity"],
                "low_stock_threshold": inv["low_stock_threshold"],
                "is_low_stock": inv["quantity"] <= inv["low_stock_threshold"]
            })
    return result

@api_router.post("/admin/inventory/adjust")
async def adjust_inventory(adjustment: InventoryAdjust, background_tasks: BackgroundTasks, user: dict = Depends(get_admin_user)):
    inventory = await db.inventory.find_one({"product_id": adjustment.product_id}, {"_id": 0})
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")
    
    new_quantity = inventory["quantity"] + adjustment.change
    if new_quantity < 0:
        raise HTTPException(status_code=400, detail="Cannot reduce stock below 0")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.inventory.update_one(
        {"product_id": adjustment.product_id},
        {"$set": {"quantity": new_quantity, "updated_at": now}}
    )
    
    await db.inventory_logs.insert_one({
        "id": str(uuid.uuid4()),
        "product_id": adjustment.product_id,
        "change": adjustment.change,
        "reason": adjustment.reason,
        "reference_id": f"ADJ-{user['id'][:8]}",
        "created_at": now
    })
    
    # Check low stock after adjustment
    background_tasks.add_task(check_low_stock_and_notify)
    
    return {"message": "Inventory adjusted", "new_quantity": new_quantity}

@api_router.get("/admin/payments")
async def get_payments(
    status: Optional[PaymentStatus] = None,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_admin_user)
):
    query = {}
    if status:
        query["status"] = status
    
    payments = await db.payments.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return payments

@api_router.get("/admin/low-stock")
async def get_low_stock_items(user: dict = Depends(get_admin_user)):
    low_stock = await db.inventory.find({
        "$expr": {"$lte": ["$quantity", "$low_stock_threshold"]}
    }, {"_id": 0}).to_list(100)
    
    result = []
    for inv in low_stock:
        product = await db.products.find_one({"id": inv["product_id"]}, {"_id": 0})
        if product:
            result.append({
                "product_id": inv["product_id"],
                "product_name": product["name"],
                "quantity": inv["quantity"],
                "threshold": inv["low_stock_threshold"]
            })
    return result

# ==================== SEO ROUTES ====================
@api_router.get("/sitemap")
async def get_sitemap():
    """Generate sitemap data for SEO"""
    base_url = "https://wacka.co.ke"
    
    urls = [
        {"loc": base_url, "priority": "1.0", "changefreq": "daily"},
        {"loc": f"{base_url}/products", "priority": "0.9", "changefreq": "daily"},
        {"loc": f"{base_url}/blog", "priority": "0.8", "changefreq": "weekly"},
    ]
    
    # Add categories
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    for cat in categories:
        urls.append({
            "loc": f"{base_url}/products?category={cat['slug']}",
            "priority": "0.8",
            "changefreq": "daily"
        })
    
    # Add products
    products = await db.products.find({"is_active": True}, {"_id": 0}).to_list(1000)
    for p in products:
        urls.append({
            "loc": f"{base_url}/products/{p['id']}",
            "priority": "0.7",
            "changefreq": "weekly"
        })
    
    # Add blog posts
    posts = await db.blog_posts.find({"is_published": True}, {"_id": 0}).to_list(100)
    for post in posts:
        urls.append({
            "loc": f"{base_url}/blog/{post['slug']}",
            "priority": "0.6",
            "changefreq": "monthly"
        })
    
    return {"urls": urls}

@api_router.get("/seo/product/{product_id}")
async def get_product_seo(product_id: str):
    """Get SEO metadata for a product"""
    product = await db.products.find_one({"id": product_id, "is_active": True}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    price = product.get("discount_price") or product["price"]
    
    return {
        "title": f"{product['name']} | Wacka Accessories",
        "description": product["description"][:160],
        "keywords": f"{product['name']}, {product['category']}, accessories, Kenya, M-Pesa",
        "og_title": product["name"],
        "og_description": product["description"][:200],
        "og_image": product["images"][0] if product.get("images") else None,
        "og_type": "product",
        "structured_data": {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product["name"],
            "description": product["description"],
            "image": product.get("images", []),
            "sku": product["sku"],
            "offers": {
                "@type": "Offer",
                "price": price,
                "priceCurrency": "KES",
                "availability": "https://schema.org/InStock"
            }
        }
    }

# ==================== SEED DATA ====================
@api_router.post("/seed")
async def seed_data():
    existing_admin = await db.users.find_one({"role": UserRole.ADMIN})
    if existing_admin:
        return {"message": "Data already seeded"}
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create admin user
    admin_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": admin_id,
        "email": "admin@wacka.co.ke",
        "password": hash_password("admin123"),
        "first_name": "Admin",
        "last_name": "User",
        "phone_number": "254712345678",
        "role": UserRole.ADMIN,
        "is_active": True,
        "created_at": now
    })
    
    # Create categories
    categories = [
        {"id": str(uuid.uuid4()), "name": "Watches", "slug": "watches", "description": "Premium watches for every occasion", "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Jewelry", "slug": "jewelry", "description": "Elegant jewelry pieces", "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Bags", "slug": "bags", "description": "Stylish bags and handbags", "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Accessories", "slug": "accessories", "description": "Fashion accessories", "created_at": now},
    ]
    for cat in categories:
        await db.categories.insert_one(cat)
    
    # Create products
    products = [
        {
            "id": str(uuid.uuid4()),
            "name": "Classic Gold Watch",
            "slug": "classic-gold-watch",
            "description": "Elegant gold-plated watch with leather strap. Perfect for formal occasions.",
            "price": 15000,
            "discount_price": 12500,
            "category": "watches",
            "sku": "WA-001",
            "images": ["https://images.unsplash.com/photo-1737731662588-729f42147158?w=500"],
            "is_active": True,
            "created_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Pearl Necklace Set",
            "slug": "pearl-necklace-set",
            "description": "Beautiful freshwater pearl necklace with matching earrings.",
            "price": 8500,
            "category": "jewelry",
            "sku": "JW-001",
            "images": ["https://images.unsplash.com/photo-1717282924526-07a7373bb142?w=500"],
            "is_active": True,
            "created_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Leather Handbag",
            "slug": "leather-handbag",
            "description": "Premium leather handbag with multiple compartments. Available in brown.",
            "price": 12000,
            "discount_price": 9800,
            "category": "bags",
            "sku": "BG-001",
            "images": ["https://images.unsplash.com/photo-1637759292654-a12cb2be085e?w=500"],
            "is_active": True,
            "created_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Designer Sunglasses",
            "slug": "designer-sunglasses",
            "description": "UV protected designer sunglasses. Unisex style.",
            "price": 4500,
            "category": "accessories",
            "sku": "AC-001",
            "images": ["https://images.unsplash.com/photo-1761290521477-21c12d8db198?w=500"],
            "is_active": True,
            "created_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Silver Bracelet",
            "slug": "silver-bracelet",
            "description": "Sterling silver bracelet with intricate design.",
            "price": 3500,
            "category": "jewelry",
            "sku": "JW-002",
            "images": ["https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=500"],
            "is_active": True,
            "created_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Sports Watch",
            "slug": "sports-watch",
            "description": "Water-resistant sports watch with digital display.",
            "price": 7500,
            "category": "watches",
            "sku": "WA-002",
            "images": ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"],
            "is_active": True,
            "created_at": now
        }
    ]
    
    for product in products:
        await db.products.insert_one(product)
        await db.inventory.insert_one({
            "id": str(uuid.uuid4()),
            "product_id": product["id"],
            "quantity": 20,
            "low_stock_threshold": 5,
            "updated_at": now
        })
    
    # Create sample blog post
    await db.blog_posts.insert_one({
        "id": str(uuid.uuid4()),
        "title": "Welcome to Wacka Accessories",
        "slug": "welcome-to-wacka-accessories",
        "excerpt": "Discover premium accessories crafted for the modern you.",
        "content": """
        <h2>Welcome to Wacka Accessories!</h2>
        <p>We're thrilled to have you here. At Wacka, we believe that the right accessory can transform any outfit and express your unique personality.</p>
        <h3>Our Collections</h3>
        <p>Explore our carefully curated collections:</p>
        <ul>
            <li><strong>Watches</strong> - From classic to contemporary</li>
            <li><strong>Jewelry</strong> - Elegant pieces for every occasion</li>
            <li><strong>Bags</strong> - Functional meets fashionable</li>
            <li><strong>Accessories</strong> - The finishing touches</li>
        </ul>
        <h3>Pay with M-Pesa</h3>
        <p>We make shopping easy with secure M-Pesa payments. Simply add items to your cart, checkout, and pay directly from your phone.</p>
        <p>Happy shopping!</p>
        """,
        "featured_image": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800",
        "tags": ["announcement", "welcome"],
        "author_id": admin_id,
        "is_published": True,
        "views": 0,
        "created_at": now,
        "updated_at": now
    })
    
    return {"message": "Data seeded successfully", "admin_email": "admin@wacka.co.ke", "admin_password": "admin123"}

# ==================== NOTIFICATION ROUTES ====================
@api_router.get("/admin/notifications", response_model=List[NotificationResponse])
async def get_notifications(skip: int = 0, limit: int = 50, user: dict = Depends(get_admin_user)):
    """Get all notifications for admin"""
    notifications = await db.notifications.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [
        NotificationResponse(
            id=n["id"],
            type=n["type"],
            title=n["title"],
            message=n["message"],
            related_id=n.get("related_id"),
            is_read=n["is_read"],
            created_at=datetime.fromisoformat(n["created_at"]) if isinstance(n["created_at"], str) else n["created_at"]
        )
        for n in notifications
    ]

@api_router.get("/admin/notifications/unread/count")
async def get_unread_notifications_count(user: dict = Depends(get_admin_user)):
    """Get count of unread notifications"""
    count = await db.notifications.count_documents({"is_read": False})
    return {"count": count}

@api_router.patch("/admin/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_admin_user)):
    """Mark a notification as read"""
    result = await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"is_read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}

@api_router.post("/admin/notifications/mark-all-read")
async def mark_all_notifications_read(user: dict = Depends(get_admin_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "All notifications marked as read"}

# ==================== ENHANCED DASHBOARD STATS ====================
@api_router.get("/admin/dashboard/stats", response_model=EnhancedDashboardStats)
async def get_enhanced_dashboard_stats(user: dict = Depends(get_admin_user)):
    """Get enhanced dashboard statistics"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Today's stats
    today_orders = await db.orders.find({
        "created_at": {"$gte": today_start.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    today_sales = sum(o["total_amount"] for o in today_orders)
    orders_today = len(today_orders)
    
    # Failed payments
    failed_payments = await db.payments.count_documents({"status": PaymentStatus.FAILED})
    
    # Low stock count
    low_stock_count = await db.inventory.count_documents({
        "$expr": {"$lte": ["$quantity", "$low_stock_threshold"]}
    })
    
    # Monthly sales (last 12 months)
    monthly_sales = {}
    for i in range(12):
        month_date = now - timedelta(days=30 * i)
        month_key = month_date.strftime("%Y-%m")
        month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        if i == 0:
            month_end = now
        else:
            month_end = (month_date.replace(day=1) + timedelta(days=32)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        month_orders = await db.orders.find({
            "created_at": {"$gte": month_start.isoformat(), "$lt": month_end.isoformat()},
            "status": {"$nin": [OrderStatus.CANCELLED, OrderStatus.FAILED]}
        }, {"_id": 0}).to_list(10000)
        
        monthly_sales[month_key] = sum(o["total_amount"] for o in month_orders)
    
    # Yearly sales
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    year_orders = await db.orders.find({
        "created_at": {"$gte": year_start.isoformat()},
        "status": {"$nin": [OrderStatus.CANCELLED, OrderStatus.FAILED]}
    }, {"_id": 0}).to_list(10000)
    yearly_sales = sum(o["total_amount"] for o in year_orders)
    
    # Quarterly sales (current quarter)
    quarter = (now.month - 1) // 3
    quarter_start_month = quarter * 3 + 1
    quarter_start = now.replace(month=quarter_start_month, day=1, hour=0, minute=0, second=0, microsecond=0)
    quarter_orders = await db.orders.find({
        "created_at": {"$gte": quarter_start.isoformat()},
        "status": {"$nin": [OrderStatus.CANCELLED, OrderStatus.FAILED]}
    }, {"_id": 0}).to_list(10000)
    quarterly_sales = sum(o["total_amount"] for o in quarter_orders)
    
    # Most viewed products
    products = await db.blog_posts.find({}, {"_id": 0}).sort("views", -1).limit(10).to_list(10)
    most_viewed_blog = [{"id": p["id"], "title": p["title"], "views": p.get("views", 0)} for p in products]
    
    # Also get top selling products by counting orders
    product_sales = {}
    all_orders = await db.orders.find({"status": {"$in": [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.COMPLETED]}}, {"_id": 0}).to_list(10000)
    for order in all_orders:
        for item in order.get("items", []):
            pid = item["product_id"]
            if pid not in product_sales:
                product_sales[pid] = {"quantity": 0, "revenue": 0, "name": item["product_name"]}
            product_sales[pid]["quantity"] += item["quantity"]
            product_sales[pid]["revenue"] += item["price"] * item["quantity"]
    
    most_viewed_products = [
        {"id": pid, "name": data["name"], "quantity_sold": data["quantity"], "revenue": data["revenue"]}
        for pid, data in sorted(product_sales.items(), key=lambda x: x[1]["revenue"], reverse=True)[:10]
    ]
    
    # Total customers
    total_customers = await db.users.count_documents({"role": UserRole.CUSTOMER})
    
    # Pending orders
    pending_orders = await db.orders.count_documents({
        "status": {"$in": [OrderStatus.PENDING_PAYMENT, OrderStatus.PROCESSING]}
    })
    
    return EnhancedDashboardStats(
        today_sales=today_sales,
        orders_today=orders_today,
        failed_payments=failed_payments,
        low_stock_count=low_stock_count,
        monthly_sales=monthly_sales,
        yearly_sales=yearly_sales,
        quarterly_sales=quarterly_sales,
        most_viewed_products=most_viewed_products,
        total_customers=total_customers,
        pending_orders=pending_orders
    )

# ==================== CUSTOM EMAIL ROUTES ====================
@api_router.post("/admin/send-custom-email")
async def send_custom_email(email_request: CustomEmailRequest, user: dict = Depends(get_admin_user)):
    """Send custom email to multiple recipients"""
    success_count = 0
    failed_emails = []
    
    for email in email_request.recipient_emails:
        try:
            result = email_service.send_email(email, email_request.subject, email_request.html_content)
            if result:
                success_count += 1
            else:
                failed_emails.append(email)
        except Exception as e:
            logger.error(f"Failed to send email to {email}: {str(e)}")
            failed_emails.append(email)
    
    return {
        "message": f"Sent {success_count} emails successfully",
        "success_count": success_count,
        "failed_count": len(failed_emails),
        "failed_emails": failed_emails
    }

# ==================== USER MANAGEMENT ROUTES ====================
@api_router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(skip: int = 0, limit: int = 50, role: Optional[UserRole] = None, user: dict = Depends(get_admin_user)):
    """Get all users with optional role filter"""
    query = {}
    if role:
        query["role"] = role
    
    users = await db.users.find(query, {"_id": 0, "password": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [
        UserResponse(
            id=u["id"],
            email=u["email"],
            first_name=u["first_name"],
            last_name=u["last_name"],
            phone_number=u.get("phone_number"),
            role=u["role"],
            created_at=datetime.fromisoformat(u["created_at"]) if isinstance(u["created_at"], str) else u["created_at"]
        )
        for u in users
    ]

@api_router.post("/admin/users", response_model=UserResponse)
async def create_user_by_admin(user_data: UserCreateByAdmin, user: dict = Depends(get_admin_user)):
    """Create a new user with specified role (admin only)"""
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    new_user = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "phone_number": user_data.phone_number,
        "role": user_data.role,
        "is_active": True,
        "created_at": now
    }
    await db.users.insert_one(new_user)
    
    # Create cart for customer users
    if user_data.role == UserRole.CUSTOMER:
        await db.carts.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "items": [],
            "is_active": True,
            "updated_at": now
        })
    
    return UserResponse(
        id=user_id,
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone_number=user_data.phone_number,
        role=user_data.role,
        created_at=datetime.fromisoformat(now)
    )

@api_router.patch("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, role: UserRole, user: dict = Depends(get_admin_user)):
    """Update user role (admin only)"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": role}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User role updated successfully"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(get_admin_user)):
    """Delete a user (admin only)"""
    # Prevent deleting yourself
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete user and associated data
    await db.users.delete_one({"id": user_id})
    await db.carts.delete_many({"user_id": user_id})
    await db.addresses.delete_many({"user_id": user_id})
    
    return {"message": "User deleted successfully"}

# ==================== STORE SETTINGS ROUTES ====================
@api_router.get("/store-settings", response_model=StoreSettingsResponse)
async def get_store_settings():
    """Get store settings (public)"""
    settings = await db.store_settings.find_one({}, {"_id": 0})
    if not settings:
        # Return default settings
        return StoreSettingsResponse(
            id="default",
            store_name="Wacka Accessories",
            logo_url=None,
            contact_email="info@wacka.co.ke",
            contact_phone=None,
            whatsapp_number=None,
            facebook_url=None,
            instagram_url=None,
            twitter_url=None,
            primary_color="#10B981",
            secondary_color="#3B82F6",
            updated_at=datetime.now(timezone.utc)
        )
    
    return StoreSettingsResponse(
        id=settings["id"],
        store_name=settings["store_name"],
        logo_url=settings.get("logo_url"),
        contact_email=settings["contact_email"],
        contact_phone=settings.get("contact_phone"),
        whatsapp_number=settings.get("whatsapp_number"),
        facebook_url=settings.get("facebook_url"),
        instagram_url=settings.get("instagram_url"),
        twitter_url=settings.get("twitter_url"),
        primary_color=settings.get("primary_color", "#10B981"),
        secondary_color=settings.get("secondary_color", "#3B82F6"),
        updated_at=datetime.fromisoformat(settings["updated_at"]) if isinstance(settings["updated_at"], str) else settings["updated_at"]
    )

@api_router.patch("/admin/store-settings", response_model=StoreSettingsResponse)
async def update_store_settings(settings_update: StoreSettingsUpdate, user: dict = Depends(get_admin_user)):
    """Update store settings (admin only)"""
    existing = await db.store_settings.find_one({}, {"_id": 0})
    now = datetime.now(timezone.utc).isoformat()
    
    if existing:
        # Update existing settings
        update_data = {k: v for k, v in settings_update.model_dump().items() if v is not None}
        update_data["updated_at"] = now
        
        await db.store_settings.update_one(
            {"id": existing["id"]},
            {"$set": update_data}
        )
        
        settings = await db.store_settings.find_one({"id": existing["id"]}, {"_id": 0})
    else:
        # Create new settings
        settings_id = str(uuid.uuid4())
        settings = {
            "id": settings_id,
            "store_name": settings_update.store_name or "Wacka Accessories",
            "logo_url": settings_update.logo_url,
            "contact_email": settings_update.contact_email or "info@wacka.co.ke",
            "contact_phone": settings_update.contact_phone,
            "whatsapp_number": settings_update.whatsapp_number,
            "facebook_url": settings_update.facebook_url,
            "instagram_url": settings_update.instagram_url,
            "twitter_url": settings_update.twitter_url,
            "primary_color": settings_update.primary_color or "#10B981",
            "secondary_color": settings_update.secondary_color or "#3B82F6",
            "updated_at": now
        }
        await db.store_settings.insert_one(settings)
    
    return StoreSettingsResponse(
        id=settings["id"],
        store_name=settings["store_name"],
        logo_url=settings.get("logo_url"),
        contact_email=settings["contact_email"],
        contact_phone=settings.get("contact_phone"),
        whatsapp_number=settings.get("whatsapp_number"),
        facebook_url=settings.get("facebook_url"),
        instagram_url=settings.get("instagram_url"),
        twitter_url=settings.get("twitter_url"),
        primary_color=settings.get("primary_color", "#10B981"),
        secondary_color=settings.get("secondary_color", "#3B82F6"),
        updated_at=datetime.fromisoformat(settings["updated_at"]) if isinstance(settings["updated_at"], str) else settings["updated_at"]
    )

# ==================== ORDER CANCELLATION ROUTES ====================
@api_router.post("/orders/{order_id}/cancel")
async def request_order_cancellation(order_id: str, user: dict = Depends(get_current_user)):
    """Request order cancellation (customer)"""
    order = await db.orders.find_one({"id": order_id, "user_id": user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Only allow cancellation for certain statuses
    if order["status"] in [OrderStatus.SHIPPED, OrderStatus.COMPLETED]:
        raise HTTPException(status_code=400, detail="Cannot cancel order that has been shipped or completed")
    
    if order["status"] == OrderStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Order is already cancelled")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": OrderStatus.CANCELLED, "updated_at": now}}
    )
    
    # Restore inventory if it was deducted
    if order.get("payment_method") == "pay_on_delivery" or order["status"] == OrderStatus.PAID:
        for item in order["items"]:
            await db.inventory.update_one(
                {"product_id": item["product_id"]},
                {"$inc": {"quantity": item["quantity"]}}
            )
    
    # Create notification
    await create_notification(
        NotificationType.ORDER_CANCELLED,
        "Order Cancelled",
        f"Order #{order_id[:8].upper()} was cancelled by customer {user['first_name']} {user['last_name']}",
        order_id
    )
    
    return {"message": "Order cancelled successfully"}

# ==================== RELATED PRODUCTS ROUTE ====================
@api_router.get("/products/{product_id}/related", response_model=List[ProductResponse])
async def get_related_products(product_id: str, limit: int = 4):
    """Get related products based on category"""
    product = await db.products.find_one({"id": product_id, "is_active": True}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get products from same category, excluding current product
    related = await db.products.find({
        "category": product["category"],
        "is_active": True,
        "id": {"$ne": product_id}
    }, {"_id": 0}).limit(limit).to_list(limit)
    
    result = []
    for p in related:
        inventory = await db.inventory.find_one({"product_id": p["id"]}, {"_id": 0})
        result.append(ProductResponse(
            id=p["id"],
            name=p["name"],
            slug=p["slug"],
            description=p["description"],
            price=p["price"],
            discount_price=p.get("discount_price"),
            category=p["category"],
            sku=p["sku"],
            images=p.get("images", []),
            is_active=p["is_active"],
            stock_quantity=inventory["quantity"] if inventory else 0,
            created_at=datetime.fromisoformat(p["created_at"]) if isinstance(p["created_at"], str) else p["created_at"]
        ))
    
    return result

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.products.create_index("sku", unique=True)
    await db.products.create_index("slug")
    await db.products.create_index("category")
    await db.orders.create_index("user_id")
    await db.orders.create_index("status")
    await db.payments.create_index("checkout_request_id")
    await db.inventory.create_index("product_id", unique=True)
    await db.categories.create_index("slug", unique=True)
    await db.blog_posts.create_index("slug", unique=True)
    logger.info("Database indexes created")

@app.on_event("shutdown")
async def shutdown():
    client.close()
