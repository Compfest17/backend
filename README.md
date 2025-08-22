# 🏙️ GATOTKOTA

GatotKota is a web application that serves as a **platform for reporting damaged urban infrastructure**—such as roads, bridges, and public facilities—directly to the authorities.  
In addition, GatotKota also provides a **community discussion forum** where users can share insights, discuss solutions, and collaborate on improving city infrastructure and public services.

---

## 📑 Table of Contents

- [ℹ️ About](#about)
- [👨‍💻 Developers](#developers)
- [📚 Documentation](#documentation)
- [✨ Features](#features)
- [🛠️ Tech Stack](#-tech-stack)
- [🚀 Installation](#-installation)
- [⚙️ Environment Variables](#environment-variables)

---

## ℹ️ About

**GatotKota** is a web-based platform designed to help communities **report damaged urban infrastructure**—such as roads, street lights, bridges, and public facilities—directly to the authorities.  
Beyond reporting, GatotKota also provides an **interactive discussion forum** where citizens can share opinions, suggest improvements, and collaborate to build better urban environments.  

This frontend project is built using **Next.js** and modern web technologies to ensure a responsive, fast, and user-friendly experience.

---

## 👨‍💻 Developers

### 🔧 Back-end
- **M. Danu Seta Wiardana** – Universitas Lampung  
- **Yolanda Belva D.** – Universitas Komputer Indonesia  

### 🎨 Front-end
- **Anak Agung Ngurah Aditya Wirayudha** – Universitas Brawijaya  
- **Alfi Rizqy** – Universitas Indonesia  

---

## 📚 Documentation

### 🗄️ Entity Relationship Diagram (ERD)
![image](https://github.com/user-attachments/assets/122afad0-48f8-4966-bc65-c44382cb591c)

### 📌 Use Case Diagram
![WhatsApp Image 2025-08-22 at 19 17 58_04619e60](https://github.com/user-attachments/assets/ee306962-f54e-49e5-a7c6-309f4e2345d6)

---

## ✨ Features

- 💬 **Forum & Discussions:** Create, manage, and engage in forum posts.  
- 👍 **User Interaction:** Like, comment, and reply to posts in real time.  
- 👤 **Profile Management:** Customize user profiles with personal details and avatars.  
- 📱 **Responsive Design:** Optimized for both desktop and mobile experiences.  
- 🧭 **Smart Navigation:** Clean navigation and filtering system for a seamless user journey.  

---

## 🛠️ Tech Stack

### 🎨 Frontend
- **Framework:** Next.js  
- **Styling:** Tailwind CSS, Framer Motion  
- **Linting & Code Quality:** ESLint  
- **Deployment:** Vercel  

### ⚙️ Backend
- **Runtime:** Node.js  
- **Framework:** Express.js  
- **Database:** Supabase (PostgreSQL)  
- **Authentication & Security:** JSON Web Token (JWT), bcrypt, Role-based System  
- **Deployment:** Railway / Render / Vercel (hybrid)  

---

## 🚀 Installation

To get started with the GatotKota Frontend, follow these steps:

### 1️⃣ Clone the Repository
clone first
```bash
git clone https://github.com/Compfest17/frontend.git
git clone https://github.com/Compfest17/backend.git

```
Install my-project with npm

```bash
npm install my-project
cd my-project
```

Navigate to the Project Directory
```bash
cd ...
```

Install Dependencies
```bash
npm install
```

Start the Development Server
```bash
npm run dev
```
## Environment Variables 

To run this project, you will need to add the following environment variables to your .env file

frontend

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_API_URL=http://localhost:5000

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>

NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_TURNSTILE_ENABLED=false
```

backend

```bash
NODE_ENV=development
PORT=5000

# Supabase Configuration
SUPABASE_URL=https://aswybmohtflmfldvpzmf.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzd3libW9odGZsbWZsZHZwem1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NzcwNDUsImV4cCI6MjA3MDQ1MzA0NX0.uqtlhlOAIje4ap0a3g--EJdmpxoZeEKzeFvGKvZsDcc
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzd3libW9odGZsbWZsZHZwem1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDg3NzA0NSwiZXhwIjoyMDcwNDUzMDQ1fQ.CpWapliHCGWc7-vf9yoB26U7gDBA8DUvL7CABZJZkOY

JWT_SECRET=2K1pC5hTwKglQexq5Pe/t9e81lB1zNneYqaqlB+W1HvaL0v8prbF5NezSCwG45jzwS3mKz2zrnJzytkjgE9akQ==
JWT_EXPIRES_IN=7d

BCRYPT_SALT_ROUNDS=12

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

UPLOAD_MAX_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp,application/pdf

CORS_ORIGIN=http://localhost:3000

# Cloudflare Turnstile Configuration
TURNSTILE_SECRET_KEY=0x4AAAAAABuJvnVHGEyhHa2UeFShfl4O-88
TURNSTILE_ENABLED=false
```

