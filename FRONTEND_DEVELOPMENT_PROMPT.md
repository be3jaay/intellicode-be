# Frontend Development Prompt: User Management System

## Overview
Build a comprehensive user management system for the IntelliCode platform with admin controls for managing students and instructors, including approval workflows and account suspension features.

### 2. User Management APIs (Admin Only)
**Base URL:** `/users`

#### Get All Users with Filtering
**Endpoint:** `GET /users`
**Query Parameters:**
- `role`: 'student' | 'teacher' | 'admin'
- `search`: string (searches name, email, student number)
- `isSuspended`: boolean
- `page`: number (default: 1)
- `limit`: number (default: 10)

**Response:**
```typescript
interface UsersResponse {
  users: UserProfile[];
  total: number;
  page: number;
  limit: number;
}

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  role: 'student' | 'teacher' | 'admin';
  student_number: string | null;
  section: string | null;
  profile_picture: string | null;
  is_suspended: boolean; // NEW
  suspension_reason: string | null; // NEW
  is_approved: boolean; // NEW
  approval_reason: string | null; // NEW
  created_at: string;
  updated_at: string;
}
```

#### Suspend/Unsuspend User
**Endpoint:** `PUT /users/:id/suspend`
**Request Body:**
```typescript
interface SuspendUserRequest {
  isSuspended: boolean;
  reason?: string;
}
```

#### Approve/Reject Instructor
**Endpoint:** `PUT /users/:id/approve`
**Request Body:**
```typescript
interface ApproveInstructorRequest {
  isApproved: boolean;
  reason?: string;
}
```

#### Get Pending Approvals
**Endpoint:** `GET /users/pending-approval`
**Response:** Array of UserProfile objects (teachers awaiting approval)

#### Get Suspended Users
**Endpoint:** `GET /users/suspended`
**Response:** Array of UserProfile objects (suspended users)

## Frontend Components to Build

#### User Management Table
- **Features:**
  - Pagination with page size selector
  - Search bar (searches name, email, student number)
  - Role filter dropdown
  - Suspension status filter
  - Sortable columns
  - Bulk actions (select multiple users)

- **Columns:**
  - Avatar/Profile Picture
  - Name (First Last)
  - Email
  - Role (with badge styling)
  - Student Number (if applicable)
  - Section (if applicable)
  - Status (Active/Suspended/Pending Approval)
  - Created Date
  - Actions (Suspend/Unsuspend, Approve/Reject, Edit, Delete)

#### Pending Approvals Section
- **Features:**
  - List of instructors awaiting approval
  - Quick approve/reject buttons
  - Reason input field
  - Instructor details preview

#### Suspended Users Section
- **Features:**
  - List of all suspended users
  - Suspension reason display
  - Quick unsuspend option
  - Search and filter capabilities

### 3. User Management Modals

#### Suspend User Modal
```typescript
interface SuspendModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: SuspendUserRequest) => void;
}
```
- Toggle switch for suspend/unsuspend
- Text area for reason
- Confirmation dialog

#### Approve Instructor Modal
```typescript
interface ApproveModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ApproveInstructorRequest) => void;
}
```
- Toggle switch for approve/reject
- Text area for reason
- Instructor details preview

### 4. Status Badges and Indicators
Create reusable status badge components:
- **Active** (green)
- **Suspended** (red)
- **Pending Approval** (yellow/orange)
- **Rejected** (gray)

### 5. User Profile Cards
For displaying user information in various contexts:
- Profile picture placeholder
- Name and email
- Role badge
- Status indicators
- Quick action buttons


### Zustand/ Context Structure
```typescript
interface UserManagementState {
  users: {
    list: UserProfile[];
    total: number;
    page: number;
    limit: number;
    loading: boolean;
    error: string | null;
  };
  filters: {
    role: string | null;
    search: string;
    isSuspended: boolean | null;
  };
  pendingApprovals: UserProfile[];
  suspendedUsers: UserProfile[];
  selectedUsers: string[];
}
```

## API Integration Hooks

### Custom Hooks
```typescript
// useUserManagement.ts
export const useUserManagement = () => {
  const getUsers = (filters: UserManagementQuery) => Promise<UsersResponse>;
  const suspendUser = (id: string, data: SuspendUserRequest) => Promise<void>;
  const approveInstructor = (id: string, data: ApproveInstructorRequest) => Promise<void>;
  const getPendingApprovals = () => Promise<UserProfile[]>;
  const getSuspendedUsers = () => Promise<UserProfile[]>;
  const deleteUser = (id: string) => Promise<void>;
};

// useRegistration.ts
export const useRegistration = () => {
  const register = (data: SignupRequest) => Promise<SignupResponse>;
  const isLoading: boolean;
  const error: string | null;
};
```

## UI/UX Requirements

### Design System
- Use consistent color scheme
- Implement proper loading states
- Add skeleton loaders for tables
- Use toast notifications for actions
- Implement proper error handling

### Responsive Design
- Mobile-first approach
- Collapsible table on mobile
- Touch-friendly action buttons
- Responsive modals

### Accessibility
- Proper ARIA labels
- Keyboard navigation
- Screen reader support
- High contrast mode support

## Security Considerations
- All admin endpoints require admin role
- Implement proper permission checks
- Add confirmation dialogs for destructive actions
- Log all admin actions for audit trail

## Testing Requirements
- Unit tests for all components
- Integration tests for API calls
- E2E tests for user workflows
- Accessibility testing

## File Structure Suggestion
```
src/
├── components/
│   ├── admin/
│   │   ├── UserManagementTable.tsx
│   │   ├── PendingApprovals.tsx
│   │   ├── SuspendedUsers.tsx
│   │   ├── SuspendUserModal.tsx
│   │   └── ApproveInstructorModal.tsx
│   ├── auth/
│   │   └── RegistrationForm.tsx (updated)
│   └── common/
│       ├── StatusBadge.tsx
│       ├── UserProfileCard.tsx
│       └── ConfirmationModal.tsx
├── hooks/
│   ├── useUserManagement.ts
│   └── useRegistration.ts
├── types/
│   └── user.ts
└── services/
    └── userApi.ts
```

## Implementation Priority
1. **Phase 1:** Update registration form with user type selection
2. **Phase 2:** Build basic admin user management table
3. **Phase 3:** Implement suspend/unsuspend functionality
4. **Phase 4:** Add instructor approval workflow
5. **Phase 5:** Add advanced filtering and search
6. **Phase 6:** Polish UI/UX and add animations

## Notes
- All admin functionality should be protected by role-based access control
- Implement proper error handling and user feedback
- Consider adding audit logs for admin actions
- Ensure the interface is intuitive for non-technical administrators
