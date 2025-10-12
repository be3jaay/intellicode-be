# Supabase Storage Setup for Course Thumbnails

## 1. Create Storage Bucket in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Configure the bucket:
   - **Name**: `course-thumbnails`
   - **Public**: ✅ **Yes** (so images can be accessed publicly)
   - **File size limit**: 5MB
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp`

## 2. Set Up Bucket Policies

### Public Access Policy (for reading images)
```sql
-- Allow public read access to course thumbnails
CREATE POLICY "Public read access for course thumbnails" ON storage.objects
FOR SELECT USING (bucket_id = 'course-thumbnails');
```

### Authenticated Upload Policy (for teachers)
```sql
-- Allow authenticated users to upload course thumbnails
CREATE POLICY "Authenticated users can upload course thumbnails" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'course-thumbnails' 
  AND auth.role() = 'authenticated'
);
```

### Update Policy (for course updates)
```sql
-- Allow users to update their own course thumbnails
CREATE POLICY "Users can update their own course thumbnails" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'course-thumbnails' 
  AND auth.role() = 'authenticated'
);
```

### Delete Policy (for course deletion)
```sql
-- Allow users to delete their own course thumbnails
CREATE POLICY "Users can delete their own course thumbnails" ON storage.objects
FOR DELETE USING (
  bucket_id = 'course-thumbnails' 
  AND auth.role() = 'authenticated'
);
```

## 3. Environment Variables

Make sure your `.env` file includes:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## 4. API Endpoints

### Create Course with Thumbnail Upload
```
POST /course/with-thumbnail
Content-Type: multipart/form-data

Fields:
- title: string
- description: string  
- category: string
- thumbnail: file (JPEG, PNG, WebP - max 5MB)
```

### Create Course with Thumbnail URL
```
POST /course
Content-Type: application/json

{
  "title": "Course Title",
  "description": "Course Description", 
  "category": "Programming",
  "thumbnail": "https://example.com/image.jpg"
}
```

## 5. File Structure in Storage

Images will be stored in the following structure:
```
course-thumbnails/
└── thumbnails/
    ├── 1703123456789-abc123def456.jpg
    ├── 1703123456790-xyz789uvw012.png
    └── ...
```

## 6. Features

- ✅ **File Validation**: Only JPEG, PNG, WebP images allowed
- ✅ **Size Limit**: Maximum 5MB per file
- ✅ **Unique Naming**: Timestamp + random string to prevent conflicts
- ✅ **Public URLs**: Images are publicly accessible
- ✅ **Error Handling**: Proper error messages for invalid files
- ✅ **Backward Compatibility**: Still supports thumbnail URLs

## 7. Usage Examples

### Frontend Upload (JavaScript)
```javascript
const formData = new FormData();
formData.append('title', 'Advanced JavaScript');
formData.append('description', 'Learn advanced JS concepts');
formData.append('category', 'Programming');
formData.append('thumbnail', fileInput.files[0]);

fetch('/course/with-thumbnail', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### cURL Example
```bash
curl -X POST "http://localhost:3000/course/with-thumbnail" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "title=Advanced JavaScript" \
  -F "description=Learn advanced JS concepts" \
  -F "category=Programming" \
  -F "thumbnail=@/path/to/image.jpg"
```
