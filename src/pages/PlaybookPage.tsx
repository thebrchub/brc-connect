import { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  MessageSquare,
  PhoneCall,
  IndianRupee,
  ShieldAlert,
  Sparkles,
  Quote,
  MessageCircle,
  ChevronDown,
} from "lucide-react";

export default function PlaybookPage() {
  const [activeSection, setActiveSection] = useState("mindset");
  const [openObj, setOpenObj] = useState<number | null>(null);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const navItems = [
    { id: "mindset", label: "1. The Sales Mindset", icon: BookOpen },
    { id: "phrases", label: "2. What (Not) To Say", icon: MessageSquare },
    { id: "first-15", label: "3. The First 15 Secs", icon: PhoneCall },
    { id: "hooks", label: "4. Curiosity Hooks", icon: Sparkles },
    { id: "objections", label: "5. Handling Objections", icon: ShieldAlert },
    { id: "human", label: "6. Sounding Human", icon: UsersIcon },
    { id: "whatsapp", label: "7. WhatsApp Rules", icon: MessageCircle },
    { id: "pricing", label: "8. Pricing Reference", icon: IndianRupee },
    { id: "never-do", label: "9. Never Do These", icon: XCircle },
    { id: "ending", label: "10. The Perfect Ending", icon: CheckCircle2 },
  ];

  const objections = [
    {
      tag: "Not Interested",
      client: "Not interested.",
      response:
        "Completely understand — most business owners feel this way at first. I just had one specific observation about your digital presence worth flagging. If it doesn't land, I won't take more than 30 more seconds of your time.",
      note: "One relevant observation is enough to make the call worthwhile.",
    },
    {
      tag: "Already Have a Website",
      client: "We already have a website.",
      response:
        "That's great — the question is usually less about whether it exists and more about whether it's doing the job. I noticed something specific about your current setup that's a fairly common drop-off point. Mind if I share it quickly?",
      note: "Acknowledge it, then pivot to function — not existence.",
    },
    {
      tag: "Too Expensive",
      client: "It sounds too expensive / we don't have budget.",
      response:
        "Fair point to raise early. The investment depends a lot on scope, and we're pretty flexible in how we structure things. Usually it helps to figure out what you actually need first — then we find a structure that fits. Would a quick scoping call make sense?",
      note: "Never defend price. Redirect to scope first, price second.",
    },
    {
      tag: "Send Details",
      client: "Just send me your brochure / details on WhatsApp.",
      response:
        "Happy to — but a generic PDF isn't very useful. What I'd rather do is send you a short, specific note about what's relevant for your business. It'll take 30 seconds to read. Does that work?",
      note: "Reframe 'details' as something specific and short. Avoid the brochure dump.",
    },
    {
      tag: "Call Me Later",
      client: "Call me later / this isn't a good time.",
      response:
        "Sure, no problem. When works better — tomorrow morning or later in the week? I'll make a note and reach out then. And I'll drop a quick line on WhatsApp so you have some context beforehand.",
      note: "Confirm a specific time. Don't leave it open-ended.",
    },
    {
      tag: "Already with an Agency",
      client: "We're already working with someone.",
      response:
        "That makes sense — most growing businesses are. I'm not suggesting you switch anything right now. Sometimes a second perspective on your digital presence surfaces things worth thinking about. Happy to leave you with one observation and take it from there.",
      note: "Never compete directly. Position as a second opinion, not a replacement.",
    },
    {
      tag: "No Budget Right Now",
      client: "We don't have budget right now.",
      response:
        "Totally understand — timing matters. I just want to make sure that when you're ready, you have a clear sense of what the options look like. Would it be okay if I followed up in a few weeks to see if anything has shifted?",
      note: "Accept gracefully. Ask for a future follow-up window. Don't pressure.",
    },
    {
      tag: "Not Now",
      client: "Not now / bad time.",
      response:
        "Absolutely. I just had one thing I wanted to flag — if you have 30 seconds I'll say it and leave you alone. If not, I'll drop a short note on WhatsApp and you can read it whenever you're free.",
      note: "Don't hang up immediately. Offer a 30-second version or a WhatsApp note.",
    },
  ];

  return (
    <div className="w-full relative animate-in fade-in duration-500 space-y-6">
      
      {/* Ambient Background Glow */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[400px] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative z-10">
        <div>
      
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            BRC HUB Sales Playbook
          </h1>
          <p className="text-sm text-zinc-400 mt-3 max-w-2xl leading-relaxed font-medium">
            A battle-tested, trust-first B2B sales cheat sheet for the Indian market. Built for real calls — not theory.
          </p>
        </div>

        {/* Trust Banner */}
        <div className="shrink-0 flex items-center gap-3 bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20 rounded-2xl px-5 py-3.5 self-start sm:self-auto shadow-[inset_0_1px_1px_rgba(249,115,22,0.1),0_4px_10px_rgba(0,0,0,0.2)]">
          <ShieldAlert size={18} className="text-orange-400 shrink-0 drop-shadow-[0_0_5px_rgba(249,115,22,0.4)]" />
          <p className="text-xs font-extrabold text-orange-300 uppercase tracking-widest">
            Trust &gt; Pressure
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start relative z-10">

        {/* Sticky Sidebar Nav */}
        <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-24 hidden md:block">
          <div className="bg-[#09090b] border border-white/5 rounded-3xl p-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_10px_20px_rgba(0,0,0,0.4)]">
            <nav className="flex flex-col space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all text-left ${
                    activeSection === item.id
                      ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <item.icon
                    size={14}
                    className={activeSection === item.id ? "text-orange-400" : "text-zinc-600"}
                  />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Mobile Nav Pills */}
        <div className="flex md:hidden w-full gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`shrink-0 text-[11px] font-bold px-4 py-2 rounded-full border transition-all whitespace-nowrap ${
                activeSection === item.id
                  ? "bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]"
                  : "bg-[#09090b] text-zinc-500 border-white/5 hover:text-zinc-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <main className="flex-1 space-y-6 pb-24 w-full min-w-0">

          {/* ── Section 1: Mindset ── */}
          <SectionCard id="mindset" title="1. The Sales Mindset" icon={<BookOpen size={20} />}>
            <div className="grid sm:grid-cols-2 gap-6 mb-6">
              <div className="space-y-3">
                <h4 className="text-[11px] font-extrabold text-orange-500 uppercase tracking-widest drop-shadow-sm">The Indian B2B Reality</h4>
                <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                  Indian business owners have a well-trained radar for performance. The moment they sense a rehearsed script, an inflated claim, or fake energy — they mentally check out. Their "I'll think about it" often means the call is already over.
                </p>
                <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                  They respond to calm confidence, specific observations, and respectful communication — not hype, not American-style energy, not manufactured urgency.
                </p>
              </div>
              <div className="space-y-4">
                <h4 className="text-[11px] font-extrabold text-orange-500 uppercase tracking-widest drop-shadow-sm">The Core Framework</h4>
                <div className="bg-[#09090b] border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] rounded-2xl p-5 flex items-center justify-center gap-3 text-sm font-extrabold text-white flex-wrap">
                  <span>Relationship</span>
                  <span className="text-zinc-700">→</span>
                  <span>Trust</span>
                  <span className="text-zinc-700">→</span>
                  <span>Value</span>
                  <span className="text-zinc-700">→</span>
                  <span className="text-accent-start drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]">Deal</span>
                </div>
                <p className="text-xs text-zinc-500 font-medium italic text-center">
                  Goal of call #1: earn 5 more minutes of honest conversation — not to close.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <MindsetCard
                title="Sound like a consultant"
                body="Consultants observe before they advise. They ask questions, admit uncertainty, and speak specifically. They don't pitch everything — they identify the one thing that matters."
              />
              <MindsetCard
                title="Calm is your edge"
                body="Everyone else is louder and more desperate. You being measured and specific will feel different — and different feels trustworthy in a noisy market."
              />
              <MindsetCard
                title="Never fake it"
                body="Avoid exaggerated case studies and hype language. Use pattern language instead: 'We usually notice this with businesses at your stage…' — it's honest and it lands."
              />
            </div>
          </SectionCard>

          {/* ── Section 2: What to Say ── */}
          <SectionCard id="phrases" title="2. What Not To Say vs. What To Say" icon={<MessageSquare size={20} />}>
            <p className="text-sm text-zinc-400 mb-5 font-medium">Replace agency-talk with consultant-talk. Every phrase below has a natural, human alternative.</p>
            <div className="overflow-x-auto rounded-3xl border border-white/5 bg-[#09090b] shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
              <table className="w-full text-sm text-left min-w-[520px]">
                <thead className="bg-white/[0.02] border-b border-white/5 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">
                  <tr>
                    <th className="px-6 py-4 w-1/2">❌ Say This Never (Salesy & Fake)</th>
                    <th className="px-6 py-4 w-1/2">✓ Say This Instead (Calm & Consultative)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <ComparisonRow bad="We provide website development services." good="Quick observation regarding your website — is this a good time for 2 minutes?" />
                  <ComparisonRow bad="We are the best agency in India." good="Our focus is building practical, scalable solutions — not flashy work that doesn't convert." />
                  <ComparisonRow bad="We have worked with 100+ clients." good="We typically work with businesses at exactly this stage — so we know what the common friction points are." />
                  <ComparisonRow bad="We will scale your business." good="What we can do is solve the specific digital gaps that are costing you right now." />
                  <ComparisonRow bad="We guarantee results." good="We can give you a realistic picture of what's achievable — and what it takes to get there." />
                  <ComparisonRow bad="This offer is only valid till Friday." good="Whenever you're ready, we can block time and figure out what actually makes sense." />
                  <ComparisonRow bad="Let me send you our brochure." good="Let me send a short note on WhatsApp covering specifically what's relevant for your business." />
                  <ComparisonRow bad="We recently scaled a brand from 5Cr to 12Cr." good="This is a pattern we see often with businesses at your stage — and there's usually one root cause." />
                  <ComparisonRow bad="Can I pitch our services?" good="Can I share one thing I noticed that's typically costing businesses like yours?" />
                  <ComparisonRow bad="We have a special discount for you." good="Depending on scope, we usually find a structure that fits the budget without cutting corners." />
                  <ComparisonRow bad="When can we finalize this?" good="What would help you make a comfortable decision from here?" />
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* ── Section 3: First 15 Seconds ── */}
          <SectionCard id="first-15" title="3. The Perfect First 15 Seconds" icon={<PhoneCall size={20} />}>
            <p className="text-sm text-zinc-400 mb-6 font-medium">
              The only goal: prevent an immediate hang-up. Be specific, be calm, create mild curiosity. Never say "I want to introduce our services" — say "I had one observation."
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <ScriptBox
                title="Local Business"
                script="Hi, this is [Name] calling from BRC HUB. I noticed your Google presence is quite strong, but I had one observation about your website I wanted to quickly mention. Is now a bad time?"
              />
              <ScriptBox
                title="Startup / Early-Stage"
                script="Hi [Name], I'm calling from BRC HUB. We work with early-stage startups on their product and web infrastructure. I had a specific observation about where you might be losing early traction online — do you have 2 minutes?"
              />
              <ScriptBox
                title="D2C / E-Commerce Brand"
                script="Hi, this is [Name] from BRC HUB. I noticed something on your store that's a fairly common drop-off point for growing brands. Quick question — is your mobile traffic converting the way you'd expect?"
              />
              <ScriptBox
                title="SaaS Founder"
                script="Hi [Name], BRC HUB here. Quick question: are you managing product development in-house, or exploring a tech partner? I had an observation I wanted to share quickly."
              />
              <ScriptBox
                title="Clinic / Healthcare"
                script="Hi, this is [Name] from BRC HUB. We help clinics improve how patients find and trust them online. I noticed one thing about your current setup worth flagging. Is this a good moment?"
              />
              <ScriptBox
                title="Real Estate"
                script="Hi [Name], BRC HUB here — we work with real estate businesses on their lead generation infrastructure. I had a quick observation about your enquiry flow. Do you have 2 minutes?"
              />
            </div>
          </SectionCard>

          {/* ── Section 4: Hooks ── */}
          <SectionCard id="hooks" title="4. Micro-Hooks That Create Curiosity" icon={<Sparkles size={20} />}>
            <p className="text-sm text-zinc-400 mb-5 font-medium">Use one hook per call. It should feel like an observation, not a claim. Specific beats generic every time.</p>
            <ul className="grid sm:grid-cols-2 gap-3">
              <HookItem text="Your Google presence is stronger than your website right now — that gap is actively costing you." />
              <HookItem text="Most visitors on mobile leave within the first 3–4 seconds. Your current site is in that risk zone." />
              <HookItem text="Your reviews are genuinely strong — but the website doesn't reflect that trust level yet." />
              <HookItem text="Businesses at your stage usually have good offline credibility and weak digital credibility. It's a very common pattern." />
              <HookItem text="The way your enquiry form is set up right now — you're likely losing 30–40% of interested visitors before they submit." />
              <HookItem text="There's usually a mismatch between how much a business spends on ads and how well the landing experience converts. That's likely happening here." />
              <HookItem text="The typical clinic we work with gets found on Google but loses the patient at the appointment booking step. Worth checking if that's the case." />
              <HookItem text="Most D2C brands focus on acquisition but lose customers on product pages. That's usually where the real revenue leak is." />
              <HookItem text="Your social presence looks active, but when someone searches you, the website doesn't carry that energy. That inconsistency affects trust." />
              <HookItem text="SaaS products typically struggle with pricing page clarity and onboarding drop-off — both are recoverable with the right UX thinking." />
              <HookItem text="Your competitors in this space are starting to invest in proper mobile experiences. The gap is still small — but it won't stay that way." />
            </ul>
          </SectionCard>

          {/* ── Section 5: Objections ── */}
          <SectionCard id="objections" title="5. Handling Objections (Calmly)" icon={<ShieldAlert size={20} />}>
            <p className="text-sm text-zinc-400 mb-5 font-medium">
              Never argue. Never panic. Never get defensive. Acknowledge → Pivot. Click each objection to expand.
            </p>
            <div className="space-y-3">
              {objections.map((obj, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-[#09090b] border border-white/5 overflow-hidden shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] transition-all duration-300"
                >
                  <button
                    onClick={() => setOpenObj(openObj === i ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#121214] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 group-hover:bg-red-500/15 transition-colors">
                        {obj.tag}
                      </span>
                      <span className="text-sm font-medium text-zinc-400 italic hidden sm:block truncate max-w-sm">"{obj.client}"</span>
                    </div>
                    <div className={`p-1.5 rounded-full bg-white/5 transition-transform duration-300 ${openObj === i ? "rotate-180 bg-white/10" : ""}`}>
                      <ChevronDown size={14} className="text-zinc-400" />
                    </div>
                  </button>
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${
                      openObj === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-5 bg-[#050505]/50">
                        <p className="text-sm text-red-400/90 font-medium flex items-start gap-2">
                          <XCircle size={16} className="shrink-0 mt-0.5 opacity-70" />
                          <span className="italic">Client: "{obj.client}"</span>
                        </p>
                        <p className="text-sm text-emerald-400 font-medium flex items-start gap-2">
                          <CheckCircle2 size={16} className="shrink-0 mt-0.5 opacity-80" />
                          <span>You: "{obj.response}"</span>
                        </p>
                        <div className="ml-6 pl-3 border-l-2 border-zinc-800">
                          <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Playbook Note</p>
                          <p className="text-xs text-zinc-400 font-medium italic">
                            {obj.note}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ── Section 6 & 7: Human + WhatsApp ── */}
          <div className="grid lg:grid-cols-2 gap-6">
            <SectionCard id="human" title="6. Sounding Human" icon={<UsersIcon size={20} />}>
              <ul className="space-y-4 text-sm text-zinc-300">
                <TipItem icon="✓" color="emerald" text={<><strong className="text-white">Pace down.</strong> Speak 10–15% slower than you think you should.</>} />
                <TipItem icon="✓" color="emerald" text={<><strong className="text-white">Use silence.</strong> Pause after asking a question. Let silence do the work.</>} />
                <TipItem icon="✓" color="emerald" text={<><strong className="text-white">Say "usually" and "typically."</strong> These words sound observational and honest — not absolute.</>} />
                <TipItem icon="✓" color="emerald" text={<><strong className="text-white">Ask one good question.</strong> One specific, smart question beats five generic ones.</>} />
                <TipItem icon="✓" color="emerald" text={<><strong className="text-white">Admit uncertainty.</strong> "I'd need to understand more to say for sure." This builds enormous credibility.</>} />
                <TipItem icon="✓" color="emerald" text={<><strong className="text-white">Transition naturally.</strong> "Based on what you just said…" beats jumping to the next script point.</>} />
                <TipItem icon="✗" color="red" text={<><strong className="text-white">Don't read paragraphs.</strong> Know your 3 key points. Say them conversationally. Different every time.</>} />
                <TipItem icon="✗" color="red" text={<><strong className="text-white">No AI-speak.</strong> Avoid "synergy," "paradigm," "revolutionary." Be blunt and normal.</>} />
                <TipItem icon="✗" color="red" text={<><strong className="text-white">No fake urgency.</strong> Never use artificial deadlines or FOMO tactics.</>} />
              </ul>
            </SectionCard>

            <SectionCard id="whatsapp" title="7. WhatsApp Rules" icon={<MessageCircle size={20} />}>
              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-widest mb-3 drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]">What Works</h4>
                  <ul className="space-y-2.5">
                    <TipItem icon="✓" color="emerald" text="Short messages — 3 to 4 lines max. Indian buyers ignore walls of text." />
                    <TipItem icon="✓" color="emerald" text="Voice notes for follow-up after a good call — feels personal, proves you're human." />
                    <TipItem icon="✓" color="emerald" text="Reference the call: 'Following up from our chat earlier…'" />
                    <TipItem icon="✓" color="emerald" text="Best timing: 10am–12pm or 4pm–6pm on weekdays only." />
                    <TipItem icon="✓" color="emerald" text="Follow up once at 24hrs, once at 4 days. Then stop or ask directly." />
                    <TipItem icon="✓" color="emerald" text="End with a soft question: 'Does this make sense for your stage?'" />
                  </ul>
                </div>
                <div>
                  <h4 className="text-[10px] font-extrabold text-red-500 uppercase tracking-widest mb-3 drop-shadow-[0_0_5px_rgba(239,68,68,0.3)]">What Destroys Trust</h4>
                  <ul className="space-y-2.5">
                    <TipItem icon="✗" color="red" text="PDF brochures as your opening message — screams template." />
                    <TipItem icon="✗" color="red" text="Following up 3+ times with no response. It signals desperation." />
                    <TipItem icon="✗" color="red" text="Messaging at 7am, 9pm, or Sunday morning." />
                    <TipItem icon="✗" color="red" text="'Just checking in' with no new value added." />
                    <TipItem icon="✗" color="red" text="Formal 'Dear Sir' language — too stiff for WhatsApp." />
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 text-xs text-orange-200/80 font-medium">
                  <strong className="block mb-1.5 text-orange-400">Sample follow-up (right after call):</strong>
                  "Hi [Name] — good speaking with you. As I mentioned, the main thing I'd focus on at your stage is [specific observation]. Happy to walk through this properly if it's useful. Let me know."
                </div>
              </div>
            </SectionCard>
          </div>

          {/* ── Section 8: Pricing ── */}
          <SectionCard id="pricing" title="8. Pricing Reference Table" icon={<IndianRupee size={20} />}>
            <p className="text-sm text-zinc-400 mb-5 font-medium">Use as reference only. Never lead with pricing. Understand scope before quoting anything.</p>
            <div className="overflow-x-auto rounded-3xl border border-white/5 bg-[#09090b] shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
              <table className="w-full text-sm text-left min-w-[600px]">
                <thead className="bg-white/[0.02] border-b border-white/5 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">
                  <tr>
                    <th className="px-6 py-4">Service</th>
                    <th className="px-6 py-4">Investment Range</th>
                    <th className="px-6 py-4">Key Variables</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-zinc-300">
                  {[
                    ["Business Website", "5-page standard", "₹26k – ₹50k", "Design complexity, pages, SEO setup"],
                    ["E-commerce Store", "Full setup", "₹65k – ₹1.2L+", "Product count, payment systems, traffic needs"],
                    ["Custom Web Application", "Backend + frontend", "₹50k – ₹1.0L+", "Features, backend complexity, integrations"],
                    ["Mobile App", "Android + iOS", "₹80k – ₹1.8L+", "Platform scope, functionality, APIs"],
                    ["Marketing Retainer", "Monthly", "₹25k – ₹80k/mo", "Platform count, content volume, ad management"],
                    ["Full-stack Growth Partner", "Dev + Marketing", "₹50k – ₹1.5L/mo", "Scope of development + marketing involvement"],
                  ].map(([name, sub, range, vars]) => (
                    <tr key={name} className="hover:bg-[#121214] transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-extrabold text-white">{name}</p>
                        <p className="text-[11px] text-zinc-500 mt-1 font-bold tracking-wide uppercase">{sub}</p>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-orange-400">{range}</td>
                      <td className="px-6 py-4 text-xs font-medium text-zinc-400">{vars}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20 flex items-start gap-3">
              <ShieldAlert size={18} className="text-orange-400 shrink-0 mt-0.5" />
              <p className="text-xs text-orange-200/90 font-medium leading-relaxed">
                <strong className="text-orange-400">Important:</strong> Pricing is indicative and depends on project scope, features, integrations, timelines, and complexity. Never commit to a final number on a cold call.
              </p>
            </div>
          </SectionCard>

          {/* ── Section 9: Never Do ── */}
          <SectionCard id="never-do" title="9. Things Sales Reps Must Never Do" icon={<XCircle size={20} />}>
            <p className="text-sm text-zinc-400 mb-6 font-medium">Non-negotiable. One violation can damage BRC HUB's reputation permanently in a market that runs on word-of-mouth.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <RuleItem text="Never fabricate or exaggerate case studies. Never quote results we can't verify internally." />
              <RuleItem text="Never guarantee business outcomes — we build, we don't control the market." />
              <RuleItem text="Never speak negatively about competitor agencies, even if the prospect prompts you." />
              <RuleItem text="Never apply pressure or urgency tactics. Indian B2B buyers push back hard on manufactured urgency." />
              <RuleItem text="Never spam WhatsApp with repeated follow-ups after no response." />
              <RuleItem text="Never overpromise delivery timelines just to win the project." />
              <RuleItem text="Never argue with a prospect — even if they're wrong. Acknowledge and move forward." />
              <RuleItem text="Never quote a final price on a cold call before understanding scope." />
              <RuleItem text="Never send generic PDF brochures as your opening WhatsApp message." />
              <RuleItem text="Never imitate aggressive, American-style sales energy. It reads as fake here." />
            </div>
          </SectionCard>

          {/* ── Section 10: Perfect Ending ── */}
          <SectionCard id="ending" title="10. The Perfect Ending to a First Call" icon={<CheckCircle2 size={20} />}>
            <p className="text-sm text-zinc-400 mb-6 font-medium">
              Close every call with a low-pressure, forward-moving line. The goal: permission for the next conversation — nothing more.
            </p>
            <div className="grid md:grid-cols-2 gap-5 mb-8">
              <ScriptBox
                title="WhatsApp Transition"
                script="I'll drop you a short note on WhatsApp — just 2–3 lines on what I was referring to. You can read it whenever it's convenient."
              />
              <ScriptBox
                title="Follow-Up Permission"
                script="I won't keep sending messages — but if it's alright, I'll follow up once in a few days to see if this is relevant."
              />
              <ScriptBox
                title="Soft Next Step"
                script="If any of this resonates, a 20-minute call is usually enough to figure out whether we can actually help — and we'll be straight if we can't."
              />
              <ScriptBox
                title="Curiosity Close"
                script="Happy to share one reference relevant to your type of business — nothing long. Would that be useful on WhatsApp?"
              />
              <ScriptBox
                title="Respect Their Time"
                script="I know this isn't the right moment for everyone. If things change and this becomes relevant, I'm easy to reach."
              />
              <ScriptBox
                title="Discovery Invitation"
                script="Even if you're not in a buying mindset — a quick conversation about your digital presence costs nothing. Worth 15 minutes?"
              />
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-r from-[#09090b] to-[#121214] border border-white/5 text-center shadow-[0_10px_20px_rgba(0,0,0,0.5)] relative overflow-hidden">
              <div className="absolute inset-0 bg-orange-500/5 backdrop-blur-3xl" />
              <p className="text-sm font-extrabold text-orange-400 uppercase tracking-widest relative z-10 drop-shadow-[0_0_8px_rgba(249,115,22,0.3)]">
                End every call warmer than you started it.
              </p>
            </div>
          </SectionCard>

        </main>
      </div>
    </div>
  );
}

/* ─── Reusable Sub-Components ─── */

function SectionCard({ id, title, icon, children }: { id: string, title: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-3xl border border-white/5 border-t-white/10 bg-gradient-to-b from-[#18181b] to-[#09090b] p-6 sm:p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_20px_40px_rgba(0,0,0,0.6)]"
    >
      <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-6 flex items-center gap-3">
        <span className="text-zinc-500 bg-white/5 p-2 rounded-xl border border-white/5 shadow-inner">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function MindsetCard({ title, body }: { title: string, body: string }) {
  return (
    <div className="bg-[#09090b] border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] rounded-2xl p-5 space-y-3">
      <h5 className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-widest">{title}</h5>
      <p className="text-xs text-zinc-500 leading-relaxed font-medium">{body}</p>
    </div>
  );
}

function ComparisonRow({ bad, good }: { bad: string, good: string }) {
  return (
    <tr className="hover:bg-[#121214] transition-colors group">
      <td className="px-6 py-4 align-top w-1/2 border-r border-white/5">
        <div className="flex gap-3 text-red-400/80 group-hover:text-red-400 transition-colors">
          <XCircle size={16} className="shrink-0 mt-0.5 opacity-80" />
          <span className="text-sm font-medium leading-relaxed">"{bad}"</span>
        </div>
      </td>
      <td className="px-6 py-4 align-top w-1/2">
        <div className="flex gap-3 text-emerald-400/80 group-hover:text-emerald-400 transition-colors">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5 opacity-80" />
          <span className="text-sm font-medium leading-relaxed">"{good}"</span>
        </div>
      </td>
    </tr>
  );
}

function ScriptBox({ title, script }: { title: string, script: string }) {
  return (
    <div className="bg-[#09090b] border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] rounded-2xl p-5 flex flex-col justify-between hover:border-white/10 transition-colors">
      <h4 className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest mb-4">{title}</h4>
      <div className="flex items-start gap-3">
        <Quote size={16} className="text-zinc-600 shrink-0 mt-0.5" />
        <p className="text-sm text-zinc-300 italic leading-relaxed font-medium">"{script}"</p>
      </div>
    </div>
  );
}

function HookItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 p-4 rounded-2xl bg-[#09090b] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02),0_2px_4px_rgba(0,0,0,0.3)] hover:border-white/10 transition-colors">
      <Sparkles size={16} className="text-orange-400 shrink-0 mt-0.5" />
      <span className="text-sm text-zinc-300 font-medium leading-relaxed">"{text}"</span>
    </li>
  );
}

function TipItem({ icon, color, text }: { icon: React.ReactNode, color: string, text: React.ReactNode | string }) {
  const isEmerald = color === "emerald";
  return (
    <li className="flex items-start gap-3">
      <span className={`shrink-0 mt-0.5 text-sm font-black ${isEmerald ? "text-emerald-500" : "text-red-500"}`}>
        {icon}
      </span>
      <span className="text-sm text-zinc-400 leading-relaxed font-medium">{text}</span>
    </li>
  );
}

function RuleItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/5 border border-red-500/10 shadow-[inset_0_1px_1px_rgba(239,68,68,0.05)]">
      <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
      <span className="text-sm text-red-200/90 font-medium leading-relaxed">{text}</span>
    </div>
  );
}

function UsersIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
