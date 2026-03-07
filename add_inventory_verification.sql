-- Add verification columns to user_inventory
ALTER TABLE public.user_inventory 
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Policy to allow admins to update these columns
CREATE POLICY "Admins can verify inventory items" ON public.user_inventory
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
