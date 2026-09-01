import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownToLine,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  Clock3,
  FileText,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  UserRoundPlus,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Student = {
  student_id: string;
  name: string;
  class_section: string;
  guardian_whatsapp_number: string | null;
  enrolled_date: string;
};

type AttendanceRow = {
  attendance_id: string;
  student_id: string;
  date: string;
  time_in: string | null;
  status: 'Present' | 'Late' | 'Absent';
  students: { name: string; class_section: string } | null;
};

type View = 'overview' | 'live' | 'students' | 'reports';

const navItems: { label: string; view: View; icon: typeof LayoutDashboard }[] = [
  { label: 'Overview', view: 'overview', icon: LayoutDashboard },
  { label: 'Live recognition', view: 'live', icon: Camera },
  { label: 'Students', view: 'students', icon: Users },
  { label: 'Reports', view: 'reports', icon: BarChart3 },
];

const formatTime = (value: string | null) => value ? new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';
const formatDate = (value: string) => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));

function App() {
  const [view, setView] = useState<View>('overview');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All classes');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [toast, setToast] = useState('');
  const [lastRecognized, setLastRecognized] = useState<Student | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const loadData = async () => {
    setLoading(true);
    setError('');
    const [studentsResult, attendanceResult] = await Promise.all([
      supabase.from('students').select('student_id, name, class_section, guardian_whatsapp_number, enrolled_date').order('name'),
      supabase.from('attendance').select('attendance_id, student_id, date, time_in, status, students(name, class_section)').order('time_in', { ascending: false }),
    ]);
    if (studentsResult.error || attendanceResult.error) {
      setError('We couldn’t load the attendance records. Please refresh and try again.');
    } else {
      setStudents(studentsResult.data ?? []);
      setAttendance((attendanceResult.data as AttendanceRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { void loadData(); }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const todayAttendance = useMemo(() => attendance.filter((item) => item.date === today), [attendance, today]);
  const presentCount = todayAttendance.filter((item) => item.status === 'Present').length;
  const lateCount = todayAttendance.filter((item) => item.status === 'Late').length;
  const absentCount = students.length - todayAttendance.filter((item) => item.status !== 'Absent').length;
  const attendanceRate = students.length ? Math.round(((presentCount + lateCount) / students.length) * 100) : 0;
  const classes = ['All classes', ...Array.from(new Set(students.map((student) => student.class_section))).sort()];
  const filteredStudents = students.filter((student) => student.name.toLowerCase().includes(query.toLowerCase()) && (classFilter === 'All classes' || student.class_section === classFilter));
  const recentAttendance = todayAttendance.filter((item) => item.status !== 'Absent').slice(0, 6);

  const navigate = (nextView: View) => {
    setView(nextView);
    setQuery('');
  };

  const handleAddStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const classSection = String(form.get('class_section') ?? '').trim();
    const guardian = String(form.get('guardian_whatsapp_number') ?? '').trim();
    if (!name || !classSection) return;
    const { error: insertError } = await supabase.from('students').insert({ name, class_section: classSection, guardian_whatsapp_number: guardian || null, face_embedding_ref: `pending_${Date.now()}` });
    if (insertError) {
      setError('This student could not be added. Please check the details and try again.');
      return;
    }
    setShowAddStudent(false);
    setToast(`${name} was added to the student register.`);
    await loadData();
  };

  const markRecognized = async (student: Student) => {
    const existing = todayAttendance.find((item) => item.student_id === student.student_id);
    if (!existing) {
      const { error: insertError } = await supabase.from('attendance').insert({ student_id: student.student_id, date: today, time_in: new Date().toISOString(), status: 'Present' });
      if (insertError) {
        setError('The recognition could not be recorded. Please try again.');
        return;
      }
      await loadData();
    }
    setLastRecognized(student);
    setToast(`${student.name} marked present.`);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Sparkles size={18} /></div>
          <div><strong>Attendly</strong><span>smart attendance</span></div>
        </div>
        <div className="workspace-switcher"><div className="school-avatar">V</div><div><strong>Vivek Das School</strong><span>KIIT University</span></div><ChevronDown size={15} /></div>
        <nav className="main-nav" aria-label="Main navigation">
          <p className="nav-label">Workspace</p>
          {navItems.map(({ label, view: itemView, icon: Icon }) => <button key={itemView} className={view === itemView ? 'nav-item active' : 'nav-item'} onClick={() => navigate(itemView)}><Icon size={18} /><span>{label}</span>{itemView === 'live' && <i className="live-dot" />}</button>)}
          <p className="nav-label nav-label-spaced">Manage</p>
          <button className="nav-item" onClick={() => setShowAddStudent(true)}><UserRoundPlus size={18} /><span>Add student</span></button>
          <button className="nav-item" onClick={() => setToast('Settings are ready for your school administrator.')}><Settings size={18} /><span>Settings</span></button>
        </nav>
        <div className="sidebar-footer"><div className="secure-icon"><ShieldCheck size={16} /></div><div><strong>Data is protected</strong><span>Records are securely stored</span></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><button className="mobile-menu"><Menu size={20} /></button><div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{navItems.find((item) => item.view === view)?.label}</strong></div><div className="topbar-actions"><div className="status-pill"><span className="status-pulse" /> System live</div><button className="icon-button" aria-label="Notifications" onClick={() => setShowAlerts(!showAlerts)}><Bell size={19} /><b>2</b></button><div className="user-avatar">VD</div><div className="user-name"><strong>Vivek Das</strong><span>Administrator</span></div></div>{showAlerts && <div className="alerts-popover"><strong>Notifications</strong><p><span className="alert-dot orange" /> 2 late arrivals today</p><p><span className="alert-dot blue" /> Weekly report is ready</p></div>}</header>

        <div className="page-wrap">
          {error && <div className="error-banner"><AlertCircle size={17} />{error}<button onClick={() => setError('')}><X size={16} /></button></div>}
          {view === 'overview' && <OverviewView students={students} recentAttendance={recentAttendance} attendanceRate={attendanceRate} presentCount={presentCount} lateCount={lateCount} absentCount={absentCount} loading={loading} navigate={navigate} />}
          {view === 'live' && <LiveView students={students} todayAttendance={todayAttendance} lastRecognized={lastRecognized} onRecognized={markRecognized} />}
          {view === 'students' && <StudentsView students={filteredStudents} query={query} setQuery={setQuery} classFilter={classFilter} setClassFilter={setClassFilter} classes={classes} onAdd={() => setShowAddStudent(true)} />}
          {view === 'reports' && <ReportsView students={students} attendance={attendance} />}
        </div>
      </main>
      {showAddStudent && <AddStudentModal onClose={() => setShowAddStudent(false)} onSubmit={handleAddStudent} />}
      {toast && <div className="toast"><Check size={17} />{toast}</div>}
    </div>
  );
}

function OverviewView({ students, recentAttendance, attendanceRate, presentCount, lateCount, absentCount, loading, navigate }: { students: Student[]; recentAttendance: AttendanceRow[]; attendanceRate: number; presentCount: number; lateCount: number; absentCount: number; loading: boolean; navigate: (view: View) => void }) {
  return <>
    <div className="page-heading"><div><p className="eyebrow">Tuesday, September 1, 2026</p><h1>Good morning, Vivek<span>.</span></h1><p className="heading-subtitle">Here’s what’s happening with attendance today.</p></div><button className="primary-button" onClick={() => navigate('live')}><Camera size={17} /> Open live recognition</button></div>
    <section className="stats-grid">
      <StatCard label="Attendance rate" value={`${attendanceRate}%`} detail="of enrolled students" icon={Activity} tone="teal" trend="+4.2%" />
      <StatCard label="Present today" value={String(presentCount)} detail={`out of ${students.length} students`} icon={Check} tone="green" trend="On track" />
      <StatCard label="Late arrivals" value={String(lateCount)} detail="need a quick follow-up" icon={Clock3} tone="orange" trend="Today" />
      <StatCard label="Absent today" value={String(absentCount)} detail="parent alerts pending" icon={AlertCircle} tone="red" trend="Review" />
    </section>
    <div className="content-grid">
      <section className="card attendance-card"><div className="card-heading"><div><p className="eyebrow">Live overview</p><h2>Today’s attendance</h2></div><button className="text-button" onClick={() => navigate('reports')}>View report <ArrowUpRight size={15} /></button></div><div className="attendance-visual"><div className="ring" style={{ '--progress': `${attendanceRate * 3.6}deg` } as React.CSSProperties}><div><strong>{attendanceRate}%</strong><span>attendance</span></div></div><div className="legend"><LegendRow color="teal" label="Present" value={presentCount} /><LegendRow color="orange" label="Late" value={lateCount} /><LegendRow color="red" label="Absent" value={absentCount} /></div></div><div className="progress-track"><span style={{ width: `${attendanceRate}%` }} /></div><div className="card-note"><span><span className="tiny-status" /> Recognition is running smoothly</span><strong>Updated just now</strong></div></section>
      <section className="card camera-card"><div className="camera-top"><div><p className="eyebrow">Recognition station</p><h2>Front gate camera</h2></div><span className="live-badge"><i /> Live</span></div><div className="camera-preview"><div className="scan-corner tl" /><div className="scan-corner tr" /><div className="scan-corner bl" /><div className="scan-corner br" /><div className="camera-center"><Camera size={25} /><span>Camera is ready</span><small>Faces will be recognized automatically</small></div><span className="camera-timestamp">08:42:18</span></div><button className="secondary-button full-button" onClick={() => navigate('live')}>Open recognition view <ArrowUpRight size={16} /></button></section>
    </div>
    <section className="card table-card"><div className="card-heading"><div><p className="eyebrow">Latest activity</p><h2>Recent check-ins</h2></div><button className="text-button" onClick={() => navigate('students')}>All students <ArrowUpRight size={15} /></button></div>{loading ? <div className="empty-state">Loading attendance records...</div> : recentAttendance.length === 0 ? <div className="empty-state">No check-ins have been recorded today.</div> : <AttendanceTable rows={recentAttendance} />}</section>
  </>;
}

function StatCard({ label, value, detail, icon: Icon, tone, trend }: { label: string; value: string; detail: string; icon: typeof Activity; tone: string; trend: string }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={18} /></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div><span className={`stat-trend ${tone}`}>{trend}</span></div>; }
function LegendRow({ color, label, value }: { color: string; label: string; value: number }) { return <div className="legend-row"><span><i className={`legend-dot ${color}`} />{label}</span><strong>{value}</strong></div>; }

function AttendanceTable({ rows }: { rows: AttendanceRow[] }) { return <div className="table-scroll"><table><thead><tr><th>Student</th><th>Class</th><th>Time in</th><th>Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.attendance_id}><td><div className="student-cell"><div className="student-initial">{row.students?.name.charAt(0)}</div><strong>{row.students?.name}</strong></div></td><td>{row.students?.class_section}</td><td>{formatTime(row.time_in)}</td><td><span className={`status-badge ${row.status.toLowerCase()}`}><i />{row.status}</span></td></tr>)}</tbody></table></div>; }

function LiveView({ students, todayAttendance, lastRecognized, onRecognized }: { students: Student[]; todayAttendance: AttendanceRow[]; lastRecognized: Student | null; onRecognized: (student: Student) => Promise<void> }) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  return <><div className="page-heading"><div><p className="eyebrow">Recognition station / Front gate</p><h1>Live recognition<span>.</span></h1><p className="heading-subtitle">Attendance is recorded automatically when a face is recognized.</p></div><span className="large-live-badge"><i /> System active</span></div><div className="live-layout"><section className="card live-camera-card"><div className="live-camera"><div className="grid-overlay" /><div className="scan-corner tl" /><div className="scan-corner tr" /><div className="scan-corner bl" /><div className="scan-corner br" /><div className="live-camera-message"><div className="camera-orb"><Camera size={28} /></div><strong>Camera preview</strong><span>Waiting for a face to enter the frame</span></div><div className="scan-line" /><span className="camera-timestamp">CAM 01 · 08:42:18</span></div><div className="camera-controls"><div><span className="control-light green" /> HD camera connected</div><button className="secondary-button" onClick={() => setSelectedStudent(students.find((student) => !todayAttendance.some((row) => row.student_id === student.student_id)) ?? students[0] ?? null)}><Sparkles size={16} /> Simulate recognition</button></div></section><aside className="card recognition-side"><p className="eyebrow">Quick simulation</p><h2>Test a student</h2><p className="side-copy">Use a student below to preview how a successful recognition is recorded.</p><div className="recognition-list">{students.slice(0, 5).map((student) => { const marked = todayAttendance.some((row) => row.student_id === student.student_id && row.status !== 'Absent'); return <button key={student.student_id} className="recognition-person" onClick={() => setSelectedStudent(student)}><div className="student-initial">{student.name.charAt(0)}</div><div><strong>{student.name}</strong><span>{student.class_section}</span></div><span className={marked ? 'already-marked' : 'ready-mark'}>{marked ? <Check size={14} /> : <ArrowUpRight size={14} />}</span></button>; })}</div>{lastRecognized && <div className="last-recognized"><div className="success-icon"><Check size={17} /></div><div><strong>Last recognized</strong><span>{lastRecognized.name} · just now</span></div></div>}</aside></div>{selectedStudent && <div className="confirm-recognition"><div><div className="student-initial large">{selectedStudent.name.charAt(0)}</div><div><p className="eyebrow">Face match found</p><h3>{selectedStudent.name}</h3><span>{selectedStudent.class_section} · {todayAttendance.some((row) => row.student_id === selectedStudent.student_id) ? 'Already recorded today' : 'Ready to mark present'}</span></div></div><div className="confirm-actions"><button className="text-button" onClick={() => setSelectedStudent(null)}>Cancel</button><button className="primary-button" onClick={() => { void onRecognized(selectedStudent); setSelectedStudent(null); }}><Check size={16} /> Confirm attendance</button></div></div>}</>;
}

function StudentsView({ students, query, setQuery, classFilter, setClassFilter, classes, onAdd }: { students: Student[]; query: string; setQuery: (value: string) => void; classFilter: string; setClassFilter: (value: string) => void; classes: string[]; onAdd: () => void }) { return <><div className="page-heading"><div><p className="eyebrow">Manage your register</p><h1>Students<span>.</span></h1><p className="heading-subtitle">{students.length} students are enrolled in your attendance system.</p></div><button className="primary-button" onClick={onAdd}><Plus size={17} /> Add student</button></div><section className="card table-card students-table-card"><div className="toolbar"><div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search students..." /></div><div className="filter-wrap"><BookOpen size={16} /><select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>{classes.map((item) => <option key={item}>{item}</option>)}</select></div><button className="export-button"><ArrowDownToLine size={16} /> Export</button></div><div className="table-scroll"><table><thead><tr><th>Student</th><th>Class</th><th>Guardian contact</th><th>Enrolled</th><th>Recognition</th></tr></thead><tbody>{students.map((student) => <tr key={student.student_id}><td><div className="student-cell"><div className="student-initial">{student.name.charAt(0)}</div><strong>{student.name}</strong></div></td><td><span className="class-badge">{student.class_section}</span></td><td>{student.guardian_whatsapp_number ?? 'Not added'}</td><td>{formatDate(student.enrolled_date)}</td><td><span className="recognition-ready"><Check size={14} /> Ready</span></td></tr>)}</tbody></table>{students.length === 0 && <div className="empty-state">No students match your search.</div>}</div></section></>; }

function ReportsView({ students, attendance }: { students: Student[]; attendance: AttendanceRow[] }) { const dates = Array.from(new Set(attendance.map((row) => row.date))).sort().reverse(); const reportRows = students.map((student) => { const records = attendance.filter((row) => row.student_id === student.student_id); const present = records.filter((row) => row.status !== 'Absent').length; return { student, records, rate: records.length ? Math.round((present / records.length) * 100) : 0 }; }); return <><div className="page-heading"><div><p className="eyebrow">Attendance intelligence</p><h1>Reports<span>.</span></h1><p className="heading-subtitle">A clear view of attendance patterns across your school.</p></div><button className="secondary-button"><ArrowDownToLine size={17} /> Export report</button></div><div className="report-summary"><div className="report-highlight"><div className="report-highlight-icon"><BarChart3 size={21} /></div><div><span>Average attendance</span><strong>{students.length ? Math.round(reportRows.reduce((sum, row) => sum + row.rate, 0) / students.length) : 0}%</strong><small>Across tracked records</small></div></div><div className="report-highlight"><div className="report-highlight-icon orange"><CalendarDays size={21} /></div><div><span>Days tracked</span><strong>{dates.length}</strong><small>Since the system went live</small></div></div><div className="report-highlight"><div className="report-highlight-icon blue"><FileText size={21} /></div><div><span>Student records</span><strong>{students.length}</strong><small>Active in register</small></div></div></div><section className="card table-card"><div className="card-heading"><div><p className="eyebrow">Student performance</p><h2>Attendance by student</h2></div><div className="report-period"><CalendarDays size={15} /> All tracked days</div></div><div className="table-scroll"><table><thead><tr><th>Student</th><th>Class</th><th>Days recorded</th><th>Present</th><th>Attendance rate</th></tr></thead><tbody>{reportRows.map(({ student, records, rate }) => <tr key={student.student_id}><td><div className="student-cell"><div className="student-initial">{student.name.charAt(0)}</div><strong>{student.name}</strong></div></td><td>{student.class_section}</td><td>{records.length}</td><td>{records.filter((row) => row.status !== 'Absent').length}</td><td><div className="rate-cell"><div className="mini-progress"><span style={{ width: `${rate}%` }} /></div><strong>{rate}%</strong></div></td></tr>)}</tbody></table></div></section></>; }

function AddStudentModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) { return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">Student register</p><h2>Add a student</h2></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><p className="modal-copy">Add their details now. Face recognition can be enrolled from the live station later.</p><form onSubmit={onSubmit}><label>Full name<input name="name" required placeholder="e.g. Maya Sharma" autoFocus /></label><label>Class / section<input name="class_section" required placeholder="e.g. 10-A" /></label><label>Guardian WhatsApp <span>(optional)</span><input name="guardian_whatsapp_number" placeholder="e.g. +91 98765 43210" /></label><div className="modal-actions"><button type="button" className="text-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Plus size={16} /> Add student</button></div></form></div></div>; }

export default App;
