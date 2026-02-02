-- Create products table
create table if not exists products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  model_name text,
  description text,
  price decimal(10, 2) not null default 0,
  image_url text,
  youtube_url text,
  category text,
  featured boolean default false,
  stock integer default 1,
  on_sale boolean default false,
  sale_price decimal(10, 2),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create categories table
create table if not exists categories (
  id uuid default uuid_generate_v4() primary key,
  name text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table products enable row level security;
alter table categories enable row level security;

-- Create policies for products
-- Allow public read access to products
create policy "Allow public read access" on products
  for select using (true);

-- Allow admins to insert/update/delete products
-- Note: You should replace 'admin' with your actual admin role check if needed, 
-- or ensure the user executing this has admin rights via app logic.
-- Ideally: auth.uid() in (select id from profiles where role = 'admin')
create policy "Allow admin full access" on products
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Create policies for categories
create policy "Allow public read access categories" on categories
  for select using (true);

create policy "Allow admin full access categories" on categories
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
