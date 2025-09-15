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

https://lovable.dev/projects/b6d78e19-5de2-4407-b047-cb5bac9fb05f
