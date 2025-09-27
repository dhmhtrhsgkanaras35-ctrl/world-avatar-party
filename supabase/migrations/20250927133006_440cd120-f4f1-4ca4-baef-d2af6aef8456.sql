-- Fix existing avatar URLs to use 'standing' pose instead of 'relaxed'
UPDATE profiles 
SET avatar_url = REPLACE(avatar_url, 'pose=relaxed', 'pose=standing'),
    updated_at = now()
WHERE avatar_url LIKE '%pose=relaxed%';