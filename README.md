# How to install
npm install

# Backend
cd server
npm install
npm run server:dev
# API at http://localhost:4000/api/health

# Frontend
cd ..
npm run dev

npm audit fix --force
npm rm fix

# App at http://localhost:8000

# Database (optional, if/when needed)
docker compose up -d

npx prisma migrate dev
npx prisma generate
npx prisma db seed

# Configure .env with DATABASE_URL if using Prisma later

# Adminer (Local)
localhost:8080
server: db
user: root
password: root
db: rpg
