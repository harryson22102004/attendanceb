/*
# Create Smart Attendance System data model

1. New Tables
- `students`: enrolled learners, class sections, guardian contact, and recognition profile metadata.
- `attendance`: one daily attendance record per student with first-seen time and status.

2. Constraints and indexes
- A unique constraint on (`student_id`, `date`) guarantees one attendance record per student per day.
- Indexes support daily class reports and recent activity views.

3. Security
- Row Level Security is enabled on both tables.
- This is a shared, no-sign-in school dashboard, so anon and authenticated roles receive CRUD access.

4. Starter data
- Adds a small set of realistic demo students and attendance records for the current school day so the dashboard is useful immediately.
*/

CREATE TABLE IF NOT EXISTS public.students (
  student_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  class_section text NOT NULL,
  guardian_whatsapp_number text,
  face_embedding_ref text,
  enrolled_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance (
  attendance_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  time_in timestamptz,
  status text NOT NULL DEFAULT 'Present' CHECK (status IN ('Present', 'Late', 'Absent')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, date)
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shared dashboard can read students" ON public.students;
CREATE POLICY "Shared dashboard can read students" ON public.students FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Shared dashboard can add students" ON public.students;
CREATE POLICY "Shared dashboard can add students" ON public.students FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Shared dashboard can update students" ON public.students;
CREATE POLICY "Shared dashboard can update students" ON public.students FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Shared dashboard can remove students" ON public.students;
CREATE POLICY "Shared dashboard can remove students" ON public.students FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Shared dashboard can read attendance" ON public.attendance;
CREATE POLICY "Shared dashboard can read attendance" ON public.attendance FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Shared dashboard can add attendance" ON public.attendance;
CREATE POLICY "Shared dashboard can add attendance" ON public.attendance FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Shared dashboard can update attendance" ON public.attendance;
CREATE POLICY "Shared dashboard can update attendance" ON public.attendance FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Shared dashboard can remove attendance" ON public.attendance;
CREATE POLICY "Shared dashboard can remove attendance" ON public.attendance FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS students_class_section_idx ON public.students(class_section);
CREATE INDEX IF NOT EXISTS attendance_date_idx ON public.attendance(date);
CREATE INDEX IF NOT EXISTS attendance_student_date_idx ON public.attendance(student_id, date);

INSERT INTO public.students (name, class_section, guardian_whatsapp_number, face_embedding_ref, enrolled_date)
SELECT name, class_section, guardian_whatsapp_number, face_embedding_ref, enrolled_date::date
FROM (VALUES
  ('Aarav Sharma', '10-A', '+91 98765 43210', 'embedding_aarav', '2025-06-12'),
  ('Isha Mehta', '10-A', '+91 98765 43211', 'embedding_isha', '2025-06-12'),
  ('Rohan Verma', '10-A', '+91 98765 43212', 'embedding_rohan', '2025-06-13'),
  ('Ananya Singh', '10-A', '+91 98765 43213', 'embedding_ananya', '2025-06-14'),
  ('Kabir Patel', '10-B', '+91 98765 43214', 'embedding_kabir', '2025-06-15'),
  ('Diya Nair', '10-B', '+91 98765 43215', 'embedding_diya', '2025-06-16'),
  ('Vihaan Kapoor', '10-B', '+91 98765 43216', 'embedding_vihaan', '2025-06-17'),
  ('Meera Joshi', '10-C', '+91 98765 43217', 'embedding_meera', '2025-06-18'),
  ('Aditya Rao', '10-C', '+91 98765 43218', 'embedding_aditya', '2025-06-18'),
  ('Sara Khan', '10-C', '+91 98765 43219', 'embedding_sara', '2025-06-19')
) AS seed(name, class_section, guardian_whatsapp_number, face_embedding_ref, enrolled_date)
WHERE NOT EXISTS (SELECT 1 FROM public.students);

INSERT INTO public.attendance (student_id, date, time_in, status)
SELECT s.student_id, CURRENT_DATE,
  CASE s.name
    WHEN 'Aarav Sharma' THEN CURRENT_DATE + time '08:04'
    WHEN 'Isha Mehta' THEN CURRENT_DATE + time '08:07'
    WHEN 'Rohan Verma' THEN CURRENT_DATE + time '08:31'
    WHEN 'Ananya Singh' THEN CURRENT_DATE + time '08:12'
    WHEN 'Kabir Patel' THEN CURRENT_DATE + time '08:02'
    WHEN 'Diya Nair' THEN CURRENT_DATE + time '08:18'
    WHEN 'Vihaan Kapoor' THEN CURRENT_DATE + time '08:09'
    WHEN 'Meera Joshi' THEN CURRENT_DATE + time '08:03'
    ELSE NULL
  END,
  CASE WHEN s.name IN ('Rohan Verma', 'Diya Nair') THEN 'Late' ELSE 'Present' END
FROM public.students s
WHERE NOT EXISTS (SELECT 1 FROM public.attendance WHERE date = CURRENT_DATE)
  AND s.name NOT IN ('Aditya Rao', 'Sara Khan');

INSERT INTO public.attendance (student_id, date, time_in, status)
SELECT s.student_id, CURRENT_DATE, NULL, 'Absent'
FROM public.students s
WHERE s.name IN ('Aditya Rao', 'Sara Khan')
  AND NOT EXISTS (SELECT 1 FROM public.attendance WHERE student_id = s.student_id AND date = CURRENT_DATE);
