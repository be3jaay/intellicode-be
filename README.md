# Intellicode Backend

A robust NestJS backend with Supabase authentication and role-based access control (RBAC) for the Intellicode Learning Tool & Personalized Coding Assessment platform.

## 🚀 Features

- **🔐 Passport.js + Supabase Authentication** - JWT-based auth with multiple strategies
- **🎫 Multiple Auth Strategies** - Local, JWT, and extensible to OAuth providers
- **👥 Role-Based Access Control (RBAC)** - Admin, Teacher, and Student roles
- **🛡️ Row-Level Security (RLS)** - Database-level security policies
- **📝 Swagger Documentation** - Interactive API documentation
- **🎯 Global Exception Handling** - Consistent error responses
- **✨ Response Interceptor** - Standardized API responses
- **🔒 Custom Guards & Decorators** - `@Roles()`, `@CurrentUser()`
- **📊 User Management** - Profile CRUD operations with role management
- **🔄 Token Refresh** - Automatic token refresh endpoint
- **🚪 Logout Support** - Secure logout functionality

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account ([Sign up here](https://supabase.com))

## 🛠️ Tech Stack

- **Framework:** NestJS (TypeScript)
- **Authentication:** Passport.js + Supabase Auth
- **Database:** PostgreSQL (Supabase) + Prisma ORM
- **Documentation:** Swagger/OpenAPI
- **Validation:** class-validator
- **Strategies:** JWT, Local (extensible to OAuth)

## 📦 Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd intellicode-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp env.example .env
```

Edit `.env` with your Supabase credentials:

```env
PORT=3000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# CORS Configuration (optional)
CORS_ORIGIN=http://localhost:3001
```

**Where to find your Supabase keys:**
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click on "Settings" → "API"
4. Copy the `URL`, `anon` key, `service_role` key, and `JWT Secret`

### 4. Set Up Database Schema

1. Open your Supabase Dashboard
2. Navigate to "SQL Editor"
3. Copy and paste the contents of `database/schema.sql`
4. Click "Run" to execute

This will create:
- `profiles` table
- Row-Level Security policies
- Database triggers
- Indexes

See `database/README.md` for detailed schema documentation.

### 5. Create Your First Admin User

**Option A: Via API**
```bash
# Start the server first
npm run start:dev

# Sign up
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!",
    "fullName": "Admin User"
  }'
```

**Option B: Upgrade existing user to admin**
```sql
-- Run this in Supabase SQL Editor
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@example.com';
```

## 🏃 Running the Application

### Development Mode
```bash
npm run start:dev
```

### Production Mode
```bash
npm run build
npm run start:prod
```

### Access Points
- **API:** http://localhost:3000
- **Swagger Docs:** http://localhost:3000/api/docs

## 📚 API Documentation

### Authentication Endpoints

#### POST `/auth/signup`
Register a new user (default role: student)

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "Password123!",
  "fullName": "John Doe",
  "studentNumber": "2021-00001",
  "section": "BSCS 3A"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": "uuid",
      "email": "john.doe@example.com",
      "role": "student",
      "fullName": "John Doe"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### POST `/auth/login`
Authenticate user

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "Password123!"
}
```

#### POST `/auth/login/local`
Authenticate user with Passport Local Strategy (alternative login)

#### GET `/auth/me`
Get current user information (requires authentication)

**Headers:**
```
Authorization: Bearer <access_token>
```

#### POST `/auth/refresh`
Refresh expired access token

**Request Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

#### POST `/auth/logout`
Logout current user (requires authentication)

### User Management Endpoints

#### GET `/users`
Get all users (Admin & Teacher only)

#### GET `/users/by-role?role=student`
Get users by role (Admin & Teacher only)

#### GET `/users/:id`
Get user by ID (All authenticated users)

#### PUT `/users/:id`
Update user profile
- Students can only update their own profile
- Teachers and admins can update any profile

**Request Body:**
```json
{
  "fullName": "John Updated",
  "studentNumber": "2021-00001",
  "section": "BSCS 4A",
  "profilePicture": "https://example.com/avatar.jpg"
}
```

#### PUT `/users/:id/role`
Update user role (Admin only)

**Request Body:**
```json
{
  "role": "teacher"
}
```

#### DELETE `/users/:id`
Delete user (Admin only)

## 🔐 Role-Based Access Control

### Role Hierarchy

| Role | Description | Access Level |
|------|-------------|--------------|
| `admin` | System administrator | Full access to all endpoints |
| `teacher` | Course instructor | Can view all users, manage content |
| `student` | Student user | Can only view/edit own profile |

### Using Guards & Decorators

```typescript
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('example')
export class ExampleController {
  // Admin-only endpoint
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin-only')
  async adminOnly() {
    return { message: 'Admin access granted' };
  }

  // Multiple roles
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('teachers-and-admins')
  async teachersAndAdmins() {
    return { message: 'Teacher or Admin access' };
  }

  // Get current user
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@CurrentUser() user: RequestUser) {
    return user;
  }
}
```

> **Note:** See `src/auth/README.md` for detailed authentication documentation and `PASSPORT_MIGRATION_GUIDE.md` for migration details.

## 🏗️ Project Structure

```
intellicode-backend/
├── database/
│   ├── schema.sql              # Database schema
│   └── README.md               # Database documentation
├── src/
│   ├── auth/
│   │   ├── dto/                # Data Transfer Objects
│   │   ├── guards/             # Auth guards (JWT, Local)
│   │   ├── strategies/         # Passport strategies
│   │   ├── interfaces/         # TypeScript interfaces
│   │   ├── auth.controller.ts  # Auth endpoints
│   │   ├── auth.service.ts     # Auth business logic
│   │   ├── auth.module.ts      # Auth module
│   │   └── README.md           # Auth documentation
│   ├── users/
│   │   ├── dto/                # User DTOs
│   │   ├── users.controller.ts # User endpoints
│   │   ├── users.service.ts    # User business logic
│   │   └── users.module.ts     # User module
│   ├── supabase/
│   │   ├── supabase.service.ts # Supabase client
│   │   └── supabase.module.ts  # Supabase module
│   ├── common/
│   │   ├── decorators/         # Custom decorators
│   │   ├── guards/             # Common guards
│   │   ├── filters/            # Exception filters
│   │   └── interceptors/       # Response interceptors
│   ├── app.module.ts           # Root module
│   └── main.ts                 # Application entry point
├── .env.example                # Environment template
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
└── README.md                   # This file
```

## 🧪 Testing the API

### Using cURL

**Sign up:**
```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "fullName": "Test User"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

**Get current user:**
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer <your_access_token>"
```

### Using Swagger UI

1. Start the server: `npm run start:dev`
2. Open browser: http://localhost:3000/api/docs
3. Click "Authorize" and enter your JWT token
4. Test endpoints interactively

## 🔗 Next.js Frontend Integration

### Example: Authentication Hook

```typescript
// hooks/useAuth.ts
import { useState } from 'react';

const API_URL = 'http://localhost:3000';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const signup = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      });
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('accessToken', data.data.accessToken);
        setUser(data.data.user);
      }
      return data;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('accessToken', data.data.accessToken);
        setUser(data.data.user);
      }
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  return { user, loading, signup, login, logout };
}
```

### Example: Protected API Call

```typescript
// utils/api.ts
const API_URL = 'http://localhost:3000';

export async function apiCall(endpoint: string, options = {}) {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  const data = await response.json();
  return data;
}

// Usage
const userProfile = await apiCall('/auth/me');
const allUsers = await apiCall('/users');
```

## 🚨 Error Handling

All API responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "statusCode": 401,
  "error": "UnauthorizedError",
  "message": "Invalid or expired token",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/auth/me"
}
```

## 🔒 Security Best Practices

1. **Never commit `.env` file** - Use `.env.example` as template
2. **Use strong passwords** - Minimum 6 characters (increase in production)
3. **Rotate JWT secrets** - Change Supabase keys periodically
4. **Enable CORS selectively** - Set specific origins in production
5. **Use HTTPS** - Always use HTTPS in production
6. **Rate limiting** - Consider adding rate limiting middleware
7. **Input validation** - All DTOs use class-validator

## 📝 Common Issues & Solutions

### Issue: "Supabase URL and Service Role Key must be provided"
**Solution:** Check your `.env` file and ensure all Supabase credentials are set correctly.

### Issue: "User profile not found" after signup
**Solution:** Verify the database trigger is working. Run the schema.sql again.

### Issue: "Access denied" errors
**Solution:** Check that:
1. You're sending the correct JWT token
2. Your user has the required role
3. RLS policies are properly configured

### Issue: CORS errors from frontend
**Solution:** Update `CORS_ORIGIN` in `.env` or modify the CORS config in `main.ts`.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [Swagger](https://swagger.io/) - API documentation

## 📞 Support

For support and questions:
- Open an issue on GitHub
- Check the [NestJS Documentation](https://docs.nestjs.com/)
- Review [Supabase Docs](https://supabase.com/docs)

---

**Built with ❤️ for the Intellicode Learning Platform**
