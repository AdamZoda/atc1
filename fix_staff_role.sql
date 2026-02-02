-- Ensure 'staff' is a valid role in the profiles table
DO $$ 
BEGIN
    -- Check if it's a check constraint
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'profiles_role_check'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
        ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'staff', 'user'));
    END IF;

    -- Also check for enum type if it exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        BEGIN
            ALTER TYPE user_role ADD VALUE 'staff';
        EXCEPTION WHEN OTHERS THEN
            -- already exists
        END;
    END IF;
END $$;
