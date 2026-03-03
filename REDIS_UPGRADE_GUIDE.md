# Redis 7 Upgrade & Tuning Guide for Ubuntu 20.04/22.04

This guide provides step-by-step instructions to safely upgrade Redis from 6.0.x to 7.x, secure it, tune it for production performance, and restart your PM2-managed Node.js API (`anicrew-api`).

**⚠️ Prerequisites before you start:**
* Run these commands as `root` or a user with `sudo` privileges.
* Ensure you have the new Redis password ready if you choose to enable `requirepass`. Update your `.env` file (`REDIS_PASSWORD=...`) for the Node API beforehand so it can reconnect immediately after the restart.

---

## 1. Safely Backup Existing Data

Before upgrading, we must force Redis to save the dataset to disk (`dump.rdb`) to ensure no data loss.

```bash
# Force a synchronous save of the dataset to disk
redis-cli save

# Copy the dump file to a safe backup location (usually located in /var/lib/redis)
sudo cp /var/lib/redis/dump.rdb /var/lib/redis/dump.rdb.backup
```

---

## 2. Upgrade to Redis 7

Ubuntu's default repositories often lag behind. We will use the official Redis APT repository.

```bash
# Install prerequisites
sudo apt-get update
sudo apt-get install -y lsb-release curl gpg

# Add the official Redis GPG key
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg

# Add the Redis APT repository
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list

# Update package index and install Redis (this will upgrade the existing installation)
sudo apt-get update
sudo apt-get install -y redis redis-server
```
*(During the upgrade, if prompted whether to keep your existing `redis.conf` or install the package maintainer's version, choose **keep your existing version** (`N`). We will edit it manually.)*

---

## 3. Configure Security & Performance Tuning

We will now edit the Redis configuration file to bind to localhost, set a password, disable dangerous commands, and apply performance tunings.

```bash
# Open the Redis configuration file
sudo nano /etc/redis/redis.conf
```

**Find and modify/add the following lines in `redis.conf`:**

### Security Settings:
```ini
# Bind to localhost only (prevents external access)
bind 127.0.0.1 -::1

# Require a password (uncomment and set a strong password)
requirepass YOUR_STRONG_PASSWORD_HERE

# Disable dangerous commands to prevent accidental or malicious data wipes
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
rename-command CONFIG ""
```

### Production Performance Tuning:
BullMQ (which you are using) relies heavily on Redis memory.

```ini
# Max memory allocation (adjust based on your VPS RAM, e.g., 500mb or 1gb)
maxmemory 500mb

# Eviction policy (Volatile LRU is generally good for queues, but noeviction is safer if you rely on strict job retention)
maxmemory-policy noeviction

# Save configuration (BullMQ doesn't always need heavy persistence, but keep standard saves)
save 900 1
save 300 10
```

### OS-Level Tuning (Crucial for Redis):
Redis will warn you if OS kernel settings are not optimized. Fix them with these commands:

```bash
# 1. Fix overcommit memory warning
echo "vm.overcommit_memory = 1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# 2. Disable Transparent Huge Pages (THP) warning
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled

# Make THP disable persistent across reboots by adding it to crontab or rc.local
# (A quick way is to add the command to the system crontab)
(crontab -l 2>/dev/null; echo "@reboot echo never > /sys/kernel/mm/transparent_hugepage/enabled") | crontab -
```

---

## 4. Restart Services & Verify

Now we restart Redis, ensure it starts on boot, and restart your PM2 application.

```bash
# Enable Redis to start on system boot
sudo systemctl enable redis-server

# Restart Redis to apply the new configuration
sudo systemctl restart redis-server

# Verify Redis version
redis-server -v
# Expected output: Redis server v=7.2.x ...

# Check Redis status to ensure it's running smoothly
sudo systemctl status redis-server
```

**Restart PM2 Node API:**
*Ensure your `.env` file has the new `REDIS_PASSWORD` before doing this.*

```bash
# Restart your specific PM2 process
pm2 restart anicrew-api

# Check PM2 logs to ensure connection is successful ("✅ Redis Connected")
pm2 logs anicrew-api --lines 50
```

---

## 5. Rollback Steps (If Upgrade Fails)

If something breaks catastrophically and you need to revert to Ubuntu's default Redis 6.0.16:

```bash
# 1. Stop the broken Redis
sudo systemctl stop redis-server

# 2. Remove the official Redis repository
sudo rm /etc/apt/sources.list.d/redis.list
sudo apt-get update

# 3. Downgrade/Reinstall default Ubuntu Redis
sudo apt-get install --reinstall redis-server

# 4. Restore your data backup
sudo cp /var/lib/redis/dump.rdb.backup /var/lib/redis/dump.rdb
sudo chown redis:redis /var/lib/redis/dump.rdb

# 5. Restart Redis
sudo systemctl restart redis-server
```

---

## Alternative: Docker-based Setup (Recommended)

If you find managing bare-metal Redis cumbersome, moving to Docker isolates Redis and makes version upgrades trivial.

**Why Docker?**
- Upgrading is as simple as changing `image: redis:6` to `image: redis:7-alpine`.
- Easy port binding and isolated volumes.

**Setup with Docker Compose:**
```yaml
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    container_name: anicrew_redis
    restart: always
    ports:
      - "127.0.0.1:6379:6379"
    command: redis-server --requirepass YOUR_STRONG_PASSWORD_HERE --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```
*(Run with `docker-compose up -d`)*