-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

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
  CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT comments_forum_id_fkey FOREIGN KEY (forum_id) REFERENCES public.forums(id),
  CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comments(id)
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
CREATE TABLE public.forum_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  forum_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action USER-DEFINED,
  old_values json,
  new_values json,
  notes text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT forum_history_pkey PRIMARY KEY (id),
  CONSTRAINT forum_history_forum_id_fkey FOREIGN KEY (forum_id) REFERENCES public.forums(id),
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
  CONSTRAINT forum_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id),
  CONSTRAINT forum_tags_forum_id_fkey FOREIGN KEY (forum_id) REFERENCES public.forums(id)
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
  views_count character varying,
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
  CONSTRAINT notifications_forum_id_fkey FOREIGN KEY (forum_id) REFERENCES public.forums(id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  forum_id uuid,
  comment_id uuid,
  type USER-DEFINED,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT reactions_pkey PRIMARY KEY (id),
  CONSTRAINT reactions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id),
  CONSTRAINT reactions_forum_id_fkey FOREIGN KEY (forum_id) REFERENCES public.forums(id),
  CONSTRAINT reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
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
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT users_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.levels(id)
);