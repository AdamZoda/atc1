-- Create blog_posts table
create table if not exists blog_posts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  content text not null, -- Stores HTML content
  excerpt text, -- Short summary
  cover_image text,
  author_id uuid references auth.users(id) not null,
  is_published boolean default false
);

-- Enable RLS
alter table blog_posts enable row level security;

-- Policies

-- Everyone can read published posts
create policy "Public can view published posts"
  on blog_posts for select
  using ( is_published = true );

-- Admins can view all posts (including drafts)
-- Assuming you check admin status via app metadata or a profiles table query
-- For simplicity here, we'll allow authenticated users to view all if they are the author, 
-- or generic public view. Detailed admin check usually requires a join or claim.
-- Let's stick to: Everyone can see published. Authors can see their own.
create policy "Authors can view own posts"
  on blog_posts for select
  using ( auth.uid() = author_id );

-- Only admins/authors can insert
create policy "Authors can insert posts"
  on blog_posts for insert
  with check ( auth.uid() = author_id );

-- Only admins/authors can update
create policy "Authors can update own posts"
  on blog_posts for update
  using ( auth.uid() = author_id );

-- Only admins/authors can delete
create policy "Authors can delete own posts"
  on blog_posts for delete
  using ( auth.uid() = author_id );
