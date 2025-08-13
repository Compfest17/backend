-- Function untuk sync auth.users ke public.users
CREATE OR REPLACE FUNCTION sync_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id UUID;
  default_level_id UUID;
BEGIN
  -- Get default role (user)
  SELECT id INTO default_role_id 
  FROM public.roles 
  WHERE name = 'user' 
  LIMIT 1;

  -- Get default level (Level Gundala - level terendah)
  SELECT id INTO default_level_id 
  FROM public.levels 
  WHERE name = 'Level Gundala'
  LIMIT 1;

  -- Create default roles if not exist
  IF default_role_id IS NULL THEN
    -- Insert all roles
    INSERT INTO public.roles (id, name, description) VALUES
      (gen_random_uuid(), 'user', 'Regular user - pengguna biasa'),
      (gen_random_uuid(), 'karyawan', 'Employee - karyawan perusahaan'),
      (gen_random_uuid(), 'admin', 'Administrator - admin sistem');
    
    -- Get the user role ID
    SELECT id INTO default_role_id 
    FROM public.roles 
    WHERE name = 'user' 
    LIMIT 1;
  END IF;

  -- Create default levels if not exist
  IF default_level_id IS NULL THEN
    -- Insert all levels with points hierarchy
    INSERT INTO public.levels (id, name, points, description) VALUES
      (gen_random_uuid(), 'Level Gundala', 0, 'Level pemula - Gundala'),
      (gen_random_uuid(), 'Level GatotKaca', 100, 'Level menengah - GatotKaca'),
      (gen_random_uuid(), 'Level SriAsih', 250, 'Level mahir - SriAsih'),
      (gen_random_uuid(), 'Level Godam', 500, 'Level expert - Godam'),
      (gen_random_uuid(), 'Level Aquanus', 1000, 'Level master - Aquanus');
    
    -- Get the default level ID (Level Gundala)
    SELECT id INTO default_level_id 
    FROM public.levels 
    WHERE name = 'Level Gundala'
    LIMIT 1;
  END IF;

  -- Insert or update user in public.users
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.users (
      id,
      email,
      full_name,
      role_id,
      level_id,
      avatar_url,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      default_role_id,
      default_level_id,
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.created_at,
      NEW.updated_at
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.users SET
      email = NEW.email,
      full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
      avatar_url = NEW.raw_user_meta_data->>'avatar_url',
      updated_at = NEW.updated_at
    WHERE id = NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.users SET
      deleted_at = NOW()
    WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OR DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_auth_user();

-- Function untuk sync existing users (run once)
CREATE OR REPLACE FUNCTION sync_existing_auth_users()
RETURNS void AS $$
DECLARE
  auth_user RECORD;
  default_role_id UUID;
  default_level_id UUID;
BEGIN
  -- Get default role and level
  SELECT id INTO default_role_id FROM public.roles WHERE name = 'user' LIMIT 1;
  SELECT id INTO default_level_id FROM public.levels WHERE name = 'Level Gundala' LIMIT 1;

  -- Create defaults if not exist
  IF default_role_id IS NULL THEN
    -- Insert all roles
    INSERT INTO public.roles (id, name, description) VALUES
      (gen_random_uuid(), 'user', 'Regular user - pengguna biasa'),
      (gen_random_uuid(), 'karyawan', 'Employee - karyawan perusahaan'),
      (gen_random_uuid(), 'admin', 'Administrator - admin sistem');
    
    SELECT id INTO default_role_id FROM public.roles WHERE name = 'user' LIMIT 1;
  END IF;

  IF default_level_id IS NULL THEN
    -- Insert all levels with points hierarchy
    INSERT INTO public.levels (id, name, points, description) VALUES
      (gen_random_uuid(), 'Level Gundala', 0, 'Level pemula - Gundala'),
      (gen_random_uuid(), 'Level GatotKaca', 100, 'Level menengah - GatotKaca'),
      (gen_random_uuid(), 'Level SriAsih', 250, 'Level mahir - SriAsih'),
      (gen_random_uuid(), 'Level Godam', 500, 'Level expert - Godam'),
      (gen_random_uuid(), 'Level Aquanus', 1000, 'Level master - Aquanus');
    
    SELECT id INTO default_level_id FROM public.levels WHERE name = 'Level Gundala' LIMIT 1;
  END IF;

  -- Sync existing auth users
  FOR auth_user IN 
    SELECT * FROM auth.users WHERE id NOT IN (SELECT id FROM public.users WHERE deleted_at IS NULL)
  LOOP
    INSERT INTO public.users (
      id, email, full_name, role_id, level_id, avatar_url, created_at, updated_at
    ) VALUES (
      auth_user.id,
      auth_user.email,
      COALESCE(auth_user.raw_user_meta_data->>'full_name', auth_user.email),
      default_role_id,
      default_level_id,
      auth_user.raw_user_meta_data->>'avatar_url',
      auth_user.created_at,
      auth_user.updated_at
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
