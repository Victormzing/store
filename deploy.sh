#!/bin/bash

#===============================================================================
# WACKA ACCESSORIES - DEPLOYMENT SCRIPT
# 
# This script deploys the Wacka Accessories e-commerce platform to a custom domain.
# 
# Prerequisites:
#   - Ubuntu 20.04+ or Debian-based server
#   - Root or sudo access
#   - Domain pointed to your server's IP
#
# Usage:
#   chmod +x deploy.sh
#   sudo ./deploy.sh --domain yourdomain.com --email your@email.com
#
#===============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DOMAIN=""
EMAIL=""
APP_DIR="/var/www/wacka"
BACKEND_PORT=8001
FRONTEND_PORT=3000

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --email)
            EMAIL="$2"
            shift 2
            ;;
        --help)
            echo "Usage: sudo ./deploy.sh --domain yourdomain.com --email your@email.com"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate inputs
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Error: --domain is required${NC}"
    echo "Usage: sudo ./deploy.sh --domain yourdomain.com --email your@email.com"
    exit 1
fi

if [ -z "$EMAIL" ]; then
    echo -e "${RED}Error: --email is required (for SSL certificate)${NC}"
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  WACKA ACCESSORIES DEPLOYMENT${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Domain: ${YELLOW}$DOMAIN${NC}"
echo -e "Email: ${YELLOW}$EMAIL${NC}"
echo ""

#-------------------------------------------------------------------------------
# STEP 1: System Update & Dependencies
#-------------------------------------------------------------------------------
echo -e "${GREEN}[1/8] Installing system dependencies...${NC}"

apt-get update
apt-get install -y \
    curl \
    git \
    nginx \
    certbot \
    python3-certbot-nginx \
    python3 \
    python3-pip \
    python3-venv \
    gnupg \
    supervisor

# Install Node.js 18.x
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Installing Node.js 18.x...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Install Yarn
if ! command -v yarn &> /dev/null; then
    echo -e "${YELLOW}Installing Yarn...${NC}"
    npm install -g yarn
fi

#-------------------------------------------------------------------------------
# STEP 2: Install MongoDB
#-------------------------------------------------------------------------------
echo -e "${GREEN}[2/8] Installing MongoDB...${NC}"

if ! command -v mongod &> /dev/null; then
    curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
        gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
    
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
        tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    
    apt-get update
    apt-get install -y mongodb-org
    
    systemctl start mongod
    systemctl enable mongod
fi

echo -e "${GREEN}MongoDB is running${NC}"

#-------------------------------------------------------------------------------
# STEP 3: Create Application Directory
#-------------------------------------------------------------------------------
echo -e "${GREEN}[3/8] Setting up application directory...${NC}"

mkdir -p $APP_DIR
mkdir -p $APP_DIR/backend
mkdir -p $APP_DIR/frontend
mkdir -p $APP_DIR/logs

# Copy application files (adjust source path as needed)
if [ -d "/app/backend" ]; then
    cp -r /app/backend/* $APP_DIR/backend/
fi

if [ -d "/app/frontend" ]; then
    cp -r /app/frontend/* $APP_DIR/frontend/
fi

#-------------------------------------------------------------------------------
# STEP 4: Backend Setup
#-------------------------------------------------------------------------------
echo -e "${GREEN}[4/8] Setting up backend...${NC}"

cd $APP_DIR/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create/Update .env file
cat > $APP_DIR/backend/.env << EOF
# Database
MONGO_URL="mongodb://localhost:27017"
DB_NAME="wacka_accessories"

# CORS - Update with your domain
CORS_ORIGINS="https://$DOMAIN,https://www.$DOMAIN"

# JWT Secret - CHANGE THIS IN PRODUCTION!
JWT_SECRET="$(openssl rand -hex 32)"
JWT_ALGORITHM="HS256"
JWT_EXPIRATION_HOURS=24

# M-Pesa Configuration (Update with your credentials)
MPESA_CONSUMER_KEY="your_consumer_key"
MPESA_CONSUMER_SECRET="your_consumer_secret"
MPESA_SHORTCODE="your_shortcode"
MPESA_PASSKEY="your_passkey"
MPESA_CALLBACK_URL="https://$DOMAIN/api/payments/mpesa/callback"
MPESA_ENV="sandbox"

# Email Configuration (Update with your credentials)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your_email@gmail.com"
SMTP_PASSWORD="your_app_password"
ADMIN_EMAIL="admin@$DOMAIN"
EOF

deactivate

echo -e "${YELLOW}⚠️  IMPORTANT: Update backend/.env with your actual credentials!${NC}"

#-------------------------------------------------------------------------------
# STEP 5: Frontend Setup
#-------------------------------------------------------------------------------
echo -e "${GREEN}[5/8] Setting up frontend...${NC}"

cd $APP_DIR/frontend

# Update frontend .env
cat > $APP_DIR/frontend/.env << EOF
REACT_APP_BACKEND_URL=https://$DOMAIN
REACT_APP_SITE_NAME=Wacka Accessories
EOF

# Install dependencies and build
yarn install
yarn build

echo -e "${GREEN}Frontend built successfully${NC}"

#-------------------------------------------------------------------------------
# STEP 6: Configure Supervisor (Process Manager)
#-------------------------------------------------------------------------------
echo -e "${GREEN}[6/8] Configuring Supervisor...${NC}"

cat > /etc/supervisor/conf.d/wacka-backend.conf << EOF
[program:wacka-backend]
command=$APP_DIR/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port $BACKEND_PORT
directory=$APP_DIR/backend
user=www-data
autostart=true
autorestart=true
stderr_logfile=$APP_DIR/logs/backend.err.log
stdout_logfile=$APP_DIR/logs/backend.out.log
environment=PATH="$APP_DIR/backend/venv/bin"
EOF

# Reload supervisor
supervisorctl reread
supervisorctl update
supervisorctl restart wacka-backend

echo -e "${GREEN}Backend service configured${NC}"

#-------------------------------------------------------------------------------
# STEP 7: Configure Nginx
#-------------------------------------------------------------------------------
echo -e "${GREEN}[7/8] Configuring Nginx...${NC}"

cat > /etc/nginx/sites-available/wacka << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Redirect HTTP to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL certificates (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend (React build)
    root $APP_DIR/frontend/build;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    # API routes -> Backend
    location /api/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
        # File upload size limit
        client_max_body_size 10M;
    }

    # Static uploads
    location /uploads/ {
        alias $APP_DIR/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Frontend routes (React Router)
    location / {
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/wacka /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t

#-------------------------------------------------------------------------------
# STEP 8: SSL Certificate (Let's Encrypt)
#-------------------------------------------------------------------------------
echo -e "${GREEN}[8/8] Obtaining SSL certificate...${NC}"

# First, create a temporary config without SSL for initial certificate
cat > /etc/nginx/sites-available/wacka-temp << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    root $APP_DIR/frontend/build;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 200 'Server is being configured...';
        add_header Content-Type text/plain;
    }
}
EOF

ln -sf /etc/nginx/sites-available/wacka-temp /etc/nginx/sites-enabled/wacka
systemctl reload nginx

# Obtain certificate
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $EMAIL

# Now apply the full config
ln -sf /etc/nginx/sites-available/wacka /etc/nginx/sites-enabled/
systemctl reload nginx

#-------------------------------------------------------------------------------
# STEP 9: Set Permissions
#-------------------------------------------------------------------------------
echo -e "${GREEN}Setting file permissions...${NC}"

chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR
mkdir -p $APP_DIR/backend/uploads
chown -R www-data:www-data $APP_DIR/backend/uploads

#-------------------------------------------------------------------------------
# STEP 10: Create Useful Scripts
#-------------------------------------------------------------------------------

# Create restart script
cat > $APP_DIR/restart.sh << 'EOF'
#!/bin/bash
echo "Restarting Wacka Accessories..."
supervisorctl restart wacka-backend
systemctl reload nginx
echo "Done!"
EOF
chmod +x $APP_DIR/restart.sh

# Create log viewing script
cat > $APP_DIR/logs.sh << 'EOF'
#!/bin/bash
echo "=== Backend Logs ==="
tail -f /var/www/wacka/logs/backend.err.log
EOF
chmod +x $APP_DIR/logs.sh

# Create update script
cat > $APP_DIR/update.sh << 'EOF'
#!/bin/bash
set -e
cd /var/www/wacka

echo "Updating backend..."
cd backend
source venv/bin/activate
pip install -r requirements.txt
deactivate

echo "Updating frontend..."
cd ../frontend
yarn install
yarn build

echo "Restarting services..."
supervisorctl restart wacka-backend
systemctl reload nginx

echo "Update complete!"
EOF
chmod +x $APP_DIR/update.sh

#-------------------------------------------------------------------------------
# DEPLOYMENT COMPLETE
#-------------------------------------------------------------------------------
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  DEPLOYMENT COMPLETE! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Your site is now live at: ${YELLOW}https://$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Don't forget to:${NC}"
echo "1. Update $APP_DIR/backend/.env with your actual credentials:"
echo "   - M-Pesa API credentials"
echo "   - Gmail SMTP credentials"
echo ""
echo "2. Create an admin user (if not seeded):"
echo "   - Email: admin@wacka.co.ke"
echo "   - Password: admin123"
echo ""
echo -e "${GREEN}Useful commands:${NC}"
echo "  - Restart services:  $APP_DIR/restart.sh"
echo "  - View logs:         $APP_DIR/logs.sh"
echo "  - Update app:        $APP_DIR/update.sh"
echo "  - Backend status:    supervisorctl status wacka-backend"
echo "  - Nginx status:      systemctl status nginx"
echo ""
echo -e "${GREEN}File locations:${NC}"
echo "  - App directory:     $APP_DIR"
echo "  - Backend logs:      $APP_DIR/logs/backend.err.log"
echo "  - Nginx config:      /etc/nginx/sites-available/wacka"
echo "  - SSL certificates:  /etc/letsencrypt/live/$DOMAIN/"
echo ""
