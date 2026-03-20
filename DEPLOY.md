# 🚀 Shiloh Ridge Farm II - Deployment Guide

## 🔧 Deployment Instructions (VPS)

### Prerequisites:
- Ubuntu 22.04 VPS
- Docker + Docker Compose installed
- Git installed
- Ports 80 and 443 open

### Steps:

1. **SSH into the server:**
   ```bash
   ssh deployer@YOUR_SERVER_IP
   ```

2. **Clone the repository:**
   ```bash
   gh repo clone Spruked/Shiloh-Ridge-Farm-II
   cd Shiloh-Ridge-Farm-II
   ```

3. **Create the deployment environment file:**
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your real Mongo credentials, a long random `JWT_SECRET`, your public backend URL, and the allowed browser origins.

4. **Bootstrap the first admin account:**
   - Set `INITIAL_ADMIN_USERNAME` and `INITIAL_ADMIN_PASSWORD` in `.env` before the first startup.
   - After the admin user is created, remove those two values from `.env` so they are not reused.

5. **Start the application:**
   ```bash
   docker compose up --build -d
   ```

6. **(Optional) Set up Nginx or Caddy reverse proxy for domain access:**
   - Configure reverse proxy to forward requests to the appropriate containers
   - Set up SSL certificates for HTTPS

## 🧪 Testing

**Backend API:** `https://your-api-domain.example/docs`
**Frontend:** `https://your-site-domain.example`

## 📋 Application Features

- **Livestock Management:** Complete inventory system for Katahdin sheep and other livestock
- **Sales & Accounting:** Full financial tracking and customer management
- **Admin Dashboard:** Comprehensive management interface
- **Real-time Market Data:** USDA API integration for price tracking
- **NFT Integration:** Blockchain-based livestock certification
- **Document Management:** PDF generation and storage
- **Responsive Design:** Mobile-friendly interface

## 🔧 Environment Configuration

The application uses the following default ports:
- Frontend: Port 3000
- Backend: Port 8000
- MongoDB: Port 27017

Update the domain references in the deployment instructions to match your actual domain configuration.

## 📞 Support

For deployment assistance or issues, contact the development team.
