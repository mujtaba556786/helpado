# Helpado — Commands Reference

## Start the App

### Backend
```bash
cd backend
npm install        # first time only
node server.js
```
Runs on: http://localhost:3000

### Frontend
```bash
cd frontend/webapp
python3 -m http.server 8080
```
Runs on: http://localhost:8080/index.html

---

## Database

### Backup (run from project root)
```bash
/Applications/MAMP/Library/bin/mysql80/bin/mysqldump \
  -h 127.0.0.1 -P 8889 -u root -proot \
  --single-transaction --routines --triggers --add-drop-table \
  servicelink_db > helphub_backup.sql
```

### Restore on a new machine
```bash
# 1. Create the database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS servicelink_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Import the backup
mysql -u root -p servicelink_db < helphub_backup.sql
```

---

## Environment Setup (backend/.env)
```
DB_HOST=127.0.0.1
DB_PORT=3306        # 8889 if using MAMP
DB_USER=root
DB_PASSWORD=root
DB_NAME=servicelink_db
```

---

## Git
```bash
git checkout -b feat/your-feature   # always branch before editing
git add <files>
git commit -m "feat: description"
git checkout main && git merge feat/your-feature --no-ff
```
