
# Shiloh Ridge Farm - Livestock Management Website

![MIT License](https://img.shields.io/badge/license-MIT-green)


A comprehensive full-stack web application for managing and showcasing Katahdin sheep, live hogs, and select cattle with complete registration and bloodline documentation.

## Licensing

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.


## Features

### Public-Facing Website

- **Home Page**: Beautiful hero section with farm branding and featured livestock
- **Livestock Inventory**: Browse available animals with search and filter capabilities
- **Detailed Animal Profiles**: Complete information including registration, bloodline, health records, pricing
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
