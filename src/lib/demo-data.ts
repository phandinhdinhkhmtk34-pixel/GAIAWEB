/**
 * DEMO DATA — Phase 1 prototype only.
 * Everything in this file is invented for layout review. In Phase 2+ every value
 * is replaced by database queries (Supabase / PostgreSQL). Nothing here is real.
 */

type L10n = { ja: string; vi: string; en: string };

export function pick(text: L10n, locale: string): string {
  return (text as Record<string, string>)[locale] ?? text.en;
}

export interface Category {
  id: string;
  name: L10n;
  hue: number; // thumbnail art hue
}

export const categories: Category[] = [
  { id: "manners", name: { ja: "ビジネスマナー", vi: "Tác phong công sở", en: "Business manners" }, hue: 38 },
  { id: "safety", name: { ja: "安全衛生", vi: "An toàn lao động", en: "Workplace safety" }, hue: 8 },
  { id: "japanese", name: { ja: "仕事の日本語", vi: "Tiếng Nhật công việc", en: "Japanese for work" }, hue: 212 },
  { id: "it", name: { ja: "IT・デジタル", vi: "IT & kỹ năng số", en: "IT & digital" }, hue: 250 },
  { id: "compliance", name: { ja: "コンプライアンス", vi: "Tuân thủ", en: "Compliance" }, hue: 160 },
  { id: "service", name: { ja: "接客・サービス", vi: "Phục vụ khách hàng", en: "Customer service" }, hue: 330 },
];

/** Placeholder names for the eight GAIA V8 characters — replace with the official names. */
export const characters = ["Hikari", "Sora", "Ren", "Aoi", "Kaito", "Mei", "Daichi", "Yui"];

export interface Video {
  id: string;
  category: string;
  title: L10n;
  summary: L10n;
  minutes: number;
  character: string;
  premium: boolean;
  subtitles: string[];
  progress?: number; // 0-100, demo viewer only
  isNew?: boolean;
}

const ALL_SUBS = ["ja", "vi", "en", "my", "id", "si", "km"];

export const videos: Video[] = [
  {
    id: "v01", category: "manners", character: "Hikari", minutes: 8, premium: false, subtitles: ALL_SUBS, progress: 100,
    title: { ja: "初日のあいさつ", vi: "Lời chào ngày đầu tiên", en: "Greetings on day one" },
    summary: { ja: "ヒカリの入社初日。おじぎの角度と、名前を覚えてもらう自己紹介。", vi: "Ngày đầu đi làm của Hikari: góc cúi chào và cách tự giới thiệu để được nhớ tên.", en: "Hikari's first day: the right bow and a self-introduction people remember." },
  },
  {
    id: "v02", category: "manners", character: "Ren", minutes: 12, premium: true, subtitles: ALL_SUBS, progress: 45,
    title: { ja: "報・連・相のタイミング", vi: "Báo cáo – liên lạc – bàn bạc đúng lúc", en: "When to report, update and consult" },
    summary: { ja: "トラブルを一人で抱えたレンが、上司に相談するまで。", vi: "Ren ôm sự cố một mình, cho đến khi biết hỏi ý cấp trên.", en: "Ren keeps a problem to himself until he learns to ask his manager." },
  },
  {
    id: "v03", category: "safety", character: "Daichi", minutes: 10, premium: true, subtitles: ALL_SUBS, isNew: true,
    title: { ja: "ヒヤリハットを報告する", vi: "Báo cáo sự cố suýt xảy ra", en: "Reporting near misses" },
    summary: { ja: "倉庫でのヒヤリとした瞬間。ダイチは何を記録し、誰に伝えたか。", vi: "Một khoảnh khắc suýt tai nạn trong kho: Daichi ghi lại gì và báo cho ai.", en: "A close call in the warehouse: what Daichi wrote down and who he told." },
  },
  {
    id: "v04", category: "safety", character: "Mei", minutes: 7, premium: true, subtitles: ["ja", "vi", "en", "id"], progress: 80,
    title: { ja: "熱中症を防ぐ", vi: "Phòng say nắng", en: "Preventing heatstroke" },
    summary: { ja: "真夏の現場。メイが気づいた同僚の小さな変化。", vi: "Công trường giữa hè và thay đổi nhỏ ở đồng nghiệp mà Mei nhận ra.", en: "Midsummer on site, and the small change Mei notices in a coworker." },
  },
  {
    id: "v05", category: "japanese", character: "Aoi", minutes: 15, premium: true, subtitles: ALL_SUBS,
    title: { ja: "電話の受け方", vi: "Cách nghe điện thoại", en: "Answering the phone" },
    summary: { ja: "「少々お待ちください」から伝言メモまで。アオイと練習。", vi: "Từ “xin chờ một chút” đến ghi lời nhắn, luyện cùng Aoi.", en: "From “one moment please” to taking a message, practised with Aoi." },
  },
  {
    id: "v06", category: "japanese", character: "Sora", minutes: 9, premium: false, subtitles: ALL_SUBS, isNew: true,
    title: { ja: "敬語のきほん", vi: "Kính ngữ cơ bản", en: "Keigo basics" },
    summary: { ja: "ソラが間違えやすい三つの敬語を、場面で覚える。", vi: "Ba lỗi kính ngữ Sora hay mắc, học qua tình huống.", en: "Three keigo slips Sora keeps making, learned through scenes." },
  },
  {
    id: "v07", category: "it", character: "Kaito", minutes: 11, premium: true, subtitles: ["ja", "vi", "en"],
    title: { ja: "怪しいメールを見分ける", vi: "Nhận diện email lừa đảo", en: "Spotting phishing email" },
    summary: { ja: "カイトに届いた「至急」のメール。開く前に確認する 4 つの点。", vi: "Email “khẩn cấp” gửi Kaito: 4 điều cần kiểm tra trước khi mở.", en: "An “urgent” email reaches Kaito: four checks before opening it." },
  },
  {
    id: "v08", category: "it", character: "Yui", minutes: 13, premium: true, subtitles: ALL_SUBS, isNew: true,
    title: { ja: "チャットで伝わる書き方", vi: "Viết tin nhắn công việc rõ ràng", en: "Writing clear work chats" },
    summary: { ja: "ユイの一行メッセージが誤解された理由。", vi: "Vì sao tin nhắn một dòng của Yui bị hiểu lầm.", en: "Why Yui's one-line message was misunderstood." },
  },
  {
    id: "v09", category: "compliance", character: "Ren", minutes: 10, premium: true, subtitles: ALL_SUBS,
    title: { ja: "個人情報の扱い方", vi: "Xử lý thông tin cá nhân", en: "Handling personal data" },
    summary: { ja: "コピー機に残された書類。レンはどうする？", vi: "Tài liệu bị bỏ quên ở máy photo. Ren sẽ làm gì?", en: "Papers left on the copier. What does Ren do?" },
  },
  {
    id: "v10", category: "compliance", character: "Hikari", minutes: 8, premium: true, subtitles: ["ja", "en", "vi", "my"],
    title: { ja: "ハラスメントに気づく", vi: "Nhận biết quấy rối nơi làm việc", en: "Recognising harassment" },
    summary: { ja: "冗談のつもりの一言。ヒカリが相談窓口を使うまで。", vi: "Một câu “đùa” và hành trình Hikari tìm đến bộ phận hỗ trợ.", en: "A remark meant as a joke, and how Hikari uses the help desk." },
  },
  {
    id: "v11", category: "service", character: "Mei", minutes: 9, premium: true, subtitles: ALL_SUBS, progress: 20,
    title: { ja: "クレームへの最初の一言", vi: "Câu đầu tiên khi khách phàn nàn", en: "The first words to a complaint" },
    summary: { ja: "怒ったお客様の前で、メイが最初に言ったこと。", vi: "Điều đầu tiên Mei nói trước vị khách đang giận.", en: "What Mei says first to an angry customer." },
  },
  {
    id: "v12", category: "service", character: "Aoi", minutes: 6, premium: false, subtitles: ALL_SUBS,
    title: { ja: "笑顔のお見送り", vi: "Tiễn khách với nụ cười", en: "Seeing customers off" },
    summary: { ja: "最後の 10 秒で印象が変わる。アオイのお見送り。", vi: "10 giây cuối thay đổi ấn tượng: Aoi tiễn khách.", en: "The last ten seconds change everything: Aoi sees a guest off." },
  },
];

/* ---------------- Dashboard (demo viewer: a company manager) ---------------- */

export const demoMember = {
  name: "田中 美咲",
  email: "misaki.tanaka@example.co.jp",
  company: "サクラ物流株式会社（デモ）",
  plan: "monthly" as const,
  status: "active" as const,
  renewsAt: "2026-12-01T00:00:00+09:00",
  seatsTotal: 6,
  watchMinutes: 186,
  completed: 9,
  streak: 5,
  favorites: ["v03", "v07", "v05"],
  history: ["v02", "v04", "v11", "v01"],
  completedCourses: [
    { id: "manners", done: 3, total: 4 },
    { id: "safety", done: 2, total: 5 },
    { id: "japanese", done: 4, total: 6 },
  ],
};

export const weeklyMinutes = [
  { week: "10/6", minutes: 32 },
  { week: "10/13", minutes: 48 },
  { week: "10/20", minutes: 41 },
  { week: "10/27", minutes: 65 },
  { week: "11/3", minutes: 52 },
];

export const demoPayments = [
  { id: "R-2026-0112", date: "2026-11-01", desc: { ja: "月額プラン（6 アカウント）", vi: "Gói tháng (6 tài khoản)", en: "Monthly plan (6 accounts)" }, method: "card", amount: 45000, status: "paid" },
  { id: "R-2026-0087", date: "2026-10-01", desc: { ja: "月額プラン（5 アカウント）", vi: "Gói tháng (5 tài khoản)", en: "Monthly plan (5 accounts)" }, method: "bank", amount: 42000, status: "paid" },
  { id: "R-2026-0051", date: "2026-09-01", desc: { ja: "月額プラン（3 アカウント）", vi: "Gói tháng (3 tài khoản)", en: "Monthly plan (3 accounts)" }, method: "bank", amount: 36000, status: "paid" },
] as const;

export const demoEmployees = [
  { name: "グエン・ヴァン・アン", email: "an.nguyen@example.co.jp", progress: 72, last: "2026-11-04", invited: false },
  { name: "Thiri Aung", email: "thiri@example.co.jp", progress: 54, last: "2026-11-03", invited: false },
  { name: "Dewi Lestari", email: "dewi@example.co.jp", progress: 38, last: "2026-10-30", invited: false },
  { name: "佐藤 健", email: "ken.sato@example.co.jp", progress: 91, last: "2026-11-05", invited: false },
];

/* ---------------- Admin (demo business data) ---------------- */

export const adminKpis = {
  users: 1284,
  paid: 932,
  companies: 87,
  activeSubs: 214,
  mrr: 7_842_000,
  total: 41_260_000,
  pending: 3,
  videos: 148,
  views: 23_418,
};

export const monthlyRevenue = [
  { month: "6月", revenue: 4_920_000 },
  { month: "7月", revenue: 5_380_000 },
  { month: "8月", revenue: 5_910_000 },
  { month: "9月", revenue: 6_640_000 },
  { month: "10月", revenue: 7_210_000 },
  { month: "11月", revenue: 7_842_000 },
];

export const viewsByCategory = [
  { id: "manners", views: 6240 },
  { id: "safety", views: 5120 },
  { id: "japanese", views: 4870 },
  { id: "it", views: 3210 },
  { id: "compliance", views: 2380 },
  { id: "service", views: 1598 },
];

export const pendingTransfers = [
  { code: "GL-24117", customer: "株式会社ミナト食品", seats: 12, amount: 63000, date: "2026-11-04" },
  { code: "GL-24113", customer: "Lotus Care 合同会社", seats: 4, amount: 39000, date: "2026-11-03" },
  { code: "GL-24109", customer: "山本 翔太", seats: 1, amount: 30000, date: "2026-11-02" },
];

export const adminMembers = [
  { name: "サクラ物流株式会社", type: "company", seats: 6, status: "active", since: "2026-09-01" },
  { name: "株式会社ミナト食品", type: "company", seats: 12, status: "pending", since: "2026-11-04" },
  { name: "Lotus Care 合同会社", type: "company", seats: 4, status: "pending", since: "2026-11-03" },
  { name: "Pham Thi Lan", type: "individual", seats: 1, status: "active", since: "2026-07-15" },
  { name: "北斗建設株式会社", type: "company", seats: 25, status: "cancelled", since: "2026-03-01" },
  { name: "Ko Min Thant", type: "individual", seats: 1, status: "expired", since: "2026-05-20" },
];

export const auditLog = [
  { who: "admin@gaia（デモ）", what: "GL-24098 の入金を確認", when: "2026-11-04T14:12:00+09:00" },
  { who: "editor@gaia（デモ）", what: "動画「ヒヤリハットを報告する」を公開", when: "2026-11-03T10:40:00+09:00" },
  { who: "admin@gaia（デモ）", what: "追加アカウント料金を表示（変更なし）", when: "2026-11-02T09:05:00+09:00" },
  { who: "accounting@gaia（デモ）", what: "10 月分の売上を CSV 出力", when: "2026-11-01T18:30:00+09:00" },
];
