# Implementation Complete: Assignment Time-Limit Auto-Submission

## 🎯 Summary

You now have a complete **backend-driven auto-submission system** for timed assignments. When a student's time limit expires, the system automatically submits an empty assignment within 30 seconds, even if they closed the browser or lost connection.

## 📦 What You Get

### ✅ Backend Features
- **Auto-submit job** runs every 30 seconds and auto-submits expired sessions
- **Session tracking** records when students start assignments
- **Resume capability** allows students to pick up where they left off if they refresh
- **Audit trail** marks auto-submissions vs manual submissions
- **Automatic cleanup** removes old session records after 7 days

### ✅ API Endpoints
1. **POST** `/course/assignments/{assignmentId}/session/start`
   - Frontend calls when student clicks "Start Assignment"
   - Returns: session info with expiration time
   - Auth: JWT required

2. **GET** `/course/assignments/{assignmentId}/session`
   - Frontend calls on page refresh or app resume
   - Returns: current active session or null
   - Auth: JWT required

### ✅ Database Schema
- New `AssignmentSession` table with 1-to-1 mapping per student per assignment
- `AssignmentSubmission` table enhanced with `auto_submitted` boolean flag
- Properly indexed for performance

### ✅ Documentation
- `IMPLEMENTATION_GUIDE.md` - Complete technical reference
- `AUTO_SUBMIT_README.md` - Quick start and summary

## 🔧 Files Changed (7 Total)

### New Files (3)
1. `src/modules/course/assignment-session.service.ts` - Core service with cron jobs
2. `prisma/migrations/add_assignment_sessions/migration.sql` - Database migration
3. Documentation files (2) - Integration guides

### Modified Files (4)
1. `prisma/schema.prisma` - Added models and relations
2. `src/modules/course/course.controller.ts` - Added 2 endpoints
3. `src/modules/course/course.module.ts` - Registered service
4. `src/modules/course/assignment.service.ts` - Updated submission creation
5. `src/app.module.ts` - Enabled ScheduleModule

## 🚀 Deployment Steps

### Step 1: Database Migration
```bash
# Regenerate Prisma client with new types
npm run prisma:generate

# Apply migration to your database
npm run prisma:migrate  # (development)
# OR
npm run prisma:deploy   # (production)
```

### Step 2: Start Backend
```bash
npm run dev
# OR
npm run start:prod
```

Check logs for:
```
[AssignmentSession] Running expired session check...
```
This confirms the cron job is active.

### Step 3: Update Frontend

Frontend needs to:
1. Call `POST /course/assignments/{id}/session/start` when assignment begins
2. Call `GET /course/assignments/{id}/session` on page refresh
3. Use the returned `expires_at` to calculate countdown
4. Call existing `submitAssignment` when student submits or time expires

**Example:**
```javascript
// Start assignment
const session = await startAssignmentSession(assignmentId);
startCountdown(session.expires_at);

// On page refresh
const session = await getAssignmentSession(assignmentId);
if (session) {
  startCountdown(session.expires_at);
}

// When submitting (manual or timeout)
await submitAssignment(answers);
```

## ⚙️ Configuration

### Auto-Submit Timing
- **Frequency:** Every 30 seconds (configurable in `AssignmentSessionService.processExpiredSessions()`)
- **Cleanup:** Daily at midnight for sessions older than 7 days

### No Additional Dependencies Required
✅ All necessary packages already in `package.json`:
- `@nestjs/schedule` ← enables cron jobs
- `@nestjs/common` ← for services
- Prisma ← already used

## 📊 How It Works

```
User Flow:
┌─────────────────────────────────────────────────┐
│ Student clicks "Start Assignment"               │
└────────────────┬────────────────────────────────┘
                 │
                 v
         ┌──────────────────┐
         │ POST /session    │  ← Frontend
         │ /start           │
         └────────┬─────────┘
                  │
                  v
         ┌──────────────────────────────┐
         │ Create session record        │
         │ expires_at = now + timeLimit │  ← Backend
         │ Return to frontend           │
         └────────┬─────────────────────┘
                  │
                  v
         ┌──────────────────┐
         │ Frontend starts  │
         │ countdown using  │  ← Frontend
         │ expires_at       │
         └────────┬─────────┘
                  │
         ┌────────┴────────────────────────┐
         │                                 │
         v                                 v
    Student submits              Time expires
    (manual)                      (no submit)
         │                             │
         v                             v
    Regular submit              Cron job runs
    endpoint called             (every 30 sec)
         │                             │
         v                             v
    submission created           Auto-submit
    auto_submitted=false         empty submission
                                 auto_submitted=true
```

## 🔒 Security & Safety

✓ **Time tamper-proof** - calculated server-side
✓ **Enrollment check** - validates student enrolled in course
✓ **Authentication** - JWT required for all endpoints
✓ **Idempotent** - unique constraint prevents duplicate sessions
✓ **Non-blocking** - cron job doesn't affect API performance
✓ **Graceful** - if student submits before timeout, handled correctly

## 📈 What Gets Logged

All auto-submit actions are logged with `[AssignmentSession]` prefix:

```
[AssignmentSession] Running expired session check...
[AssignmentSession] Found 3 expired sessions
[AssignmentSession] Auto-submitted empty submission {uuid} for student {uuid} on assignment {uuid}
[AssignmentSession] Cleaned up 15 old sessions
```

Monitor these logs in production to verify the system is working.

## ❓ Quick FAQs

**Q: What if student closes browser?**
A: Session stays in DB. When time expires, cron job auto-submits empty submission.

**Q: What if student refreshes page?**
A: Existing session found, frontend resumes countdown using `expires_at`.

**Q: What if student submits just before timeout?**
A: Submission succeeds with `auto_submitted=false`. Session still marked as processed.

**Q: Can student manipulate the time limit?**
A: No. Expiration time calculated server-side. Frontend just displays countdown.

**Q: What if server is down during expiry?**
A: When server restarts, cron job catches up and processes all expired sessions.

**Q: Can there be duplicate sessions?**
A: No. Unique constraint on `(assignment_id, student_id)`.

## 🧪 Test It

### Quick Test (5-minute assignment)
1. Create assignment with 5-minute time limit
2. As student, call: `POST /course/assignments/{id}/session/start`
3. Get session back with expiration time
4. Wait 5+ minutes or adjust server time
5. Check database - `assignment_submissions` should have a new row with:
   - `auto_submitted = true`
   - `score = 0`
   - `status = 'submitted'`

### Verify Cron Job
Watch server logs - should see every 30 seconds:
```
[AssignmentSession] Running expired session check...
```

## 📞 Support

**If auto-submit isn't working:**
1. Check logs for `[AssignmentSession]` messages
2. Verify `@nestjs/schedule` is imported in AppModule ✓ (done)
3. Verify migration was applied: `SELECT * FROM assignment_sessions`
4. Check if `time_limit` is set on the assignment in database

**If Prisma errors:**
```bash
npm run prisma:generate
npm run build
```

**If cron doesn't start:**
Restart server with `npm run dev`

## ✨ What's Next

1. ✅ Database schema updated
2. ✅ Backend service implemented
3. ✅ API endpoints created
4. ✅ Scheduler enabled
5. → **Update frontend** (main remaining task)
6. → Test with real time limits
7. → Monitor logs in production

---

**🎉 You're ready to deploy!** The backend is fully implemented and ready for integration with your frontend.

See `AUTO_SUBMIT_README.md` for quick start and `IMPLEMENTATION_GUIDE.md` for detailed reference.
