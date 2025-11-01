# Shiloh Ridge Farm - Complete Farm Management System

A full-stack web application for Shiloh Ridge Farm, featuring livestock management, product sales, blog content, and comprehensive admin dashboard.

## 🚀 Quick Start

### Option 1: Docker (Recommended - Most Reliable)

```bash
# Make sure Docker is running, then:
docker-compose up --build -d

# Wait for services to be healthy (about 2-3 minutes)
# Then open: http://localhost:3000
```

### Option 2: Local Development

```bash
# Backend (requires MongoDB running locally)
cd backend
pip install -r requirements.txt
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload

# Frontend (in another terminal)
cd frontend
npm install
npm start
```

## 🔐 Admin Access

- **URL:** http://localhost:3000/admin
- **Username:** admin
- **Password:** admin123
- **Features:** Full CRUD operations for livestock, products, blog, and about content

## ✨ Features

### 🏠 Public Features
- **Home Page:** Welcome and farm overview
- **Livestock:** Browse available Katahdin sheep
- **Products:** Farm products and ordering system
- **Blog:** Farm news and educational content
- **About:** Farm history and mission
- **Auctions:** Regional livestock auction information

### 🔧 Admin Features
- **Dashboard:** Complete management interface
- **Livestock Management:** Add/edit/delete sheep inventory
- **Product Management:** Manage farm products and pricing
- **Blog Management:** Create and edit blog posts
- **About Management:** Update farm information
- **Data Persistence:** All changes saved locally when backend unavailable

## 🛠️ Tech Stack

- **Frontend:** React 19, Tailwind CSS, Shadcn/UI
- **Backend:** FastAPI, MongoDB, JWT Authentication
- **Deployment:** Docker, Docker Compose
- **Offline Support:** localStorage fallback for all data

## 📁 Project Structure

```
├── backend/          # FastAPI server
│   ├── server.py     # Main API server
│   ├── requirements.txt
│   └── documents/    # File storage
├── frontend/         # React application
│   ├── src/
│   │   ├── pages/    # Route components
│   │   ├── components/ # Reusable UI components
│   │   └── App.js    # Main app component
│   └── package.json
├── docker-compose.yml # Docker orchestration
└── README.md
```

## 🔄 Data Persistence

The application includes robust offline functionality:

- **localStorage Fallback:** When backend is unavailable, all data is stored locally
- **Demo Mode:** Full admin functionality works without backend
- **Data Synchronization:** Changes persist across browser sessions
- **Graceful Degradation:** Site remains fully functional offline

## 🚀 Deployment

### Production Docker Deployment

```bash
# Build and deploy
docker-compose up --build -d

# Check service health
docker-compose ps

# View logs
docker-compose logs -f [service-name]
```

### Environment Variables

Create `.env` file in project root:

```env
# MongoDB
MONGO_URL=mongodb://admin:password123@mongodb:27017/shilohridgefarm?authSource=admin
DB_NAME=shilohridgefarm

# JWT
JWT_SECRET=your-secret-key-here

# CORS
CORS_ORIGINS=http://localhost:3000,http://frontend:3000
```

## 🐛 Troubleshooting

### Common Issues

1. **"Failed to fetch" errors:**
   - Backend not running → Use demo mode (admin/admin123)
   - Check Docker services: `docker-compose ps`

2. **MongoDB connection issues:**
   - Ensure MongoDB container is healthy
   - Check connection string in `.env`

3. **Port conflicts:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000
   - MongoDB: localhost:27017

### Reset Everything

```bash
# Stop and remove all containers
docker-compose down -v

# Clean rebuild
docker-compose up --build --force-recreate
```

## 📞 Support

For technical support or questions:
- Check the admin demo mode for full functionality testing
- All data persists locally when backend is unavailable
- Docker setup provides the most reliable deployment

---

**© 2025 Shiloh Ridge Farm - Professional Farm Management System**
- **About Page**: Farm history, mission, and values
- **Blog**: Educational content and farm updates with admin editing capabilities
- **Katahdin Information Page**: Comprehensive breed guide with structured content and navigation
- **Local Auctions Page**: Regional livestock auction listings by state with filtering
- **Contact Forms**: General inquiries, animal-specific inquiries, and make offers
- **Live Price Ticker**: Real-time livestock market prices (currently using mock data)
- **Global Dark Mode**: Toggle dark/light theme from any page

### Admin Dashboard (Password Protected)

- **Livestock Management**: Full CRUD operations for all animals
- **Blog Management**: Create and edit blog posts with rich content
- **About Page Editor**: Update website content dynamically
- **Contact Form Management**: View and respond to customer inquiries
- **Settings Management**: Configure all API keys and integrations
- **NFT Minting**: Mint blockchain certificates for livestock on Polygon network
- **PDF Export**: Export KHSI-style livestock certificates and transfer paperwork as PDFs

### NFT Integration (Polygon Network)

- ERC-721 smart contract with updatable metadata
- Livestock registration certificates as NFTs
- Track health records, vaccinations, and breeding history on-chain
- Ready for on-demand deployment


## Technology Stack

- **Backend**: FastAPI, MongoDB, JWT Authentication, bcrypt
- **Frontend**: React 19, React Router, Tailwind CSS, Shadcn UI, Axios
- **PDF Generation**: pdf-lib, jsPDF


## Project Structure

```
shilohridgefarm/
├── backend/                 # FastAPI backend
│   ├── server.py           # Main FastAPI application
│   ├── requirements.txt    # Python dependencies
│   ├── documents/          # PDF documents storage
│   └── __pycache__/        # Python cache (ignored)
├── frontend/                # React frontend
│   ├── src/                # Source code
│   ├── public/             # Static assets
│   ├── package.json        # Node dependencies
│   └── build/              # Production build (ignored)
├── assets/                  # Static assets
│   └── images/             # Image files
├── contracts/               # Smart contracts
├── tests/                   # Test files
├── docker-compose.yml       # Docker Compose configuration
├── Dockerfile.backend       # Backend Docker configuration
├── Dockerfile.frontend      # Frontend Docker configuration
├── .gitignore              # Git ignore rules
├── LICENSE                 # MIT License
└── README.md               # This file
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Git

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone https://github.com/Spruked/Shiloh-Ridge-Farm-II.git
   cd shilohridgefarm
   ```

2. **Create environment file**
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env` with your MongoDB connection string and other settings.

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Initialize documents (first time only)**
   ```bash
   docker-compose --profile init run --rm document-init
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Admin Dashboard: http://localhost:3000/admin

### Local Development

1. **Backend Setup**
   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   uvicorn server:app --reload
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

### Default Admin Credentials
- **Username**: `admin`
- **Password**: `admin123`

**Important**: Change these credentials after first login!

### Pre-configured Settings
- **USDA API Key**: N/KUHW09nFC2hAWvW1Vb1gvVL1k7BqUd
- **Polygon Wallet**: 0x22831611004eD557E9ddB43e262Df64909Dd8b6E
- **Polygon API Key**: e12adc74792a4c30b4e2965d1ecceac9


## Usage Guide


### Adding Livestock
1. Login to Admin Dashboard
2. Navigate to "Livestock" tab
3. Click "Add New Livestock"
4. Fill in all required fields (animal type, tag number, registration details, etc.)
5. Click "Add Livestock"

### Dark Mode
- Use the sun/moon toggle in the navigation bar to switch between light and dark themes. Your preference is saved automatically.

### PDF Export
- In the Admin Dashboard, click "Export KHSI PDF" to generate a printable certificate for any livestock entry. Transfer paperwork is also available for completed sales.


### Managing Contact Forms
1. Navigate to "Contact" tab in Admin Dashboard
2. View all submissions sorted by date
3. Click "View" to see full details
4. Mark as "Read" or "Responded"

### NFT Minting
1. Navigate to "NFT" tab in Admin Dashboard
2. Ensure Polygon settings are configured
3. Select livestock to mint NFT certificate
4. Click "Mint NFT"

## Support

For questions or issues, contact: dominichanway@gmail.com

---

**Built with integrity and honesty - The Shiloh Ridge Farm way.**
