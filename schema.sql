-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.bookmarks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  forum_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT bookmarks_pkey PRIMARY KEY (id),
  CONSTRAINT bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT bookmarks_forum_id_fkey FOREIGN KEY (forum_id) REFERENCES public.forums(id)
);
CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  forum_id uuid NOT NULL,
  user_id uuid NOT NULL,
  parent_id uuid,
  content text NOT NULL,
  is_anonymous boolean DEFAULT false,
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  reaction USER-DEFINED,
  status USER-DEFINED DEFAULT 'active'::comment_status,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  deleted_at timestamp without time zone,
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comments(id),
  CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT comments_forum_id_fkey FOREIGN KEY (forum_id) REFERENCES public.forums(id)
);
CREATE TABLE public.contact_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name character varying NOT NULL,
  email character varying NOT NULL,
  phone character varying,
  message text NOT NULL,
  status character varying DEFAULT 'unread'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contact_messages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.employee_verification_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code character varying NOT NULL UNIQUE,
  province character varying NOT NULL,
  city character varying,
  expires_at timestamp with time zone NOT NULL,
  expiry_hours integer DEFAULT 24,
  is_used boolean DEFAULT false,
  created_by uuid,
  used_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  used_at timestamp with time zone,
  notes text,
  max_uses integer,
  current_uses integer DEFAULT 0,
  CONSTRAINT employee_verification_codes_pkey PRIMARY KEY (id),
  CONSTRAINT employee_verification_codes_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.users(id),
  CONSTRAINT employee_verification_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.forum_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title character varying NOT NULL,
  description text NOT NULL,
  address character varying NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  priority character varying NOT NULL,
  status character varying NOT NULL,
  incident_date date NOT NULL,
  created_at timestamp without time zone NOT NULL,
  updated_at timestamp without time zone NOT NULL,
  CONSTRAINT forum_history_pkey PRIMARY KEY (id),
  CONSTRAINT forum_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.forum_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  forum_id uuid NOT NULL,
  file_url character varying NOT NULL,
  file_type character varying NOT NULL,
  file_name character varying NOT NULL,
  file_size integer,
  is_primary boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT forum_media_pkey PRIMARY KEY (id),
  CONSTRAINT forum_media_forum_id_fkey FOREIGN KEY (forum_id) REFERENCES public.forums(id)
);
CREATE TABLE public.forum_tags (
  forum_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  CONSTRAINT forum_tags_pkey PRIMARY KEY (forum_id, tag_id),
  CONSTRAINT forum_tags_forum_id_fkey FOREIGN KEY (forum_id) REFERENCES public.forums(id),
  CONSTRAINT forum_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id)
);
CREATE TABLE public.forums (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  title character varying NOT NULL,
  description text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  address character varying NOT NULL,
  status USER-DEFINED DEFAULT 'open'::forum_status,
  priority USER-DEFINED DEFAULT 'medium'::forum_priority,
  is_anonymous boolean DEFAULT false,
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  deleted_at timestamp without time zone,
  incident_date date NOT NULL DEFAULT CURRENT_DATE,
  views_count integer DEFAULT 0,
  in_progress_at timestamp without time zone,
  resolved_at timestamp without time zone,
  closed_at timestamp without time zone,
  CONSTRAINT forums_pkey PRIMARY KEY (id),
  CONSTRAINT forums_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.levels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  points integer NOT NULL,
  description text,
  icon_url character varying,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT levels_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  forum_id uuid,
  title character varying NOT NULL,
  message text NOT NULL,
  type USER-DEFINED,
  is_read boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  read_at timestamp without time zone,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT notifications_forum_id_fkey FOREIGN KEY (forum_id) REFERENCES public.forums(id)
);
CREATE TABLE public.point_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_type character varying NOT NULL,
  event_condition character varying,
  points integer NOT NULL,
  description text NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT point_rules_pkey PRIMARY KEY (id),
  CONSTRAINT point_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.point_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points integer NOT NULL,
  event_type character varying NOT NULL,
  event_condition character varying,
  related_forum_id uuid,
  related_comment_id uuid,
  related_reaction_id uuid,
  description text NOT NULL,
  awarded_by uuid,
  rule_id uuid,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT point_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT point_transactions_awarded_by_fkey FOREIGN KEY (awarded_by) REFERENCES public.users(id),
  CONSTRAINT point_transactions_related_comment_id_fkey FOREIGN KEY (related_comment_id) REFERENCES public.comments(id),
  CONSTRAINT point_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT point_transactions_related_forum_id_fkey FOREIGN KEY (related_forum_id) REFERENCES public.forums(id),
  CONSTRAINT point_transactions_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.point_rules(id)
);
CREATE TABLE public.roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  description text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  slug character varying NOT NULL UNIQUE,
  description text,
  usage_count integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT tags_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL UNIQUE,
  username character varying UNIQUE,
  password character varying,
  full_name character varying,
  phone character varying,
  role_id uuid NOT NULL,
  avatar_url character varying,
  level_id uuid NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  deleted_at timestamp without time zone,
  assigned_province character varying,
  assigned_city character varying,
  coverage_coordinates jsonb,
  current_points integer DEFAULT 0,
  banner_url character varying,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT users_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.levels(id)
);
