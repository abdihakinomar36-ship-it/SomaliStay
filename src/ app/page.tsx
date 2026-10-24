"use client";

import { useMemo, useState } from "react";
import { Search, MapPin, CalendarDays, Users, Globe2, ShieldCheck, Headset, ArrowUpRight, Menu, Hotel as HotelIcon } from "lucide-react";

type Lang = "so" | "en";
type Listing = { name: string; city: string; image: string; tag: string; demo: boolean };

const copy = {
  so: {
    navHotels: "Hoteellada", navCities: "Magaalooyinka", navPartner: "Hoteel diiwaangeli", login: "Gal", signup: "Isdiiwaangeli",
    eyebrow: "Safarkaaga Soomaaliya halkaan ayuu ka bilaabmaa",
    headline: "Hel hoteelka kugu habboon Soomaaliya oo dhan.",
    sub: "Raadi hoteello, eeg adeegyada, una dir codsi ballansasho si toos ah hoteelka.",
    city: "Magaalo ama goob", checkin: "Soo gelid", checkout: "Bixid", guests: "Martida", search: "Raadi hoteello",
    destinations: "Sahami magaalooyinka", popular: "Hoteello la soo bandhigay", demo: "Tusaale muuqaal ah",
    view: "Faahfaahin", verified: "La ansixiyey", how: "Sida SomaliStay u shaqayso",
    step1: "Raadi", step1d: "Dooro magaalada iyo taariikhaha safarka.", step2: "Codso", step2d: "U dir codsi ballansasho hoteelka aad dooratay.", step3: "Sug xaqiijin", step3d: "Hoteelku wuxuu xaqiijinayaa ama diidayaa codsigaaga.",
    secure: "Hoteello la hubiyey", secureD: "Hoteelku wuxuu dadweynaha u muuqdaa marka maamulka ansixiyo.",
    direct: "Xaqiijin toos ah", directD: "Codsigaaga waxaa ka jawaabaya hoteelka laftiisa.",
    support: "Laba luqadood", supportD: "Ku isticmaal Af Soomaali ama English.",
    partnerTitle: "Ma leedahay hoteel Soomaaliya ku yaal?", partnerD: "Diiwaangeli hoteelkaaga, geli xogta iyo sawirrada, kadibna sug ansixinta maamulka.", partnerCTA: "Bilow diiwaangelinta",
    footer: "Hel hoteello Soomaaliya oo dhan — si fudud oo kalsooni leh.", searchResults: "Natiijooyinka raadinta", noResults: "Ma jiraan tusaalooyin ku habboon raadinta. Marka xog hoteello dhab ah lagu xiro, natiijooyinka halkan ayay ka soo muuqan doonaan.",
    requestDemo: "Codsiga ballansashada waa tijaabo muuqaal ah oo keliya. Marka backend-ka la xiro, codsiyada waxaa lagu kaydin doonaa database-ka.", dates: "Taariikhaha"
  },
  en: {
    navHotels: "Hotels", navCities: "Destinations", navPartner: "List your hotel", login: "Log in", signup: "Sign up",
    eyebrow: "Your journey across Somalia starts here",
    headline: "Find your stay, anywhere in Somalia.",
    sub: "Discover hotels, explore amenities, and send a booking request directly to the property.",
    city: "City or destination", checkin: "Check-in", checkout: "Check-out", guests: "Guests", search: "Search hotels",
    destinations: "Explore destinations", popular: "Featured hotel cards", demo: "Visual demo",
    view: "View details", verified: "Approved", how: "How SomaliStay works",
    step1: "Discover", step1d: "Choose a destination and your travel dates.", step2: "Request", step2d: "Send a booking request to your chosen hotel.", step3: "Get confirmation", step3d: "The hotel accepts or declines your request.",
    secure: "Reviewed listings", secureD: "Properties appear publicly only after admin approval.",
    direct: "Hotel confirmation", directD: "The property responds to your booking request.",
    support: "Bilingual experience", supportD: "Use Somali or English.",
    partnerTitle: "Own a hotel in Somalia?", partnerD: "Register your property, add its details and photos, and submit it for admin review.", partnerCTA: "Start listing",
    footer: "Discover hotels across Somalia — simply and confidently.", searchResults: "Search results", noResults: "No demo cards match your search. Once real hotel data is connected, verified results will appear here.",
    requestDemo: "Booking requests are demo-only in this preview. After backend integration, requests will be stored in the database.", dates: "Dates"
  }
};

const destinations = [
  { name: "Muqdisho", en: "Mogadishu", img: "photo-1519046904884-53103b34b206" },
  { name: "Hargeysa", en: "Hargeisa", img: "photo-1464822759023-fed622ff2c3b" },
  { name: "Boosaaso", en: "Bosaso", img: "photo-1500375592092-40eb2168fd21" },
  { name: "Kismaayo", en: "Kismayo", img: "photo-1507525428034-b723cf961d3e" },
  { name: "Berbera", en: "Berbera", img: "photo-1473116763249-2faaef81ccda" },
  { name: "Garoowe", en: "Garowe", img: "photo-1470770841072-f978cf4d019e" }
];

// Deliberately no invented hotel names, prices, ratings, or availability.
// Replace this empty list with records from approved hotel submissions.
const listings: Listing[] = [];

export default function Home() {
  const [lang, setLang] = useState<Lang>("so");
  const [city, setCity] = useState("");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guests, setGuests] = useState("2");
  const [searched, setSearched] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const t = copy[lang];

  const filtered = useMemo(() => listings.filter((h) => {
    const query = city.toLowerCase().trim();
    return !query || h.city.toLowerCase().includes(query) || h.name.toLowerCase().includes(query);
  }), [city]);

  function searchHotels(e: React.FormEvent) {
    e.preventDefault();
    setSearched(true);
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function bookingNotice() {
    alert(t.requestDemo);
  }

  return (
    <main>
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="container h-[76px] flex items-center justify-between gap-4">
          <a href="#" className="flex items-center gap-2 no-underline">
            <span className="w-11 h-11 rounded-2xl bg-brand-pale flex items-center justify-center text-brand-green"><HotelIcon size={25}/></span>
            <span><strong className="text-[23px] tracking-tight text-brand-navy">Somali<span className="text-brand-green">Stay</span></strong><span className="block text-[10px] uppercase tracking-[.18em] text-slate-500 -mt-1">Hotels across Somalia</span></span>
          </a>
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <a href="#results" className="hover:text-brand-green">{t.navHotels}</a><a href="#destinations" className="hover:text-brand-green">{t.navCities}</a><a href="#partner" className="hover:text-brand-green">{t.navPartner}</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(lang === "so" ? "en" : "so")} className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-sm font-bold"><Globe2 size={16}/>{lang === "so" ? "SO" : "EN"}</button>
            <a href="#partner" className="hidden sm:inline-flex rounded-full bg-brand-green px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">{t.signup}</a>
            <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu"><Menu/></button>
          </div>
        </div>
        {menuOpen && <div className="container md:hidden pb-4 flex flex-col gap-3 text-sm"><a href="#results">{t.navHotels}</a><a href="#destinations">{t.navCities}</a><a href="#partner">{t.navPartner}</a></div>}
      </header>

      <section className="hero-bg text-white">
        <div className="container py-16 md:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">{t.eyebrow}</span>
            <h1 className="mt-6 text-4xl md:text-6xl font-extrabold leading-[1.08] tracking-tight">{t.headline}</h1>
            <p className="mt-5 max-w-2xl text-lg md:text-xl text-white/85 leading-relaxed">{t.sub}</p>
          </div>
          <form onSubmit={searchHotels} className="mt-10 grid grid-cols-1 md:grid-cols-5 gap-3 rounded-3xl bg-white p-4 text-brand-navy soft-shadow">
            <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 md:col-span-1"><MapPin className="text-brand-green shrink-0" size={20}/><span className="min-w-0 flex-1"><span className="block text-xs text-slate-500">{t.city}</span><input value={city} onChange={e => setCity(e.target.value)} placeholder={lang === "so" ? "Tusaale: Muqdisho" : "e.g. Mogadishu"} className="mt-1 w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"/></span></label>
            <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3"><CalendarDays className="text-brand-green shrink-0" size={20}/><span className="min-w-0 flex-1"><span className="block text-xs text-slate-500">{t.checkin}</span><input type="date" value={checkin} min={new Date().toISOString().slice(0,10)} onChange={e => setCheckin(e.target.value)} className="mt-1 w-full bg-transparent text-sm font-semibold outline-none"/></span></label>
            <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3"><CalendarDays className="text-brand-green shrink-0" size={20}/><span className="min-w-0 flex-1"><span className="block text-xs text-slate-500">{t.checkout}</span><input type="date" value={checkout} min={checkin || new Date().toISOString().slice(0,10)} onChange={e => setCheckout(e.target.value)} className="mt-1 w-full bg-transparent text-sm font-semibold outline-none"/></span></label>
            <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3"><Users className="text-brand-green shrink-0" size={20}/><span className="min-w-0 flex-1"><span className="block text-xs text-slate-500">{t.guests}</span><select value={guests} onChange={e => setGuests(e.target.value)} className="mt-1 w-full bg-transparent text-sm font-semibold outline-none"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5+</option></select></span></label>
            <button className="flex items-center justify-center gap-2 rounded-2xl bg-brand-green px-5 py-4 font-bold text-white hover:bg-emerald-800"><Search size={19}/>{t.search}</button>
          </form>
          <p className="mt-4 text-xs text-white/75">{lang === "so" ? "Ballansashadu waa codsi; hoteelku waa inuu xaqiijiyaa." : "Bookings are requests; the hotel must confirm them."}</p>
        </div>
      </section>

      <section id="destinations" className="container py-14 md:py-20">
        <div className="flex items-end justify-between gap-4 mb-7"><div><p className="text-brand-green font-bold text-sm">{lang === "so" ? "Meelo la sahmiyo" : "Places to explore"}</p><h2 className="mt-2 text-3xl md:text-4xl font-extrabold">{t.destinations}</h2></div><span className="hidden sm:block text-sm text-slate-500">{lang === "so" ? "Soomaaliya oo dhan" : "Across Somalia"}</span></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {destinations.map((d) => <button key={d.en} onClick={() => {setCity(lang === "so" ? d.name : d.en); setSearched(true); document.getElementById("results")?.scrollIntoView({behavior:"smooth"});}} className="group text-left rounded-2xl overflow-hidden bg-white border border-slate-100 hover:-translate-y-1 transition soft-shadow">
            <div className="h-32 bg-slate-200 overflow-hidden"><img alt="" src={`https://images.unsplash.com/${d.img}?auto=format&fit=crop&w=500&q=80`} className="h-full w-full object-cover group-hover:scale-105 transition duration-500"/></div>
            <div className="p-4"><strong className="block">{lang === "so" ? d.name : d.en}</strong><span className="text-xs text-slate-500">{lang === "so" ? "Soomaaliya" : "Somalia"}</span></div>
          </button>)}
        </div>
      </section>

      <section id="results" className="bg-white py-14 md:py-20 border-y border-slate-100">
        <div className="container">
          <div className="flex items-end justify-between gap-4 mb-8"><div><p className="text-brand-green font-bold text-sm">{lang === "so" ? "Liisaska la ansixiyey" : "Approved listings"}</p><h2 className="mt-2 text-3xl md:text-4xl font-extrabold">{searched ? t.searchResults : t.popular}</h2></div><span className="text-xs text-slate-500">{lang === "so" ? "Xog dhab ah oo keliya" : "Real data only"}</span></div>
          {filtered.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 md:p-12 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-pale text-brand-green"><HotelIcon size={27}/></div><h3 className="mt-4 text-xl font-bold">{lang === "so" ? "Hoteello la ansixiyey wali lama gelin" : "No approved hotels have been added yet"}</h3><p className="mx-auto mt-2 max-w-xl text-slate-600 leading-relaxed">{t.noResults}</p><a href="#partner" className="mt-5 inline-flex rounded-full bg-brand-green px-5 py-3 text-sm font-bold text-white">{t.navPartner}<ArrowUpRight size={16} className="ml-2"/></a></div> :
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{filtered.map(h => <article key={h.name} className="rounded-3xl overflow-hidden border border-slate-100 bg-white soft-shadow"><img src={h.image} alt={h.name} className="w-full h-52 object-cover"/><div className="p-5"><span className="text-xs rounded-full bg-brand-pale text-brand-green px-3 py-1">{t.verified}</span><h3 className="mt-3 text-xl font-bold">{h.name}</h3><p className="text-slate-500">{h.city}</p><button onClick={bookingNotice} className="mt-4 w-full rounded-xl bg-brand-green py-3 text-white font-bold">{t.view}</button></div></article>)}</div>}
          <p className="mt-5 text-xs text-slate-500">{lang === "so" ? "Ma jiro qiime ama hoteel la sameeyey si been ah; liisaska waxaa lagu dari doonaa marka la xaqiijiyo." : "No fabricated hotel names or prices; listings will be added after verification."}</p>
        </div>
      </section>

      <section className="container py-14 md:py-20">
        <div className="text-center max-w-2xl mx-auto"><p className="text-brand-green font-bold text-sm">{lang === "so" ? "Fudud. Cad. Lagu kalsoonaan karo." : "Simple. Clear. Trusted."}</p><h2 className="mt-2 text-3xl md:text-4xl font-extrabold">{t.how}</h2></div>
        <div className="mt-10 grid md:grid-cols-3 gap-5">
          {[{n:"01",title:t.step1,desc:t.step1d,icon:<Search/>},{n:"02",title:t.step2,desc:t.step2d,icon:<CalendarDays/>},{n:"03",title:t.step3,desc:t.step3d,icon:<ShieldCheck/>}].map(item => <div key={item.n} className="rounded-3xl border border-slate-100 bg-white p-7 soft-shadow"><div className="flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-pale text-brand-green">{item.icon}</span><span className="text-3xl font-black text-slate-100">{item.n}</span></div><h3 className="mt-6 text-xl font-bold">{item.title}</h3><p className="mt-2 text-slate-600 leading-relaxed">{item.desc}</p></div>)}
        </div>
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {[{title:t.secure,desc:t.secureD,icon:<ShieldCheck/>},{title:t.direct,desc:t.directD,icon:<HotelIcon/>},{title:t.support,desc:t.supportD,icon:<Headset/>}].map(x => <div key={x.title} className="flex gap-4 rounded-2xl bg-brand-pale p-5"><span className="text-brand-green">{x.icon}</span><div><strong>{x.title}</strong><p className="mt-1 text-sm text-slate-600">{x.desc}</p></div></div>)}
        </div>
      </section>

      <section id="partner" className="container pb-16">
        <div className="rounded-[2rem] bg-gradient-to-r from-brand-navy to-brand-blue p-8 md:p-12 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl"><p className="text-emerald-300 text-sm font-bold">{lang === "so" ? "La shaqee SomaliStay" : "Partner with SomaliStay"}</p><h2 className="mt-2 text-3xl md:text-4xl font-extrabold">{t.partnerTitle}</h2><p className="mt-3 text-white/80 leading-relaxed">{t.partnerD}</p></div>
          <button onClick={() => alert(lang === "so" ? "Foomka diiwaangelinta partner-ka wuxuu shaqayn doonaa marka Supabase Auth iyo API-ga la isku xiro." : "Partner registration will work after Supabase Auth and the API are connected.")} className="shrink-0 rounded-full bg-white px-6 py-4 font-bold text-brand-navy hover:bg-emerald-50">{t.partnerCTA}<ArrowUpRight size={17} className="inline ml-2"/></button>
        </div>
      </section>

      <footer className="bg-[#0d2c40] text-white">
        <div className="container py-10 flex flex-col md:flex-row justify-between gap-6"><div><strong className="text-2xl">Somali<span className="text-emerald-400">Stay</span></strong><p className="mt-2 max-w-md text-sm text-white/65">{t.footer}</p></div><div className="text-sm text-white/65"><p>SomaliStay · Hotels across Somalia</p><p className="mt-2">© {new Date().getFullYear()} SomaliStay</p><p className="mt-2">{lang === "so" ? "Lacag-bixinta online-ka: marxalad dambe" : "Online payments: planned for a later phase"}</p></div></div>
      </footer>
    </main>
  );
}
