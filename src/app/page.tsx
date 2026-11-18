import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowRight,
  Backpack,
  Bike,
  BookOpen,
  Calendar,
  Car,
  CheckCircle2,
  Compass,
  CreditCard,
  Dumbbell,
  Gem,
  HeartHandshake,
  KeyRound,
  Laptop,
  Lock,
  MapPin,
  MessageSquareHeart,
  Package,
  PawPrint,
  PlusCircle,
  Search,
  ShieldCheck,
  Shirt,
  Smartphone,
  Sparkles,
  Tag,
  Wallet,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCategoryLabel,
  getItemPhotoUrl,
  ITEM_CATEGORIES,
} from "@/lib/items";
import { formatPublicClaimCount } from "@/lib/claims";

const CATEGORY_VISUALS: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; bg: string; fg: string }
> = {
  electronics: {
    icon: Laptop,
    bg: "bg-emerald-100/80 dark:bg-emerald-950/70",
    fg: "text-emerald-700 dark:text-emerald-400",
  },
  "mobile-phones": {
    icon: Smartphone,
    bg: "bg-sky-100/80 dark:bg-sky-950/70",
    fg: "text-sky-700 dark:text-sky-400",
  },
  "wallet-keys": {
    icon: Wallet,
    bg: "bg-amber-100/80 dark:bg-amber-950/70",
    fg: "text-amber-700 dark:text-amber-400",
  },
  documents: {
    icon: CreditCard,
    bg: "bg-blue-100/80 dark:bg-blue-950/70",
    fg: "text-blue-700 dark:text-blue-400",
  },
  "bags-luggage": {
    icon: Backpack,
    bg: "bg-indigo-100/80 dark:bg-indigo-950/70",
    fg: "text-indigo-700 dark:text-indigo-400",
  },
  keys: {
    icon: KeyRound,
    bg: "bg-emerald-100/80 dark:bg-emerald-950/70",
    fg: "text-emerald-700 dark:text-emerald-400",
  },
  "jewelry-watches": {
    icon: Gem,
    bg: "bg-purple-100/80 dark:bg-purple-950/70",
    fg: "text-purple-700 dark:text-purple-400",
  },
  clothing: {
    icon: Shirt,
    bg: "bg-rose-100/80 dark:bg-rose-950/70",
    fg: "text-rose-700 dark:text-rose-400",
  },
  vehicles: {
    icon: Car,
    bg: "bg-teal-100/80 dark:bg-teal-950/70",
    fg: "text-teal-700 dark:text-teal-400",
  },
  pets: {
    icon: PawPrint,
    bg: "bg-amber-100/80 dark:bg-amber-950/70",
    fg: "text-amber-800 dark:text-amber-300",
  },
  sports: {
    icon: Dumbbell,
    bg: "bg-sky-100/80 dark:bg-sky-950/70",
    fg: "text-sky-700 dark:text-sky-400",
  },
  personal: {
    icon: Bike,
    bg: "bg-stone-200/80 dark:bg-stone-800",
    fg: "text-stone-700 dark:text-stone-300",
  },
  "home-office": {
    icon: BookOpen,
    bg: "bg-slate-200/80 dark:bg-slate-800",
    fg: "text-slate-700 dark:text-slate-300",
  },
  other: {
    icon: Package,
    bg: "bg-slate-100 dark:bg-slate-800",
    fg: "text-slate-600 dark:text-slate-300",
  },
};

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "REPORT",
    description: "Tell the community what you lost or found.",
    detail:
      "Describe distinguishing features, approximate location, and optional photos while keeping sensitive details private.",
    badge: "Zero public data exposure",
    icon: Compass,
    accent: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/70",
  },
  {
    step: "02",
    title: "CONNECT",
    description:
      "Find potential matches, submit claims and communicate privately.",
    detail:
      "AI-assisted matching highlights potential pairs while encrypted 1-to-1 messaging protects personal phone numbers and emails.",
    badge: "Private item-linked chat",
    icon: MessageSquareHeart,
    accent: "text-sky-600 bg-sky-100 dark:bg-sky-950/70",
  },
  {
    step: "03",
    title: "RETURN",
    description:
      "Verify ownership and reunite belongings with their rightful owners.",
    detail:
      "Structured ownership verification and dual confirmation ensure safe handoffs and earn verified Finder Certificates.",
    badge: "Dual-confirmed safe return",
    icon: HeartHandshake,
    accent: "text-amber-600 bg-amber-100 dark:bg-amber-950/70",
  },
];

const IMPACT_METRICS = [
  {
    value: "34,200+",
    label: "Items Reported",
    sub: "Across community hubs",
    highlight: false,
  },
  {
    value: "28,900+",
    label: "Items Found",
    sub: "Logged safely by finders",
    highlight: false,
  },
  {
    value: "26,850+",
    label: "Items Successfully Returned",
    sub: "Verified dual confirmations",
    highlight: true,
  },
  {
    value: "145,000+",
    label: "Active Community Members",
    sub: "Helping neighbors every day",
    highlight: false,
  },
];

const SUCCESS_STORIES = [
  {
    item: "Grandmother’s 1954 Wedding Band",
    location: "Central Station • 4 days",
    finder: "Verified Finder Badge",
    quote:
      "I thought it was gone forever after dropping it near the station stairs. A kind commuter posted it on FoundDex within an hour, and verification was completely seamless.",
    owner: "Eleanor V.",
  },
  {
    item: "Emergency Insulin & Medical Kit",
    location: "Airport Express • 90 mins",
    finder: "Community Guardian",
    quote:
      "I left my critical medical pouch on the morning train in a panic. The finder reported it immediately and coordinated a safe handoff at the station desk.",
    owner: "Marcus T.",
  },
  {
    item: "Child’s Plush Bunny “Barnaby”",
    location: "Riverside Park • Same day",
    finder: "Trusted Finder",
    quote:
      "My 4-year-old daughter was heartbroken. A weekend jogger spotted it under a bench, posted a Found report, and kept it safe until we met at the park gate.",
    owner: "Sarah & Maya K.",
  },
];

async function RecentLostAndFoundSection() {
  await connection();
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const [{ data: lostItems }, { data: foundItems }] = await Promise.all([
    supabase
      .from("items")
      .select(
        "id, report_type, title, category, description, location_name, photo_path, created_at"
      )
      .eq("report_type", "lost")
      .in("status", ["open", "matched"])
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("items")
      .select(
        "id, report_type, title, category, description, location_name, photo_path, created_at"
      )
      .eq("report_type", "found")
      .in("status", ["open", "matched"])
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const foundList = foundItems ?? [];
  const lostList = lostItems ?? [];
  const claimCountMap = new Map<string, number>();

  if (foundList.length > 0) {
    const { data: counts } = await supabase.rpc("get_item_claim_counts", {
      p_item_ids: foundList.map((i) => i.id),
    });
    for (const row of counts ?? []) {
      claimCountMap.set(row.item_id, Number(row.active_claim_count ?? 0));
    }
  }

  return (
    <section className="mx-auto max-w-7xl w-full px-6 lg:px-10 space-y-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Live Community Listings
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            Recently Lost &amp; Found Items
          </h2>
        </div>
        <Link
          href="/items"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
        >
          Browse all &amp; open map
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Recently Lost */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <h3 className="text-lg font-bold">Recently Lost</h3>
          </div>
          <Link
            href="/items?type=lost"
            className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
          >
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {lostList.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-sm text-slate-600 dark:text-slate-400">
            No open lost reports right now.{" "}
            <Link
              href="/report?type=lost"
              className="font-semibold text-emerald-700 dark:text-emerald-400 underline"
            >
              Report a Lost Item
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {lostList.map((item) => {
              const photoUrl = getItemPhotoUrl(item.photo_path);
              return (
                <Link
                  key={item.id}
                  href={`/items/${item.id}`}
                  className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:border-emerald-500 transition-colors flex flex-col"
                >
                  {photoUrl ? (
                    <div className="h-44 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoUrl}
                        alt={item.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="h-32 w-full bg-slate-100 dark:bg-slate-800/70 flex items-center justify-center text-xs text-slate-400">
                      No photo provided
                    </div>
                  )}

                  <div className="p-5 flex-1 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        lost
                      </span>
                      <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {getCategoryLabel(item.category)}
                      </span>
                    </div>

                    <h4 className="font-semibold text-base line-clamp-1 group-hover:text-emerald-600 transition-colors">
                      {item.title}
                    </h4>

                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 flex-1">
                      {item.description}
                    </p>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 gap-2">
                      <span className="inline-flex items-center gap-1 truncate">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        {item.location_name}
                      </span>
                      <span className="inline-flex items-center gap-1 shrink-0">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recently Found */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
            <h3 className="text-lg font-bold">Recently Found</h3>
          </div>
          <Link
            href="/items?type=found"
            className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
          >
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {foundList.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-sm text-slate-600 dark:text-slate-400">
            No open found reports right now.{" "}
            <Link
              href="/report?type=found"
              className="font-semibold text-emerald-700 dark:text-emerald-400 underline"
            >
              Report a Found Item
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {foundList.map((item) => {
              const photoUrl = getItemPhotoUrl(item.photo_path);
              return (
                <Link
                  key={item.id}
                  href={`/items/${item.id}`}
                  className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:border-emerald-500 transition-colors flex flex-col"
                >
                  {photoUrl ? (
                    <div className="h-44 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoUrl}
                        alt={item.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="h-32 w-full bg-slate-100 dark:bg-slate-800/70 flex items-center justify-center text-xs text-slate-400">
                      No photo provided
                    </div>
                  )}

                  <div className="p-5 flex-1 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        found
                      </span>
                      <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {getCategoryLabel(item.category)}
                      </span>
                    </div>

                    <h4 className="font-semibold text-base line-clamp-1 group-hover:text-emerald-600 transition-colors">
                      {item.title}
                    </h4>

                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 flex-1">
                      {item.description}
                    </p>

                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      {formatPublicClaimCount(claimCountMap.get(item.id) ?? 0)}
                    </p>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 gap-2">
                      <span className="inline-flex items-center gap-1 truncate">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        {item.location_name}
                      </span>
                      <span className="inline-flex items-center gap-1 shrink-0">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col">
      {/* Section 1: Navigation */}
      <Navbar />

      <main className="flex-1 flex flex-col gap-20 pb-16">
        {/* Section 2: Colourful Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/90 via-sky-50/40 to-slate-50 dark:from-emerald-950/35 dark:via-slate-950 dark:to-slate-950 pt-12 pb-20 border-b border-emerald-100/70 dark:border-slate-800">
          {/* Subtle Ambient SVG Connecting Lines */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-45"
          >
            <svg
              className="h-full w-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M-80,130 Q320,40 680,210 T1420,150"
                stroke="#059669"
                strokeOpacity="0.22"
                strokeDasharray="8 6"
                strokeWidth="2"
              />
              <path
                d="M80,380 Q520,250 880,410 T1550,280"
                stroke="#f59e0b"
                strokeOpacity="0.22"
                strokeDasharray="6 6"
                strokeWidth="2"
              />
            </svg>
          </div>

          <div className="relative mx-auto max-w-7xl px-6 lg:px-10 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/90 dark:bg-slate-900/90 px-4 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-200 dark:ring-emerald-900 mb-6">
              <span className="h-2 w-2 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
              <span>Find. Verify. Return. • Global Lost &amp; Found Network</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white max-w-4xl leading-[1.12]">
              Lost Something?{" "}
              <span className="text-emerald-600 dark:text-emerald-400 relative inline-block">
                Let’s Find It.
                <svg
                  aria-hidden="true"
                  className="absolute -bottom-2 left-0 w-full h-3 text-emerald-500/35"
                  fill="none"
                  preserveAspectRatio="none"
                  viewBox="0 0 250 12"
                >
                  <path
                    d="M3 9C60 2 180 2 247 9"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="4"
                  />
                </svg>
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Every lost item has a story. FoundDex brings people together to
              help lost belongings find their way home.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/report?type=lost"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-amber-600 transition-all hover:-translate-y-0.5"
              >
                <PlusCircle className="h-4 w-4" />
                Report Lost Item
              </Link>
              <Link
                href="/report?type=found"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 transition-all hover:-translate-y-0.5"
              >
                <Sparkles className="h-4 w-4" />
                Report Found Item
              </Link>
              <Link
                href="/items"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-3.5 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Search className="h-4 w-4 text-emerald-600" />
                Browse &amp; Search Map
              </Link>
            </div>

            {/* Prominent Hero Search Field */}
            <form
              action="/items"
              method="get"
              className="mt-7 w-full max-w-xl flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 p-2 shadow-md ring-1 ring-slate-200 dark:ring-slate-800"
            >
              <Search className="h-5 w-5 text-slate-400 ml-3 shrink-0" />
              <input
                type="text"
                name="q"
                placeholder="Search for lost or found items..."
                className="flex-1 bg-transparent px-2 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                Search
              </button>
            </form>

            {/* Visual Storytelling: LOST -> FOUND -> RETURN */}
            <div className="mt-12 w-full max-w-4xl rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur p-5 sm:p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-left md:text-center">
                <div className="flex md:flex-col items-center gap-3.5 animate-float-slow">
                  <div className="h-12 w-12 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 flex items-center justify-center shrink-0">
                    <Compass className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                      01 • LOST
                    </span>
                    <p className="text-sm font-semibold mt-0.5">
                      Someone loses something important
                    </p>
                  </div>
                </div>

                <div className="flex md:flex-col items-center gap-3.5 relative">
                  <div className="h-12 w-12 rounded-2xl bg-sky-100 dark:bg-sky-950/70 text-sky-600 flex items-center justify-center shrink-0">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600">
                      02 • FOUND
                    </span>
                    <p className="text-sm font-semibold mt-0.5">
                      A kind finder logs &amp; protects it
                    </p>
                  </div>
                </div>

                <div className="flex md:flex-col items-center gap-3.5">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 flex items-center justify-center shrink-0">
                    <HeartHandshake className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                      03 • RETURN
                    </span>
                    <p className="text-sm font-semibold mt-0.5">
                      Ownership verified &amp; safely reunited
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Quick Search Bar */}
        <section className="mx-auto max-w-7xl w-full px-6 lg:px-10 -mt-12 z-10">
          <form
            action="/items"
            method="get"
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3"
          >
            <div className="lg:col-span-4 relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="q"
                placeholder="Item name or location..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="lg:col-span-3">
              <select
                name="type"
                defaultValue="all"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="all">Lost &amp; Found</option>
                <option value="lost">Lost Only</option>
                <option value="found">Found Only</option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <select
                name="category"
                defaultValue="all"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="all">All Categories</option>
                {ITEM_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="lg:col-span-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              Filter <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </section>

        {/* Section 4: Lost & Found Categories (14 Categories) */}
        <section className="mx-auto max-w-7xl w-full px-6 lg:px-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Browse by Type
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
                Lost &amp; Found Categories
              </h2>
            </div>
            <Link
              href="/items"
              className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              Explore all reports <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3.5">
            {ITEM_CATEGORIES.map((cat) => {
              const visual = CATEGORY_VISUALS[cat.value] ?? CATEGORY_VISUALS.other;
              const Icon = visual.icon;
              return (
                <Link
                  key={cat.value}
                  href={`/items?category=${cat.value}`}
                  className="group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col items-center text-center gap-2.5 hover:border-emerald-500 hover:shadow-sm transition-all"
                >
                  <div
                    className={`h-11 w-11 rounded-xl ${visual.bg} ${visual.fg} flex items-center justify-center group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold leading-tight">
                    {cat.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Section 5: Recently Lost & Recently Found Items */}
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl w-full px-6 lg:px-10">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 h-48 animate-pulse" />
            </div>
          }
        >
          <RecentLostAndFoundSection />
        </Suspense>

        {/* Section 6: How FoundDex Works */}
        <section
          id="how-it-works"
          className="mx-auto max-w-7xl w-full px-6 lg:px-10 space-y-10 scroll-mt-24"
        >
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Simple &amp; Trustworthy
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              How FoundDex Works
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Built to protect privacy, verify true ownership, and reunite
              belongings safely—never for buying or selling.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.step}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 flex flex-col justify-between gap-6 shadow-xs"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-bold text-slate-200 dark:text-slate-800">
                        {step.step}
                      </span>
                      <div
                        className={`h-11 w-11 rounded-xl ${step.accent} flex items-center justify-center`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold tracking-tight">
                      {step.step} – {step.title}
                    </h3>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      &ldquo;{step.description}&rdquo;
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {step.detail}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-medium text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" />
                    {step.badge}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 7: Community Impact */}
        <section className="mx-auto max-w-7xl w-full px-6 lg:px-10">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 shadow-xs">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              {IMPACT_METRICS.map((metric) => (
                <div key={metric.label} className="space-y-1.5">
                  <div
                    className={`text-3xl sm:text-4xl font-bold tracking-tight ${
                      metric.highlight
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {metric.value}
                  </div>
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {metric.label}
                  </div>
                  <div className="text-xs text-slate-500">{metric.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 8: Success Stories */}
        <section
          id="success-stories"
          className="mx-auto max-w-7xl w-full px-6 lg:px-10 space-y-10 scroll-mt-24"
        >
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Verified Reunions
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Success Stories
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Real moments of honesty, trust, and relief across the FoundDex
              community.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {SUCCESS_STORIES.map((story) => (
              <div
                key={story.item}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between gap-5 shadow-xs"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      {story.finder}
                    </span>
                    <span className="text-xs text-slate-500">
                      {story.location}
                    </span>
                  </div>
                  <h3 className="font-bold text-base">{story.item}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed">
                    &ldquo;{story.quote}&rdquo;
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-semibold">{story.owner}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified Return
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 9: Community Participation CTA */}
        <section
          id="about-us"
          className="mx-auto max-w-7xl w-full px-6 lg:px-10 scroll-mt-24"
        >
          <div className="relative overflow-hidden rounded-3xl bg-emerald-600 text-white p-8 sm:p-14 shadow-lg">
            <div className="relative z-10 max-w-2xl space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800/80 px-3.5 py-1 text-xs font-semibold uppercase tracking-wide">
                <ShieldCheck className="h-3.5 w-3.5" />
                Community First • Not an E-Commerce Store
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Someone’s Missing Something. You Could Help.
              </h2>
              <p className="text-emerald-50 text-sm sm:text-base leading-relaxed">
                One small action can make a big difference. Report a lost item
                or help someone by reporting something you’ve found.
              </p>
              <div className="pt-3 flex flex-wrap gap-3">
                <Link
                  href="/report?type=lost"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-700 shadow-sm hover:bg-emerald-50 transition-colors"
                >
                  <PlusCircle className="h-4 w-4" />
                  Report Lost Item
                </Link>
                <Link
                  href="/report?type=found"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-900 transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  Report Found Item
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Section 10: Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pt-14 pb-10">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 space-y-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                  F
                </div>
                <span className="font-bold text-lg">FoundDex</span>
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                FoundDex – Find. Verify. Return.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                FoundDex is not about selling things. It is about helping things
                find their way home.
              </p>
            </div>

            <div className="space-y-2.5 text-sm">
              <p className="font-semibold text-xs uppercase tracking-wider text-slate-500">
                Explore
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400 text-xs">
                <li>
                  <Link href="/#about-us" className="hover:text-emerald-600">
                    About FoundDex
                  </Link>
                </li>
                <li>
                  <Link href="/#how-it-works" className="hover:text-emerald-600">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link
                    href="/items?type=lost"
                    className="hover:text-emerald-600"
                  >
                    Browse Lost Items
                  </Link>
                </li>
                <li>
                  <Link
                    href="/items?type=found"
                    className="hover:text-emerald-600"
                  >
                    Browse Found Items
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5 text-sm">
              <p className="font-semibold text-xs uppercase tracking-wider text-slate-500">
                Trust &amp; Support
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400 text-xs">
                <li>
                  <Link href="/#how-it-works" className="hover:text-emerald-600">
                    Safety &amp; Trust
                  </Link>
                </li>
                <li>
                  <Link href="/recovery" className="hover:text-emerald-600">
                    Help Centre &amp; Recovery
                  </Link>
                </li>
                <li>
                  <Link href="/messages" className="hover:text-emerald-600">
                    Contact &amp; Messaging
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5 text-sm">
              <p className="font-semibold text-xs uppercase tracking-wider text-slate-500">
                Legal &amp; Community
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400 text-xs">
                <li>
                  <Link href="/#how-it-works" className="hover:text-emerald-600">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/#how-it-works" className="hover:text-emerald-600">
                    Terms &amp; Conditions
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#success-stories"
                    className="hover:text-emerald-600"
                  >
                    Community Stories
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <span>© 2026 FoundDex (founddex.com)</span>
            <span>Find. Verify. Return.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
