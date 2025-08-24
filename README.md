# How to install
docker compose down -v
docker compose up -d
npx prisma generate
npx prisma migrate dev --name init
npm run seed

# How to run
docker compose up -d
npm run dev

# Links
http://localhost:3000
http://localhost:3000/api/characters