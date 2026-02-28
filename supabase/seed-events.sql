-- ── EVENTS TABLE ────────────────────────────────────────────────────────────
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS events (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT        NOT NULL,
  description TEXT,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ NOT NULL,
  all_day     BOOLEAN     DEFAULT false,
  location    TEXT,
  members     TEXT[]      DEFAULT '{}',   -- 'mum', 'dad', 'isabel', 'james'
  colour      TEXT,                       -- optional override hex
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (open policy until auth is added)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON events FOR ALL USING (true) WITH CHECK (true);

-- ── SEED DATA ───────────────────────────────────────────────────────────────
-- Events spread across the week of Mar 1 2026 (NZDT = UTC+13)
-- Today is Sunday March 1, 2026

INSERT INTO events (title, description, start_time, end_time, location, members, colour) VALUES

-- Mon Feb 23
('School Drop-off',
 'Drop Isabel and James at Sacred Heart Primary',
 '2026-02-23 08:30:00+13', '2026-02-23 08:45:00+13',
 'Sacred Heart Primary School, Khandallah',
 ARRAY['dad', 'isabel', 'james'], '#34D399'),

-- Wed Feb 25
('James Football Training',
 'Weekly after-school training at Newlands Park',
 '2026-02-25 16:30:00+13', '2026-02-25 17:30:00+13',
 'Newlands Park',
 ARRAY['dad', 'james'], '#FBBF24'),

-- Thu Feb 26
('Mum Hair Appointment',
 'Cut and colour at The Salon',
 '2026-02-26 10:00:00+13', '2026-02-26 11:30:00+13',
 'Wellington CBD',
 ARRAY['mum'], '#6C8EFF'),

('Isabel Gymnastics',
 'Term 1 gymnastics class',
 '2026-02-26 16:00:00+13', '2026-02-26 17:00:00+13',
 'Wellington Gymnastics Centre',
 ARRAY['mum', 'isabel'], '#F472B6'),

-- Fri Feb 28
('Family Movie Night',
 'Pizza and a movie at home — everyone picks a movie segment!',
 '2026-02-28 19:00:00+13', '2026-02-28 21:00:00+13',
 'Home',
 ARRAY['mum', 'dad', 'isabel', 'james'], NULL),

-- Sun Mar 1 (today)
('Wellington Farmers Market',
 'Weekly shop for fresh produce and treats',
 '2026-03-01 09:00:00+13', '2026-03-01 11:00:00+13',
 'Newtown Park, Wellington',
 ARRAY['mum', 'dad'], '#34D399'),

('Isabel Swimming Lessons',
 'Term 1 swimming at Freyberg Pool',
 '2026-03-01 14:00:00+13', '2026-03-01 15:00:00+13',
 'Freyberg Pool, Oriental Bay',
 ARRAY['mum', 'isabel'], '#F472B6'),

-- Wed Mar 4
('James Football Game',
 'Under 7s home game — bring snacks!',
 '2026-03-04 10:00:00+13', '2026-03-04 11:30:00+13',
 'Newlands Park',
 ARRAY['dad', 'james'], '#FBBF24'),

-- Thu Mar 5
('School Dental Checkup',
 'Isabel and James dental van at school',
 '2026-03-05 09:30:00+13', '2026-03-05 10:30:00+13',
 'Sacred Heart Primary School',
 ARRAY['isabel', 'james'], '#F472B6'),

-- Fri Mar 6
('Family Dinner Out',
 'Friday treat — booking at 6pm',
 '2026-03-06 18:00:00+13', '2026-03-06 20:00:00+13',
 'Ortega Fish Shack, Wellington',
 ARRAY['mum', 'dad', 'isabel', 'james'], '#6C8EFF');
