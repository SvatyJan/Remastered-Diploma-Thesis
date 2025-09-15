# How to install
npm install

# Backend
cd server
npm install
npm run dev
# API at http://localhost:4000/api/health

# Frontend
cd ..
npm run dev
# App at http://localhost:8000

# Database (optional, if/when needed)
docker compose up -d
# Configure .env with DATABASE_URL if using Prisma later
