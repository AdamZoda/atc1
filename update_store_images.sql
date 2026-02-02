-- Add images column to products table
alter table products 
add column if not exists images text[] default array[]::text[];

-- Migrate existing image_url data to the new images array
update products 
set images = array_append(images, image_url) 
where image_url is not null 
  and image_url != '' 
  and (images is null or cardinality(images) = 0);

-- Optional: You can drop image_url later, but keeping it for now is safer for backward compatibility.
-- The application logic will prefer 'images' array over 'image_url'.
