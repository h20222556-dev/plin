-- ============================================================
-- PLIN App — Supabase SQL Schema
-- Supabase SQL Editor에서 이 전체 내용을 붙여넣고 실행하세요
-- ============================================================

-- ──────────────────────────────────────
-- 1. USERS 테이블 (프로필)
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname    TEXT        NOT NULL DEFAULT '새로운 유저',
  profile_emoji TEXT      NOT NULL DEFAULT '🧑‍🎤',
  bio         TEXT,
  is_public   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ──────────────────────────────────────
-- 2. PERFORMANCES 테이블 (공연 기록)
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.performances (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  concert_name TEXT        NOT NULL,
  artist       TEXT,
  date         DATE        NOT NULL,
  venue        TEXT,
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  weather      TEXT,
  pin_icon     TEXT        DEFAULT 'music',
  memo         TEXT,
  setlist      JSONB       NOT NULL DEFAULT '[]',
  tags         TEXT[]      NOT NULL DEFAULT '{}',
  photos       TEXT[]      NOT NULL DEFAULT '{}',
  is_public    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER performances_updated_at
  BEFORE UPDATE ON public.performances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS performances_user_id_idx ON public.performances(user_id);
CREATE INDEX IF NOT EXISTS performances_date_idx ON public.performances(date DESC);

-- ──────────────────────────────────────
-- 3. POSTS 테이블 (커뮤니티 게시글)
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.posts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  performance_id UUID        REFERENCES public.performances(id) ON DELETE SET NULL,
  content        TEXT        NOT NULL CHECK (char_length(content) <= 500),
  emotion        TEXT,
  tags           TEXT[]      NOT NULL DEFAULT '{}',
  likes_count    INT         NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS posts_user_id_idx ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON public.posts(created_at DESC);

-- ──────────────────────────────────────
-- 4. POST_LIKES 테이블 (게시글 좋아요)
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_likes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  post_id    UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON public.post_likes(post_id);

-- post_likes 변경 시 posts.likes_count 자동 동기화 트리거
CREATE OR REPLACE FUNCTION public.sync_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER post_likes_sync
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_likes_count();

-- ──────────────────────────────────────
-- 5. CHAT_ROOMS 테이블 (1:1 채팅방)
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id  UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_b_id  UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '3 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (
    LEAST(user_a_id::TEXT, user_b_id::TEXT),
    GREATEST(user_a_id::TEXT, user_b_id::TEXT)
  )
);

CREATE INDEX IF NOT EXISTS chat_rooms_user_a_idx ON public.chat_rooms(user_a_id);
CREATE INDEX IF NOT EXISTS chat_rooms_user_b_idx ON public.chat_rooms(user_b_id);
CREATE INDEX IF NOT EXISTS chat_rooms_expires_at_idx ON public.chat_rooms(expires_at);

-- ──────────────────────────────────────
-- 6. CHATS 테이블 (채팅 메시지)
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chats (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID        NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message     TEXT        NOT NULL CHECK (char_length(message) <= 1000),
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chats_room_id_idx ON public.chats(room_id);
CREATE INDEX IF NOT EXISTS chats_created_at_idx ON public.chats(created_at ASC);

-- 메시지 전송 시 채팅방 만료시간을 now()+3일로 자동 갱신 (3일 TTL)
CREATE OR REPLACE FUNCTION public.refresh_chat_room_expiry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.chat_rooms
  SET expires_at = NOW() + INTERVAL '3 days'
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER chats_refresh_expiry
  AFTER INSERT ON public.chats
  FOR EACH ROW EXECUTE FUNCTION public.refresh_chat_room_expiry();

-- ============================================================
-- RLS (Row Level Security) 정책
-- ============================================================

-- ── USERS ──
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select" ON public.users FOR SELECT
  USING (is_public = TRUE OR auth.uid() = id);

CREATE POLICY "users_update" ON public.users FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "users_insert" ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ── PERFORMANCES ──
ALTER TABLE public.performances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "performances_select" ON public.performances FOR SELECT
  USING (is_public = TRUE OR auth.uid() = user_id);

CREATE POLICY "performances_insert" ON public.performances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "performances_update" ON public.performances FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "performances_delete" ON public.performances FOR DELETE
  USING (auth.uid() = user_id);


-- ── POSTS ──
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_select" ON public.posts FOR SELECT USING (TRUE);

CREATE POLICY "posts_insert" ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_update" ON public.posts FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_delete" ON public.posts FOR DELETE
  USING (auth.uid() = user_id);


-- ── POST_LIKES ──
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_likes_select" ON public.post_likes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "post_likes_insert" ON public.post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "post_likes_delete" ON public.post_likes FOR DELETE
  USING (auth.uid() = user_id);


-- ── CHAT_ROOMS ──
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_rooms_select" ON public.chat_rooms FOR SELECT
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE POLICY "chat_rooms_insert" ON public.chat_rooms FOR INSERT
  WITH CHECK (auth.uid() = user_a_id OR auth.uid() = user_b_id);


-- ── CHATS ──
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chats_select" ON public.chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms cr
      WHERE cr.id = room_id
        AND (cr.user_a_id = auth.uid() OR cr.user_b_id = auth.uid())
    )
  );

CREATE POLICY "chats_insert" ON public.chats FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.chat_rooms cr
      WHERE cr.id = room_id
        AND (cr.user_a_id = auth.uid() OR cr.user_b_id = auth.uid())
    )
  );

-- ──────────────────────────────────────
-- 7. COMMENTS 테이블 (게시글 댓글)
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL CHECK (char_length(content) <= 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS comments_post_id_idx ON public.comments(post_id);

-- ── COMMENTS RLS ──
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_select" ON public.comments FOR SELECT USING (TRUE);
CREATE POLICY "comments_insert" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- ──────────────────────────────────────
-- 8. FOLLOWS 테이블 (친구/팔로우)
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.follows (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_id UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON public.follows(following_id);

-- ── FOLLOWS RLS ──
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows_select" ON public.follows FOR SELECT USING (TRUE);
CREATE POLICY "follows_insert" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete" ON public.follows FOR DELETE USING (auth.uid() = follower_id);
