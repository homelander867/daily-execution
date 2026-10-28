'use strict';

/* =========================================================
   每日执行力计划 — 单文件应用逻辑
   数据只保存在当前浏览器的 localStorage 中，不做任何云同步。
   ========================================================= */

const APP_VERSION = '1.1.0';
const STORAGE_KEY = 'daily-execution:v1';
const PRE_IMPORT_KEY = 'daily-execution:pre-import';
const APP_ID = 'daily-execution-plan';

const WEEKDAY_NAMES = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const WEEKDAY_SHORT = ['', '一', '二', '三', '四', '五', '六', '日'];
const REPEAT_LABELS = { daily: '每天', weekdays: '工作日', custom: '自定义' };
const LOG_STATUS_LABELS = {
  done: '已完成',
  partial: '部分完成',
  skipped: '已跳过',
  postponed: '已顺延',
  split: '已拆分',
};

const DEFAULT_PERIODS = [
  { start: '08:00', end: '08:45' },
  { start: '08:55', end: '09:40' },
  { start: '10:00', end: '10:45' },
  { start: '10:55', end: '11:40' },
  { start: '13:00', end: '13:45' },
  { start: '13:55', end: '14:40' },
  { start: '15:00', end: '15:45' },
  { start: '15:55', end: '16:40' },
  { start: '18:00', end: '18:45' },
  { start: '18:55', end: '19:40' },
  { start: '19:50', end: '20:35' },
  { start: '20:45', end: '21:30' },
];

const DAY_MINUTES = 24 * 60;
const SEARCH_START = 6 * 60;
const SEARCH_END = 23 * 60 + 30;
const SLOT_STEP = 5;
const SLOT_BUFFER = 5;
const MAX_IMPORT_CHARS = 3_500_000;

const ICONS = {
  plus: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.3 4.3L19 6.8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chevronLeft: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chevronRight: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  arrowRight: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15M14 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.8V12l3 1.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s6.2-5.7 6.2-11A6.2 6.2 0 105.8 10c0 5.3 6.2 11 6.2 11z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.2" stroke="currentColor" stroke-width="1.7"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.6" stroke="currentColor" stroke-width="1.7"/><path d="M5 20c.7-3.4 3.4-5.2 7-5.2s6.3 1.8 7 5.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" stroke-width="1.7"/><path d="M7.5 3v4M16.5 3v4M3.5 9.5h17" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4.5h9.2A2.8 2.8 0 0117 7.3V21l-6-3.3L5 21V4.5z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.2 8.5h5.4M8.2 12h3.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l1.7 5.2L19 10l-5.3 1.8L12 17l-1.7-5.2L5 10l5.3-1.8L12 3zM19 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  leaf: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 4.5C12 4 5 8.2 5 14.5a5.5 5.5 0 005.5 5.5C17 20 20 12.5 20 4.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M5 21c1.8-5.3 5-8.4 9.5-10.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.5v5.2M12 16.4v.2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 11v5M12 7.7v.2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.5v11M7.5 10.5L12 15l4.5-4.5M4.5 19.5h15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 15.5v-12M7.5 8L12 3.5 16.5 8M4.5 19.5h15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.2" stroke="currentColor" stroke-width="1.7"/><path d="M16 8V6.2A2.2 2.2 0 0013.8 4H6.2A2.2 2.2 0 004 6.2v7.6A2.2 2.2 0 006.2 16H8" stroke="currentColor" stroke-width="1.7"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z" stroke="currentColor" stroke-width="1.7"/><path d="M19.4 13.5a7.8 7.8 0 000-3l2-1.5-2-3.4-2.4 1a8 8 0 00-2.6-1.5L14 2.5h-4L9.6 5a8 8 0 00-2.6 1.5l-2.4-1-2 3.4 2 1.5a7.8 7.8 0 000 3l-2 1.5 2 3.4 2.4-1A8 8 0 009.6 19l.4 2.5h4l.4-2.5a8 8 0 002.6-1.5l2.4 1 2-3.4-2-1.6z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="5" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="19" cy="12" r="1.7" fill="currentColor"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 14.3A8.4 8.4 0 019.7 4 8.4 8.4 0 1020 14.3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M9 7V4.8h6V7M6.5 7l.8 13h9.4l.8-13M10 11v5M14 11v5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 20h4.2L19 9.2a2.4 2.4 0 00-3.4-3.4L4.8 16.6 4 20z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  shift: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 5h9M5 5v9M5 5l6 6M19 19H9.5M19 19V9.5M19 19l-6-6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  split: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 5v4a3 3 0 003 3h8a3 3 0 013 3v4M5 19v-4a3 3 0 013-3M16.5 16.5L19 19l2.5-2.5M16.5 7.5L19 5l2.5 2.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  skip: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.7"/><path d="M8.5 12h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.5 11.5L12 5l7.5 6.5V20a1 1 0 01-1 1h-4.2v-5.4H9.7V21H5.5a1 1 0 01-1-1v-8.5z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 11a8 8 0 10-2.3 6.4M20 5v6h-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.7"/><path d="M12 2.5v2.2M12 19.3v2.2M4.3 4.3l1.6 1.6M18.1 18.1l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.3 19.7l1.6-1.6M18.1 5.9l1.6-1.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  bookOpen: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 6.5C10.2 5.2 7.7 4.5 4.5 4.5v14c3.2 0 5.7.7 7.5 2 1.8-1.3 4.3-2 7.5-2v-14c-3.2 0-5.7.7-7.5 2zM12 6.5v14" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.5 20V4.5M4.5 20H20M8 16.5V11M12 16.5V7M16 16.5v-3.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2.2" stroke="currentColor" stroke-width="1.7"/><path d="M8 10V7.5a4 4 0 018 0V10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
};

const COURSE_SEEDS = [
  {
    id: 'course_ai_embedded',
    code: '005M081201C141',
    name: 'AI+高级嵌入式系统',
    teacher: '罗飞',
    room: 'D504',
    campus: '奉贤校区',
    weekday: 1,
    periodStart: 1,
    periodEnd: 4,
    weekStart: 2,
    weekEnd: 9,
    hours: 32,
    credits: 2,
    program: 'M-学术硕士课程',
    category: 'C-专业选修课(非学位课)',
    className: 'AI+高级嵌入式系统',
    school: '信息科学与工程学院',
    selfArranged: false,
    note: '',
  },
  {
    id: 'course_politics',
    code: '009M030500A003',
    name: '新时代中国特色社会主义理论与实践研究',
    teacher: '赵爽',
    room: 'D402',
    campus: '奉贤校区',
    weekday: 1,
    periodStart: 5,
    periodEnd: 8,
    weekStart: 2,
    weekEnd: 9,
    hours: 32,
    credits: 2,
    program: 'M-学术硕士课程',
    category: 'A-公共课(学位课)',
    className: '新时代中国特色社会主义理论与实践研究(41)班',
    school: '马克思主义学院',
    selfArranged: false,
    note: '',
  },
  {
    id: 'course_engineering_ethics',
    code: '008F085700A001',
    name: '工程伦理',
    teacher: '周易',
    room: 'B202',
    campus: '奉贤校区',
    weekday: 3,
    periodStart: 7,
    periodEnd: 8,
    weekStart: 2,
    weekEnd: 9,
    hours: 16,
    credits: 1,
    program: 'F-全日制专业学位硕士',
    category: 'A-公共课(学位课)',
    className: '工程伦理(9)班（不限学院）',
    school: '资源与环境工程学院',
    selfArranged: false,
    note: '',
  },
  {
    id: 'course_academic_english',
    code: '011M050200A012',
    name: '学术英语（读写）',
    teacher: '潘琪',
    room: 'E418',
    campus: '奉贤校区',
    weekday: 4,
    periodStart: 5,
    periodEnd: 6,
    weekStart: 2,
    weekEnd: 17,
    hours: 32,
    credits: 2,
    program: 'M-学术硕士课程',
    category: 'A-公共课(学位课)',
    className: '学术英语（读写）(25)班',
    school: '外国语学院',
    selfArranged: false,
    note: '',
  },
  {
    id: 'course_fitness',
    code: '014M040300A001',
    name: '健身',
    teacher: '宋可可',
    room: '体育馆副馆205',
    campus: '奉贤校区',
    weekday: 5,
    periodStart: 3,
    periodEnd: 4,
    weekStart: 11,
    weekEnd: 18,
    hours: 16,
    credits: 1,
    program: 'M-学术硕士课程',
    category: 'A-公共课(学位课)',
    className: '健身(73)班 体适能4班',
    school: '体育科学与工程学院',
    selfArranged: false,
    note: '',
  },
  {
    id: 'course_digital_systems',
    code: '005M081000B001',
    name: '现代数字系统设计',
    teacher: '李钰',
    room: 'B101',
    campus: '奉贤校区',
    weekday: 3,
    periodStart: 5,
    periodEnd: 8,
    weekStart: 11,
    weekEnd: 18,
    hours: 32,
    credits: 2,
    program: 'M-学术硕士课程',
    category: 'B-专业核心课(学位课)',
    className: '现代数字系统设计',
    school: '信息科学与工程学院',
    selfArranged: false,
    note: '',
  },
  {
    id: 'course_intelligent_info',
    code: '005M081001C183',
    name: '智能信息处理',
    teacher: '万永菁',
    room: 'D501',
    campus: '奉贤校区',
    weekday: 5,
    periodStart: 9,
    periodEnd: 12,
    weekStart: 11,
    weekEnd: 18,
    hours: 32,
    credits: 2,
    program: 'M-学术硕士课程',
    category: 'C-专业选修课(非学位课)',
    className: '智能信息处理',
    school: '信息科学与工程学院',
    selfArranged: false,
    note: '',
  },
  {
    id: 'course_writing',
    code: '005M081001C002',
    name: '论文写作（信）',
    teacher: '汪楠、朱煜',
    room: 'D204',
    campus: '奉贤校区',
    weekday: 3,
    periodStart: 9,
    periodEnd: 12,
    weekStart: 2,
    weekEnd: 5,
    hours: 16,
    credits: 1,
    program: 'M-学术硕士课程',
    category: 'C-专业选修课(非学位课)',
    className: '论文写作（信）',
    school: '信息科学与工程学院',
    selfArranged: false,
    note: '',
  },
  {
    id: 'course_literature',
    code: '017M120500D018',
    name: '文献检索与检索案例研究',
    teacher: '霍丽萍',
    room: 'D505',
    campus: '奉贤校区',
    weekday: 3,
    periodStart: 9,
    periodEnd: 12,
    weekStart: 11,
    weekEnd: 14,
    hours: 16,
    credits: 1,
    program: 'M-学术硕士课程',
    category: 'D-综合素养课(非学位课)',
    className: '文献检索与检索案例研究(10)班',
    school: '科技信息研究所',
    selfArranged: false,
    note: '',
  },
  {
    id: 'course_lab_safety',
    code: '005M081100C195',
    name: '实验室安全教育',
    teacher: '顾震、陈兰岚、仲灏',
    room: 'B100',
    campus: '奉贤校区',
    weekday: 6,
    periodStart: 5,
    periodEnd: 8,
    weekStart: 11,
    weekEnd: 14,
    hours: 16,
    credits: 1,
    program: 'M-学术硕士课程',
    category: 'C-专业选修课(非学位课)',
    className: '实验室安全教育(2)班',
    school: '信息科学与工程学院',
    selfArranged: false,
    note: '',
  },
  {
    id: 'course_llm_practice',
    code: '005M081000A001',
    name: '大模型基础及应用实践',
    teacher: '程华',
    room: '全部自排',
    campus: '奉贤校区',
    weekday: null,
    periodStart: null,
    periodEnd: null,
    weekStart: null,
    weekEnd: null,
    hours: 32,
    credits: 2,
    program: 'M-学术硕士课程',
    category: 'A-公共课(学位课)',
    className: '大模型基础及应用实践(2)班',
    school: '信息科学与工程学院',
    selfArranged: true,
    note: '原课表标记为「全部自排」，未给出固定星期、节次和周次，因此不自动占用日程。',
  },
  {
    id: 'course_frontier_lecture',
    code: '005F085401C001',
    name: '电子与通信工程前沿讲座',
    teacher: '朱煜',
    room: '全部自排',
    campus: '',
    weekday: null,
    periodStart: null,
    periodEnd: null,
    weekStart: null,
    weekEnd: null,
    hours: 16,
    credits: 1,
    program: 'F-全日制专业学位硕士',
    category: 'C-专业选修课(非学位课)',
    className: '电子与通信工程前沿讲座',
    school: '信息科学与工程学院',
    selfArranged: true,
    note: '原课表标记为「全部自排」，未给出固定星期、节次和周次，因此不自动占用日程。',
  },
];

/* ---------------- 基础工具 ---------------- */

function pad2(n) {
  return String(n).padStart(2, '0');
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ico(name) {
  return ICONS[name] || '';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isSafeId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,90}$/.test(value);
}

function uid(prefix = 'id') {
  const random = (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
    ? globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 10)
    : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

function localISO(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function todayISO() {
  return localISO(new Date());
}

function nowISO() {
  return new Date().toISOString();
}

function parseISODate(iso) {
  if (typeof iso !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function isISODate(value) {
  return Boolean(parseISODate(value));
}

function addDays(iso, amount) {
  const date = parseISODate(iso);
  if (!date) return iso;
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount, 12, 0, 0, 0);
  return localISO(next);
}

function daysBetween(fromISO, toISOValue) {
  const from = parseISODate(fromISO);
  const to = parseISODate(toISOValue);
  if (!from || !to) return 0;
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function startOfWeek(iso) {
  const date = parseISODate(iso);
  if (!date) return iso;
  const offset = (date.getDay() + 6) % 7;
  return addDays(iso, -offset);
}

function weekdayIndex(iso) {
  const date = parseISODate(iso);
  if (!date) return 1;
  return ((date.getDay() + 6) % 7) + 1;
}

function formatMonthDay(iso) {
  const date = parseISODate(iso);
  if (!date) return '—';
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatFullDate(iso) {
  const date = parseISODate(iso);
  if (!date) return '—';
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatShortDate(iso) {
  const date = parseISODate(iso);
  if (!date) return '—';
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function relativeDateName(iso) {
  const offset = daysBetween(todayISO(), iso);
  if (offset === 0) return '今天';
  if (offset === 1) return '明天';
  if (offset === -1) return '昨天';
  return WEEKDAY_NAMES[weekdayIndex(iso)];
}

function formatWeekRange(startISO) {
  return `${formatMonthDay(startISO)} – ${formatMonthDay(addDays(startISO, 6))}`;
}

function formatDuration(minutes) {
  const value = Math.max(0, Math.round(Number(minutes) || 0));
  if (value < 60) return `${value}分钟`;
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest ? `${hours}小时${rest}分` : `${hours}小时`;
}

function timeToMinutes(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function minutesToTime(total) {
  const normalized = ((Math.round(total) % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  return `${pad2(Math.floor(normalized / 60))}:${pad2(normalized % 60)}`;
}

function clockLabel(value) {
  const minutes = timeToMinutes(value);
  return minutes === null ? '—' : minutesToTime(minutes);
}

function normalizeClock(value, fallback = '09:00') {
  const minutes = timeToMinutes(value);
  return minutes === null ? fallback : minutesToTime(minutes);
}

function formatTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatTimeOnly(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function periodRangeLabel(start, end) {
  if (!start || !end) return '时间待定';
  return start === end ? `第${start}节` : `第${start}–${end}节`;
}

function programShort(program) {
  if (!program) return '';
  return program.split('-')[0] || '';
}

function weekdayOptions(selected) {
  return WEEKDAY_NAMES.slice(1).map((name, index) => {
    const value = index + 1;
    return `<option value="${value}" ${Number(selected) === value ? 'selected' : ''}>${name}</option>`;
  }).join('');
}

function periodOptions(selected, includePlaceholder = false) {
  let html = includePlaceholder ? '<option value="">请选择</option>' : '';
  for (let i = 1; i <= 12; i += 1) {
    html += `<option value="${i}" ${Number(selected) === i ? 'selected' : ''}>第${i}节</option>`;
  }
  return html;
}

function normalizeStatus(value) {
  return ['done', 'partial', 'skipped', 'postponed', 'split'].includes(value) ? value : null;
}

function isSpecialStatus(status) {
  return status === 'skipped' || status === 'postponed' || status === 'split';
}

/* ---------------- 默认数据 ---------------- */

function createSeedState() {
  const today = todayISO();
  const timestamp = nowISO();
  return {
    schemaVersion: 1,
    meta: {
      appVersion: APP_VERSION,
      createdAt: timestamp,
      startedDate: today,
      lastSavedAt: timestamp,
      lastBackupAt: null,
      lastImportedAt: null,
    },
    settings: {
      semesterStart: '2026-09-07',
      totalWeeks: 18,
      periods: DEFAULT_PERIODS.map((item) => ({ ...item })),
    },
    tasks: [
      {
        id: 'task_english',
        title: '英语单词',
        target: 30,
        unit: '个',
        preferredTime: '08:00',
        duration: 25,
        note: '用碎片时间完成，不追求一次背完。',
        repeat: 'daily',
        weekdays: [],
        active: true,
        pausedAt: null,
        deletedDate: null,
        priority: 1,
        anchor: false,
        kind: 'study',
        createdAt: today,
      },
      {
        id: 'task_stm32',
        title: 'STM32 教程',
        target: 3,
        unit: '集',
        preferredTime: '17:00',
        duration: 60,
        note: '至少看 3 集；看完记一句今天学到的东西。',
        repeat: 'daily',
        weekdays: [],
        active: true,
        pausedAt: null,
        deletedDate: null,
        priority: 2,
        anchor: false,
        kind: 'study',
        createdAt: today,
      },
      {
        id: 'task_exercise',
        title: '晚间运动与拉伸',
        target: 1,
        unit: '次',
        preferredTime: '19:30',
        duration: 120,
        note: '19:30–21:30 预留。太忙时，20 分钟拉伸也算。',
        repeat: 'daily',
        weekdays: [],
        active: true,
        pausedAt: null,
        deletedDate: null,
        priority: 3,
        anchor: true,
        kind: 'exercise',
        createdAt: today,
      },
      {
        id: 'task_review',
        title: '睡前复盘',
        target: 1,
        unit: '次',
        preferredTime: '22:20',
        duration: 5,
        note: '写三句话就够；顺手记下明天最重要的三件事。',
        repeat: 'daily',
        weekdays: [],
        active: true,
        pausedAt: null,
        deletedDate: null,
        priority: 4,
        anchor: true,
        kind: 'review',
        createdAt: today,
      },
    ],
    courses: COURSE_SEEDS.map((course) => ({ ...course })),
    adjustments: [],
    extras: [],
    logs: {},
    reviews: {},
    overrides: {},
    restDays: [],
  };
}

/* ---------------- 数据规范化 / 持久化 ---------------- */

function asTrimmedString(value, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function asFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeTask(raw, usedIds, today) {
  if (!raw || typeof raw !== 'object') return null;
  const title = asTrimmedString(raw.title, 60);
  if (!title) return null;
  let id = isSafeId(raw.id) ? raw.id : uid('task');
  if (usedIds.has(id)) id = uid('task');
  usedIds.add(id);
  const target = clamp(Math.round(asFiniteNumber(raw.target, 1)), 1, 9999);
  const duration = clamp(Math.round(asFiniteNumber(raw.duration, 30)), 5, 12 * 60);
  const repeat = ['daily', 'weekdays', 'custom'].includes(raw.repeat) ? raw.repeat : 'daily';
  let weekdays = Array.isArray(raw.weekdays)
    ? [...new Set(raw.weekdays.map((item) => Number(item)).filter((item) => item >= 1 && item <= 7))].sort((a, b) => a - b)
    : [];
  if (repeat === 'custom' && weekdays.length === 0) weekdays = [1, 2, 3, 4, 5];
  const active = raw.active !== false;
  const createdAt = isISODate(raw.createdAt) ? raw.createdAt : today;
  return {
    id,
    title,
    target,
    unit: asTrimmedString(raw.unit, 10) || '次',
    preferredTime: normalizeClock(raw.preferredTime, '09:00'),
    duration,
    note: asTrimmedString(raw.note, 500),
    repeat,
    weekdays,
    active,
    pausedAt: isISODate(raw.pausedAt) ? raw.pausedAt : null,
    deletedDate: isISODate(raw.deletedDate) ? raw.deletedDate : null,
    priority: clamp(Math.round(asFiniteNumber(raw.priority, 5)), 1, 99),
    anchor: Boolean(raw.anchor),
    kind: ['study', 'exercise', 'review', 'other'].includes(raw.kind) ? raw.kind : 'other',
    createdAt,
  };
}

function normalizeExtra(raw, usedIds) {
  if (!raw || typeof raw !== 'object') return null;
  const title = asTrimmedString(raw.title, 80);
  if (!title) return null;
  let id = isSafeId(raw.id) ? raw.id : uid('extra');
  if (usedIds.has(id)) id = uid('extra');
  usedIds.add(id);
  const dueDate = isISODate(raw.dueDate) ? raw.dueDate : todayISO();
  return {
    id,
    title,
    target: clamp(Math.round(asFiniteNumber(raw.target, 1)), 1, 9999),
    unit: asTrimmedString(raw.unit, 10) || '次',
    preferredTime: normalizeClock(raw.preferredTime, '09:00'),
    duration: clamp(Math.round(asFiniteNumber(raw.duration, 30)), 5, 12 * 60),
    note: asTrimmedString(raw.note, 500),
    dueDate,
    priority: clamp(Math.round(asFiniteNumber(raw.priority, 5)), 1, 99),
    sourceTaskId: isSafeId(raw.sourceTaskId) ? raw.sourceTaskId : null,
    splitGroup: isSafeId(raw.splitGroup) ? raw.splitGroup : null,
    movedFrom: isISODate(raw.movedFrom) ? raw.movedFrom : null,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt.slice(0, 40) : nowISO(),
  };
}

function normalizeCourse(raw, usedIds) {
  if (!raw || typeof raw !== 'object') return null;
  const name = asTrimmedString(raw.name, 80);
  if (!name) return null;
  let id = isSafeId(raw.id) ? raw.id : uid('course');
  if (usedIds.has(id)) id = uid('course');
  usedIds.add(id);
  const selfArranged = Boolean(raw.selfArranged);
  let weekday = Number(raw.weekday);
  let periodStart = Number(raw.periodStart);
  let periodEnd = Number(raw.periodEnd);
  let weekStart = Number(raw.weekStart);
  let weekEnd = Number(raw.weekEnd);
  if (!selfArranged) {
    if (!(weekday >= 1 && weekday <= 7)) return null;
    if (!(periodStart >= 1 && periodStart <= 12) || !(periodEnd >= periodStart && periodEnd <= 12)) return null;
    if (!(weekStart >= 1 && weekStart <= 30) || !(weekEnd >= weekStart && weekEnd <= 30)) return null;
  }
  return {
    id,
    code: asTrimmedString(raw.code, 30),
    name,
    teacher: asTrimmedString(raw.teacher, 80),
    room: asTrimmedString(raw.room, 80),
    campus: asTrimmedString(raw.campus, 40),
    weekday: selfArranged ? null : weekday,
    periodStart: selfArranged ? null : periodStart,
    periodEnd: selfArranged ? null : periodEnd,
    weekStart: selfArranged ? null : weekStart,
    weekEnd: selfArranged ? null : weekEnd,
    hours: clamp(Math.round(asFiniteNumber(raw.hours, 0)), 0, 500),
    credits: clamp(asFiniteNumber(raw.credits, 0), 0, 50),
    program: asTrimmedString(raw.program, 60),
    category: asTrimmedString(raw.category, 60) || '自定义课程',
    className: asTrimmedString(raw.className, 100),
    school: asTrimmedString(raw.school, 80),
    selfArranged,
    note: asTrimmedString(raw.note, 500),
  };
}

function normalizeAdjustment(raw, usedIds) {
  if (!raw || typeof raw !== 'object') return null;
  const date = isISODate(raw.date) ? raw.date : null;
  const name = asTrimmedString(raw.name, 80);
  if (!date || !name) return null;
  const periodStart = clamp(Math.round(asFiniteNumber(raw.periodStart, 1)), 1, 12);
  const periodEnd = clamp(Math.round(asFiniteNumber(raw.periodEnd, periodStart)), periodStart, 12);
  let id = isSafeId(raw.id) ? raw.id : uid('adjustment');
  if (usedIds.has(id)) id = uid('adjustment');
  usedIds.add(id);
  return {
    id,
    date,
    name,
    room: asTrimmedString(raw.room, 80),
    teacher: asTrimmedString(raw.teacher, 80),
    periodStart,
    periodEnd,
    note: asTrimmedString(raw.note, 500),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt.slice(0, 40) : nowISO(),
  };
}

function normalizeLog(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const status = normalizeStatus(raw.status);
  const actual = clamp(Math.round(asFiniteNumber(raw.actual, 0)), 0, 1_000_000);
  if (!status && actual === 0) return null;
  return {
    status: status || 'partial',
    actual,
    note: asTrimmedString(raw.note, 300),
    completedAt: typeof raw.completedAt === 'string' ? raw.completedAt.slice(0, 40) : null,
    backfilled: Boolean(raw.backfilled),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt.slice(0, 40) : null,
  };
}

function normalizePeriods(raw) {
  const periods = DEFAULT_PERIODS.map((item) => ({ ...item }));
  if (!Array.isArray(raw)) return periods;
  for (let i = 0; i < 12; i += 1) {
    const item = raw[i];
    if (!item || typeof item !== 'object') continue;
    const start = timeToMinutes(item.start);
    const end = timeToMinutes(item.end);
    if (start !== null && end !== null && end > start) {
      periods[i] = { start: minutesToTime(start), end: minutesToTime(end) };
    }
  }
  return periods;
}

function normalizeState(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('备份内容不是一个有效的数据对象。');
  }
  const source = input.data && typeof input.data === 'object' ? input.data : input;
  if (!source || typeof source !== 'object') throw new Error('备份内容格式不正确。');
  if (!Array.isArray(source.tasks) || !Array.isArray(source.courses)) {
    throw new Error('备份缺少任务或课程数据。');
  }
  if (source.tasks.length > 2000 || source.courses.length > 500 || (Array.isArray(source.extras) && source.extras.length > 3000)) {
    throw new Error('备份数据量异常，已拒绝导入。');
  }
  const today = todayISO();
  const usedTaskIds = new Set();
  const tasks = source.tasks.map((item) => normalizeTask(item, usedTaskIds, today)).filter(Boolean);
  const extras = (Array.isArray(source.extras) ? source.extras : [])
    .map((item) => normalizeExtra(item, usedTaskIds))
    .filter(Boolean);
  const usedCourseIds = new Set();
  const courses = source.courses.map((item) => normalizeCourse(item, usedCourseIds)).filter(Boolean);
  const usedAdjustmentIds = new Set();
  const adjustments = (Array.isArray(source.adjustments) ? source.adjustments : [])
    .map((item) => normalizeAdjustment(item, usedAdjustmentIds))
    .filter(Boolean);

  const logs = {};
  if (source.logs && typeof source.logs === 'object' && !Array.isArray(source.logs)) {
    for (const date of Object.keys(source.logs).slice(0, 2000)) {
      if (!isISODate(date)) continue;
      const dayLogs = source.logs[date];
      if (!dayLogs || typeof dayLogs !== 'object' || Array.isArray(dayLogs)) continue;
      const next = {};
      for (const taskId of Object.keys(dayLogs)) {
        if (!isSafeId(taskId)) continue;
        const log = normalizeLog(dayLogs[taskId]);
        if (log) next[taskId] = log;
      }
      if (Object.keys(next).length) logs[date] = next;
    }
  }

  const overrides = {};
  if (source.overrides && typeof source.overrides === 'object' && !Array.isArray(source.overrides)) {
    for (const date of Object.keys(source.overrides).slice(0, 2000)) {
      if (!isISODate(date)) continue;
      const dayOverrides = source.overrides[date];
      if (!dayOverrides || typeof dayOverrides !== 'object' || Array.isArray(dayOverrides)) continue;
      const next = {};
      for (const taskId of Object.keys(dayOverrides)) {
        if (!isSafeId(taskId)) continue;
        const raw = dayOverrides[taskId];
        if (!raw || typeof raw !== 'object') continue;
        const entry = {};
        const time = timeToMinutes(raw.time);
        if (time !== null) entry.time = minutesToTime(time);
        if (Number.isFinite(Number(raw.duration))) entry.duration = clamp(Math.round(Number(raw.duration)), 5, 12 * 60);
        if (Number.isFinite(Number(raw.target))) entry.target = clamp(Math.round(Number(raw.target)), 1, 9999);
        if (raw.simplified) entry.simplified = true;
        if (Object.keys(entry).length) next[taskId] = entry;
      }
      if (Object.keys(next).length) overrides[date] = next;
    }
  }

  const reviews = {};
  if (source.reviews && typeof source.reviews === 'object' && !Array.isArray(source.reviews)) {
    for (const date of Object.keys(source.reviews).slice(0, 2000)) {
      if (!isISODate(date)) continue;
      const raw = source.reviews[date];
      if (!raw || typeof raw !== 'object') continue;
      const top3 = Array.isArray(raw.top3)
        ? raw.top3.map((item) => asTrimmedString(item, 160)).filter(Boolean).slice(0, 3)
        : [];
      reviews[date] = {
        done: asTrimmedString(raw.done, 2000),
        unfinished: asTrimmedString(raw.unfinished, 1000),
        reason: asTrimmedString(raw.reason, 1000),
        top3,
        updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt.slice(0, 40) : nowISO(),
        backfilled: Boolean(raw.backfilled),
      };
    }
  }

  const restDays = Array.isArray(source.restDays)
    ? [...new Set(source.restDays.filter((date) => isISODate(date)))].slice(0, 2000)
    : [];

  const rawMeta = source.meta && typeof source.meta === 'object' ? source.meta : {};
  const settings = source.settings && typeof source.settings === 'object' ? source.settings : {};
  const semesterStart = isISODate(settings.semesterStart) ? settings.semesterStart : '2026-09-07';
  const totalWeeks = clamp(Math.round(asFiniteNumber(settings.totalWeeks, 18)), 1, 30);

  return {
    schemaVersion: 1,
    meta: {
      appVersion: APP_VERSION,
      createdAt: typeof rawMeta.createdAt === 'string' ? rawMeta.createdAt.slice(0, 40) : nowISO(),
      startedDate: isISODate(rawMeta.startedDate) ? rawMeta.startedDate : today,
      lastSavedAt: typeof rawMeta.lastSavedAt === 'string' ? rawMeta.lastSavedAt.slice(0, 40) : nowISO(),
      lastBackupAt: typeof rawMeta.lastBackupAt === 'string' ? rawMeta.lastBackupAt.slice(0, 40) : null,
      lastImportedAt: typeof rawMeta.lastImportedAt === 'string' ? rawMeta.lastImportedAt.slice(0, 40) : null,
    },
    settings: {
      semesterStart,
      totalWeeks,
      periods: normalizePeriods(settings.periods),
    },
    tasks,
    courses,
    adjustments,
    extras,
    logs,
    reviews,
    overrides,
    restDays,
  };
}

let state = null;
let initNotice = '';
let deferredInstallPrompt = null;

const ui = {
  activeDate: todayISO(),
  reviewDate: todayISO(),
  courseWeek: 1,
};

function loadState() {
  const today = todayISO();
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    initNotice = '浏览器暂时无法读取本地存储，本次修改可能无法保存。请检查是否处于无痕模式。';
    return createSeedState();
  }
  if (!raw) {
    const seed = createSeedState();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    } catch (error) {
      initNotice = '浏览器本地存储不可用，修改不会被保存。请退出无痕模式或检查存储空间。';
    }
    return seed;
  }
  try {
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch (error) {
    try {
      localStorage.setItem(`${STORAGE_KEY}:corrupt:${Date.now()}`, raw);
    } catch (saveError) {
      // 原始损坏数据保留失败时，不影响应用以空数据继续运行。
    }
    initNotice = '检测到本地数据损坏，已尝试保留原始副本并以初始数据启动。若你之前导出过 JSON，可在「更多」中导入恢复。';
    return createSeedState();
  }
}

function persist(options = {}) {
  state.meta.lastSavedAt = nowISO();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateSaveState();
    return true;
  } catch (error) {
    updateSaveState('保存失败');
    if (!options.silent) {
      showToast('保存失败：本地存储空间可能已满，请先导出备份。');
    }
    return false;
  }
}

function updateSaveState(label) {
  const element = document.getElementById('save-state');
  if (!element) return;
  if (label) {
    element.textContent = label;
    return;
  }
  const time = formatTimeOnly(state?.meta?.lastSavedAt);
  element.textContent = time ? `本地已保存 ${time}` : '本地已保存';
}

/* ---------------- 日期 / 教学周 ---------------- */

function getWeekInfo(iso = todayISO()) {
  const semesterStart = state?.settings?.semesterStart || '2026-09-07';
  const totalWeeks = state?.settings?.totalWeeks || 18;
  const baseMonday = startOfWeek(semesterStart);
  const monday = startOfWeek(iso);
  const week = Math.floor(daysBetween(baseMonday, monday) / 7) + 1;
  return {
    week,
    totalWeeks,
    start: monday,
    end: addDays(monday, 6),
    inSemester: week >= 1 && week <= totalWeeks,
  };
}

function weekLabel(iso) {
  const info = getWeekInfo(iso);
  if (info.week < 1) return '学期未开始';
  if (info.week > info.totalWeeks) return '学期周次之外';
  return `第${info.week}周`;
}

function currentSemesterTitle() {
  return '2026–2027 学年 · 第一学期';
}

/* ---------------- 课程 ---------------- */

function getCourseInterval(periodStart, periodEnd) {
  const periods = state.settings.periods;
  const startPeriod = periods[Number(periodStart) - 1];
  const endPeriod = periods[Number(periodEnd) - 1];
  if (!startPeriod || !endPeriod) return null;
  const startMin = timeToMinutes(startPeriod.start);
  const endMin = timeToMinutes(endPeriod.end);
  if (startMin === null || endMin === null || endMin <= startMin) return null;
  return { startMin, endMin, start: minutesToTime(startMin), end: minutesToTime(endMin) };
}

function getSelfArrangedCourses() {
  return state.courses.filter((course) => course.selfArranged);
}

function getCoursesForWeek(week) {
  return state.courses
    .filter((course) => !course.selfArranged && week >= course.weekStart && week <= course.weekEnd)
    .sort((a, b) => a.weekday - b.weekday || a.periodStart - b.periodStart);
}

function getDayCourseItems(date) {
  const weekInfo = getWeekInfo(date);
  const weekday = weekdayIndex(date);
  const regular = state.courses
    .filter((course) => !course.selfArranged
      && course.weekday === weekday
      && weekInfo.week >= course.weekStart
      && weekInfo.week <= course.weekEnd)
    .map((course) => {
      const interval = getCourseInterval(course.periodStart, course.periodEnd);
      return {
        type: 'course',
        id: course.id,
        title: course.name,
        teacher: course.teacher,
        room: course.room,
        campus: course.campus,
        periodStart: course.periodStart,
        periodEnd: course.periodEnd,
        periodsLabel: periodRangeLabel(course.periodStart, course.periodEnd),
        startMin: interval ? interval.startMin : null,
        endMin: interval ? interval.endMin : null,
        start: interval ? interval.start : '',
        end: interval ? interval.end : '',
        note: course.note,
        course,
      };
    });
  const temporary = state.adjustments
    .filter((item) => item.date === date)
    .map((item) => {
      const interval = getCourseInterval(item.periodStart, item.periodEnd);
      return {
        type: 'adjustment',
        id: item.id,
        title: item.name,
        teacher: item.teacher,
        room: item.room,
        campus: '',
        periodStart: item.periodStart,
        periodEnd: item.periodEnd,
        periodsLabel: periodRangeLabel(item.periodStart, item.periodEnd),
        startMin: interval ? interval.startMin : null,
        endMin: interval ? interval.endMin : null,
        start: interval ? interval.start : '',
        end: interval ? interval.end : '',
        note: item.note,
        adjustment: item,
      };
    });
  return [...regular, ...temporary].sort((a, b) => {
    if (a.startMin === null && b.startMin === null) return a.title.localeCompare(b.title, 'zh');
    if (a.startMin === null) return 1;
    if (b.startMin === null) return -1;
    return a.startMin - b.startMin;
  });
}

function getCourseWeeksText(course) {
  if (course.selfArranged) return '自排';
  return course.weekStart === course.weekEnd ? `第${course.weekStart}周` : `${course.weekStart}–${course.weekEnd}周`;
}

/* ---------------- 任务与统计 ---------------- */

function taskAppliesOn(task, date) {
  if (task.deletedDate && date >= task.deletedDate) return false;
  if (date < task.createdAt) return false;
  if (!task.active) {
    if (!task.pausedAt || date >= task.pausedAt) return false;
  }
  if (task.repeat === 'daily') return true;
  if (task.repeat === 'weekdays') return weekdayIndex(date) >= 1 && weekdayIndex(date) <= 5;
  if (task.repeat === 'custom') return task.weekdays.includes(weekdayIndex(date));
  return false;
}

function getOverride(date, taskId) {
  return (state.overrides[date] && state.overrides[date][taskId]) || null;
}

function getDueItems(date) {
  const recurring = state.tasks
    .filter((task) => taskAppliesOn(task, date))
    .map((task) => {
      const override = getOverride(date, task.id);
      return {
        id: task.id,
        title: task.title,
        target: override?.target || task.target,
        unit: task.unit,
        preferredTime: override?.time || task.preferredTime,
        duration: override?.duration || task.duration,
        note: task.note,
        isExtra: false,
        sourceTask: task,
        override,
        kind: task.kind,
        anchor: task.anchor,
        priority: task.priority,
        repeat: task.repeat,
        weekdays: task.weekdays,
        createdAt: task.createdAt,
      };
    });
  const extras = state.extras
    .filter((extra) => extra.dueDate === date)
    .map((extra) => {
      const override = getOverride(date, extra.id);
      return {
        id: extra.id,
        title: extra.title,
        target: override?.target || extra.target,
        unit: extra.unit,
        preferredTime: override?.time || extra.preferredTime,
        duration: override?.duration || extra.duration,
        note: extra.note,
        isExtra: true,
        extra,
        override,
        kind: 'other',
        anchor: false,
        priority: extra.priority,
        repeat: 'once',
        weekdays: [],
        createdAt: extra.createdAt,
      };
    });
  return [...recurring, ...extras];
}

function getLog(date, taskId) {
  return (state.logs[date] && state.logs[date][taskId]) || null;
}

function logIsCompleted(log, target) {
  if (!log) return false;
  if (isSpecialStatus(log.status)) return false;
  return Number(log.actual) >= Number(target);
}

function logIsCounted(log) {
  return !log || log.status !== 'split';
}

function computeDayStats(date) {
  const rest = state.restDays.includes(date);
  const entries = getDueItems(date).map((item) => {
    const log = getLog(date, item.id);
    return {
      item,
      log,
      done: logIsCompleted(log, item.target),
      counted: logIsCounted(log),
    };
  });
  const countedEntries = entries.filter((entry) => entry.counted);
  const total = countedEntries.length;
  const completed = countedEntries.filter((entry) => entry.done).length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : null;
  return {
    date,
    rest,
    entries,
    countedEntries,
    total,
    completed,
    rate,
    backfilled: countedEntries.filter((entry) => entry.done && entry.log?.backfilled).length,
    allDone: !rest && total > 0 && completed === total,
  };
}

function computeWeekOverview(weekStart) {
  const today = todayISO();
  const days = [];
  let total = 0;
  let completed = 0;
  let perfectDays = 0;
  let backfilled = 0;
  for (let i = 0; i < 7; i += 1) {
    const date = addDays(weekStart, i);
    const stats = computeDayStats(date);
    const future = date > today;
    if (!future) {
      total += stats.total;
      completed += stats.completed;
      backfilled += stats.backfilled;
      if (stats.allDone) perfectDays += 1;
    }
    days.push({ date, stats, future });
  }
  return {
    weekStart,
    days,
    total,
    completed,
    rate: total ? Math.round((completed / total) * 100) : null,
    perfectDays,
    backfilled,
    futureDays: days.filter((day) => day.future).length,
  };
}

function computeOverallStats() {
  const today = todayISO();
  const startedDate = state.meta.startedDate;
  let cursor = startedDate > today ? today : startedDate;
  let total = 0;
  let completed = 0;
  let perfectDays = 0;
  let activeDays = 0;
  let restDays = 0;
  let backfilled = 0;
  let guard = 0;
  const lastDate = today;
  while (cursor <= lastDate && guard < 1500) {
    const stats = computeDayStats(cursor);
    if (stats.rest) {
      restDays += 1;
    } else if (stats.total > 0) {
      activeDays += 1;
      total += stats.total;
      completed += stats.completed;
      backfilled += stats.backfilled;
      if (stats.allDone) perfectDays += 1;
    }
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return {
    total,
    completed,
    rate: total ? Math.round((completed / total) * 100) : null,
    perfectDays,
    activeDays,
    restDays,
    backfilled,
    streak: computeStreak(),
  };
}

function computeStreak() {
  const today = todayISO();
  const startedDate = state.meta.startedDate;
  let cursor = today;
  let streak = 0;
  let guard = 0;
  while (cursor >= startedDate && guard < 1500) {
    const stats = computeDayStats(cursor);
    if (stats.rest || stats.total === 0) {
      cursor = addDays(cursor, -1);
      guard += 1;
      continue;
    }
    if (!stats.allDone) {
      if (cursor === today) {
        cursor = addDays(cursor, -1);
        guard += 1;
        continue;
      }
      break;
    }
    streak += 1;
    cursor = addDays(cursor, -1);
    guard += 1;
  }
  return streak;
}

function getReview(date) {
  return state.reviews[date] || null;
}

function getRecentReviewBefore(date) {
  const dates = Object.keys(state.reviews)
    .filter((key) => key < date && daysBetween(key, date) <= 14)
    .sort();
  for (let i = dates.length - 1; i >= 0; i -= 1) {
    const review = state.reviews[dates[i]];
    if (review && review.top3 && review.top3.some(Boolean)) {
      return { date: dates[i], review };
    }
  }
  return null;
}

/* ---------------- 今日排程 ---------------- */

const ROUTINES = [
  { key: 'breakfast', label: '早餐', start: 7 * 60, end: 7 * 60 + 30, startTime: '07:00', endTime: '07:30' },
  { key: 'lunch', label: '午餐与休息', start: 12 * 60, end: 13 * 60, startTime: '12:00', endTime: '13:00' },
  { key: 'dinner', label: '晚餐与休息', start: 18 * 60, end: 19 * 60, startTime: '18:00', endTime: '19:00' },
  { key: 'sleep', label: '准备休息', start: 23 * 60 + 30, end: 24 * 60, startTime: '23:30', endTime: '24:00' },
];

function slotIsFree(start, duration, busy) {
  const end = start + duration;
  if (start < SEARCH_START || end > SEARCH_END) return false;
  return busy.every((interval) => {
    if (interval.end <= interval.start) return true;
    const buffer = interval.routine ? 0 : SLOT_BUFFER;
    return end + buffer <= interval.start || start >= interval.end + buffer;
  });
}

function findNearestSlot(preferred, duration, busy) {
  if (duration > SEARCH_END - SEARCH_START) return null;
  const candidates = [];
  if (preferred >= SEARCH_START && preferred + duration <= SEARCH_END) candidates.push(preferred);
  for (let offset = SLOT_STEP; offset <= DAY_MINUTES; offset += SLOT_STEP) {
    const later = preferred + offset;
    const earlier = preferred - offset;
    if (later + duration <= SEARCH_END) candidates.push(later);
    if (earlier >= SEARCH_START) candidates.push(earlier);
  }
  candidates.sort((a, b) => Math.abs(a - preferred) - Math.abs(b - preferred) || a - b);
  for (const start of candidates) {
    if (slotIsFree(start, duration, busy)) return start;
  }
  return null;
}

function buildDaySchedule(date) {
  const items = getDueItems(date);
  const courses = getDayCourseItems(date).filter((course) => course.startMin !== null && course.endMin !== null);
  const busy = courses.map((course) => ({ start: course.startMin, end: course.endMin, label: course.title }));
  const routineEntries = ROUTINES.map((routine) => ({
    ...routine,
    conflict: courses.some((course) => overlaps(routine.start, routine.end, course.startMin, course.endMin)),
  }));
  for (const routine of ROUTINES) {
    busy.push({ start: routine.start, end: routine.end, label: routine.label, routine: true, buffer: false });
  }

  const prepared = items.map((item) => {
    const preferred = timeToMinutes(item.preferredTime) ?? 9 * 60;
    return {
      ...item,
      preferredMin: preferred,
      fixed: Boolean(item.anchor || item.override?.time),
      assignedStart: null,
      assignedTime: null,
      assignedEnd: null,
      autoAdjusted: false,
      unscheduled: false,
      conflicts: [],
    };
  });

  const fixedItems = prepared.filter((item) => item.fixed).sort((a, b) => a.preferredMin - b.preferredMin || a.priority - b.priority);
  const flexibleItems = prepared.filter((item) => !item.fixed).sort((a, b) => a.priority - b.priority || a.preferredMin - b.preferredMin);

  for (const item of fixedItems) {
    const start = item.preferredMin;
    const end = start + item.duration;
    item.assignedStart = start;
    item.assignedTime = minutesToTime(start);
    item.assignedEnd = end <= DAY_MINUTES ? minutesToTime(end) : minutesToTime(DAY_MINUTES - 1);
    if (end > SEARCH_END) {
      item.conflicts.push('会占用到很晚');
    }
    for (const course of courses) {
      if (overlaps(start, Math.min(end, DAY_MINUTES), course.startMin, course.endMin)) {
        item.conflicts.push(`与「${course.title}」冲突`);
      }
    }
    for (const routine of ROUTINES) {
      if (overlaps(start, Math.min(end, DAY_MINUTES), routine.start, routine.end)) {
        item.conflicts.push(`与${routine.label}时间重叠`);
      }
    }
    busy.push({ start, end: end > SEARCH_END ? SEARCH_END : end, label: item.title });
    item.autoAdjusted = false;
  }

  const placed = [];
  for (const item of flexibleItems) {
    const start = findNearestSlot(item.preferredMin, item.duration, busy);
    if (start === null) {
      item.unscheduled = true;
      item.assignedTime = null;
      item.conflicts.push('今天排不下完整时段');
    } else {
      const end = start + item.duration;
      item.assignedStart = start;
      item.assignedTime = minutesToTime(start);
      item.assignedEnd = minutesToTime(end);
      item.autoAdjusted = start !== item.preferredMin;
      busy.push({ start, end, label: item.title });
    }
    placed.push(item);
  }

  const allItems = [...fixedItems, ...placed].sort((a, b) => {
    if (a.unscheduled && !b.unscheduled) return 1;
    if (!a.unscheduled && b.unscheduled) return -1;
    return (a.assignedStart ?? 9999) - (b.assignedStart ?? 9999);
  });

  const totalTaskMinutes = items.reduce((sum, item) => sum + Number(item.duration || 0), 0);
  const courseMinutes = courses.reduce((sum, course) => sum + Math.max(0, course.endMin - course.startMin), 0);
  const conflictCount = allItems.filter((item) => item.conflicts.length > 0 || item.unscheduled).length;
  return {
    date,
    items: allItems,
    courses,
    routines: routineEntries,
    conflictCount,
    unscheduledCount: allItems.filter((item) => item.unscheduled).length,
    totalTaskMinutes,
    courseMinutes,
    loadMinutes: totalTaskMinutes + courseMinutes,
  };
}

/* ---------------- 小工具 ---------------- */

function logTargetForItem(item) {
  return Number(item.target) || 1;
}

function getItemProgress(item, date) {
  const log = getLog(date, item.id);
  const target = logTargetForItem(item);
  return {
    log,
    target,
    actual: log ? Number(log.actual) || 0 : 0,
    done: logIsCompleted(log, target),
    special: log ? isSpecialStatus(log.status) : false,
    status: log?.status || null,
  };
}

function formatSlot(item) {
  if (item.unscheduled) return '待排';
  return item.assignedTime || '—';
}

function formatPeriodRange(periodStart, periodEnd) {
  const interval = getCourseInterval(Number(periodStart), Number(periodEnd));
  return interval ? `${interval.start}–${interval.end}` : '—';
}

function scheduleCompletionMessage(stats, date) {
  const isToday = date === todayISO();
  const dayWord = isToday ? '今天' : '这一天';
  if (stats.rest) return `${dayWord}是休息日，恢复也是计划的一部分。`;
  if (stats.total === 0) return `${dayWord}没有固定任务，给自己留一点空白。`;
  if (stats.allDone) return `${dayWord}的安排都完成了，可以安心收尾。`;
  if (stats.completed > 0) return `已完成 ${stats.completed}/${stats.total} 项，按自己的节奏继续。`;
  if (!isToday) return '这一天还没有留下完成记录。';
  return '还没开始也没关系，从最小的一步开始。';
}

function dayHeadline(date, stats) {
  const isToday = date === todayISO();
  if (stats.rest) return `${isToday ? '今天' : '这一天'}休息，恢复也是计划。`;
  if (stats.allDone) return `${isToday ? '今天的' : '这一天的'}安排，都收好了。`;
  if (!isToday) return `${relativeDateName(date)}的安排。`;
  if (stats.total === 0) return '今天留一点空白。';
  return '今天，先做眼前这一件。';
}

function weekPercentForDisplay(overview) {
  return overview.rate === null ? '—' : `${overview.rate}%`;
}

function dayStatusText(stats, future) {
  if (future) return '—';
  if (stats.rest) return '休';
  if (stats.total === 0) return '—';
  return `${stats.rate}%`;
}

/* =========================================================
   界面渲染
   ========================================================= */

function truncateText(value, max = 90) {
  const text = String(value || '').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function currentTab() {
  const tab = location.hash.replace(/^#/, '');
  return ['today', 'courses', 'tasks', 'review', 'more'].includes(tab) ? tab : 'today';
}

function pageTitles(tab) {
  return {
    today: '今天',
    courses: '课程表',
    tasks: '任务库',
    review: '每日复盘',
    more: '设置与数据',
  }[tab] || '每日执行力';
}

function setScrollPosition(top) {
  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  window.scrollTo(0, top);
  requestAnimationFrame(() => {
    root.style.scrollBehavior = previousBehavior;
  });
}

function renderApp(options = {}) {
  if (!state) return;
  const tab = currentTab();
  const previousY = window.scrollY;
  const pageLabel = tab === 'today' && ui.activeDate !== todayISO()
    ? (ui.activeDate > todayISO() ? '未来安排' : '历史记录')
    : pageTitles(tab);
  document.title = `${pageLabel} · 每日执行力计划`;
  document.querySelectorAll('.tab-link').forEach((link) => {
    const active = link.dataset.tab === tab;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const view = document.getElementById('view');
  if (!view) return;

  let content = '';
  if (tab === 'today') content = renderTodayPage();
  else if (tab === 'courses') content = renderCoursesPage();
  else if (tab === 'tasks') content = renderTasksPage();
  else if (tab === 'review') content = renderReviewPage();
  else content = renderMorePage();

  view.innerHTML = content;
  updateSaveState();

  if (options.scrollTop) {
    setScrollPosition(0);
  } else if (options.preserveScroll !== false) {
    requestAnimationFrame(() => {
      setScrollPosition(previousY);
    });
  }
  bindRenderedPage(tab);
}

function bindRenderedPage(tab) {
  if (tab === 'review') {
    const dateInput = document.getElementById('review-date');
    if (dateInput) {
      dateInput.addEventListener('change', () => {
        if (!isISODate(dateInput.value)) return;
        if (dateInput.value > todayISO()) {
          dateInput.value = todayISO();
          showToast('未来的复盘还不能写，先过好今天。');
          return;
        }
        ui.reviewDate = dateInput.value;
        renderApp({ scrollTop: false });
      });
    }
  }
}

function renderDateNav(date) {
  const today = todayISO();
  return `
    <div class="date-nav" data-testid="date-nav">
      <button type="button" class="date-nav-btn" data-action="change-date" data-offset="-1" aria-label="前一天">
        ${ico('chevronLeft')}
      </button>
      <div class="date-nav-label">
        <strong>${esc(relativeDateName(date))}</strong> · ${esc(formatMonthDay(date))} ${WEEKDAY_NAMES[weekdayIndex(date)]}
      </div>
      <button type="button" class="date-nav-btn" data-action="change-date" data-offset="1" aria-label="后一天">
        ${ico('chevronRight')}
      </button>
      ${date !== today ? `
        <button type="button" class="date-nav-btn" data-action="go-today" aria-label="回到今天" title="回到今天">
          ${ico('home')}
        </button>
      ` : ''}
    </div>
  `;
}

function renderHero(date, stats, schedule, overall, overview) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const percent = stats.rest ? 0 : (stats.rate ?? 0);
  const dashoffset = circumference - (circumference * percent) / 100;
  const weekInfo = getWeekInfo(date);
  const dayWord = date === todayISO() ? '今天' : '这一天';
  const weekPill = weekInfo.inSemester ? `第${weekInfo.week}周 · ${WEEKDAY_NAMES[weekdayIndex(date)]}` : weekLabel(date);
  let message = '不用把每一格填满，先完成最重要的一件。';
  if (stats.rest) message = `${dayWord}是休息日，完成率不参与计算。愿意做一点也可以，不必有负担。`;
  else if (stats.allDone) message = `记录是真实的，${dayWord}的安排已经收好。`;
  else if (schedule.conflictCount > 0) message = `有 ${schedule.conflictCount} 处安排和课程或作息冲突，可以看看简化建议。`;
  else if (date > todayISO()) message = '这是未来的安排，先心里有数，当天再来打卡。';
  else if (date < todayISO()) message = '历史记录按真实打卡计算，补记会单独标记。';
  else if (stats.completed === 0) message = '从最小的一步开始，做 5 分钟也算开始。';
  const rateLabel = stats.rest ? '休' : (stats.rate === null ? '—' : `${stats.rate}%`);
  return `
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-top">
        <span class="hero-week"><span class="live-dot"></span>${esc(weekPill)}</span>
        <span style="font-size:10.5px;color:rgba(255,255,255,.5)">${esc(formatMonthDay(date))}</span>
      </div>
      <div class="hero-headline">
        <div>
          <div class="hero-kicker">${stats.rest ? (dayWord === '今天' ? '今日节奏' : '当日节奏') : (dayWord === '今天' ? '今日完成率' : '当日完成率')}</div>
          <h2 class="hero-title" id="hero-title">${esc(scheduleCompletionMessage(stats, date))}</h2>
          <p class="hero-sub">${schedule.courses.length ? `${dayWord}有 ${schedule.courses.length} 门固定课程。` : `${dayWord}没有固定课程。`}${schedule.items.length ? ` ${schedule.items.length} 项任务已尽量避开课程。` : ''}</p>
        </div>
        <div class="ring-wrap" aria-label="今日完成率 ${rateLabel}">
          <svg class="ring-svg" viewBox="0 0 88 88" aria-hidden="true">
            <circle class="ring-bg" cx="44" cy="44" r="${radius}"></circle>
            <circle class="ring-fg" cx="44" cy="44" r="${radius}"
              stroke-dasharray="${circumference.toFixed(1)}"
              stroke-dashoffset="${dashoffset.toFixed(1)}"></circle>
          </svg>
          <div class="ring-label"><strong>${rateLabel}</strong><span>${stats.rest ? '休息日' : '完成'}</span></div>
        </div>
      </div>
      <div class="hero-bottom">
        <div class="hero-kpi">
          <strong data-testid="completed-count">${stats.completed}<span style="font-size:12px;font-weight:500;color:rgba(255,255,255,.56)"> / ${stats.total}</span></strong>
          <span>已完成任务</span>
        </div>
        <div class="hero-kpi">
          <strong>${overall.streak}<span style="font-size:12px;font-weight:500;color:rgba(255,255,255,.56)"> 天</span></strong>
          <span>连续达成</span>
        </div>
        <div class="hero-kpi">
          <strong>${overview.rate === null ? '—' : `${overview.rate}%`}</strong>
          <span>${startOfWeek(date) === startOfWeek(todayISO()) ? '本周完成率' : '这一周完成率'}</span>
        </div>
      </div>
      <div class="hero-message">
        ${ico(stats.allDone ? 'leaf' : 'sparkle')}
        <span>${esc(message)}</span>
      </div>
    </section>
  `;
}

function renderCourseCard(item) {
  const isAdjustment = item.type === 'adjustment';
  const action = isAdjustment ? 'edit-adjustment' : 'edit-course';
  const timeLabel = item.start || '待定';
  const rangeLabel = item.start && item.end ? `${item.start}–${item.end}` : '时间待定';
  return `
    <button type="button" class="course-item is-clickable" data-action="${action}" data-id="${esc(item.id)}" data-testid="course-card">
      <span class="course-time">
        <strong>${esc(timeLabel)}</strong>
        <span>${esc(item.periodsLabel)}</span>
      </span>
      <span class="course-main">
        <span class="task-title-row">
          <span class="course-title">${esc(item.title)}</span>
          ${isAdjustment ? '<span class="badge badge-warm">临时</span>' : ''}
        </span>
        <span class="course-meta">
          <span>${ico('clock')}${esc(rangeLabel)}</span>
          ${item.room ? `<span>${ico('pin')}${esc(item.room)}</span>` : ''}
          ${item.teacher ? `<span>${ico('user')}${esc(item.teacher)}</span>` : ''}
        </span>
      </span>
      <span style="align-self:center;color:var(--muted-light);width:16px;height:16px">${ico('chevronRight')}</span>
    </button>
  `;
}

function renderRoutineStrip(schedule) {
  return `
    <div class="routine-strip" aria-label="用餐和休息的节奏建议">
      ${schedule.routines.map((routine) => `
        <span class="routine-chip" title="${routine.conflict ? '这个时段与课程重叠，请灵活安排' : '节奏参考'}">
          ${ico(routine.key === 'sleep' ? 'moon' : 'clock')}
          ${esc(routine.label)} ${routine.startTime}${routine.endTime === '24:00' ? ' 起' : `–${routine.endTime}`}${routine.conflict ? ' · 与课程重叠' : ''}
        </span>
      `).join('')}
    </div>
  `;
}

function taskBadges(item, progress, date) {
  const badges = [];
  if (item.isExtra) badges.push(`<span class="badge badge-gray">${item.extra?.movedFrom ? '顺延补做' : '临时'}</span>`);
  if (item.override?.simplified) badges.push('<span class="badge badge-warm">今日简化</span>');
  if (progress.log?.backfilled && progress.done) badges.push('<span class="badge badge-warm">补记</span>');
  if (progress.log?.status === 'postponed') badges.push('<span class="badge badge-warm">已顺延</span>');
  if (progress.log?.status === 'split') badges.push('<span class="badge badge-warm">已拆分</span>');
  if (progress.log?.status === 'skipped') badges.push('<span class="badge badge-gray">已跳过</span>');
  if (progress.log && !progress.special && progress.actual > 0 && !progress.done) badges.push('<span class="badge badge-warm">部分完成</span>');
  if (item.conflicts && item.conflicts.length) badges.push('<span class="badge badge-red">时间冲突</span>');
  if (date > todayISO()) badges.push('<span class="badge badge-gray">未来</span>');
  return badges.join('');
}

function renderTaskCard(item, date, stats) {
  const progress = getItemProgress(item, date);
  const isFuture = date > todayISO();
  const target = progress.target;
  const percentage = clamp(Math.round((progress.actual / Math.max(1, target)) * 100), 0, 100);
  const special = progress.log?.status;
  const completeDisabled = isFuture || special === 'split' || special === 'postponed';
  const checkClass = progress.done ? 'is-done' : (progress.actual > 0 ? 'is-partial' : '');
  const timeText = item.unscheduled ? '待排' : (item.assignedTime || item.preferredTime || '—');
  const endText = item.assignedEnd || '';
  let metaText = progress.log
    ? `${progress.actual} / ${target}${esc(item.unit)}`
    : `目标 ${target}${esc(item.unit)}`;
  if (progress.log?.note && special === 'postponed') metaText = esc(progress.log.note);
  else if (progress.log?.note && special === 'split') metaText = '原任务已拆成单独的小项';
  let completedLabel = '';
  if (progress.done && progress.log?.completedAt) {
    completedLabel = `${progress.log.backfilled ? '补记于 ' : ''}${formatTimeOnly(progress.log.completedAt)} 完成`;
  }
  const statusLabel = progress.log && LOG_STATUS_LABELS[progress.log.status] ? LOG_STATUS_LABELS[progress.log.status] : '';
  const note = item.note ? `<div class="task-note">${esc(truncateText(item.note, 88))}</div>` : '';
  const showProgress = progress.actual > 0 && !progress.done && progress.log;
  const actionButtons = [];
  if (!isFuture) {
    if (special === 'postponed') {
      actionButtons.push(`<button type="button" class="task-link accent" data-action="restore-postponed" data-id="${esc(item.id)}" data-date="${esc(date)}">撤销顺延</button>`);
    } else if (special === 'split') {
      actionButtons.push(`<button type="button" class="task-link accent" data-action="restore-split" data-id="${esc(item.id)}" data-date="${esc(date)}">撤销拆分</button>`);
    } else {
      actionButtons.push(`<button type="button" class="task-link" data-action="open-progress" data-id="${esc(item.id)}" data-date="${esc(date)}">记实际</button>`);
    }
  }
  actionButtons.push(`<button type="button" class="task-link" data-action="adjust-task" data-id="${esc(item.id)}" data-date="${esc(date)}">调整</button>`);
  if (progress.done) {
    actionButtons.push(`<button type="button" class="task-link" data-action="uncomplete-task" data-id="${esc(item.id)}" data-date="${esc(date)}">撤销完成</button>`);
  }
  return `
    <article class="task-card ${progress.done ? 'is-completed' : ''} ${progress.actual > 0 && !progress.done ? 'is-partial' : ''} ${item.conflicts?.length ? 'has-conflict' : ''}" data-testid="task-card" data-task-id="${esc(item.id)}">
      <div class="task-time">
        <strong>${esc(timeText)}</strong>
        <span>${item.unscheduled ? '完整时段不足' : `${esc(endText || '')}${endText ? ' 结束' : formatDuration(item.duration)}`}</span>
        <span>${formatDuration(item.duration)}</span>
        ${item.autoAdjusted ? `<span class="task-auto">${ico('sparkle')}已避开课程</span>` : ''}
      </div>
      <div class="task-main">
        <div class="task-title-row">
          <button type="button" class="task-title task-title-btn" data-action="open-task-detail" data-id="${esc(item.id)}" data-date="${esc(date)}">${esc(item.title)}</button>
          ${taskBadges(item, progress, date)}
        </div>
        <div class="task-meta">
          <span>${metaText}</span>
          ${item.autoAdjusted && !item.unscheduled ? '<span class="sep"></span><span>原建议 ' + esc(item.preferredTime) + '</span>' : ''}
          ${completedLabel ? `<span class="sep"></span><span>${esc(completedLabel)}</span>` : ''}
          ${!progress.log && statusLabel ? `<span class="sep"></span><span>${esc(statusLabel)}</span>` : ''}
          ${item.conflicts?.length ? `<span class="sep"></span><span>${esc(item.conflicts[0])}</span>` : ''}
        </div>
        ${note}
        ${showProgress ? `
          <div class="task-progress">
            <div class="task-progress-track"><div class="task-progress-fill" style="width:${percentage}%"></div></div>
            <span>${percentage}%</span>
          </div>
        ` : ''}
        <div class="task-actions">
          ${actionButtons.join('')}
          ${special ? `<span class="task-link" style="color:var(--muted-light)">${esc(LOG_STATUS_LABELS[special] || '')}</span>` : ''}
        </div>
      </div>
      <div class="check-wrap">
        <button type="button" class="check-btn ${checkClass}" data-action="toggle-complete"
          data-id="${esc(item.id)}" data-date="${esc(date)}"
          ${completeDisabled ? 'disabled' : ''}
          aria-label="${progress.done ? '撤销完成' : '完成'}：${esc(item.title)}"
          aria-pressed="${progress.done ? 'true' : 'false'}">
          ${ico('check')}
        </button>
      </div>
    </article>
  `;
}

function renderWeekCard(date) {
  const overview = computeWeekOverview(startOfWeek(date));
  const isCurrentWeek = startOfWeek(date) === startOfWeek(todayISO());
  const bars = overview.days.map(({ date: dayDate, stats, future }) => {
    const isToday = dayDate === todayISO();
    const rate = stats.rest ? null : stats.rate;
    const height = rate === null ? 0 : Math.max(rate, rate > 0 ? 4 : 3);
    const label = dayStatusText(stats, future);
    return `
      <div class="bar-col ${isToday ? 'is-today' : ''} ${stats.rest ? 'is-rest' : ''} ${future ? 'is-future' : ''}"
        title="${esc(formatMonthDay(dayDate))} ${future ? '（未来）' : stats.rest ? '休息日' : stats.total ? `${stats.completed}/${stats.total} 项` : '无任务'}">
        <div class="bar-rate">${esc(label)}</div>
        <div class="bar-track"><div class="bar-fill" style="height:${height}%"></div></div>
        <div class="bar-day">${WEEKDAY_SHORT[weekdayIndex(dayDate)]}</div>
      </div>
    `;
  }).join('');
  return `
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">${isCurrentWeek ? '本周完成' : '这一周完成'}</h2>
        <span class="section-note">${esc(formatWeekRange(startOfWeek(date)))}</span>
      </div>
      <div class="card week-card">
        <div class="week-summary">
          <div><strong>${overview.completed} / ${overview.total} 次</strong><br><span>按实际打卡统计</span></div>
          <span>${overview.perfectDays} 天全完成${overview.backfilled ? ` · 含 ${overview.backfilled} 次补记` : ''}</span>
        </div>
        <div class="week-bars" role="img" aria-label="本周每日完成率">${bars}</div>
      </div>
    </section>
  `;
}

function renderFocusCard(date) {
  const isToday = date === todayISO();
  const isFuture = date > todayISO();
  const previous = getRecentReviewBefore(date);
  if (!previous) {
    if (isFuture) {
      return `
        <section class="section">
          <div class="focus-card">
            <div class="focus-kicker">${ico('moon')} 睡前 5 分钟</div>
            <p style="margin-top:8px;font-size:13px;line-height:1.7;color:var(--ink-soft)">这一天还没到。当天结束时，再来留 5 分钟。</p>
          </div>
        </section>
      `;
    }
    return `
      <section class="section">
        <div class="focus-card">
          <div class="focus-kicker">${ico('moon')} 睡前 5 分钟</div>
          <p style="margin-top:8px;font-size:13px;line-height:1.7;color:var(--ink-soft)">记录${isToday ? '今天' : '这一天'}真实发生的，不评判，也不补写完美的一天。</p>
          <button type="button" class="text-btn" style="margin-top:5px;padding-left:0" data-action="open-review" data-date="${esc(date)}">${isToday ? '写今天的复盘' : '补写这一天的复盘'} ${ico('arrowRight')}</button>
        </div>
      </section>
    `;
  }
  const label = (daysBetween(previous.date, date) === 1 && isToday)
    ? '昨天留给今天的 3 件事'
    : `${formatMonthDay(previous.date)} 的复盘`;
  return `
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">${esc(label)}</h2>
        ${isFuture ? '' : `<button type="button" class="text-btn" data-action="open-review" data-date="${esc(date)}">${isToday ? '去复盘' : '去补写'}</button>`}
      </div>
      <div class="focus-card">
        <div class="focus-kicker">${ico('bookOpen')} 上一次写下的重点</div>
        <ol>${previous.review.top3.filter(Boolean).map((item) => `<li>${esc(item)}</li>`).join('')}</ol>
        <div class="focus-foot"><span>${esc(formatMonthDay(previous.date))} 写下的</span><span>不用全部做到</span></div>
      </div>
    </section>
  `;
}

function renderTodayPage() {
  const date = ui.activeDate;
  const today = todayISO();
  const stats = computeDayStats(date);
  const schedule = buildDaySchedule(date);
  const overview = computeWeekOverview(startOfWeek(date));
  const overall = computeOverallStats();
  const review = getReview(date);
  const selfCourses = getSelfArrangedCourses();
  const isPast = date < today;
  const isFuture = date > today;
  const isToday = date === today;
  const dayWord = isToday ? '今天' : '这一天';
  const reviewActionLabel = review
    ? (isToday ? '查看今日复盘' : '查看当日复盘')
    : (isToday ? '写今日复盘' : '补写这天的复盘');
  const simplified = Object.values(state.overrides[date] || {}).some((item) => item.simplified);
  const futureNote = isFuture ? `<div class="notice">${ico('info')}<div>这是未来日期。可以先查看安排；打卡会在当天开放，避免把计划误记成完成。</div></div>` : '';
  const pastNote = isPast ? `<div class="notice">${ico('info')}<div>正在查看历史日期。补记的完成记录会标记为「补记」，并和当天实际打卡区分。</div></div>` : '';
  const restNote = stats.rest ? `
    <div class="notice notice-green">${ico('leaf')}
      <div>${dayWord}是休息日，不计入完成率和连续达成。想动一动也可以，按自己的状态来。
        <div class="notice-actions"><button type="button" class="btn btn-sm btn-ghost" data-action="toggle-rest" data-date="${esc(date)}">取消休息日</button></div>
      </div>
    </div>` : '';
  const simplifiedNote = simplified ? `
    <div class="notice notice-warm">${ico('sun')}
      <div>${dayWord}已应用简化方案，长期目标没有被修改。
        <div class="notice-actions">
          <button type="button" class="btn btn-sm btn-ghost" data-action="simplify-reset" data-date="${esc(date)}">恢复${isToday ? '今日' : '当日'}原计划</button>
          <button type="button" class="btn btn-sm btn-ghost" data-action="open-simplify" data-date="${esc(date)}">查看简化项</button>
        </div>
      </div>
    </div>` : '';
  const conflictNote = (schedule.conflictCount > 0 && isToday) ? `
    <div class="notice notice-warm">${ico('alert')}
      <div>${dayWord}有 ${schedule.conflictCount} 处安排与课程或作息冲突。可以先压缩目标，或把任务顺延，不必硬塞。
        <div class="notice-actions">
          <button type="button" class="btn btn-sm btn-warm" data-action="open-simplify" data-date="${esc(date)}">查看简化建议</button>
        </div>
      </div>
    </div>` : '';
  const courseSection = schedule.courses.length ? `
    <div class="course-list">${schedule.courses.map(renderCourseCard).join('')}</div>
  ` : `
    <div class="empty-state" style="padding:20px 16px">
      <div class="empty-icon">${ico('calendar')}</div>
      <strong>${dayWord}没有固定课程</strong>
      <p>没有课的时间不是必须填满，留给任务和休息。</p>
    </div>
  `;
  const selfNote = selfCourses.length ? `
    <button type="button" class="self-item" data-action="navigate" data-tab="courses" style="width:100%;margin-top:8px;text-align:left">
      <strong>${selfCourses.length} 门自排课程</strong>
      <span>课表没有固定时间，未自动排入${isToday ? '今天' : '这一天'} ${ico('arrowRight')}</span>
    </button>
  ` : '';
  const taskSection = schedule.items.length ? `
    <div class="task-list">${schedule.items.map((item) => renderTaskCard(item, date, stats)).join('')}</div>
  ` : `
    <div class="empty-state">
      <div class="empty-icon">${ico('leaf')}</div>
      <strong>${dayWord}没有安排任务</strong>
      <p>如果这是刻意的休息，就安心休息；如果不是，可以加一项 5 分钟就能开始的小任务。</p>
      <button type="button" class="btn btn-sm btn-soft" data-action="open-extra-modal" data-date="${esc(date)}">${ico('plus')} 添加临时任务</button>
    </div>
  `;
  const pastOrFutureNotice = futureNote + pastNote + restNote + simplifiedNote + conflictNote;
  const planLabel = isFuture ? '预览任务' : (isToday ? '今日任务' : '当日任务');
  return `
    <div class="page page-today">
      <header class="page-head">
        <div class="eyebrow"><span class="dot"></span>${esc(formatFullDate(date))} · ${WEEKDAY_NAMES[weekdayIndex(date)]} · ${esc(weekLabel(date))}</div>
        <h1 class="page-title">${esc(dayHeadline(date, stats))}</h1>
        <p class="page-sub">${schedule.courses.length ? `${dayWord}有 ${schedule.courses.length} 门固定课程` : `${dayWord}没有固定课程`}，${stats.total} 项任务${schedule.conflictCount ? `，${schedule.conflictCount} 处需要你决定怎么调整` : '，时间已尽量错开'}。所有记录只保存在这台设备。</p>
      </header>
      ${renderDateNav(date)}
      ${renderHero(date, stats, schedule, overall, overview)}
      <div class="action-row" style="margin-bottom:18px">
        ${isFuture
          ? `<button type="button" class="btn btn-primary" disabled>${ico('book')} 当天再复盘</button>`
          : `<button type="button" class="btn btn-primary" data-action="open-review" data-date="${esc(date)}">${ico('book')}${reviewActionLabel}</button>`}
        <button type="button" class="btn btn-ghost" data-action="open-extra-modal" data-date="${esc(date)}">${ico('plus')} 临时任务</button>
        ${isToday ? `<button type="button" class="btn btn-ghost" data-action="toggle-rest" data-date="${esc(date)}">${stats.rest ? '取消休息' : '今天休息'}</button>` : ''}
      </div>
      ${pastOrFutureNotice}
      <div class="today-layout">
        <div class="today-main">
          <section class="section">
            <div class="section-head">
              <h2 class="section-title">${isToday ? '今日课程' : '当日课程'} <span class="count">${schedule.courses.length}</span></h2>
              <button type="button" class="text-btn" data-action="navigate" data-tab="courses">课程表 ${ico('chevronRight')}</button>
            </div>
            ${courseSection}
            ${selfNote}
            ${renderRoutineStrip(schedule)}
          </section>
          <section class="section">
            <div class="section-head">
              <h2 class="section-title">${planLabel} <span class="count">${stats.total}</span></h2>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end">
                ${schedule.items.length ? `<button type="button" class="text-btn muted" data-action="open-simplify" data-date="${esc(date)}">简化</button>` : ''}
                <button type="button" class="text-btn" data-action="open-extra-modal" data-date="${esc(date)}">${ico('plus')} 临时</button>
              </div>
            </div>
            ${taskSection}
            <div style="margin-top:12px;display:flex;justify-content:flex-end">
              <button type="button" class="text-btn muted" data-action="toggle-rest" data-date="${esc(date)}">${stats.rest ? '取消休息日' : (isToday ? '今天状态不好？设为休息日' : '将这一天设为休息日')}</button>
            </div>
          </section>
        </div>
        <aside class="today-side">
          ${renderWeekCard(date)}
          ${renderFocusCard(date)}
        </aside>
      </div>
      <p class="footer-note">数据保存在当前浏览器。清理 Safari 网站数据、换设备或使用其他浏览器，都可能看不到这里的记录。</p>
    </div>
  `;
}

/* ---------------- 课程页 ---------------- */

function getWeekStartByNumber(weekNumber) {
  const base = startOfWeek(state.settings.semesterStart);
  return addDays(base, (weekNumber - 1) * 7);
}

function renderMiniCourse(item) {
  return `
    <button type="button" class="mini-course" data-action="${item.type === 'adjustment' ? 'edit-adjustment' : 'edit-course'}" data-id="${esc(item.id)}">
      <span class="mini-time">${esc(item.start || '—')}<br><span style="font-size:9px">${esc(item.periodsLabel)}</span></span>
      <span class="mini-main">
        <strong>${esc(item.title)}</strong>
        <small>${[item.room, item.teacher].filter(Boolean).map(esc).join(' · ') || '地点待定'}</small>
      </span>
      ${item.type === 'adjustment' ? '<span class="badge badge-warm">临时</span>' : ''}
    </button>
  `;
}

function renderCoursesPage() {
  const totalWeeks = state.settings.totalWeeks;
  ui.courseWeek = clamp(ui.courseWeek || getWeekInfo().week || 1, 1, totalWeeks);
  const week = ui.courseWeek;
  const weekStart = getWeekStartByNumber(week);
  const today = todayISO();
  const currentWeek = clamp(getWeekInfo().week, 1, totalWeeks);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const dayGroups = days.map((date) => {
    const items = getDayCourseItems(date);
    const isToday = date === today;
    return `
      <section class="day-group ${isToday ? 'is-today' : ''}">
        <div class="day-header">
          <div class="day-name">${WEEKDAY_NAMES[weekdayIndex(date)]} <small>${esc(formatMonthDay(date))}</small></div>
          ${isToday ? '<span class="today-mark">今天</span>' : ''}
        </div>
        <div class="day-courses">
          ${items.length ? items.map(renderMiniCourse).join('') : '<div class="day-empty">无固定课程</div>'}
        </div>
      </section>
    `;
  }).join('');
  const selfCourses = getSelfArrangedCourses();
  const selfBlock = selfCourses.length ? `
    <div class="self-arranged" style="margin-top:14px">
      <div class="self-arranged-head">
        <strong>自排课程 · ${selfCourses.length} 门</strong>
        <span>不自动占用时间</span>
      </div>
      <div class="self-list">
        ${selfCourses.map((course) => `
          <button type="button" class="self-item" data-action="edit-course" data-id="${esc(course.id)}" style="width:100%;text-align:left">
            <strong>${esc(course.name)}</strong>
            <span>${esc(course.teacher || '教师待定')} ${ico('chevronRight')}</span>
          </button>
        `).join('')}
      </div>
      <p class="help-text" style="margin-top:10px">原课表标记为「全部自排」，没有给出固定星期、节次和周次。应用不会替你编造上课时间，也不会把它排进每日计划。</p>
    </div>
  ` : '';
  return `
    <div class="page page-courses">
      <header class="page-head">
        <div class="eyebrow"><span class="dot"></span>${esc(currentSemesterTitle())} · ${esc(weekLabel(weekStart))}</div>
        <h1 class="page-title">课程表，按周来。</h1>
        <p class="page-sub">只显示当前教学周真正开课的课程。点击课程可以修改教室、节次和周次；临时调课只影响指定日期。</p>
      </header>
      <div class="page-toolbar">
        <div class="week-switcher">
          <button type="button" data-action="course-week-prev" aria-label="上一周" ${week <= 1 ? 'disabled' : ''}>${ico('chevronLeft')}</button>
          <div class="week-label">第 ${week} 周<small>${esc(formatWeekRange(weekStart))}</small></div>
          <button type="button" data-action="course-week-next" aria-label="下一周" ${week >= totalWeeks ? 'disabled' : ''}>${ico('chevronRight')}</button>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          ${week !== currentWeek ? `<button type="button" class="text-btn" data-action="course-week-current">回本周</button>` : ''}
          <button type="button" class="btn btn-sm btn-primary" data-action="add-course">${ico('plus')} 课程</button>
        </div>
      </div>
      <div class="course-legend">
        <span><i></i>固定课程</span>
        <span><i class="warm"></i>临时调课</span>
        <span>${esc(formatWeekRange(weekStart))}</span>
      </div>
      <div style="height:12px"></div>
      ${dayGroups}
      ${selfBlock}
      <div class="notice" style="margin-top:14px">${ico('clock')}
        <div>上课铃声时间按「参考节次时间」折算，可在「更多 → 节次参考时间」中修改。不会编造课表中不存在的上课日期。</div>
      </div>
      <div class="action-row">
        <button type="button" class="btn btn-ghost" data-action="add-adjustment" data-date="${esc(weekStart)}">${ico('plus')} 临时调课</button>
        <button type="button" class="btn btn-ghost" data-action="navigate" data-tab="today">回到今日</button>
      </div>
      <p class="footer-note">课程数据来自你提供的 2026–2027 学年第一学期课表，可在应用内修改。</p>
    </div>
  `;
}

/* ---------------- 任务库 ---------------- */

function taskCompletionHistoryCount(taskId) {
  let count = 0;
  for (const date of Object.keys(state.logs)) {
    const log = state.logs[date][taskId];
    if (!log) continue;
    if (log.status === 'done' || (log.actual > 0 && !isSpecialStatus(log.status))) {
      const item = getDueItems(date).find((entry) => entry.id === taskId);
      if (item && logIsCompleted(log, item.target)) count += 1;
    }
  }
  return count;
}

function renderTaskLibraryCard(task) {
  const finished = taskCompletionHistoryCount(task.id);
  const scheduleText = REPEAT_LABELS[task.repeat] || '每天';
  return `
    <article class="library-card ${task.active ? '' : 'is-paused'}" data-testid="library-task">
      <div class="library-top">
        <div>
          <div class="library-title">${esc(task.title)}</div>
          <div class="library-sub">${esc(scheduleText)} · 目标 ${task.target}${esc(task.unit)} · 建议 ${esc(task.preferredTime)} · ${formatDuration(task.duration)}</div>
        </div>
        ${task.active ? '<span class="badge badge-green">进行中</span>' : '<span class="badge badge-gray">已暂停</span>'}
      </div>
      ${task.note ? `<div class="task-note">${esc(task.note)}</div>` : ''}
      <div class="library-actions">
        <button type="button" class="text-btn" data-action="edit-task" data-id="${esc(task.id)}">${ico('edit')} 编辑</button>
        <label class="switch" style="margin-left:auto">
          <input type="checkbox" data-action="toggle-task-active" data-id="${esc(task.id)}" ${task.active ? 'checked' : ''}>
          <span class="switch-ui" aria-hidden="true"></span>
          <span>${task.active ? '进行中' : '已暂停'}</span>
        </label>
        <button type="button" class="text-btn muted" style="min-width:32px;justify-content:center" data-action="delete-task" data-id="${esc(task.id)}" aria-label="删除任务">${ico('trash')}</button>
      </div>
      <div class="help-text" style="margin-top:5px">${finished ? `已有 ${finished} 次完成记录，修改目标不会改写过去。` : '还没有完成记录；从今天开始也不晚。'}</div>
    </article>
  `;
}

function renderTasksPage() {
  const visible = state.tasks.filter((task) => !task.deletedDate);
  const active = visible.filter((task) => task.active).sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt));
  const paused = visible.filter((task) => !task.active).sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt));
  return `
    <div class="page page-tasks">
      <header class="page-head">
        <div class="eyebrow"><span class="dot"></span>长期任务 · 你说了算</div>
        <h1 class="page-title">目标可以改，记录不能说谎。</h1>
        <p class="page-sub">新增、修改、暂停或删除任务都在这里。暂停只影响今天以后，已经发生的打卡记录会保留。</p>
      </header>
      <div class="action-row" style="margin-top:0;margin-bottom:16px">
        <button type="button" class="btn btn-primary" data-action="add-task">${ico('plus')} 新建长期任务</button>
        <button type="button" class="btn btn-ghost" data-action="open-extra-modal" data-date="${esc(todayISO())}">${ico('calendar')} 今天的临时任务</button>
      </div>
      <div class="notice">${ico('info')}<div>任务会按重复规则自动出现在当天计划里。调整今天的某个目标不会修改长期设定，除非你在这里编辑任务本身。</div></div>
      <section class="section">
        <div class="section-head">
          <h2 class="section-title">进行中 <span class="count">${active.length}</span></h2>
          <span class="section-note">按建议时间排序</span>
        </div>
        ${active.length ? `<div class="task-library">${active.map(renderTaskLibraryCard).join('')}</div>` : `
          <div class="empty-state"><div class="empty-icon">${ico('leaf')}</div><strong>还没有长期任务</strong><p>先加一项你愿意每天做的最小任务。</p></div>
        `}
      </section>
      ${paused.length ? `
        <section class="section">
          <div class="section-head"><h2 class="section-title">已暂停 <span class="count">${paused.length}</span></h2><span class="section-note">不会出现在今天</span></div>
          <div class="task-library">${paused.map(renderTaskLibraryCard).join('')}</div>
        </section>
      ` : ''}
      <p class="footer-note">删除长期任务会从今天起隐藏，过去记录仍保留用于统计；如有需要，请先导出备份。</p>
    </div>
  `;
}

/* ---------------- 复盘页 ---------------- */

function renderReviewPage() {
  const today = todayISO();
  if (!isISODate(ui.reviewDate) || ui.reviewDate > today) ui.reviewDate = today;
  const date = ui.reviewDate;
  const review = getReview(date);
  const stats = computeDayStats(date);
  const dueReviewTask = getDueItems(date).find((item) => item.kind === 'review');
  const reviewTaskProgress = dueReviewTask ? getItemProgress(dueReviewTask, date) : null;
  const canAutoCheck = Boolean(dueReviewTask && !reviewTaskProgress?.done && date <= today);
  const completedTitles = stats.countedEntries.filter((entry) => entry.done).map((entry) => entry.item.title);
  const isBackfill = date < today;
  const dayWord = date === today ? '今天' : '这一天';
  return `
    <div class="page page-review">
      <header class="page-head">
        <div class="eyebrow"><span class="dot"></span>${esc(formatFullDate(date))} · ${WEEKDAY_NAMES[weekdayIndex(date)]}${isBackfill ? ' · 补记' : ''}</div>
        <h1 class="page-title">${date === today ? '把今天收好。' : '把这一天收好。'}</h1>
        <p class="page-sub">不用写漂亮的小作文。记录完成了什么、哪里卡住，再给明天留三个真正重要的重点。</p>
      </header>
      <div class="review-date-row">
        <button type="button" class="date-nav-btn" data-action="review-date-prev" aria-label="前一天">${ico('chevronLeft')}</button>
        <input class="input" type="date" id="review-date" value="${esc(date)}" max="${today}" aria-label="复盘日期">
        <button type="button" class="date-nav-btn" data-action="review-date-next" aria-label="后一天" ${date >= today ? 'disabled' : ''}>${ico('chevronRight')}</button>
      </div>
      <form id="review-form" class="review-wrap" novalidate>
        <section class="review-card">
          <h2><span class="num">1</span>${dayWord}完成了什么？</h2>
          <div class="field">
            <textarea class="textarea" id="review-done" name="done" maxlength="2000" placeholder="哪怕只是背了 5 个单词，也值得记下。">${esc(review?.done || '')}</textarea>
            ${completedTitles.length ? `<button type="button" class="text-btn" style="justify-self:start;padding-left:0" data-action="fill-completed" data-date="${esc(date)}">${ico('sparkle')} 带入当天已完成的 ${completedTitles.length} 项</button>` : ''}
          </div>
        </section>
        <section class="review-card">
          <h2><span class="num">2</span>哪件事没有完成？</h2>
          <div class="field">
            <textarea class="textarea" id="review-unfinished" name="unfinished" maxlength="1000" style="min-height:72px" placeholder="写下事情本身，不给自己下判断。">${esc(review?.unfinished || '')}</textarea>
          </div>
        </section>
        <section class="review-card">
          <h2><span class="num">3</span>原因是什么？</h2>
          <div class="field">
            <textarea class="textarea" id="review-reason" name="reason" maxlength="1000" style="min-height:72px" placeholder="时间不够？任务太大？还是需要休息？">${esc(review?.reason || '')}</textarea>
          </div>
          <p class="review-hint">原因不是借口。看清卡点，才有机会换一个更小的做法。</p>
        </section>
        <section class="review-card">
          <h2><span class="num">4</span>明天最重要的三件事</h2>
          <p class="review-hint" style="margin-top:5px">只写三件。写多了，等于没有重点。</p>
          <div class="top3-list">
            ${[0, 1, 2].map((index) => `
              <label class="top3-item">
                <span class="top3-num">${index + 1}</span>
                <input class="input" type="text" name="top${index + 1}" maxlength="160" value="${esc(review?.top3?.[index] || '')}" placeholder="${index === 0 ? '最重要的一件' : '可选'}">
              </label>
            `).join('')}
          </div>
        </section>
        <div class="review-save">
          ${review && review.updatedAt ? `<div class="review-saved-note">${ico('check')} 上次保存：${esc(formatTimestamp(review.updatedAt))}${review.backfilled ? '（补记）' : ''}</div>` : ''}
          ${canAutoCheck ? `
            <label class="check-line">
              <input type="checkbox" id="review-auto-check" checked>
              <span>保存时同时完成「${esc(dueReviewTask.title)}」打卡${isBackfill ? '，并标记为补记' : ''}。</span>
            </label>
          ` : reviewTaskProgress?.done ? `<div class="review-saved-note">${ico('check')} ${dayWord}的「${esc(dueReviewTask.title)}」已经打卡。</div>` : ''}
          <div class="form-error" id="review-error" role="alert"></div>
          <button type="submit" class="btn btn-primary btn-block">${review ? '更新复盘' : '保存复盘'} ${ico('arrowRight')}</button>
          <p class="help-text" style="text-align:center">同步保存到当前浏览器；没有云端同步。</p>
        </div>
      </form>
      <p class="footer-note">复盘内容会按日期保存，可以随时回来修改。补记不会伪装成当天实时记录。</p>
    </div>
  `;
}

/* ---------------- 更多 / 设置 ---------------- */

function renderMorePage() {
  const overall = computeOverallStats();
  const currentWeek = computeWeekOverview(startOfWeek(todayISO()));
  const preImportRaw = (() => {
    try { return localStorage.getItem(PRE_IMPORT_KEY); } catch (error) { return null; }
  })();
  const storageUsage = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || '';
      return raw.length > 1024 ? `${Math.round(raw.length / 1024)} KB` : `${raw.length} B`;
    } catch (error) { return '无法读取'; }
  })();
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const reviewCount = Object.keys(state.reviews).length;
  const logDays = Object.keys(state.logs).length;
  return `
    <div class="page page-more">
      <header class="page-head">
        <div class="eyebrow"><span class="dot"></span>设置 · 数据 · 使用说明</div>
        <h1 class="page-title">让工具适应你，而不是反过来。</h1>
        <p class="page-sub">这里可以调整学期与节次、导出备份、查看真实统计，也可以查看安装到主屏幕的方法。</p>
      </header>
      <div class="stat-grid" data-testid="overall-stats">
        <div class="stat-tile accent"><strong>${overall.streak} 天</strong><span>连续达成 ${overall.streak ? '· 保持真实记录' : '· 从今天开始'}</span></div>
        <div class="stat-tile"><strong>${overall.rate === null ? '—' : `${overall.rate}%`}</strong><span>总体完成率 · ${overall.completed}/${overall.total} 次</span></div>
        <div class="stat-tile"><strong>${overall.completed}</strong><span>累计完成任务次数</span></div>
        <div class="stat-tile"><strong>${overall.perfectDays}</strong><span>全部完成的天数</span></div>
      </div>
      <p class="help-text" style="margin-top:8px">统计从 ${esc(formatFullDate(state.meta.startedDate))} 开始，只依据实际打卡；含 ${overall.backfilled} 次补记，另有 ${overall.restDays} 个休息日。本周完成率 ${weekPercentForDisplay(currentWeek)}。</p>

      <div class="list-section-label">数据与备份</div>
      <div class="list-card">
        <button type="button" class="list-row" data-action="export-data">
          <span class="list-row-icon">${ico('download')}</span>
          <span class="list-row-main"><strong>导出完整 JSON 备份</strong><small>任务、课程、打卡、复盘都会包含；最后导出：${state.meta.lastBackupAt ? esc(formatTimestamp(state.meta.lastBackupAt)) : '还没有导出过'}</small></span>
          <span class="chevron">${ico('chevronRight')}</span>
        </button>
        <button type="button" class="list-row" data-action="copy-data">
          <span class="list-row-icon">${ico('copy')}</span>
          <span class="list-row-main"><strong>复制备份文本</strong><small>可粘贴到备忘录，作为应急副本</small></span>
          <span class="chevron">${ico('chevronRight')}</span>
        </button>
        <button type="button" class="list-row" data-action="open-import">
          <span class="list-row-icon warm">${ico('upload')}</span>
          <span class="list-row-main"><strong>从 JSON 导入备份</strong><small>会覆盖当前数据，请先导出备份</small></span>
          <span class="chevron">${ico('chevronRight')}</span>
        </button>
        <button type="button" class="list-row" data-action="restore-preimport" ${preImportRaw ? '' : 'disabled'}>
          <span class="list-row-icon">${ico('refresh')}</span>
          <span class="list-row-main"><strong>恢复上次导入前的数据</strong><small>${preImportRaw ? '有一份可用的导入前快照' : '还没有导入过数据'}</small></span>
          <span class="chevron">${ico('chevronRight')}</span>
        </button>
      </div>
      <div class="warning-block"><strong>本地存储风险：</strong>数据保存在当前浏览器（Safari）的本地存储中。清理 Safari 网站数据、卸载或重装应用、换手机、换浏览器、使用无痕模式，都可能造成数据永久丢失。本应用没有实现云同步，也没有服务器账号系统。请定期导出 JSON 备份。</div>

      <div class="list-section-label">计划设置</div>
      <div class="list-card">
        <button type="button" class="list-row" data-action="open-settings">
          <span class="list-row-icon">${ico('calendar')}</span>
          <span class="list-row-main"><strong>学期与教学周</strong><small>${esc(formatFullDate(state.settings.semesterStart))} · 共 ${state.settings.totalWeeks} 周</small></span>
          <span class="chevron">${ico('chevronRight')}</span>
        </button>
        <button type="button" class="list-row" data-action="open-periods">
          <span class="list-row-icon">${ico('clock')}</span>
          <span class="list-row-main"><strong>节次参考时间</strong><small>课程按 1–12 节换算为具体时间，可自行修正</small></span>
          <span class="chevron">${ico('chevronRight')}</span>
        </button>
        <button type="button" class="list-row" data-action="navigate" data-tab="tasks">
          <span class="list-row-icon">${ico('book')}</span>
          <span class="list-row-main"><strong>管理长期任务</strong><small>目标、重复规则、暂停与删除</small></span>
          <span class="chevron">${ico('chevronRight')}</span>
        </button>
      </div>

      <div class="list-section-label">使用说明</div>
      <div class="list-card">
        <button type="button" class="list-row" data-action="open-guide">
          <span class="list-row-icon">${ico('book')}</span>
          <span class="list-row-main"><strong>每天怎么用、怎么改、怎么备份</strong><small>含补记规则、简化模式和数据恢复步骤</small></span>
          <span class="chevron">${ico('chevronRight')}</span>
        </button>
      </div>

      <div class="list-section-label">安装与离线</div>
      <div class="settings-card">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
          <strong style="font-size:13px;font-weight:650">${standalone ? '已作为主屏幕应用运行' : '添加到 iPhone 主屏幕'}</strong>
          <span class="badge ${standalone ? 'badge-green' : 'badge-gray'}">${standalone ? '已安装' : 'PWA'}</span>
        </div>
        ${standalone ? '<p class="help-text" style="margin-top:7px">从主屏幕启动时使用独立窗口，数据仍保存在这个浏览器容器中。定期备份仍然必要。</p>' : `
          <ol class="install-steps">
            <li>用 <strong>Safari</strong> 打开这个网站（不是微信内置浏览器）。</li>
            <li>点底部工具栏的「分享」按钮，向上滑动找到「添加到主屏幕」。</li>
            <li>确认名称「每日执行力」，点右上角「添加」。</li>
            <li>以后从主屏幕图标打开；离线时也能加载应用外壳，但数据只在当前设备。</li>
          </ol>
          <button type="button" class="btn btn-soft btn-block" style="margin-top:12px" data-action="install-pwa" ${deferredInstallPrompt ? '' : 'disabled'}>${deferredInstallPrompt ? '使用浏览器安装提示' : 'iPhone 请按上方步骤手动添加'}</button>
        `}
        <p class="help-text" style="margin-top:9px">当前网络：${navigator.onLine ? '在线' : '离线'}。应用支持离线打开，但本地数据不会自动跨设备同步。</p>
      </div>

      <div class="list-section-label">关于与限制</div>
      <div class="settings-card">
        <div class="list-row" style="min-height:auto;padding:0;border:0">
          <span class="list-row-icon">${ico('lock')}</span>
          <span class="list-row-main"><strong>本地优先，不上传数据</strong><small>没有账号、服务器或云同步。当前占用约 ${esc(storageUsage)}；${logDays} 天有任务记录，${reviewCount} 天有复盘。</small></span>
        </div>
        <div class="warning-block" style="margin-top:10px">
          <strong>已知限制：</strong>课程表中的「全部自排」课程没有固定星期、节次和周次，应用不会编造安排；节次换算使用可修改的参考时间；自动排程只处理任务与课程的冲突，极端的用餐/通勤冲突需要你手动调整。
        </div>
        <p class="help-text" style="margin-top:10px">版本 ${APP_VERSION} · 单页 PWA · 数据格式 v1</p>
      </div>

      <div class="danger-zone">
        <h3>恢复初始数据</h3>
        <p>这会删除当前任务修改、临时任务、课程修改、打卡和复盘，恢复最初的四项任务与十二门课程。无法撤销，请先导出备份。</p>
        <button type="button" class="btn btn-sm btn-danger" data-action="reset-data">恢复初始数据</button>
      </div>
      <p class="footer-note">每日执行力计划 · 为真实生活留出弹性<br>不羞辱、不虚构、不追求填满每一天。</p>
    </div>
  `;
}

/* =========================================================
   模态框与交互
   ========================================================= */

let activeModal = null;

function openSheet({ title, subtitle = '', body = '', footer = '', onMount = null, size = 'normal' }) {
  const root = document.getElementById('modal-root');
  if (!root) return;
  const previousFocus = document.activeElement;
  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div class="sheet-grab" aria-hidden="true"></div>
        <div class="sheet-head">
          <div>
            <h2 class="sheet-title" id="sheet-title">${esc(title)}</h2>
            ${subtitle ? `<p class="sheet-sub">${subtitle}</p>` : ''}
          </div>
          <button type="button" class="sheet-close" data-action="close-modal" aria-label="关闭">${ico('close')}</button>
        </div>
        <div class="sheet-body">${body}</div>
        ${footer ? `<div class="sheet-foot">${footer}</div>` : ''}
      </div>
    </div>
  `;
  document.body.classList.add('is-locked');
  activeModal = { previousFocus };
  const backdrop = root.querySelector('.modal-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) closeModal();
    });
  }
  if (typeof onMount === 'function') onMount(root);
  requestAnimationFrame(() => {
    const firstField = root.querySelector('.sheet-body input:not([type="hidden"]):not([disabled]), .sheet-body select:not([disabled]), .sheet-body textarea:not([disabled])');
    if (firstField) firstField.focus({ preventScroll: true });
  });
}

function closeModal() {
  const root = document.getElementById('modal-root');
  const previousFocus = activeModal?.previousFocus;
  activeModal = null;
  document.body.classList.remove('is-locked');
  if (root) root.innerHTML = '';
  if (previousFocus && typeof previousFocus.focus === 'function') {
    previousFocus.focus({ preventScroll: true });
  }
}

function showFormError(form, message) {
  const error = form.querySelector('.form-error');
  if (!error) {
    showToast(message);
    return;
  }
  error.textContent = message;
  error.classList.add('is-visible');
  error.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function clearFormError(form) {
  const error = form?.querySelector('.form-error');
  if (error) {
    error.textContent = '';
    error.classList.remove('is-visible');
  }
}

function showToast(message, options = {}) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  root.querySelectorAll('.toast').forEach((node) => node.remove());
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<span class="toast-msg">${esc(message)}</span>`;
  if (options.actionLabel && typeof options.onAction === 'function') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'toast-action';
    button.textContent = options.actionLabel;
    button.addEventListener('click', () => {
      options.onAction();
      removeToast(toast);
    });
    toast.appendChild(button);
  }
  const remove = () => removeToast(toast);
  root.appendChild(toast);
  const timer = window.setTimeout(remove, options.duration || 4200);
  toast.addEventListener('remove', () => window.clearTimeout(timer), { once: true });
}

function removeToast(toast) {
  if (!toast || !toast.isConnected) return;
  toast.classList.add('is-leaving');
  window.setTimeout(() => {
    toast.remove();
    toast.dispatchEvent(new Event('remove'));
  }, 220);
}

function toastWithUndo(message, undo) {
  showToast(message, {
    actionLabel: '撤销',
    duration: 5200,
    onAction: () => {
      undo();
      persist();
      renderApp();
      showToast('已撤销');
    },
  });
}

function currentModalTaskDate() {
  return activeModal?.taskDate || ui.activeDate;
}

function openTaskModal(taskId = null, options = {}) {
  const isExtra = options.scope === 'extra';
  const existingExtra = isExtra && taskId ? state.extras.find((item) => item.id === taskId) : null;
  const existingTask = !isExtra && taskId ? state.tasks.find((item) => item.id === taskId) : null;
  if (isExtra && taskId && !existingExtra) return;
  if (!isExtra && taskId && !existingTask) return;
  const task = isExtra ? existingExtra : existingTask;
  const dueDate = options.dueDate || task?.dueDate || todayISO();
  const title = task ? (isExtra ? '编辑临时任务' : '编辑长期任务') : (isExtra ? '添加临时任务' : '新建长期任务');
  const subtitle = isExtra
    ? '只影响指定日期，不计入长期重复计划。'
    : '任务会按照重复规则进入每日计划；目标以后随时能改。';
  const body = `
    <form id="task-form" class="form-stack" novalidate>
      <div class="field">
        <label class="field-label" for="task-title">任务名称 <span class="optional">必填</span></label>
        <input class="input" id="task-title" name="title" type="text" maxlength="60" value="${esc(task?.title || '')}" placeholder="例如：英语单词、专业课复习" required>
      </div>
      <div class="form-grid">
        <div class="field">
          <label class="field-label" for="task-target">每次目标数量</label>
          <input class="input" id="task-target" name="target" type="number" inputmode="numeric" min="1" max="9999" step="1" value="${esc(task?.target ?? 1)}">
        </div>
        <div class="field">
          <label class="field-label" for="task-unit">单位</label>
          <input class="input" id="task-unit" name="unit" type="text" maxlength="10" value="${esc(task?.unit || '次')}" placeholder="个 / 集 / 次">
        </div>
      </div>
      <div class="form-grid">
        <div class="field">
          <label class="field-label" for="task-time">建议时间</label>
          <input class="input" id="task-time" name="preferredTime" type="time" value="${esc(task?.preferredTime || '09:00')}">
        </div>
        <div class="field">
          <label class="field-label" for="task-duration">预计耗时（分钟）</label>
          <input class="input" id="task-duration" name="duration" type="number" inputmode="numeric" min="5" max="720" step="5" value="${esc(task?.duration ?? 30)}">
        </div>
      </div>
      ${isExtra ? `
        <div class="field">
          <label class="field-label" for="extra-date">日期</label>
          <input class="input" id="extra-date" name="dueDate" type="date" value="${esc(dueDate)}" required>
        </div>
      ` : `
        <div class="field">
          <span class="field-label">重复方式</span>
          <div class="segmented" role="group" aria-label="重复方式">
            <label><input type="radio" name="repeat" value="daily" ${(!task || task.repeat === 'daily') ? 'checked' : ''}>每天</label>
            <label><input type="radio" name="repeat" value="weekdays" ${task?.repeat === 'weekdays' ? 'checked' : ''}>工作日</label>
            <label><input type="radio" name="repeat" value="custom" ${task?.repeat === 'custom' ? 'checked' : ''}>自定义</label>
          </div>
        </div>
        <div class="field" id="weekday-field" style="${task?.repeat === 'custom' ? '' : 'display:none'}">
          <span class="field-label">选择星期</span>
          <div class="weekday-picker">
            ${WEEKDAY_NAMES.slice(1).map((name, index) => {
              const value = index + 1;
              const checked = task?.repeat === 'custom' && task.weekdays.includes(value);
              return `<label><input type="checkbox" name="weekdays" value="${value}" ${checked ? 'checked' : ''}><span>${name.slice(1)}</span></label>`;
            }).join('')}
          </div>
        </div>
      `}
      <div class="field">
        <label class="field-label" for="task-note">备注 <span class="optional">可选</span></label>
        <textarea class="textarea" id="task-note" name="note" maxlength="500" placeholder="写一句提醒自己怎么做，不写惩罚自己的话。">${esc(task?.note || '')}</textarea>
      </div>
      <div class="form-error" role="alert"></div>
    </form>
  `;
  const deleteButton = task ? `<button type="button" class="btn btn-ghost btn-danger" data-action="${isExtra ? 'delete-extra' : 'delete-task'}" data-id="${esc(task.id)}" style="color:var(--danger);border-color:var(--line)">删除</button>` : '';
  const footer = `
    ${deleteButton}
    <button type="submit" class="btn btn-primary" form="task-form">${task ? '保存修改' : '创建任务'}</button>
  `;
  openSheet({
    title,
    subtitle,
    body,
    footer,
    onMount(root) {
      const form = root.querySelector('#task-form');
      const repeatInputs = form.querySelectorAll('input[name="repeat"]');
      repeatInputs.forEach((input) => input.addEventListener('change', () => {
        const weekdayField = root.querySelector('#weekday-field');
        if (weekdayField) weekdayField.style.display = input.value === 'custom' ? '' : 'none';
      }));
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        clearFormError(form);
        const formData = new FormData(form);
        const taskTitle = String(formData.get('title') || '').trim();
        const target = Number(formData.get('target'));
        const unit = String(formData.get('unit') || '次').trim() || '次';
        const preferredTime = normalizeClock(String(formData.get('preferredTime') || '09:00'), '09:00');
        const duration = Math.round(Number(formData.get('duration')));
        const note = String(formData.get('note') || '').trim().slice(0, 500);
        if (!taskTitle) return showFormError(form, '请填写任务名称。');
        if (taskTitle.length > 60) return showFormError(form, '任务名称请控制在 60 个字以内。');
        if (!Number.isFinite(target) || target < 1 || target > 9999) return showFormError(form, '目标数量需在 1–9999 之间。');
        if (!Number.isFinite(duration) || duration < 5 || duration > 720) return showFormError(form, '预计耗时需在 5–720 分钟之间。');
        if (isExtra) {
          const dueDateValue = String(formData.get('dueDate') || '');
          if (!isISODate(dueDateValue)) return showFormError(form, '请选择有效日期。');
          if (existingExtra) {
            Object.assign(existingExtra, {
              title: taskTitle, target, unit, preferredTime, duration, note, dueDate: dueDateValue,
            });
          } else {
            state.extras.push({
              id: uid('extra'), title: taskTitle, target, unit, preferredTime, duration, note,
              dueDate: dueDateValue, priority: 5, sourceTaskId: null, splitGroup: null, movedFrom: null,
              createdAt: nowISO(),
            });
          }
          closeModal();
          persist();
          ui.activeDate = dueDateValue;
          renderApp({ scrollTop: false });
          showToast(existingExtra ? '临时任务已更新。' : '临时任务已添加。');
          return;
        }
        const repeat = String(formData.get('repeat') || 'daily');
        const weekdays = [...form.querySelectorAll('input[name="weekdays"]:checked')].map((input) => Number(input.value));
        if (repeat === 'custom' && weekdays.length === 0) return showFormError(form, '自定义重复至少选择一天。');
        if (existingTask) {
          Object.assign(existingTask, {
            title: taskTitle, target, unit, preferredTime, duration, note, repeat, weekdays,
          });
        } else {
          state.tasks.push({
            id: uid('task'), title: taskTitle, target, unit, preferredTime, duration, note, repeat, weekdays,
            active: true, pausedAt: null, deletedDate: null, priority: 5, anchor: false, kind: 'other',
            createdAt: todayISO(),
          });
        }
        closeModal();
        persist();
        renderApp({ scrollTop: false });
        showToast(existingTask ? '任务已更新，从今天起生效。' : '长期任务已创建。');
      });
    },
  });
}

/* ---------------- 打卡与今日调整 ---------------- */

function ensureDayLogs(date) {
  if (!state.logs[date]) state.logs[date] = {};
  return state.logs[date];
}

function writeLog(date, taskId, log) {
  ensureDayLogs(date)[taskId] = log;
}

function deleteLog(date, taskId) {
  if (!state.logs[date]) return;
  delete state.logs[date][taskId];
  if (Object.keys(state.logs[date]).length === 0) delete state.logs[date];
}

function cloneLog(log) {
  return log ? { ...log } : null;
}

function openProgressModal(taskId, date) {
  if (date > todayISO()) {
    showToast('未来的任务不能提前打卡，当天再来记录。');
    return;
  }
  const item = getDueItems(date).find((entry) => entry.id === taskId);
  if (!item) {
    showToast('没有找到这项任务。');
    return;
  }
  const log = getLog(date, taskId);
  const isBackfill = date < todayISO();
  const target = item.target;
  const body = `
    <form id="progress-form" class="form-stack" novalidate>
      <div class="progress-summary">
        <strong>${esc(item.title)}</strong>
        <span>${esc(formatFullDate(date))} · 目标 ${target}${esc(item.unit)} ${isBackfill ? '· 补记' : ''}</span>
      </div>
      <div class="field">
        <label class="field-label" for="actual-value">实际完成了多少 ${esc(item.unit)}？</label>
        <input class="input" id="actual-value" name="actual" type="number" inputmode="numeric" min="0" max="999999" step="1" value="${log ? esc(log.actual) : ''}" placeholder="填写真实数量">
        <div class="quick-row">
          <button type="button" class="quick-chip" data-value="${target}">全部 ${target}${esc(item.unit)}</button>
          <button type="button" class="quick-chip" data-value="${Math.max(1, Math.ceil(target / 2))}">一半 ${Math.max(1, Math.ceil(target / 2))}${esc(item.unit)}</button>
          <button type="button" class="quick-chip" data-value="1">只做了 1${esc(item.unit)}</button>
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="progress-note">备注 <span class="optional">可选</span></label>
        <textarea class="textarea" id="progress-note" name="note" maxlength="300" style="min-height:64px" placeholder="例如：只背了 12 个，晚上状态不好">${esc(log?.note || '')}</textarea>
      </div>
      <p class="help-text">${isBackfill ? '这是补记：记录会保留「补记」标记，不会伪装成当天实时打卡。' : '达到目标数量才算完成；少于目标会记为部分完成。'}</p>
      ${log?.updatedAt ? `<p class="help-text">上次记录：${esc(formatTimestamp(log.updatedAt))} · ${esc(LOG_STATUS_LABELS[log.status] || '')}</p>` : ''}
      <div class="form-error" role="alert"></div>
    </form>
  `;
  openSheet({
    title: '记录实际完成',
    subtitle: '记录你真正做了多少，不用凑一个好看的数字。',
    body,
    footer: `
      ${log ? '<button type="button" class="btn btn-ghost" id="delete-log" style="color:var(--danger);border-color:var(--line)">删除记录</button>' : ''}
      <button type="submit" class="btn btn-primary" form="progress-form">保存记录</button>
    `,
    onMount(root) {
      const form = root.querySelector('#progress-form');
      const actualInput = root.querySelector('#actual-value');
      root.querySelectorAll('.quick-chip').forEach((button) => {
        button.addEventListener('click', () => {
          actualInput.value = button.dataset.value;
          actualInput.focus();
        });
      });
      const deleteButton = root.querySelector('#delete-log');
      if (deleteButton) {
        deleteButton.addEventListener('click', () => {
          closeModal();
          openConfirm({
            title: '删除这条打卡记录？',
            message: '删除后，今日和本周统计会立即重算。这个操作可以用提示条撤销。',
            confirmLabel: '删除记录',
            danger: true,
            onConfirm: () => {
              const snapshot = cloneLog(getLog(date, taskId));
              deleteLog(date, taskId);
              persist();
              renderApp({ scrollTop: false });
              showToast('打卡记录已删除。', {
                actionLabel: '撤销',
                duration: 5200,
                onAction: () => {
                  if (snapshot) writeLog(date, taskId, snapshot);
                  persist();
                  renderApp({ scrollTop: false });
                  showToast('记录已恢复。');
                },
              });
            },
          });
        });
      }
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        clearFormError(form);
        const formData = new FormData(form);
        const actual = Math.round(Number(formData.get('actual')));
        const note = String(formData.get('note') || '').trim().slice(0, 300);
        if (!Number.isFinite(actual) || actual < 0 || actual > 999999) {
          return showFormError(form, '实际数量需在 0–999999 之间。');
        }
        if (!log && actual === 0 && !note) {
          return showFormError(form, '还没有填写完成数量。如果今天确实没做，可以直接关闭。');
        }
        const done = actual >= target;
        writeLog(date, taskId, {
          status: done ? 'done' : 'partial',
          actual,
          note,
          completedAt: done ? (log?.completedAt || nowISO()) : null,
          backfilled: isBackfill,
          updatedAt: nowISO(),
        });
        closeModal();
        persist();
        renderApp({ scrollTop: false });
        showToast(done ? `已记录：完成 ${actual}${item.unit}。` : `已记录 ${actual}/${target}${item.unit}，今天仍算未完成。`);
      });
    },
  });
}

function openAdjustTaskModal(taskId, date) {
  if (date > todayISO()) {
    const item = getDueItems(date).find((entry) => entry.id === taskId);
    if (!item) return;
  }
  const item = getDueItems(date).find((entry) => entry.id === taskId);
  if (!item) {
    showToast('没有找到这项任务。');
    return;
  }
  if (item.isExtra) {
    openTaskModal(item.id, { scope: 'extra', dueDate: date });
    return;
  }
  const task = item.sourceTask;
  const override = getOverride(date, taskId);
  const log = getLog(date, taskId);
  const progress = getItemProgress(item, date);
  const scheduleItem = buildDaySchedule(date).items.find((entry) => entry.id === taskId);
  const future = date > todayISO();
  const hasOverride = Boolean(override);
  const canSplit = !progress.special && progress.actual === 0 && item.target >= 2;
  const baseTarget = task.target;
  const baseDuration = task.duration;
  const body = `
    <form id="adjust-task-form" class="form-stack" novalidate>
      <div class="progress-summary">
        <strong>${esc(item.title)}</strong>
        <span>${esc(formatFullDate(date))} · 当前计划 ${esc(scheduleItem?.assignedTime || '待排')}${scheduleItem?.assignedEnd ? `–${esc(scheduleItem.assignedEnd)}` : ''} · ${formatDuration(item.duration)}</span>
      </div>
      <div class="form-grid">
        <div class="field">
          <label class="field-label" for="adjust-target">今日目标数量</label>
          <input class="input" id="adjust-target" name="target" type="number" inputmode="numeric" min="1" max="9999" step="1" value="${esc(item.target)}">
        </div>
        <div class="field">
          <label class="field-label" for="adjust-duration">今日预计耗时（分钟）</label>
          <input class="input" id="adjust-duration" name="duration" type="number" inputmode="numeric" min="5" max="720" step="5" value="${esc(item.duration)}">
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="adjust-time">今日开始时间</label>
        <input class="input" id="adjust-time" name="time" type="time" value="${esc(item.preferredTime)}">
        <div class="quick-row">
          <button type="button" class="quick-chip" data-shift="-15">提前 15 分</button>
          <button type="button" class="quick-chip" data-shift="15">推迟 15 分</button>
          <button type="button" class="quick-chip" data-shift="30">推迟 30 分</button>
          <button type="button" class="quick-chip" data-half-target="1">目标减半</button>
        </div>
      </div>
      <p class="help-text">只影响 ${esc(formatMonthDay(date))}，不会修改长期任务的默认目标。${progress.done ? '当前记录已完成；如果把目标调高，会重新变为未完成。' : ''}</p>
      <div class="form-error" role="alert"></div>
    </form>
    ${!future ? `
      <div class="adjust-divider"><span>把今天处理掉</span></div>
      <div class="field">
        <label class="field-label" for="adjust-note">原因 / 备注 <span class="optional">可选</span></label>
        <input class="input" id="adjust-note" type="text" maxlength="200" placeholder="例如：课程太满，今天只做一半">
      </div>
      <div class="adjust-actions">
        <div class="adjust-box">
          <strong>顺延到其他日期</strong>
          <p>原日期会标记为顺延，并在新日期增加一项补做。</p>
          <div class="inline-control">
            <input class="input" type="date" id="postpone-date" value="${esc(addDays(date, 1))}" min="${esc(date < todayISO() ? todayISO() : addDays(date, 1))}">
            <button type="button" class="btn btn-sm btn-ghost" id="postpone-button">顺延</button>
          </div>
        </div>
        <div class="adjust-box">
          <strong>拆成小块</strong>
          <p>把「${esc(item.title)}」拆成几项分别打卡，适合一次做不完的时候。</p>
          <div class="inline-control">
            <input class="input" type="number" inputmode="numeric" id="split-parts" min="2" max="6" step="1" value="${item.target >= 3 ? Math.min(3, item.target) : 2}" ${canSplit ? '' : 'disabled'}>
            <button type="button" class="btn btn-sm btn-ghost" id="split-button" ${canSplit ? '' : 'disabled'}>拆分</button>
          </div>
          ${!canSplit ? `<p class="help-text">${progress.actual > 0 ? '已有完成记录，先撤销记录才能拆分。' : '目标太小或状态已变更，暂时不能拆分。'}</p>` : ''}
        </div>
        <div class="adjust-box">
          <strong>今天跳过</strong>
          <p>计入未完成，但不会影响长期任务；可以随时撤销。</p>
          <button type="button" class="btn btn-sm btn-ghost" id="skip-button">${progress.status === 'skipped' ? '撤销跳过' : '标记为跳过'}</button>
        </div>
      </div>
    ` : `<div class="notice notice-warm" style="margin:10px 0 0">${ico('info')}<div>这是未来日期，只能提前调整计划；顺延、跳过和拆分请当天再操作。</div></div>`}
  `;
  openSheet({
    title: '调整今天',
    subtitle: '计划可以改。改小一点，常常比放弃更有用。',
    body,
    footer: `
      ${hasOverride ? '<button type="button" class="btn btn-ghost" id="reset-adjust">恢复默认</button>' : ''}
      <button type="submit" class="btn btn-primary" form="adjust-task-form">保存今日调整</button>
    `,
    onMount(root) {
      const form = root.querySelector('#adjust-task-form');
      const targetInput = root.querySelector('#adjust-target');
      const durationInput = root.querySelector('#adjust-duration');
      const timeInput = root.querySelector('#adjust-time');
      root.querySelectorAll('[data-shift]').forEach((button) => {
        button.addEventListener('click', () => {
          const current = timeToMinutes(timeInput.value) ?? timeToMinutes(item.preferredTime) ?? 540;
          const next = clamp(current + Number(button.dataset.shift), 0, 23 * 60 + 59);
          timeInput.value = minutesToTime(next);
        });
      });
      root.querySelectorAll('[data-half-target]').forEach((button) => {
        button.addEventListener('click', () => {
          const current = Math.max(1, Number(targetInput.value) || 1);
          targetInput.value = Math.max(1, Math.ceil(current / 2));
        });
      });
      const resetButton = root.querySelector('#reset-adjust');
      if (resetButton) {
        resetButton.addEventListener('click', () => {
          if (state.overrides[date]) {
            delete state.overrides[date][taskId];
            if (Object.keys(state.overrides[date]).length === 0) delete state.overrides[date];
          }
          closeModal();
          persist();
          renderApp({ scrollTop: false });
          showToast('已恢复这一天的默认计划。');
        });
      }
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        clearFormError(form);
        const target = Math.round(Number(targetInput.value));
        const duration = Math.round(Number(durationInput.value));
        const time = normalizeClock(timeInput.value, task.preferredTime);
        if (!(target >= 1 && target <= 9999)) return showFormError(form, '目标数量需在 1–9999 之间。');
        if (!(duration >= 5 && duration <= 720)) return showFormError(form, '预计耗时需在 5–720 分钟之间。');
        const entry = { ...(override || {}) };
        if (target !== baseTarget) entry.target = target; else delete entry.target;
        if (duration !== baseDuration) entry.duration = duration; else delete entry.duration;
        if (time !== task.preferredTime) entry.time = time; else delete entry.time;
        if (override?.simplified) entry.simplified = true;
        const meaningful = Object.keys(entry).filter((key) => entry[key] !== undefined && entry[key] !== null);
        if (meaningful.length === 0) {
          if (state.overrides[date]) {
            delete state.overrides[date][taskId];
            if (Object.keys(state.overrides[date]).length === 0) delete state.overrides[date];
          }
        } else {
          if (!state.overrides[date]) state.overrides[date] = {};
          state.overrides[date][taskId] = entry;
        }
        closeModal();
        persist();
        renderApp({ scrollTop: false });
        showToast('今日计划已调整。长期目标没有改变。');
      });

      if (!future) {
        const noteInput = root.querySelector('#adjust-note');
        root.querySelector('#postpone-button')?.addEventListener('click', () => {
          const targetDate = root.querySelector('#postpone-date').value;
          if (!isISODate(targetDate)) return showToast('请选择有效的顺延日期。');
          if (targetDate <= date || targetDate < todayISO()) return showToast('顺延日期需要晚于原日期。');
          if (state.extras.some((extra) => extra.movedFrom === date && extra.sourceTaskId === item.id)) {
            return showToast('这项任务已经顺延过一次了。');
          }
          const targetItems = getDueItems(targetDate);
          if (targetItems.some((entry) => entry.id === item.id)) {
            const ok = window.confirm('目标日期本来就有这项任务，顺延后会多出一项「补做」。仍要继续吗？');
            if (!ok) return;
          }
          const extra = applyPostpone(item, date, targetDate, noteInput?.value || '');
          closeModal();
          persist();
          renderApp({ scrollTop: false });
          showToast(`已顺延到 ${formatMonthDay(targetDate)}。`, {
            actionLabel: '查看',
            onAction: () => {
              ui.activeDate = targetDate;
              renderApp({ scrollTop: true });
            },
          });
          if (extra) void extra;
        });
        root.querySelector('#split-button')?.addEventListener('click', () => {
          const parts = Math.round(Number(root.querySelector('#split-parts').value));
          if (!(parts >= 2 && parts <= 6)) return showToast('请选择 2–6 个部分。');
          if (item.target < parts) return showToast('目标数量比分块数量还少，不需要拆分。');
          if (getItemProgress(item, date).actual > 0) return showToast('已有完成记录，请先调整或删除记录。');
          const group = applySplit(item, date, parts, noteInput?.value || '');
          closeModal();
          persist();
          renderApp({ scrollTop: false });
          showToast(`已拆成 ${parts} 项，可以分别打卡。`, {
            actionLabel: '撤销',
            duration: 5200,
            onAction: () => {
              restoreSplit(item.id, date, group);
              persist();
              renderApp({ scrollTop: false });
              showToast('已撤销拆分。');
            },
          });
        });
        root.querySelector('#skip-button')?.addEventListener('click', () => {
          if (progress.status === 'skipped') {
            deleteLog(date, taskId);
            closeModal();
            persist();
            renderApp({ scrollTop: false });
            showToast('已撤销跳过。');
            return;
          }
          const reason = noteInput?.value.trim();
          const ok = window.confirm(`把「${item.title}」标记为 ${formatMonthDay(date)} 跳过吗？${reason ? `\n原因：${reason}` : ''}`);
          if (!ok) return;
          const snapshot = cloneLog(getLog(date, taskId));
          writeLog(date, taskId, {
            status: 'skipped',
            actual: 0,
            note: reason ? reason.slice(0, 300) : '',
            completedAt: null,
            backfilled: date < todayISO(),
            updatedAt: nowISO(),
          });
          closeModal();
          persist();
          renderApp({ scrollTop: false });
          showToast('已标记为跳过，不计为完成。', {
            actionLabel: '撤销',
            duration: 5200,
            onAction: () => {
              if (snapshot) writeLog(date, taskId, snapshot); else deleteLog(date, taskId);
              persist();
              renderApp({ scrollTop: false });
              showToast('已撤销跳过。');
            },
          });
        });
      }
    },
  });
}

function applyPostpone(item, date, targetDate, note) {
  const extraId = uid('extra');
  const cleanNote = String(note || '').trim().slice(0, 180);
  writeLog(date, item.id, {
    status: 'postponed',
    actual: 0,
    note: `顺延至 ${formatMonthDay(targetDate)}${cleanNote ? `：${cleanNote}` : ''}`.slice(0, 300),
    completedAt: null,
    backfilled: date < todayISO(),
    updatedAt: nowISO(),
  });
  state.extras.push({
    id: extraId,
    title: item.title,
    target: item.target,
    unit: item.unit,
    preferredTime: item.preferredTime,
    duration: item.duration,
    note: `从 ${formatMonthDay(date)} 顺延${cleanNote ? `：${cleanNote}` : ''}`.slice(0, 500),
    dueDate: targetDate,
    priority: item.priority,
    sourceTaskId: item.id,
    splitGroup: null,
    movedFrom: date,
    createdAt: nowISO(),
  });
  return extraId;
}

function applySplit(item, date, parts, note) {
  const group = uid('split');
  const targetBase = Math.floor(item.target / parts);
  const targetRest = item.target % parts;
  const durationBase = Math.max(5, Math.floor(item.duration / parts));
  const cleanNote = String(note || '').trim().slice(0, 120);
  for (let index = 0; index < parts; index += 1) {
    state.extras.push({
      id: uid('extra'),
      title: `${item.title}（${index + 1}/${parts}）`.slice(0, 80),
      target: targetBase + (index < targetRest ? 1 : 0),
      unit: item.unit,
      preferredTime: item.preferredTime,
      duration: Math.max(5, durationBase),
      note: `由 ${formatMonthDay(date)} 的「${item.title}」拆分${cleanNote ? `：${cleanNote}` : ''}`.slice(0, 500),
      dueDate: date,
      priority: item.priority,
      sourceTaskId: item.id,
      splitGroup: group,
      movedFrom: null,
      createdAt: nowISO(),
    });
  }
  writeLog(date, item.id, {
    status: 'split',
    actual: 0,
    note: `拆成 ${parts} 项，分别打卡`,
    completedAt: null,
    backfilled: date < todayISO(),
    updatedAt: nowISO(),
  });
  return group;
}

function restoreSplit(taskId, date, group) {
  const extras = state.extras.filter((extra) => extra.splitGroup === group);
  for (const extra of extras) deleteLog(extra.dueDate, extra.id);
  state.extras = state.extras.filter((extra) => extra.splitGroup !== group);
  const log = getLog(date, taskId);
  if (log?.status === 'split') deleteLog(date, taskId);
}

function restorePostponed(taskId, date) {
  const moved = state.extras.filter((extra) => extra.movedFrom === date && extra.sourceTaskId === taskId);
  const movedIds = new Set(moved.map((extra) => extra.id));
  for (const extra of moved) deleteLog(extra.dueDate, extra.id);
  state.extras = state.extras.filter((extra) => !movedIds.has(extra.id));
  const log = getLog(date, taskId);
  if (log?.status === 'postponed') deleteLog(date, taskId);
}

function openSimplifyModal(date) {
  if (date < todayISO()) {
    showToast('过去的日期不能整体简化；可以点任务旁的「调整」单独补记。');
    return;
  }
  const schedule = buildDaySchedule(date);
  if (!schedule.items.length) {
    showToast('这一天没有任务，已经足够轻了。');
    return;
  }
  const durationHalf = schedule.items.reduce((sum, item) => {
    const next = item.duration <= 10 ? item.duration : Math.max(10, Math.round(item.duration / 2 / 5) * 5);
    return sum + next;
  }, 0);
  const conflictItems = schedule.items.filter((item) => item.conflicts.length || item.unscheduled);
  const body = `
    <div class="simplify-hero">
      <div class="simplify-icon">${ico('sun')}</div>
      <div><strong>忙的时候，计划应该变短，而不是变成失败。</strong><p>简化只影响 ${esc(formatMonthDay(date))}，长期目标不变。</p></div>
    </div>
    <div class="simplify-preview">
      <div><span>现在</span><strong>${schedule.items.length} 项 · ${formatDuration(schedule.totalTaskMinutes)}</strong></div>
      <div><span>目标减半</span><strong>${schedule.items.length} 项各自减半 · 仍按实际打卡</strong></div>
    </div>
    ${conflictItems.length ? `
      <div class="notice notice-warm">${ico('alert')}<div>有 ${conflictItems.length} 项排得比较紧：${conflictItems.slice(0, 3).map((item) => esc(item.title)).join('、')}${conflictItems.length > 3 ? ' 等' : ''}。可以先减量，仍冲突就用「调整 → 顺延」。</div></div>
    ` : ''}
    <div class="simplify-options">
      <button type="button" class="simplify-option" data-simplify-mode="target">
        <span class="simplify-option-icon">${ico('chart')}</span>
        <span><strong>把今日目标减半</strong><small>每项至少保留 1；例如 30 个单词改为 15 个</small></span>
        ${ico('chevronRight')}
      </button>
      <button type="button" class="simplify-option" data-simplify-mode="duration">
        <span class="simplify-option-icon">${ico('clock')}</span>
        <span><strong>把预计耗时减半</strong><small>总计约 ${formatDuration(durationHalf)}；每项最少 10 分钟</small></span>
        ${ico('chevronRight')}
      </button>
      <button type="button" class="simplify-option" data-simplify-mode="both">
        <span class="simplify-option-icon">${ico('sparkle')}</span>
        <span><strong>目标和耗时都减半</strong><small>适合课程很满、状态一般的日子</small></span>
        ${ico('chevronRight')}
      </button>
    </div>
    <div class="notice" style="margin-top:4px">${ico('info')}<div>如果今天真的不适合执行，设为休息日比硬撑着打卡更诚实。休息日不计完成率和连续天数。</div></div>
  `;
  openSheet({
    title: '今天简化一点',
    subtitle: '不是降低标准，是把今天调到能完成的难度。',
    body,
    footer: `
      <button type="button" class="btn btn-ghost" id="simplify-rest">${state.restDays.includes(date) ? '取消休息日' : '设为休息日'}</button>
      <button type="button" class="btn btn-primary" data-action="close-modal">先这样</button>
    `,
    onMount(root) {
      root.querySelectorAll('[data-simplify-mode]').forEach((button) => {
        button.addEventListener('click', () => {
          const changed = applySimplify(date, button.dataset.simplifyMode);
          if (!changed) {
            showToast('每一项都已经很小了，不需要再减。可以设为休息日。');
            return;
          }
          closeModal();
          persist();
          renderApp({ scrollTop: false });
          showToast('已应用今日简化，长期目标没有改变。');
        });
      });
      root.querySelector('#simplify-rest').addEventListener('click', () => {
        const isRest = state.restDays.includes(date);
        if (isRest) state.restDays = state.restDays.filter((item) => item !== date);
        else state.restDays = [...new Set([...state.restDays, date])].sort();
        closeModal();
        persist();
        renderApp({ scrollTop: false });
        showToast(isRest ? '已取消休息日。' : '已设为休息日，不计入完成率和连续达成。');
      });
    },
  });
}

function applySimplify(date, mode) {
  const items = getDueItems(date);
  let changed = 0;
  for (const item of items) {
    const existing = getOverride(date, item.id) || {};
    const entry = { ...existing };
    let itemChanged = false;
    if (mode === 'target' || mode === 'both') {
      const nextTarget = Math.max(1, Math.ceil(item.target / 2));
      if (nextTarget < item.target) {
        entry.target = nextTarget;
        itemChanged = true;
      }
    }
    if (mode === 'duration' || mode === 'both') {
      const nextDuration = item.duration <= 10 ? item.duration : Math.max(10, Math.round(item.duration / 2 / 5) * 5);
      if (nextDuration < item.duration) {
        entry.duration = nextDuration;
        itemChanged = true;
      }
    }
    if (!itemChanged) continue;
    entry.simplified = true;
    if (!state.overrides[date]) state.overrides[date] = {};
    state.overrides[date][item.id] = entry;
    changed += 1;
  }
  return changed;
}

function openConfirm({ title, message, confirmLabel = '确认', danger = false, onConfirm }) {
  const body = `<div class="confirm-body">${ico(danger ? 'alert' : 'info')}<p>${esc(message).replace(/\n/g, '<br>')}</p></div>`;
  openSheet({
    title,
    body,
    footer: `
      <button type="button" class="btn btn-ghost" data-action="close-modal">取消</button>
      <button type="button" class="btn ${danger ? 'btn-danger-solid' : 'btn-primary'}" id="confirm-yes">${esc(confirmLabel)}</button>
    `,
    onMount(root) {
      root.querySelector('#confirm-yes').addEventListener('click', () => {
        closeModal();
        onConfirm();
      });
    },
  });
}

/* ---------------- 课程编辑 ---------------- */

function renderWeekdaySelect(selected) {
  return WEEKDAY_NAMES.slice(1).map((name, index) => {
    const value = index + 1;
    return `<option value="${value}" ${Number(selected) === value ? 'selected' : ''}>${name}</option>`;
  }).join('');
}

function openCourseModal(courseId = null, options = {}) {
  const course = courseId ? state.courses.find((item) => item.id === courseId) : null;
  if (courseId && !course) return;
  const isNew = !course;
  const currentWeek = clamp(getWeekInfo(options.date || ui.activeDate).week || 1, 1, state.settings.totalWeeks);
  const selectedWeek = clamp(options.week || ui.courseWeek || currentWeek, 1, state.settings.totalWeeks);
  const fallbackWeekday = options.date ? weekdayIndex(options.date) : weekdayIndex(getWeekStartByNumber(selectedWeek));
  const weekStart = course?.weekStart ?? selectedWeek;
  const weekEnd = course?.weekEnd ?? selectedWeek;
  const periodStart = course?.periodStart ?? 1;
  const periodEnd = course?.periodEnd ?? 2;
  const selfArranged = course?.selfArranged ?? false;
  const body = `
    <form id="course-form" class="form-stack" novalidate>
      <div class="field">
        <label class="field-label" for="course-name">课程名称 <span class="optional">必填</span></label>
        <input class="input" id="course-name" name="name" type="text" maxlength="80" value="${esc(course?.name || '')}" placeholder="例如：AI+高级嵌入式系统" required>
      </div>
      <div class="form-grid">
        <div class="field">
          <label class="field-label" for="course-code">课程编号 <span class="optional">可选</span></label>
          <input class="input" id="course-code" name="code" type="text" maxlength="30" value="${esc(course?.code || '')}" placeholder="例如：005M081201C141">
        </div>
        <div class="field">
          <label class="field-label" for="course-room">教室</label>
          <input class="input" id="course-room" name="room" type="text" maxlength="80" value="${esc(course?.room || '')}" placeholder="例如：D504">
        </div>
      </div>
      <div class="form-grid">
        <div class="field">
          <label class="field-label" for="course-teacher">任课教师</label>
          <input class="input" id="course-teacher" name="teacher" type="text" maxlength="80" value="${esc(course?.teacher || '')}" placeholder="选填">
        </div>
        <div class="field">
          <label class="field-label" for="course-campus">校区</label>
          <input class="input" id="course-campus" name="campus" type="text" maxlength="40" value="${esc(course?.campus || '')}" placeholder="例如：奉贤校区">
        </div>
      </div>
      <label class="switch-row">
        <span><strong>时间由老师另行安排（全部自排）</strong><small>勾选后不会占用星期、节次或周次，也不会自动排进每日计划。</small></span>
        <span class="switch">
          <input type="checkbox" id="course-self" name="selfArranged" ${selfArranged ? 'checked' : ''}>
          <span class="switch-ui" aria-hidden="true"></span>
        </span>
      </label>
      <div id="course-schedule-fields" style="${selfArranged ? 'display:none' : ''}">
        <div class="form-grid">
          <div class="field">
            <label class="field-label" for="course-week-start">开始周</label>
            <input class="input" id="course-week-start" name="weekStart" type="number" inputmode="numeric" min="1" max="${state.settings.totalWeeks}" step="1" value="${esc(weekStart)}">
          </div>
          <div class="field">
            <label class="field-label" for="course-week-end">结束周</label>
            <input class="input" id="course-week-end" name="weekEnd" type="number" inputmode="numeric" min="1" max="${state.settings.totalWeeks}" step="1" value="${esc(weekEnd)}">
          </div>
        </div>
        <div class="form-grid">
          <div class="field">
            <label class="field-label" for="course-weekday">星期</label>
            <select class="input" id="course-weekday" name="weekday">${renderWeekdaySelect(course?.weekday ?? fallbackWeekday)}</select>
          </div>
          <div class="field">
            <label class="field-label">节次</label>
            <div class="inline-control">
              <input class="input" name="periodStart" type="number" inputmode="numeric" min="1" max="12" step="1" value="${esc(periodStart)}" aria-label="开始节次">
              <span class="inline-sep">—</span>
              <input class="input" name="periodEnd" type="number" inputmode="numeric" min="1" max="12" step="1" value="${esc(periodEnd)}" aria-label="结束节次">
            </div>
          </div>
        </div>
        <p class="help-text" id="course-time-hint">按当前节次参考时间，约 ${esc(formatPeriodRange(periodStart, periodEnd))}。可在「更多 → 节次参考时间」调整。</p>
      </div>
      <div class="field">
        <label class="field-label" for="course-note">备注 <span class="optional">可选</span></label>
        <textarea class="textarea" id="course-note" name="note" maxlength="500" style="min-height:64px" placeholder="例如：单双周、教室变更说明">${esc(course?.note || '')}</textarea>
      </div>
      <div class="form-error" role="alert"></div>
    </form>
  `;
  openSheet({
    title: isNew ? '添加课程' : '编辑课程',
    subtitle: isNew ? '课程会按周次自动出现在课表和当天计划里。' : '修改会立即影响本周以后所有对应周次的显示。',
    body,
    footer: `
      ${course ? '<button type="button" class="btn btn-ghost" id="revert-course">还原初值</button>' : ''}
      ${course ? '<button type="button" class="btn btn-ghost" data-action="delete-course" data-id="' + esc(course.id) + '" style="color:var(--danger);border-color:var(--line)">删除</button>' : ''}
      <button type="submit" class="btn btn-primary" form="course-form">${isNew ? '添加课程' : '保存修改'}</button>
    `,
    onMount(root) {
      const form = root.querySelector('#course-form');
      const selfInput = root.querySelector('#course-self');
      const scheduleFields = root.querySelector('#course-schedule-fields');
      const initial = course ? JSON.parse(JSON.stringify(course)) : null;
      selfInput.addEventListener('change', () => {
        scheduleFields.style.display = selfInput.checked ? 'none' : '';
      });
      const periodStartInput = form.querySelector('[name="periodStart"]');
      const periodEndInput = form.querySelector('[name="periodEnd"]');
      const updateHint = () => {
        const hint = root.querySelector('#course-time-hint');
        if (!hint) return;
        const start = clamp(Math.round(Number(periodStartInput.value) || 1), 1, 12);
        const end = clamp(Math.round(Number(periodEndInput.value) || start), start, 12);
        hint.textContent = `按当前节次参考时间，约 ${formatPeriodRange(start, end)}。可在「更多 → 节次参考时间」调整。`;
      };
      periodStartInput.addEventListener('input', updateHint);
      periodEndInput.addEventListener('input', updateHint);
      const revertButton = root.querySelector('#revert-course');
      if (revertButton && initial) {
        revertButton.addEventListener('click', () => {
          const fields = {
            name: initial.name, code: initial.code, room: initial.room, teacher: initial.teacher,
            campus: initial.campus, weekStart: initial.weekStart, weekEnd: initial.weekEnd,
            weekday: initial.weekday, periodStart: initial.periodStart, periodEnd: initial.periodEnd,
            note: initial.note,
          };
          Object.entries(fields).forEach(([key, value]) => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) input.value = value ?? '';
          });
          selfInput.checked = Boolean(initial.selfArranged);
          scheduleFields.style.display = selfInput.checked ? 'none' : '';
          updateHint();
          showToast('已还原为打开时的内容，点保存才会生效。');
        });
      }
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        clearFormError(form);
        const formData = new FormData(form);
        const name = String(formData.get('name') || '').trim();
        if (!name) return showFormError(form, '请填写课程名称。');
        const isSelf = selfInput.checked;
        let values = {
          name,
          code: String(formData.get('code') || '').trim().slice(0, 30),
          teacher: String(formData.get('teacher') || '').trim().slice(0, 80),
          room: String(formData.get('room') || '').trim().slice(0, 80),
          campus: String(formData.get('campus') || '').trim().slice(0, 40),
          note: String(formData.get('note') || '').trim().slice(0, 500),
          selfArranged: isSelf,
          weekday: null, periodStart: null, periodEnd: null, weekStart: null, weekEnd: null,
        };
        if (!isSelf) {
          const weekStartValue = Math.round(Number(formData.get('weekStart')));
          const weekEndValue = Math.round(Number(formData.get('weekEnd')));
          const weekdayValue = Math.round(Number(formData.get('weekday')));
          const startPeriod = Math.round(Number(formData.get('periodStart')));
          const endPeriod = Math.round(Number(formData.get('periodEnd')));
          if (!(weekStartValue >= 1 && weekStartValue <= state.settings.totalWeeks)) return showFormError(form, '开始周超出当前学期范围。');
          if (!(weekEndValue >= weekStartValue && weekEndValue <= state.settings.totalWeeks)) return showFormError(form, '结束周需要不早于开始周，且在本学期内。');
          if (!(weekdayValue >= 1 && weekdayValue <= 7)) return showFormError(form, '请选择星期。');
          if (!(startPeriod >= 1 && startPeriod <= 12) || !(endPeriod >= startPeriod && endPeriod <= 12)) return showFormError(form, '节次需在 1–12 之间，且结束节次不早于开始节次。');
          values = { ...values, weekStart: weekStartValue, weekEnd: weekEndValue, weekday: weekdayValue, periodStart: startPeriod, periodEnd: endPeriod };
        }
        if (course) {
          Object.assign(course, values);
        } else {
          state.courses.push({
            id: uid('course'),
            ...values,
            hours: 0, credits: 0,
            program: '', category: '自定义课程', className: '', school: '',
          });
        }
        closeModal();
        persist();
        renderApp({ scrollTop: false });
        showToast(course ? '课程已更新。' : '课程已添加。');
      });
    },
  });
}

function openAdjustmentModal(adjustmentId = null, options = {}) {
  const adjustment = adjustmentId ? state.adjustments.find((item) => item.id === adjustmentId) : null;
  if (adjustmentId && !adjustment) return;
  const isNew = !adjustment;
  const baseDate = adjustment?.date || options.date || todayISO();
  const body = `
    <form id="adjustment-form" class="form-stack" novalidate>
      <div class="notice notice-warm" style="margin:0">${ico('info')}<div>临时调课只在指定日期出现，不会修改原课程或每周重复规则。适合补课、调课或一次性的讲座。</div></div>
      <div class="field">
        <label class="field-label" for="adjustment-name">课程名称 <span class="optional">必填</span></label>
        <input class="input" id="adjustment-name" name="name" type="text" maxlength="80" value="${esc(adjustment?.name || '')}" placeholder="例如：临时补课 / 学术讲座" required>
      </div>
      <div class="form-grid">
        <div class="field">
          <label class="field-label" for="adjustment-date">日期</label>
          <input class="input" id="adjustment-date" name="date" type="date" value="${esc(baseDate)}" required>
        </div>
        <div class="field">
          <label class="field-label">节次</label>
          <div class="inline-control">
            <input class="input" name="periodStart" type="number" inputmode="numeric" min="1" max="12" step="1" value="${esc(adjustment?.periodStart ?? 1)}" aria-label="开始节次">
            <span class="inline-sep">—</span>
            <input class="input" name="periodEnd" type="number" inputmode="numeric" min="1" max="12" step="1" value="${esc(adjustment?.periodEnd ?? 2)}" aria-label="结束节次">
          </div>
        </div>
      </div>
      <div class="form-grid">
        <div class="field">
          <label class="field-label" for="adjustment-room">教室</label>
          <input class="input" id="adjustment-room" name="room" type="text" maxlength="80" value="${esc(adjustment?.room || '')}" placeholder="例如：D402">
        </div>
        <div class="field">
          <label class="field-label" for="adjustment-teacher">教师</label>
          <input class="input" id="adjustment-teacher" name="teacher" type="text" maxlength="80" value="${esc(adjustment?.teacher || '')}" placeholder="选填">
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="adjustment-note">备注 <span class="optional">可选</span></label>
        <textarea class="textarea" id="adjustment-note" name="note" maxlength="500" style="min-height:64px" placeholder="例如：老师临时调到周三">${esc(adjustment?.note || '')}</textarea>
      </div>
      <div class="form-error" role="alert"></div>
    </form>
  `;
  openSheet({
    title: isNew ? '临时调课' : '编辑临时调课',
    subtitle: '只加在指定日期，不编造其他周次。',
    body,
    footer: `
      ${adjustment ? '<button type="button" class="btn btn-ghost" data-action="delete-adjustment" data-id="' + esc(adjustment.id) + '" style="color:var(--danger);border-color:var(--line)">删除</button>' : ''}
      <button type="submit" class="btn btn-primary" form="adjustment-form">${isNew ? '添加到这一天' : '保存修改'}</button>
    `,
    onMount(root) {
      const form = root.querySelector('#adjustment-form');
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        clearFormError(form);
        const formData = new FormData(form);
        const name = String(formData.get('name') || '').trim();
        const date = String(formData.get('date') || '');
        const periodStart = Math.round(Number(formData.get('periodStart')));
        const periodEnd = Math.round(Number(formData.get('periodEnd')));
        if (!name) return showFormError(form, '请填写课程名称。');
        if (!isISODate(date)) return showFormError(form, '请选择有效日期。');
        if (!(periodStart >= 1 && periodStart <= 12) || !(periodEnd >= periodStart && periodEnd <= 12)) {
          return showFormError(form, '节次需在 1–12 之间，且结束节次不早于开始节次。');
        }
        const values = {
          name,
          date,
          room: String(formData.get('room') || '').trim().slice(0, 80),
          teacher: String(formData.get('teacher') || '').trim().slice(0, 80),
          periodStart,
          periodEnd,
          note: String(formData.get('note') || '').trim().slice(0, 500),
        };
        if (adjustment) Object.assign(adjustment, values);
        else state.adjustments.push({ id: uid('adjustment'), ...values, createdAt: nowISO() });
        const week = getWeekInfo(date).week;
        if (week >= 1 && week <= state.settings.totalWeeks) ui.courseWeek = week;
        closeModal();
        persist();
        renderApp({ scrollTop: false });
        showToast(adjustment ? '临时调课已更新。' : '已添加到这一天。');
      });
    },
  });
}

/* ---------------- 使用说明 ---------------- */

function openGuideModal() {
  const body = `
    <div class="form-stack">
      <div class="card" style="padding:15px">
        <strong style="font-size:13px;font-weight:650">每天怎么用</strong>
        <p class="help-text" style="margin-top:6px">打开「今日」，先看课程和自动排好的任务。完成后点右侧圆圈；只做了一部分，就点「记实际」填写数量。睡前用 5 分钟写复盘，不需要写得很长。</p>
      </div>
      <div class="card" style="padding:15px">
        <strong style="font-size:13px;font-weight:650">改任务、改课程</strong>
        <p class="help-text" style="margin-top:6px">长期任务在「任务」里新增、编辑、暂停或删除。课程在「课程表」点任意课程修改教室、节次和周次；只影响某一天的调课，用「临时调课」。点任务卡的「调整」可以改今天的时间/目标、顺延、拆分或跳过。</p>
      </div>
      <div class="card" style="padding:15px">
        <strong style="font-size:13px;font-weight:650">补记规则</strong>
        <p class="help-text" style="margin-top:6px">用日期两侧的箭头回到漏掉的日子，再打卡即可。补记会标记为「补记」，不计成当天实时完成。任务只从创建当天开始生效，所以安装应用之前的日子不会凭空生成任务。</p>
      </div>
      <div class="card" style="padding:15px">
        <strong style="font-size:13px;font-weight:650">忙日简化与休息</strong>
        <p class="help-text" style="margin-top:6px">「简化」只调整当天目标或耗时，不改长期目标。状态确实不好时，把这一天设为休息日：不计完成率，也不打断连续达成。休息不是失败，是计划的一部分。</p>
      </div>
      <div class="card" style="padding:15px">
        <strong style="font-size:13px;font-weight:650">备份与恢复</strong>
        <p class="help-text" style="margin-top:6px">在「更多 → 导出完整 JSON 备份」保存文件；也可以复制备份文本。换手机或清理浏览器数据前务必先导出。导入会覆盖当前数据，应用会先保留一份“导入前快照”，可从这里恢复。备份文件包含你的课程、任务、打卡和复盘，请妥善保管。</p>
      </div>
      <div class="card" style="padding:15px">
        <strong style="font-size:13px;font-weight:650">添加到 iPhone 主屏幕</strong>
        <p class="help-text" style="margin-top:6px">必须用 Safari 打开 HTTPS 网址。点底部「分享」→「添加到主屏幕」→「添加」。之后从主屏幕图标打开，界面会像普通应用一样全屏运行。离线可以打开应用外壳，但数据只保存在当前设备。</p>
      </div>
      <div class="warning-block"><strong>数据边界：</strong>这是本地优先应用，没有账号、云同步或服务器备份。换设备、换浏览器、清理网站数据、卸载应用，都可能导致数据丢失。请定期导出 JSON。</div>
    </div>
  `;
  openSheet({
    title: '使用说明',
    subtitle: '先完成最小的那一步，再慢慢调整。',
    body,
    footer: '<button type="button" class="btn btn-primary" data-action="close-modal">知道了</button>',
  });
}

/* ---------------- 设置 ---------------- */

function openSettingsModal() {
  const body = `
    <form id="settings-form" class="form-stack" novalidate>
      <div class="field">
        <label class="field-label" for="semester-start">第 1 周开始日期</label>
        <input class="input" id="semester-start" name="semesterStart" type="date" value="${esc(state.settings.semesterStart)}">
        <p class="help-text">教学周按周一至周日计算。如果选择的不是周一，会自动归到该周周一。</p>
      </div>
      <div class="field">
        <label class="field-label" for="total-weeks">学期总周数</label>
        <input class="input" id="total-weeks" name="totalWeeks" type="number" inputmode="numeric" min="1" max="30" step="1" value="${esc(state.settings.totalWeeks)}">
      </div>
      <div class="notice">${ico('info')}<div>修改学期只影响周次显示，不会删除课程、任务或打卡记录。课程如果超出新学期范围，会暂时不显示。</div></div>
      <div class="form-error" role="alert"></div>
    </form>
  `;
  openSheet({
    title: '学期与教学周',
    subtitle: '课程表按这里的日期推算第几周。',
    body,
    footer: `
      <button type="button" class="btn btn-ghost" id="reset-semester">恢复 2026 秋季</button>
      <button type="submit" class="btn btn-primary" form="settings-form">保存设置</button>
    `,
    onMount(root) {
      const form = root.querySelector('#settings-form');
      root.querySelector('#reset-semester').addEventListener('click', () => {
        root.querySelector('#semester-start').value = '2026-09-07';
        root.querySelector('#total-weeks').value = '18';
        showToast('已填入默认值，点保存才会生效。');
      });
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        clearFormError(form);
        const rawDate = String(new FormData(form).get('semesterStart') || '');
        const totalWeeks = Math.round(Number(new FormData(form).get('totalWeeks')));
        if (!isISODate(rawDate)) return showFormError(form, '请选择有效的开学日期。');
        if (!(totalWeeks >= 1 && totalWeeks <= 30)) return showFormError(form, '学期总周数需在 1–30 之间。');
        const normalizedStart = startOfWeek(rawDate);
        state.settings.semesterStart = normalizedStart;
        state.settings.totalWeeks = totalWeeks;
        if (ui.courseWeek > totalWeeks) ui.courseWeek = totalWeeks;
        closeModal();
        persist();
        renderApp({ scrollTop: false });
        showToast(rawDate !== normalizedStart ? '已保存，第 1 周从该日期所在周的周一算起。' : '学期设置已保存。');
      });
    },
  });
}

function openPeriodsModal() {
  const rows = state.settings.periods.map((period, index) => `
    <div class="period-row">
      <span class="period-number">${index + 1}</span>
      <input class="input" type="time" name="start-${index}" value="${esc(period.start)}" aria-label="第 ${index + 1} 节开始时间">
      <span class="period-dash">—</span>
      <input class="input" type="time" name="end-${index}" value="${esc(period.end)}" aria-label="第 ${index + 1} 节结束时间">
    </div>
  `).join('');
  const body = `
    <form id="periods-form" class="form-stack" novalidate>
      <div class="notice">${ico('clock')}<div>这些时间是课程表的换算参考，不是学校官方铃声。请按你实际的上课时间修正，避免自动排程误判空档。</div></div>
      <div class="period-grid">${rows}</div>
      <div class="form-error" role="alert"></div>
    </form>
  `;
  openSheet({
    title: '节次参考时间',
    subtitle: '修改后，所有课程和自动排程会立即按新时间计算。',
    body,
    footer: `
      <button type="button" class="btn btn-ghost" id="reset-periods">恢复默认</button>
      <button type="submit" class="btn btn-primary" form="periods-form">保存时间</button>
    `,
    onMount(root) {
      const form = root.querySelector('#periods-form');
      root.querySelector('#reset-periods').addEventListener('click', () => {
        DEFAULT_PERIODS.forEach((period, index) => {
          form.querySelector(`[name="start-${index}"]`).value = period.start;
          form.querySelector(`[name="end-${index}"]`).value = period.end;
        });
        showToast('已填入默认时间，点保存才会生效。');
      });
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        clearFormError(form);
        const next = [];
        for (let index = 0; index < state.settings.periods.length; index += 1) {
          const start = form.querySelector(`[name="start-${index}"]`).value;
          const end = form.querySelector(`[name="end-${index}"]`).value;
          const startMin = timeToMinutes(start);
          const endMin = timeToMinutes(end);
          if (startMin === null || endMin === null || endMin <= startMin) {
            return showFormError(form, `第 ${index + 1} 节的结束时间需要晚于开始时间。`);
          }
          next.push({ start: minutesToTime(startMin), end: minutesToTime(endMin) });
        }
        state.settings.periods = next;
        closeModal();
        persist();
        renderApp({ scrollTop: false });
        showToast('节次参考时间已更新。');
      });
    },
  });
}

/* ---------------- 任务详情与历史 ---------------- */

function getTaskHistory(taskId) {
  const rows = [];
  Object.keys(state.logs).forEach((date) => {
    const log = state.logs[date][taskId];
    if (log) rows.push({ date, log });
  });
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

function openTaskDetailModal(taskId, date) {
  const item = getDueItems(date).find((entry) => entry.id === taskId);
  if (!item) return;
  const history = getTaskHistory(taskId);
  const progress = getItemProgress(item, date);
  const recent = history.slice(0, 8);
  const body = `
    <div class="detail-head">
      <div class="detail-title">${esc(item.title)}</div>
      <div class="detail-meta">${item.isExtra ? '临时任务' : (REPEAT_LABELS[item.repeat] || '长期任务')} · 目标 ${item.target}${esc(item.unit)} · 建议 ${esc(item.preferredTime)} · ${formatDuration(item.duration)}</div>
      ${item.note ? `<p class="detail-note">${esc(item.note)}</p>` : ''}
    </div>
    <div class="detail-stats">
      <div><strong>${history.filter((row) => logIsCompleted(row.log, item.target)).length}</strong><span>累计完成</span></div>
      <div><strong>${history.length}</strong><span>有记录的天数</span></div>
      <div><strong>${progress.done ? '已完成' : (progress.actual > 0 ? '部分完成' : '未完成')}</strong><span>${esc(formatMonthDay(date))}</span></div>
    </div>
    <div class="detail-section-label">最近记录</div>
    ${recent.length ? `
      <div class="history-list">
        ${recent.map(({ date: historyDate, log }) => `
          <div class="history-row">
            <span class="history-date">${esc(formatShortDate(historyDate))}</span>
            <span class="history-status">${esc(LOG_STATUS_LABELS[log.status] || '已记录')}${log.backfilled ? ' · 补记' : ''}</span>
            <span class="history-actual">${log.actual}/${item.target}${esc(item.unit)}</span>
          </div>
        `).join('')}
      </div>
    ` : '<p class="help-text">还没有打卡记录。今天开始，就会出现在这里。</p>'}
    ${item.isExtra ? '<p class="help-text">这是临时任务，只存在于指定日期。</p>' : ''}
  `;
  openSheet({
    title: '任务详情',
    subtitle: '记录是日志，不是评判。',
    body,
    footer: `
      <button type="button" class="btn btn-ghost" data-action="close-modal">关闭</button>
      <button type="button" class="btn btn-ghost" data-action="${item.isExtra ? 'edit-extra' : 'edit-task'}" data-id="${esc(item.id)}">编辑</button>
      <button type="button" class="btn btn-primary" data-action="adjust-task" data-id="${esc(item.id)}" data-date="${esc(date)}">调整今天</button>
    `,
  });
}

/* =========================================================
   全局交互
   ========================================================= */

const TABS = ['today', 'courses', 'tasks', 'review', 'more'];

function navigateTo(tab) {
  if (!TABS.includes(tab)) return;
  if (location.hash === `#${tab}`) {
    renderApp({ scrollTop: true });
    return;
  }
  location.hash = `#${tab}`;
}

function goToDay(date) {
  if (!isISODate(date)) return;
  ui.activeDate = date;
  if (currentTab() !== 'today') navigateTo('today');
  else renderApp({ scrollTop: true });
}

function changeReviewDate(offset) {
  const next = addDays(ui.reviewDate, offset);
  if (next > todayISO()) {
    showToast('未来的复盘还不能写，先过好今天。');
    return;
  }
  ui.reviewDate = next;
  renderApp({ scrollTop: false });
}

function findDueItem(date, taskId) {
  return getDueItems(date).find((entry) => entry.id === taskId) || null;
}

function toggleTaskComplete(taskId, date) {
  if (date > todayISO()) {
    showToast('未来的任务不能提前打卡，当天再来记录。');
    return;
  }
  const item = findDueItem(date, taskId);
  if (!item) {
    showToast('没有找到这项任务，可能已经被删除或暂停。');
    return;
  }
  const progress = getItemProgress(item, date);
  if (progress.done) {
    removeTaskLog(taskId, date, '已撤销完成记录。');
    return;
  }
  if (progress.status === 'postponed') {
    showToast('这项已顺延到其他日期，请到补做的那一天打卡。');
    return;
  }
  if (progress.status === 'split') {
    showToast('这项已拆成几个小项，请分别打卡，或先撤销拆分。');
    return;
  }
  const snapshot = cloneLog(progress.log);
  writeLog(date, taskId, {
    status: 'done',
    actual: Math.max(progress.target, progress.actual),
    note: progress.log?.note || '',
    completedAt: nowISO(),
    backfilled: date < todayISO(),
    updatedAt: nowISO(),
  });
  persist();
  renderApp();
  const message = date < todayISO()
    ? '已补记完成，记录会标记为补记。'
    : (item.kind === 'review' ? '已打卡。别忘了去复盘页写两句。' : '完成一项，记录已保存。');
  showToast(message, {
    actionLabel: '撤销',
    duration: 4800,
    onAction: () => {
      if (snapshot) writeLog(date, taskId, snapshot);
      else deleteLog(date, taskId);
      persist();
      renderApp();
      showToast('已撤销这次打卡。');
    },
  });
}

function removeTaskLog(taskId, date, message = '打卡记录已删除。') {
  const snapshot = cloneLog(getLog(date, taskId));
  if (!snapshot) {
    showToast('这一天没有打卡记录。');
    return;
  }
  deleteLog(date, taskId);
  persist();
  renderApp();
  showToast(message, {
    actionLabel: '撤销',
    duration: 5200,
    onAction: () => {
      writeLog(date, taskId, snapshot);
      persist();
      renderApp();
      showToast('记录已恢复。');
    },
  });
}

function toggleRestDay(date) {
  if (!isISODate(date)) return;
  const previous = [...state.restDays];
  const isRest = state.restDays.includes(date);
  if (isRest) state.restDays = state.restDays.filter((item) => item !== date);
  else state.restDays = [...new Set([...state.restDays, date])].sort();
  persist();
  renderApp();
  showToast(isRest ? '已取消休息日，恢复计算完成率。' : '已设为休息日，不计完成率和连续达成。', {
    actionLabel: '撤销',
    duration: 5200,
    onAction: () => {
      state.restDays = previous;
      persist();
      renderApp();
      showToast('已恢复原来的休息日设置。');
    },
  });
}

function resetTodaySimplification(date) {
  const day = state.overrides[date];
  if (!day) {
    showToast('今天没有简化项。');
    return;
  }
  let changed = 0;
  for (const taskId of Object.keys(day)) {
    if (day[taskId]?.simplified) {
      delete day[taskId];
      changed += 1;
    }
  }
  if (Object.keys(day).length === 0) delete state.overrides[date];
  if (!changed) {
    showToast('没有可恢复的简化项。');
    return;
  }
  persist();
  renderApp();
  showToast('已恢复今日原计划，长期目标没有改变。');
}

function restoreSplitWithConfirm(taskId, date) {
  const extras = state.extras.filter((extra) => extra.sourceTaskId === taskId && extra.dueDate === date && extra.splitGroup);
  if (!extras.length) {
    showToast('没有找到这项拆分记录。');
    return;
  }
  const completedParts = extras.filter((extra) => logIsCompleted(getLog(date, extra.id), extra.target)).length;
  openConfirm({
    title: '撤销拆分？',
    message: `会让原来的「${findDueItem(date, taskId)?.title || '任务'}」重新出现，并删除 ${extras.length} 个拆分项${completedParts ? `，其中 ${completedParts} 个已经打卡` : ''}。这个操作不能撤销。`,
    confirmLabel: '撤销拆分',
    danger: true,
    onConfirm: () => {
      const ids = new Set(extras.map((extra) => extra.id));
      for (const extra of extras) deleteLog(extra.dueDate, extra.id);
      state.extras = state.extras.filter((extra) => !ids.has(extra.id));
      const log = getLog(date, taskId);
      if (log?.status === 'split') deleteLog(date, taskId);
      persist();
      renderApp();
      showToast('已撤销拆分。');
    },
  });
}

function restorePostponedWithConfirm(taskId, date) {
  const extras = state.extras.filter((extra) => extra.sourceTaskId === taskId && extra.movedFrom === date);
  if (!extras.length) {
    const log = getLog(date, taskId);
    if (log?.status === 'postponed') {
      deleteLog(date, taskId);
      persist();
      renderApp();
      showToast('已撤销顺延标记。');
    } else {
      showToast('没有找到顺延记录。');
    }
    return;
  }
  const completedParts = extras.filter((extra) => logIsCompleted(getLog(extra.dueDate, extra.id), extra.target)).length;
  openConfirm({
    title: '撤销顺延？',
    message: `会删除顺延到其他日期的补做项${completedParts ? `（其中 ${completedParts} 个已经打卡，记录也会删除）` : ''}，并让原任务回到 ${formatMonthDay(date)}。`,
    confirmLabel: '撤销顺延',
    danger: true,
    onConfirm: () => {
      const ids = new Set(extras.map((extra) => extra.id));
      state.extras = state.extras.filter((extra) => !ids.has(extra.id));
      for (const extra of extras) deleteLog(extra.dueDate, extra.id);
      const log = getLog(date, taskId);
      if (log?.status === 'postponed') deleteLog(date, taskId);
      persist();
      renderApp();
      showToast('已撤销顺延。');
    },
  });
}

function deleteCourseWithConfirm(courseId) {
  const course = state.courses.find((item) => item.id === courseId);
  if (!course) return;
  openConfirm({
    title: '删除这门课程？',
    message: `「${course.name}」会从所有周次的课表和每日计划中移除。打卡记录不会受影响。`,
    confirmLabel: '删除课程',
    danger: true,
    onConfirm: () => {
      state.courses = state.courses.filter((item) => item.id !== courseId);
      persist();
      renderApp({ scrollTop: false });
      showToast('课程已删除。');
    },
  });
}

function deleteAdjustmentWithConfirm(adjustmentId) {
  const adjustment = state.adjustments.find((item) => item.id === adjustmentId);
  if (!adjustment) return;
  openConfirm({
    title: '删除这次临时调课？',
    message: `「${adjustment.name}」只存在于 ${formatFullDate(adjustment.date)}，删除后不会影响其他周次。`,
    confirmLabel: '删除调课',
    danger: true,
    onConfirm: () => {
      state.adjustments = state.adjustments.filter((item) => item.id !== adjustmentId);
      persist();
      renderApp({ scrollTop: false });
      showToast('临时调课已删除。');
    },
  });
}

function deleteTaskWithConfirm(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  openConfirm({
    title: '删除长期任务？',
    message: `「${task.title}」从今天起不再出现在每日计划中。过去的打卡记录仍然保留用于统计。`,
    confirmLabel: '删除任务',
    danger: true,
    onConfirm: () => {
      const snapshot = { active: task.active, pausedAt: task.pausedAt, deletedDate: task.deletedDate };
      task.active = false;
      task.pausedAt = null;
      task.deletedDate = todayISO();
      persist();
      renderApp({ scrollTop: false });
      showToast('任务已删除，历史记录保留。', {
        actionLabel: '撤销',
        duration: 5600,
        onAction: () => {
          Object.assign(task, snapshot);
          persist();
          renderApp({ scrollTop: false });
          showToast('任务已恢复。');
        },
      });
    },
  });
}

function deleteExtraWithConfirm(extraId, date) {
  const extra = state.extras.find((item) => item.id === extraId);
  if (!extra) return;
  openConfirm({
    title: '删除临时任务？',
    message: `「${extra.title}」和它在这一天的打卡记录会一起删除。${extra.splitGroup ? '这是拆分出来的一项，其他小项会保留。' : ''}`,
    confirmLabel: '删除',
    danger: true,
    onConfirm: () => {
      state.extras = state.extras.filter((item) => item.id !== extraId);
      deleteLog(extra.dueDate || date, extraId);
      persist();
      renderApp({ scrollTop: false });
      showToast('临时任务已删除。');
    },
  });
}

function markBackupDone() {
  state.meta.lastBackupAt = nowISO();
  persist({ silent: true });
}

function buildBackupPayload() {
  return JSON.stringify({
    app: '每日执行力计划',
    appVersion: APP_VERSION,
    schemaVersion: 1,
    exportedAt: nowISO(),
    data: state,
  }, null, 2);
}

function downloadBackup() {
  try {
    markBackupDone();
    const payload = buildBackupPayload();
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `每日执行力备份-${todayISO()}.json`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
    renderApp();
    showToast('备份文件已生成。请在 Safari 的下载项中确认保存。', { duration: 6000 });
  } catch (error) {
    console.error(error);
    showToast('导出失败，请尝试复制备份文本。');
  }
}

async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    // 继续尝试旧方法。
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', 'readonly');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    area.style.top = '0';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, area.value.length);
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch (error) {
    return false;
  }
}

async function copyBackup() {
  markBackupDone();
  const payload = buildBackupPayload();
  const ok = await copyTextToClipboard(payload);
  renderApp();
  showToast(ok ? '备份文本已复制到剪贴板。' : '复制失败，请改用导出文件。', { duration: 5200 });
}

function openImportModal() {
  const body = `
    <form id="import-form" class="form-stack" novalidate>
      <div class="notice notice-warm" style="margin:0">${ico('alert')}<div>导入会用备份内容<strong>覆盖当前所有任务、课程、打卡和复盘</strong>。导入前会自动保存一份当前数据的快照，但请仍然先导出一次备份。</div></div>
      <div class="field">
        <label class="field-label" for="import-file">选择 JSON 文件</label>
        <input class="input file-input" id="import-file" type="file" accept=".json,application/json,text/plain">
        <p class="help-text" id="import-file-name">也可以在下方粘贴之前导出的 JSON 文本。</p>
      </div>
      <div class="field">
        <label class="field-label" for="import-text">备份 JSON</label>
        <textarea class="textarea" id="import-text" name="payload" maxlength="${MAX_IMPORT_CHARS}" style="min-height:140px" placeholder='{"app":"每日执行力计划",...}'></textarea>
      </div>
      <div class="form-error" role="alert"></div>
    </form>
  `;
  openSheet({
    title: '导入 JSON 备份',
    subtitle: '只接受本应用导出的数据，或结构正确的旧版备份。',
    body,
    footer: `
      <button type="button" class="btn btn-ghost" data-action="close-modal">取消</button>
      <button type="submit" class="btn btn-primary" form="import-form">检查并导入</button>
    `,
    onMount(root) {
      const form = root.querySelector('#import-form');
      const textarea = root.querySelector('#import-text');
      const fileInput = root.querySelector('#import-file');
      const fileName = root.querySelector('#import-file-name');
      fileInput.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        if (file.size > 6 * 1024 * 1024) {
          showFormError(form, '文件超过 6 MB，已拒绝读取。');
          fileInput.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          textarea.value = String(reader.result || '');
          fileName.textContent = `已读取：${file.name}（${Math.max(1, Math.round(file.size / 1024))} KB）`;
          clearFormError(form);
        };
        reader.onerror = () => showFormError(form, '读取文件失败，请重试或改用粘贴。');
        reader.readAsText(file, 'utf-8');
      });
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        clearFormError(form);
        const rawText = textarea.value.trim();
        if (!rawText) return showFormError(form, '请先选择文件或粘贴备份内容。');
        if (rawText.length > MAX_IMPORT_CHARS) return showFormError(form, '备份文本过大，已拒绝导入。');
        let parsed;
        try {
          parsed = JSON.parse(rawText);
        } catch (error) {
          return showFormError(form, 'JSON 格式错误，请确认复制了完整备份。');
        }
        let nextState;
        try {
          nextState = normalizeState(parsed);
        } catch (error) {
          return showFormError(form, error.message || '备份内容不符合要求。');
        }
        if (!nextState.tasks.length && !nextState.courses.length) {
          return showFormError(form, '备份里没有任务或课程，已拒绝导入空数据。');
        }
        closeModal();
        openConfirm({
          title: '覆盖当前数据？',
          message: `备份包含 ${nextState.tasks.length} 个长期任务、${nextState.courses.length} 门课程、${Object.keys(nextState.logs).length} 天打卡记录、${Object.keys(nextState.reviews).length} 天复盘。\n\n当前数据会先保存为导入前快照。确认后会立即替换。`,
          confirmLabel: '确认导入',
          danger: true,
          onConfirm: () => {
            try {
              localStorage.setItem(PRE_IMPORT_KEY, JSON.stringify({ savedAt: nowISO(), data: state }));
            } catch (error) {
              showToast('本地空间不足，无法保存导入前快照，已取消导入。请先导出并清理空间。');
              return;
            }
            const previousState = state;
            nextState.meta.lastImportedAt = nowISO();
            state = nextState;
            const saved = persist({ silent: true });
            if (!saved) {
              state = previousState;
              renderApp({ scrollTop: false });
              showToast('导入失败：本地存储空间不足，已保留原数据。');
              return;
            }
            ui.activeDate = todayISO();
            ui.reviewDate = todayISO();
            ui.courseWeek = clamp(getWeekInfo().week || 1, 1, state.settings.totalWeeks);
            renderApp({ scrollTop: true });
            showToast('备份已导入，数据已替换。', { duration: 6000 });
          },
        });
      });
    },
  });
}

function restorePreImport() {
  let raw = null;
  try {
    raw = localStorage.getItem(PRE_IMPORT_KEY);
  } catch (error) {
    showToast('无法读取本地快照。');
    return;
  }
  if (!raw) {
    showToast('没有可用的导入前快照。');
    return;
  }
  let snapshot;
  try {
    const parsed = JSON.parse(raw);
    snapshot = parsed?.data ? parsed.data : parsed;
  } catch (error) {
    showToast('导入前快照已损坏，无法恢复。');
    return;
  }
  let nextState;
  try {
    nextState = normalizeState(snapshot);
  } catch (error) {
    showToast('导入前快照不符合数据格式，无法恢复。');
    return;
  }
  openConfirm({
    title: '恢复导入前的数据？',
    message: '当前数据会被快照替换。恢复后会移除这份导入前快照。',
    confirmLabel: '恢复快照',
    danger: true,
    onConfirm: () => {
      state = nextState;
      ui.activeDate = todayISO();
      ui.reviewDate = todayISO();
      ui.courseWeek = clamp(getWeekInfo().week || 1, 1, state.settings.totalWeeks);
      persist();
      try {
        localStorage.removeItem(PRE_IMPORT_KEY);
      } catch (error) {
        // 清理失败不影响恢复结果。
      }
      renderApp({ scrollTop: true });
      showToast('已恢复到上次导入前的数据。');
    },
  });
}

function resetAllData() {
  openConfirm({
    title: '恢复初始数据？',
    message: '这会删除当前所有任务修改、临时任务、课程修改、打卡和复盘，并恢复最初的四项任务和十二门课程。该操作不能撤销，请先导出备份。',
    confirmLabel: '恢复初始数据',
    danger: true,
    onConfirm: () => {
      const previous = state;
      state = createSeedState();
      ui.activeDate = todayISO();
      ui.reviewDate = todayISO();
      ui.courseWeek = clamp(getWeekInfo().week || 1, 1, state.settings.totalWeeks);
      if (!persist({ silent: true })) {
        state = previous;
        showToast('重置失败：本地存储不可用，原数据没有被替换。');
        return;
      }
      try {
        localStorage.removeItem(PRE_IMPORT_KEY);
      } catch (error) {
        // 忽略清理失败。
      }
      renderApp({ scrollTop: true });
      showToast('已恢复初始数据。');
    },
  });
}

function openTaskEditorFromAction(element) {
  const id = element.dataset.id;
  const action = element.dataset.action;
  if (action === 'edit-task') {
    openTaskModal(id);
  } else {
    const extra = state.extras.find((item) => item.id === id);
    if (!extra) return showToast('没有找到这项临时任务。');
    openTaskModal(id, { scope: 'extra', dueDate: extra.dueDate });
  }
}

async function installPwa() {
  if (!deferredInstallPrompt) {
    showToast('请按「更多」页里的 Safari 分享 → 添加到主屏幕步骤操作。');
    return;
  }
  const prompt = deferredInstallPrompt;
  deferredInstallPrompt = null;
  try {
    await prompt.prompt();
    await prompt.userChoice;
  } catch (error) {
    // 用户取消或浏览器不支持时无需报错。
  }
  renderApp({ scrollTop: false });
}

function handleReviewSubmit(event) {
  event.preventDefault();
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  clearFormError(form);
  const date = ui.reviewDate;
  const formData = new FormData(form);
  const done = String(formData.get('done') || '').trim().slice(0, 2000);
  const unfinished = String(formData.get('unfinished') || '').trim().slice(0, 1000);
  const reason = String(formData.get('reason') || '').trim().slice(0, 1000);
  const top3 = [1, 2, 3].map((index) => String(formData.get(`top${index}`) || '').trim().slice(0, 160));
  if (!done && !unfinished && !reason && !top3.some(Boolean)) {
    return showFormError(form, '至少写一项内容，再保存。哪怕只写一句。');
  }
  const isBackfill = date < todayISO();
  state.reviews[date] = {
    done,
    unfinished,
    reason,
    top3,
    updatedAt: nowISO(),
    backfilled: isBackfill,
  };
  const autoCheck = form.querySelector('#review-auto-check');
  let autoCompleted = false;
  if (autoCheck?.checked) {
    const reviewItem = getDueItems(date).find((item) => item.kind === 'review');
    if (reviewItem) {
      const current = getLog(date, reviewItem.id);
      if (!logIsCompleted(current, reviewItem.target)) {
        writeLog(date, reviewItem.id, {
          status: 'done',
          actual: reviewItem.target,
          note: current?.note || '随每日复盘自动打卡',
          completedAt: nowISO(),
          backfilled: isBackfill,
          updatedAt: nowISO(),
        });
        autoCompleted = true;
      }
    }
  }
  persist();
  renderApp({ scrollTop: false });
  showToast(autoCompleted ? '复盘已保存，睡前复盘也打卡了。' : '复盘已保存。', {
    actionLabel: '回今日',
    duration: 4200,
    onAction: () => navigateTo('today'),
  });
}

function handleDocumentClick(event) {
  const actionElement = event.target.closest?.('[data-action]');
  if (!actionElement || actionElement.disabled) return;
  const action = actionElement.dataset.action;
  const date = actionElement.dataset.date || ui.activeDate;
  switch (action) {
    case 'close-modal':
      closeModal();
      break;
    case 'navigate':
      navigateTo(actionElement.dataset.tab);
      break;
    case 'change-date':
      goToDay(addDays(ui.activeDate, Number(actionElement.dataset.offset) || 0));
      break;
    case 'go-today':
      goToDay(todayISO());
      break;
    case 'open-review':
      ui.reviewDate = isISODate(actionElement.dataset.date) && actionElement.dataset.date <= todayISO()
        ? actionElement.dataset.date
        : todayISO();
      navigateTo('review');
      break;
    case 'open-extra-modal':
      openTaskModal(null, { scope: 'extra', dueDate: isISODate(date) ? date : todayISO() });
      break;
    case 'toggle-complete':
      toggleTaskComplete(actionElement.dataset.id, date);
      break;
    case 'uncomplete-task':
      removeTaskLog(actionElement.dataset.id, date);
      break;
    case 'open-progress':
      openProgressModal(actionElement.dataset.id, date);
      break;
    case 'adjust-task':
      openAdjustTaskModal(actionElement.dataset.id, date);
      break;
    case 'open-task-detail':
      openTaskDetailModal(actionElement.dataset.id, date);
      break;
    case 'add-task':
      openTaskModal(null);
      break;
    case 'edit-task':
    case 'edit-extra':
      openTaskEditorFromAction(actionElement);
      break;
    case 'delete-task':
      deleteTaskWithConfirm(actionElement.dataset.id);
      break;
    case 'delete-extra':
      deleteExtraWithConfirm(actionElement.dataset.id, date);
      break;
    case 'restore-split':
      restoreSplitWithConfirm(actionElement.dataset.id, date);
      break;
    case 'restore-postponed':
      restorePostponedWithConfirm(actionElement.dataset.id, date);
      break;
    case 'toggle-rest':
      toggleRestDay(date);
      break;
    case 'simplify-reset':
      resetTodaySimplification(date);
      break;
    case 'open-simplify':
      openSimplifyModal(date);
      break;
    case 'edit-course':
      openCourseModal(actionElement.dataset.id);
      break;
    case 'edit-adjustment':
      openAdjustmentModal(actionElement.dataset.id);
      break;
    case 'add-course':
      openCourseModal(null, {
        date: ui.courseWeek === clamp(getWeekInfo().week, 1, state.settings.totalWeeks) ? todayISO() : getWeekStartByNumber(ui.courseWeek),
        week: ui.courseWeek,
      });
      break;
    case 'add-adjustment':
      openAdjustmentModal(null, { date: isISODate(date) ? date : getWeekStartByNumber(ui.courseWeek) });
      break;
    case 'delete-course':
      deleteCourseWithConfirm(actionElement.dataset.id);
      break;
    case 'delete-adjustment':
      deleteAdjustmentWithConfirm(actionElement.dataset.id);
      break;
    case 'course-week-prev':
      if (ui.courseWeek > 1) {
        ui.courseWeek -= 1;
        renderApp({ scrollTop: false });
      }
      break;
    case 'course-week-next':
      if (ui.courseWeek < state.settings.totalWeeks) {
        ui.courseWeek += 1;
        renderApp({ scrollTop: false });
      }
      break;
    case 'course-week-current':
      ui.courseWeek = clamp(getWeekInfo().week || 1, 1, state.settings.totalWeeks);
      renderApp({ scrollTop: false });
      break;
    case 'open-guide':
      openGuideModal();
      break;
    case 'open-settings':
      openSettingsModal();
      break;
    case 'open-periods':
      openPeriodsModal();
      break;
    case 'export-data':
      downloadBackup();
      break;
    case 'copy-data':
      void copyBackup();
      break;
    case 'open-import':
      openImportModal();
      break;
    case 'restore-preimport':
      restorePreImport();
      break;
    case 'reset-data':
      resetAllData();
      break;
    case 'install-pwa':
      void installPwa();
      break;
    case 'fill-completed': {
      const stats = computeDayStats(date);
      const titles = stats.countedEntries.filter((entry) => entry.done).map((entry) => entry.item.title);
      const textarea = document.getElementById('review-done');
      if (!textarea) break;
      if (!titles.length) {
        showToast('这一天还没有已完成的打卡记录。');
        break;
      }
      const list = titles.map((title) => `· ${title}`).join('\n');
      textarea.value = textarea.value.trim() ? `${textarea.value.trim()}\n${list}` : list;
      textarea.focus();
      showToast('已带入已完成项，保存后才会写入复盘。');
      break;
    }
    case 'review-date-prev':
      changeReviewDate(-1);
      break;
    case 'review-date-next':
      changeReviewDate(1);
      break;
    default:
      break;
  }
}

function setupInteraction() {
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('submit', (event) => {
    if (event.target?.id === 'review-form') handleReviewSubmit(event);
  });
  document.addEventListener('change', (event) => {
    const input = event.target.closest?.('input[data-action="toggle-task-active"]');
    if (!input) return;
    const task = state.tasks.find((item) => item.id === input.dataset.id);
    if (!task) return;
    if (input.checked) {
      task.active = true;
      task.pausedAt = null;
      showToast('任务已恢复，今天就会回到计划里。');
    } else {
      task.active = false;
      task.pausedAt = addDays(todayISO(), 1);
      showToast('已从明天起暂停，今天已出现的记录会保留。');
    }
    persist();
    renderApp({ scrollTop: false });
  });
  document.addEventListener('keydown', (event) => {
    if (!activeModal) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== 'Tab') return;
    const root = document.getElementById('modal-root');
    const focusables = [...root.querySelectorAll('button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [href]')]
      .filter((element) => element.getClientRects().length > 0);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  document.querySelectorAll('.tab-link').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (location.hash === link.getAttribute('href')) {
        event.preventDefault();
        renderApp({ scrollTop: true });
      }
    });
  });
  document.querySelector('.wordmark')?.addEventListener('click', (event) => {
    if (location.hash === '#today') {
      event.preventDefault();
      renderApp({ scrollTop: true });
    }
  });
  window.addEventListener('hashchange', () => {
    if (!TABS.includes(location.hash.replace(/^#/, ''))) {
      history.replaceState(null, '', '#today');
    }
    renderApp({ scrollTop: true });
  });
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (currentTab() === 'more') renderApp({ scrollTop: false });
  });
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    showToast('已添加为应用，可以从主屏幕直接打开。');
    if (currentTab() === 'more') renderApp({ scrollTop: false });
  });
  window.addEventListener('online', () => {
    if (currentTab() === 'more') renderApp({ scrollTop: false });
  });
  window.addEventListener('offline', () => {
    if (currentTab() === 'more') renderApp({ scrollTop: false });
    showToast('已离线。应用仍可打开，修改会保存在本机。');
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (!(window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) return;
  navigator.serviceWorker.register('./sw.js').catch((error) => {
    console.warn('Service Worker 注册失败：', error);
  });
}

function initApp() {
  if (state) return;
  state = loadState();
  const hashTab = location.hash.replace(/^#/, '');
  if (!TABS.includes(hashTab)) history.replaceState(null, '', '#today');
  ui.activeDate = todayISO();
  ui.reviewDate = todayISO();
  ui.courseWeek = clamp(getWeekInfo().week || 1, 1, state.settings.totalWeeks);
  setupInteraction();
  renderApp({ scrollTop: true });
  registerServiceWorker();
  if (initNotice) window.setTimeout(() => showToast(initNotice, { duration: 9000 }), 350);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
  initApp();
}

