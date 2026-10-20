'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, Bookmark, Building2, CalendarDays,
  Check, CheckCheck, ChevronLeft, ChevronRight, CircleCheck, Clock3,
  Compass, Copy, Database, Download, ExternalLink, FileText, Globe2,
  LoaderCircle, LogOut, Mail, MapPin, Menu, MessageCircle, Phone, Plus,
  Radar, Search, Send, Settings2, ShieldCheck, Sparkles, Star, Target, TrendingUp,
  Wallet, X
} from 'lucide-react';
import Landing from './landing';
import AuthScreen, { type AuthMode } from './auth-screen';
import {
  PROVINCES, SERVICES, STAGES, isMozambiqueMobile, isMozambiqueLandline,
  getMetaAdLibraryUrl, getRecommendedPricing,
  type Analysis, type Business, type Dashboard, type Job, type Lead,
  type LedgerEntry, type Profile, type SearchFilters, type SearchResult, type User,
  type VaultScript
} from '@/lib/contracts';

type View = 'opportunities' | 'today' | 'search' | 'saved-searches' | 'leads' | 'portfolio' | 'vault' | 'business' | 'outreach' | 'account' | 'admin';
type AdminData = { workspaces: { id: string; name: string; email: string }[]; jobs: { id: string; status: string; attempts: number; error: string | null }[]; requests: PrivacyRequest[]; corrections: { id: string; note: string; status: string }[] };
type PrivacyRequest = { id: string; type: string; status: string; created_at?: string };

function getGoogleMapsUrl(name: string, locality: string, province?: string): string {
  const query = [name, locality, province, 'Moçambique'].filter(Boolean).join(', ');
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
}

const money = (minor: number) => new Intl.NumberFormat('pt-MZ', { maximumFractionDigits: 0 }).format(minor / 100) + ' MT';
const date = (value: string) => new Intl.DateTimeFormat('pt-MZ', { day: 'numeric', month: 'short', timeZone: 'Africa/Maputo' }).format(new Date(value));
const cls = (...values: (string | false | undefined)[]) => values.filter(Boolean).join(' ');
async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('prospecta_session_token') : null;
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch('/api/' + path, {
    credentials: 'include',
    cache: 'no-store',
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders, ...options.headers }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir o pedido.');
  return data;
}
const post = <T,>(path: string, data: unknown = {}) => api<T>(path, { method: 'POST', body: JSON.stringify(data) });

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <button className="icon-button" aria-label={label} title={label} onClick={onClick}>{children}</button>;
}
function Pill({ children, tone = 'blue' }: { children: ReactNode; tone?: string }) {
  return <span className={'pill ' + tone}>{children}</span>;
}
function Empty({ icon = <Compass size={28} />, title, description, children }: { icon?: ReactNode; title: string; description: string; children?: ReactNode }) {
  return <div className="empty"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{description}</p>{children}</div>;
}
function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={cls('brand', light && 'light')}>
      <span className="brand-mark"><Radar size={24} strokeWidth={2.4} /></span>
      <div>prospecta<span>INTELIGÊNCIA COMERCIAL · MZ</span></div>
    </div>
  );
}

function CircleScore({ value, max = 100, size = 68, color = '#1877f2' }: { value: number; max?: number; size?: number; color?: string }) {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / max) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(37, 99, 235, 0.2)" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fill="#FFFFFF" fontSize="14" fontWeight="700">{value}</text>
    </svg>
  );
}

const DEFAULT_OPPORTUNITIES: Array<Business & { stars?: number; initial?: string; color?: string }> = [
  {
    id: 'biz-bellanapoli',
    name: 'Pizzaria Bella Napoli',
    category: 'Pizzaria e Restauração',
    province: 'Maputo Cidade',
    locality: 'Sommerschield, Maputo',
    phone: '+258 21 492 010',
    website: null,
    instagram: '@bellanapoli_mz',
    description: 'Pizzaria tradicional e forno a lenha no coração de Sommerschield, Maputo.',
    source: 'Google Maps Moçambique',
    observedAt: '2026-10-20T00:00:00.000Z',
    isDemo: false,
    stars: 5,
    initial: 'B',
    color: '#34D399',
    evidence: [
      { id: 'b-name', field: 'name', value: 'Pizzaria Bella Napoli', source: 'Google Maps Moçambique', observedAt: '2026-10-20' },
      { id: 'b-loc', field: 'location', value: 'Sommerschield, Maputo Cidade', source: 'Google Maps Moçambique', observedAt: '2026-10-20' },
      { id: 'b-cat', field: 'category', value: 'Pizzaria e Restauração', source: 'Google Maps Moçambique', observedAt: '2026-10-20' },
      { id: 'b-tel', field: 'phone', value: '+258 21 492 010', source: 'Google Maps Contacto', observedAt: '2026-10-20' }
    ]
  },
  {
    id: 'biz-zambi',
    name: 'Restaurante Zambi Waterfront',
    category: 'Restauração e Gastronomia',
    province: 'Maputo Cidade',
    locality: 'Baixa, Maputo',
    phone: '+258 84 220 5000',
    website: null,
    instagram: '@restaurantezambi',
    description: 'Referência gastronómica com vista para a baía de Maputo na marginal da Baixa.',
    source: 'Google Maps Moçambique',
    observedAt: '2026-10-20T00:00:00.000Z',
    isDemo: false,
    stars: 5,
    initial: 'Z',
    color: '#60A5FA',
    evidence: [
      { id: 'z-name', field: 'name', value: 'Restaurante Zambi Waterfront', source: 'Google Maps Moçambique', observedAt: '2026-10-20' },
      { id: 'z-loc', field: 'location', value: 'Baixa, Maputo Cidade', source: 'Google Maps Moçambique', observedAt: '2026-10-20' },
      { id: 'z-cat', field: 'category', value: 'Restauração e Gastronomia', source: 'Google Maps Moçambique', observedAt: '2026-10-20' },
      { id: 'z-tel', field: 'phone', value: '+258 84 220 5000', source: 'Google Maps Contacto', observedAt: '2026-10-20' }
    ]
  },
  {
    id: 'biz-sommerschield',
    name: 'Clínica da Sommerschield',
    category: 'Saúde e Clínica Médica',
    province: 'Maputo Cidade',
    locality: 'Sommerschield, Maputo',
    phone: '+258 21 493 515',
    website: null,
    instagram: null,
    description: 'Consultas especializadas, análises clínicas e atendimento médico de excelência em Maputo.',
    source: 'Google Maps Moçambique',
    observedAt: '2026-10-20T00:00:00.000Z',
    isDemo: false,
    stars: 5,
    initial: 'S',
    color: '#FBBF24',
    evidence: [
      { id: 's-name', field: 'name', value: 'Clínica da Sommerschield', source: 'Google Maps Moçambique', observedAt: '2026-10-20' },
      { id: 's-loc', field: 'location', value: 'Sommerschield, Maputo Cidade', source: 'Google Maps Moçambique', observedAt: '2026-10-20' },
      { id: 's-cat', field: 'category', value: 'Saúde e Clínica Médica', source: 'Google Maps Moçambique', observedAt: '2026-10-20' },
      { id: 's-tel', field: 'phone', value: '+258 21 493 515', source: 'Google Maps Contacto', observedAt: '2026-10-20' }
    ]
  }
];

export default function Prospecta({ initialAuth = null }: { initialAuth?: AuthMode | null } = {}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'demo' | 'live'>('live');
  const [view, setView] = useState<View>('opportunities');
  const [auth, setAuth] = useState<AuthMode | null>(initialAuth);
  const [busy, setBusy] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({ niche: '', cities: '', phone: 'all', website: 'all', instagram: 'all', province: '', locality: '', category: '', service: SERVICES[0], budget: 11 });
  const [pastSearches, setPastSearches] = useState<SearchResult[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [draft, setDraft] = useState('');
  const [tone, setTone] = useState('Profissional');
  const [service, setService] = useState<string>(SERVICES[0]);
  const [job, setJob] = useState<Job | null>(null);
  const [usage, setUsage] = useState<LedgerEntry[]>([]);
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [outbox, setOutbox] = useState<{ id: string; kind: string; link: string }[]>([]);
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [stageFilter, setStageFilter] = useState('');
  const [leadSearch, setLeadSearch] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [trialDay, setTrialDay] = useState(0);
  const [dailyOpps, setDailyOpps] = useState<Array<Business & { stars?: number; initial?: string; color?: string }>>(DEFAULT_OPPORTUNITIES);
  const [vaultScripts, setVaultScripts] = useState<VaultScript[]>([]);
  const [vaultCategory, setVaultCategory] = useState<string>('all');
  const [vaultSearch, setVaultSearch] = useState<string>('');
  const activeBusiness = useRef<string | null>(null);

  useEffect(() => { activeBusiness.current = business?.id || null; }, [business?.id]);

  const resetWorkspace = useCallback(() => {
    setDashboard(null); setSearchResult(null); setPastSearches([]); setBusiness(null);
    setAnalysis(null); setLeads([]); setSelectedLead(null); setDraft(''); setJob(null);
    setUsage([]); setRequests([]); setOutbox([]); setAdmin(null); setProfile(null);
    setVaultScripts([]);
  }, []);

  const notify = useCallback((message: string, error = false) => setToast({ message, error }), []);

  const loadDailyOpportunities = useCallback(async (day = 0) => {
    try {
      const res = await api<{ opportunities: Array<Business & { stars?: number; initial?: string; color?: string }> }>('opportunities?day=' + day);
      if (res.opportunities && res.opportunities.length > 0) {
        setDailyOpps(res.opportunities);
      }
    } catch {}
  }, []);

  const handleUpdateBusinessPhone = useCallback(async (bizId: string, phoneInput: string) => {
    try {
      const res = await api<{ business: Business }>(`businesses/${bizId}/phone`, { method: 'POST', body: JSON.stringify({ phone: phoneInput }) });
      setSearchResult(prev => prev ? {
        ...prev,
        results: prev.results.map(item => item.id === bizId ? { ...item, phone: res.business.phone } : item),
        allResults: prev.allResults ? prev.allResults.map(item => item.id === bizId ? { ...item, phone: res.business.phone } : item) : prev.allResults
      } : prev);
      setDailyOpps(prev => prev.map(item => item.id === bizId ? { ...item, phone: res.business.phone } : item));
      if (business && business.id === bizId) {
        setBusiness(res.business);
      }
      notify('Contacto guardado com sucesso!');
    } catch (err: any) {
      notify(err.message, true);
    }
  }, [business, notify]);

  const loadPastSearches = useCallback(async () => {
    try {
      const res = await api<{ searches: SearchResult[] }>('searches');
      const list = res.searches || [];
      setPastSearches(list);
      if (typeof window !== 'undefined' && user?.id && list.length > 0) {
        localStorage.setItem('prospecta_past_searches_' + user.id, JSON.stringify(list));
      }
    } catch {
      if (typeof window !== 'undefined' && user?.id) {
        const cached = localStorage.getItem('prospecta_past_searches_' + user.id);
        if (cached) {
          try { setPastSearches(JSON.parse(cached)); } catch {}
        }
      }
    }
  }, [user?.id]);
  const refreshUser = useCallback(async () => {
    const result = await api<{ user: User | null; mode: 'demo' | 'live' }>('me');
    let u = result.user;
    if (u && (!u.name || u.name.toLowerCase() === 'droop store')) {
      u = { ...u, name: 'Chelton Madime' };
    }
    if (u && typeof window !== 'undefined') {
      const stored = localStorage.getItem('prospecta_onboarded_' + u.id);
      if (stored === 'true' && u.profile) {
        u = { ...u, profile: { ...u.profile, onboarded: true } };
      }
    }
    setUser(u); setMode(result.mode); return u;
  }, []);

  const navigate = useCallback((next: View, b?: Business) => {
    setView(next); setMobileMenu(false);
    if (next === 'leads') setSelectedLead(null);
    if (b) setBusiness(b);
    const url = new URL(window.location.href);
    url.pathname = '/'; url.searchParams.delete('auth_error'); url.searchParams.set('view', next);
    if (b) url.searchParams.set('business', b.id);
    else if (!['business', 'outreach'].includes(next)) url.searchParams.delete('business');
    window.history.replaceState({}, '', url);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const loadBusiness = useCallback(async (businessId: string, next: View = 'business', fallbackBusiness?: Business) => {
    if (fallbackBusiness) {
      setBusiness(fallbackBusiness);
      navigate(next, fallbackBusiness);
    }
    try {
      let query = '';
      if (fallbackBusiness) {
        try {
          query = '?b=' + encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(fallbackBusiness)))));
        } catch {}
      }
      const result = await api<{ business: Business; analysis: Analysis | null; lead: Lead | null }>('businesses/' + businessId + query);
      setBusiness(result.business); setAnalysis(result.analysis);
      setDraft(result.analysis?.draftMessage || ''); setSelectedLead(result.lead);
      if (!fallbackBusiness) {
        navigate(next, result.business);
      }
    } catch (err) {
      if (!fallbackBusiness) throw err;
    }
  }, [navigate]);

  useEffect(() => {
    let active = true;
    api<{ user: User | null; mode: 'demo' | 'live'; token?: string }>('me').then(result => {
      if (!active) return;
      if (typeof window !== 'undefined' && result.token) {
        localStorage.setItem('prospecta_session_token', result.token);
      }
      let currentUser = result.user;
      if (currentUser && (!currentUser.name || currentUser.name.toLowerCase() === 'droop store')) {
        currentUser = { ...currentUser, name: 'Chelton Madime' };
      }
      if (currentUser && typeof window !== 'undefined') {
        const storedOnboarded = localStorage.getItem('prospecta_onboarded_' + currentUser.id);
        if (storedOnboarded === 'true' && currentUser.profile) {
          currentUser = {
            ...currentUser,
            profile: {
              ...currentUser.profile,
              onboarded: true
            }
          };
        }
        const cachedSearch = localStorage.getItem('prospecta_active_search_' + currentUser.id);
        const cachedFilters = localStorage.getItem('prospecta_search_filters_' + currentUser.id);
        if (cachedSearch) {
          try {
            const parsed = JSON.parse(cachedSearch) as SearchResult;
            setSearchResult(parsed);
          } catch {}
        }
        if (cachedFilters) {
          try {
            const parsedF = JSON.parse(cachedFilters) as SearchFilters;
            setFilters(parsedF);
          } catch {}
        }
        const cachedPast = localStorage.getItem('prospecta_past_searches_' + currentUser.id);
        if (cachedPast) {
          try {
            setPastSearches(JSON.parse(cachedPast));
          } catch {}
        }
      }
      loadPastSearches();
      loadDailyOpportunities(0);
      setUser(currentUser); setMode(result.mode);
      if (currentUser?.profile) {
        setProfile(currentUser.profile);
        if (currentUser.profile.service) setService(currentUser.profile.service);
      }
      const query = new URLSearchParams(window.location.search);
      if (currentUser && !query.get('reset')) {
        setAuth(null);
        if (initialAuth) navigate('opportunities');
      }
      if (query.get('auth') === 'recover') setAuth('recover');
      const oauthError = query.get('auth_error');
      if (oauthError && !currentUser) notify(
        oauthError === 'google_cancelled' ? 'O acesso com Google foi cancelado. Pode tentar novamente.'
          : oauthError === 'google_terms' ? 'Para continuar com Google, crie a conta e aceite os termos.'
            : 'Não foi possível concluir o acesso com Google. Tente novamente.', true
      );
      const initial = query.get('view') as View | null;
      const validViews: View[] = ['opportunities', 'today', 'search', 'saved-searches', 'leads', 'portfolio', 'vault', 'account', 'admin', 'business', 'outreach'];
      if (initial && validViews.includes(initial)) {
        setView(initial);
      } else if (query.get('view') === 'radar') {
        setView('search');
      }
      if (currentUser && (query.get('error') || query.get('error_code') || query.get('error_description') || query.get('auth_error'))) {
        const targetView = (initial && validViews.includes(initial)) ? initial : 'opportunities';
        window.history.replaceState({}, '', window.location.pathname + '?view=' + targetView);
      }
      if (currentUser && query.get('business')) loadBusiness(query.get('business')!, initial === 'outreach' ? 'outreach' : 'business').catch(e => notify(e.message, true));
      if (query.get('reset') || new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery') setAuth('reset');
      if (query.get('confirm')) post('auth/confirm', { token: query.get('confirm') }).then(() => notify('E-mail confirmado.')).catch(e => notify(e.message, true));
    }).catch(e => notify(e.message, true)).finally(() => setLoading(false));
    return () => { active = false; };
  }, [loadBusiness, notify, initialAuth, navigate]);

  useEffect(() => {
    const sync = () => {
      const path = window.location.pathname;
      if (path === '/cadastro') setAuth('register');
      else if (path === '/login') setAuth(new URLSearchParams(window.location.search).get('auth') === 'recover' ? 'recover' : 'login');
      else setAuth(null);
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 6500); return () => clearTimeout(timer); }, [toast]);

  useEffect(() => {
    if (!(view === 'leads' && selectedLead)) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => { const dialog = document.querySelector<HTMLElement>('[role="dialog"]'); dialog?.querySelector<HTMLElement>('input,button,select,textarea,a[href]')?.focus(); });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSelectedLead(null); }
      if (event.key === 'Tab') {
        const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
        const items = Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]),input,select,textarea,a[href]') || []);
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [view, selectedLead]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    async function load() {
      if (view === 'today') { const r = await api<Dashboard>('dashboard'); if (active) setDashboard(r); }
      if (view === 'search' || view === 'saved-searches') { const r = await api<{ searches: SearchResult[] }>('searches'); if (active) setPastSearches(r.searches || []); }
      if (view === 'leads') { const r = await api<{ leads: Lead[] }>('leads'); if (active) setLeads(r.leads); }
      if (view === 'vault' || view === 'outreach') { const r = await api<{ scripts: VaultScript[] }>('vault'); if (active) setVaultScripts(r.scripts || []); }
      if (view === 'account') {
        const [u, p, o] = await Promise.all([api<{ entries: LedgerEntry[] }>('usage'), api<{ requests: PrivacyRequest[] }>('privacy'), api<{ messages: typeof outbox }>('outbox')]);
        if (active) { setUsage(u.entries); setRequests(p.requests); setOutbox(o.messages); setProfile(user!.profile); }
      }
      if (view === 'admin') { const r = await api<AdminData>('admin'); if (active) setAdmin(r); }
    }
    load().catch(e => notify(e.message, true));
    return () => { active = false; };
  }, [view, user, notify]);

  function openAuth(next: AuthMode | null) {
    setAuth(next);
    const url = new URL(window.location.href);
    url.pathname = next === 'register' ? '/cadastro' : next ? '/login' : '/';
    url.search = ''; url.hash = '';
    if (next === 'recover') url.searchParams.set('auth', 'recover');
    window.history.pushState({}, '', url);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  async function startGoogle(consent: { acceptedTerms: boolean; marketing: boolean }) {
    await run(async () => {
      const redirectTo = `${window.location.origin}/api/auth/callback`;
      const result = await post<{ redirectUrl: string }>('auth/google', { intent: auth === 'register' ? 'register' : 'login', redirectTo, ...consent });
      window.location.assign(result.redirectUrl);
    });
  }

  async function run(operation: () => Promise<void>) {
    setBusy(true);
    try { await operation(); } catch (error) { notify(error instanceof Error ? error.message : 'Ocorreu um erro.', true); } finally { setBusy(false); }
  }

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      if (auth === 'recover') { const r = await post<{ message: string }>('auth/recover', { email: form.get('email') }); notify(r.message); openAuth('login'); return; }
      if (auth === 'reset') {
        const recovery = new URLSearchParams(window.location.hash.slice(1));
        await post('auth/reset', { token: new URLSearchParams(window.location.search).get('reset'), accessToken: recovery.get('access_token'), refreshToken: recovery.get('refresh_token'), password: form.get('password') });
        window.history.replaceState({}, '', window.location.pathname); resetWorkspace(); setUser(null); openAuth('login'); notify('Palavra-passe actualizada. Entre novamente.'); return;
      }
      const result = await post<{ user?: User; token?: string; confirmationRequired?: boolean; message?: string }>('auth/' + auth, { name: form.get('name'), email: form.get('email'), password: form.get('password'), phone: form.get('phone') || '', acceptedTerms: form.get('terms') === 'on', consent: form.get('marketing') === 'on' });
      if (result.confirmationRequired) { notify(result.message || 'Confirme o seu e-mail.'); openAuth('login'); return; }
      if (result.user) {
        if (result.token && typeof window !== 'undefined') {
          localStorage.setItem('prospecta_session_token', result.token);
        }
        resetWorkspace(); setUser(result.user); setProfile(result.user.profile); setAuth(null); navigate('opportunities');
      }
    });
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>, onboarded = true) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      const payload = {
        name: String(form.get('name') || user?.name || ''),
        service: String(form.get('service') || 'Criação de websites'),
        pitch: String(form.get('pitch') || ''),
        province: String(form.get('province') || ''),
        phone: String(form.get('phone') || ''),
        nationwide: form.get('nationwide') === 'on',
        onboarded: true
      };
      const result = await api<{ success?: boolean; user?: User }>('profile', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      const updatedUser = result?.user || (result as unknown as User);
      if (updatedUser && updatedUser.profile) {
        const enforcedUser: User = {
          ...updatedUser,
          profile: {
            ...updatedUser.profile,
            onboarded: true
          }
        };
        setUser(enforcedUser);
        setProfile(enforcedUser.profile);
        setService(enforcedUser.profile.service || 'Criação de websites');
        if (typeof window !== 'undefined' && enforcedUser.id) {
          localStorage.setItem('prospecta_onboarded_' + enforcedUser.id, 'true');
        }
        notify('Perfil guardado com sucesso.');
      } else if (user) {
        const safeProfile: Profile = {
          service: payload.service,
          pitch: payload.pitch,
          province: payload.province,
          phone: payload.phone,
          nationwide: payload.nationwide,
          onboarded: true
        };
        const safeUser: User = { ...user, name: payload.name || user.name, profile: safeProfile };
        setUser(safeUser);
        setProfile(safeProfile);
        setService(safeProfile.service);
        if (typeof window !== 'undefined' && user.id) {
          localStorage.setItem('prospecta_onboarded_' + user.id, 'true');
        }
        notify('Perfil guardado com sucesso.');
      }
    });
  }

  async function doSearch(page?: number, customFilters?: SearchFilters) {
    await run(async () => {
      const searchParams = customFilters || filters;
      if (page && searchResult?.allResults && searchResult.allResults.length > 0) {
        const pageSize = 8;
        const total = searchResult.allResults.length;
        const pages = Math.max(1, Math.ceil(total / pageSize));
        const safePage = Math.min(Math.max(1, page), pages);
        const results = searchResult.allResults.slice((safePage - 1) * pageSize, safePage * pageSize);
        const updated = {
          ...searchResult,
          page: safePage,
          pages,
          results
        };
        setSearchResult(updated);
        if (typeof window !== 'undefined' && user?.id) {
          try {
            localStorage.setItem('prospecta_active_search_' + user.id, JSON.stringify(updated));
          } catch {}
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      let result: SearchResult;
      if (page && searchResult) {
        try {
          result = await api<SearchResult>(`searches/${searchResult.id}?page=${page}`);
        } catch {
          result = await post<SearchResult>('searches', searchParams);
        }
      } else {
        result = await post<SearchResult>('searches', searchParams);
      }
      setSearchResult(result);
      if (typeof window !== 'undefined' && user?.id) {
        try {
          localStorage.setItem('prospecta_active_search_' + user.id, JSON.stringify(result));
          localStorage.setItem('prospecta_search_filters_' + user.id, JSON.stringify(searchParams));
        } catch {}
      }
      for (let i = 0; ['queued', 'running'].includes(result.status) && i < 80; i++) {
        await new Promise(r => setTimeout(r, 650));
        try {
          result = await api<SearchResult>('searches/' + result.id);
          setSearchResult(result);
          if (typeof window !== 'undefined' && user?.id) {
            try {
              localStorage.setItem('prospecta_active_search_' + user.id, JSON.stringify(result));
            } catch {}
          }
        } catch {
          break;
        }
      }
      if (['queued', 'running'].includes(result.status)) notify('A pesquisa continua em curso. Verifique o processador de tarefas.', true);
      else loadPastSearches();
    });
  }

  async function resumeSearch(item: SearchResult) {
    setFilters(item.filters);
    await run(async () => {
      try {
        const full = await api<SearchResult>(`searches/${item.id}`);
        setSearchResult(full);
        if (typeof window !== 'undefined' && user?.id) {
          try {
            localStorage.setItem('prospecta_active_search_' + user.id, JSON.stringify(full));
            localStorage.setItem('prospecta_search_filters_' + user.id, JSON.stringify(item.filters));
          } catch {}
        }
      }
      catch { await doSearch(undefined, item.filters); }
    });
  }

  async function saveBusiness(b: Business) {
    await run(async () => {
      const result = await post<{ lead: Lead }>('leads', { businessId: b.id });
      setSelectedLead(result.lead);
      if (business?.id === b.id) setBusiness({ ...b, saved: true });
      setSearchResult(prev => prev ? { ...prev, results: prev.results.map(item => item.id === b.id ? { ...item, saved: true } : item) } : prev);
      notify('Empresa guardada nas suas oportunidades.');
    });
  }

  async function generate(fresh = false) {
    if (!business) return;
    await run(async () => {
      let result = await api<Job>('analyses', { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ businessId: business.id, tone, service, fresh }) });
      setJob(result);
      if (result.status === 'succeeded' && result.result) {
        if (!activeBusiness.current || activeBusiness.current === result.result.businessId || business.id === result.result.businessId) { setAnalysis(result.result); setDraft(result.result.draftMessage); }
        await refreshUser(); notify('Análise e mensagem preparadas.');
        return;
      }
      for (let i = 0; ['queued', 'running'].includes(result.status) && i < 40; i++) {
        await new Promise(r => setTimeout(r, 650));
        result = await api<Job>('jobs/' + result.id); setJob(result);
      }
      if (result.status === 'succeeded' && result.result) {
        if (!activeBusiness.current || activeBusiness.current === result.result.businessId || business.id === result.result.businessId) { setAnalysis(result.result); setDraft(result.result.draftMessage); }
        await refreshUser(); notify('Análise e mensagem preparadas.');
      } else if (result.status === 'failed') { await refreshUser(); throw new Error(result.error || 'A análise falhou; a reserva foi libertada.'); }
      else if (result.status === 'cancelled') { await refreshUser(); notify('Análise cancelada.'); }
      else notify('A tarefa continua em curso. Pode consultar o resultado mais tarde.', true);
    });
  }

  async function saveDraft() {
    if (!analysis) return;
    await run(async () => {
      const result = await api<{ analysis: Analysis }>('drafts/' + analysis.id, { method: 'PATCH', body: JSON.stringify({ body: draft }) });
      setAnalysis(result.analysis); notify('Mensagem guardada.');
    });
  }

  async function copyDraft() {
    try { await navigator.clipboard.writeText(draft); notify('Mensagem copiada. Reveja antes de enviar.'); }
    catch { notify('Não foi possível copiar. Seleccione o texto manualmente.', true); }
  }

  async function updateLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedLead) return;
    const form = new FormData(event.currentTarget);
    await run(async () => {
      const amount = String(form.get('amount') || '');
      const due = String(form.get('due') || '');
      const result = await api<{ lead: Lead }>('leads/' + selectedLead.id, { method: 'PATCH', body: JSON.stringify({ stage: form.get('stage'), note: form.get('note'), nextAction: form.get('nextAction'), nextActionAt: due ? new Date(due).toISOString() : null, amountMinor: amount ? Math.round(Number(amount) * 100) : null }) });
      setSelectedLead(result.lead); setLeads(prev => prev.map(l => l.id === result.lead.id ? result.lead : l)); notify('Oportunidade actualizada.');
    });
  }

  async function requestPrivacy(type: 'export' | 'delete') {
    if (type === 'delete' && !window.confirm('Pretende pedir a eliminação da sua conta e dados privados? O pedido será revisto pela administração.')) return;
    await run(async () => {
      const result = await post<{ request: PrivacyRequest }>('privacy', { type });
      setRequests(prev => [result.request, ...prev]);
      notify(type === 'export' ? 'Exportação pronta para descarregar.' : 'Pedido de eliminação registado.');
    });
  }

  // ─── Navigation (Clivra structure) ──────────────────
  const navMain = [
    { view: 'opportunities' as View, label: 'Oportunidades grátis', icon: Sparkles },
    { view: 'today' as View, label: 'Hoje', icon: CalendarDays },
    { view: 'search' as View, label: 'Encontrar clientes', icon: Compass },
    { view: 'saved-searches' as View, label: 'Buscas salvas', icon: Search },
    { view: 'leads' as View, label: 'Leads salvos', icon: Bookmark },
    { view: 'portfolio' as View, label: 'Portfólio', icon: FileText, beta: true },
    { view: 'vault' as View, label: 'Cofre', icon: ShieldCheck },
  ];

  // ─── Render ──────────────────────────────────────────
  if (loading) return <div className="boot"><Brand /><LoaderCircle className="spin" /><p>A preparar o seu espaço…</p></div>;

  const toastUi = toast && (
    <div role={toast.error ? 'alert' : 'status'} className={cls('toast', toast.error && 'error')}>
      {toast.error ? <ShieldCheck size={19} /> : <CircleCheck size={19} />}
      <span>{toast.message}</span>
      <IconButton label="Fechar mensagem" onClick={() => setToast(null)}><X size={16} /></IconButton>
    </div>
  );

  if (!user || auth === 'reset') return (
    <div className="public-page">{toastUi}
      {auth
        ? <AuthScreen key={auth} kind={auth} busy={busy} onSubmit={authenticate} onSwitch={openAuth} onHome={() => openAuth(null)} onGoogle={startGoogle} />
        : <Landing busy={busy} onRegister={() => openAuth('register')} onLogin={() => openAuth('login')} />}
    </div>
  );

  return (
    <div className="app">
      {toastUi}
      <a className="skip-link" href="#main">Saltar para o conteúdo</a>
      {mobileMenu && <div className="sidebar-backdrop" onClick={() => setMobileMenu(false)} />}

      {/* ══ SIDEBAR ══════════════════════════════════════ */}
      <aside className={cls('sidebar', mobileMenu && 'open')}>
        <Brand />

        <span className="nav-label">MENU</span>
        <nav aria-label="Navegação principal">
          {navMain.map(item => (
            <button key={item.view} className={cls('nav-item', view === item.view && 'active')} onClick={() => navigate(item.view)}>
              <item.icon size={19} />
              <span>{item.label}</span>
              {item.beta && <span className="nav-beta">BETA</span>}
            </button>
          ))}
          {user.role === 'admin' && (
            <button className={cls('nav-item', view === 'admin' && 'active')} onClick={() => navigate('admin')}>
              <ShieldCheck size={19} /><span>Administração</span>
            </button>
          )}
        </nav>

        <div className="sidebar-bottom">
          {/* Credits pill */}
          <div className="sidebar-credits">
            <Sparkles size={14} />
            <span>{user.credits.available} créditos</span>
            <button className="text-button" style={{ marginLeft: 'auto' }} onClick={() => navigate('account')}><ArrowRight size={13} /></button>
          </div>

          {/* Configurações */}
          <button className="nav-item" onClick={() => navigate('account')}>
            <Settings2 size={19} /><span>Configurações</span>
          </button>

          {/* User card */}
          <button className="user-card" onClick={() => navigate('account')}>
            <span className="avatar">{((user.name && user.name.toLowerCase() !== 'droop store') ? user.name : 'Chelton Madime').split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('')}</span>
            <span><strong>{(user.name && user.name.toLowerCase() !== 'droop store') ? user.name : 'Chelton Madime'}</strong><small>{user.profile.province || 'Moçambique'}</small></span>
            <Settings2 size={17} />
          </button>

          <button className="logout" disabled={busy} onClick={() => run(async () => {
            if (typeof window !== 'undefined') localStorage.removeItem('prospecta_session_token');
            await post('auth/logout'); resetWorkspace(); setUser(null); setAuth(null);
          })}>
            <LogOut size={15} /> Terminar sessão
          </button>
        </div>
      </aside>

      {/* ══ MAIN ════════════════════════════════════════ */}
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <IconButton label="Abrir menu" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={20} /></IconButton>
            <span className="breadcrumb">
              O meu espaço <ChevronRight size={13} /> <b>
                {view === 'business' ? 'Ficha da empresa'
                  : view === 'outreach' ? 'Preparar abordagem'
                  : view === 'admin' ? 'Administração'
                  : navMain.find(n => n.view === view)?.label || 'Configurações'}
              </b>
            </span>
          </div>
          <div className="topbar-right">
            <span className="country"><span className="country-dot" /> Moçambique</span>
            <button className="balance" onClick={() => navigate('account')}><Sparkles size={14} />{user.credits.available} créditos</button>
            <span className="avatar small">{user.name.slice(0, 1)}</span>
          </div>
        </header>

        <main id="main" className="workspace">

          {/* Onboarding */}
          {!user.profile.onboarded && (
            <section className="panel onboarding">
              <div><span className="eyebrow">BEM-VINDO À PROSPECTA</span><h2>Primeiro, diga-nos o que faz.</h2><p className="muted">A sua apresentação ajuda a preparar abordagens com a sua voz.</p></div>
              <ProfileForm user={user} profile={profile || user.profile} busy={busy} onSubmit={saveProfile} />
            </section>
          )}

          {/* ══ VIEW: Oportunidades grátis ════════════════ */}
          {user.profile.onboarded && view === 'opportunities' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow"><Sparkles size={14} /> TESTE GRÁTIS · 3 DIAS</div>
                  <h1>As suas primeiras oportunidades. <span className="wave">✳</span></h1>
                  <p>Explore leads reais sem pagar. Comece hoje mesmo.</p>
                </div>
                <button className="button" onClick={() => navigate('search')}><Plus size={18} /> Encontrar mais</button>
              </div>

              {/* Trial progress */}
              <div className="trial-banner">
                {(['Hoje', 'Dia 2', 'Dia 3'] as const).map((label, i) => (
                  <button key={i} className={cls('trial-day', i === trialDay && 'active', i < trialDay && 'done')} onClick={() => { setTrialDay(i); loadDailyOpportunities(i); }}>
                    {i < trialDay ? <Check size={14} /> : <span className="trial-num">{i + 1}</span>}
                    {label}
                  </button>
                ))}
                <div className="trial-progress"><span style={{ width: `${(trialDay / 2) * 100}%` }} /></div>
              </div>

              {/* Opportunity cards */}
              <p className="section-label">Oportunidades de {trialDay === 0 ? 'hoje' : trialDay === 1 ? 'amanhã (Dia 2)' : 'depois de amanhã (Dia 3)'}</p>
              <div className="opp-grid">
                {dailyOpps.map(opp => (
                  <article key={opp.id} className="opp-card">
                    <div className="opp-card-top">
                      <span className="opp-initial" style={{ background: 'rgba(24, 119, 242, 0.15)', color: opp.color || '#38BDF8', borderColor: 'rgba(37, 99, 235, 0.3)' }}>{opp.initial || opp.name.charAt(0)}</span>
                      <div className="opp-meta">
                        <h3>{opp.name}</h3>
                        <span>{opp.category} · {opp.locality}</span>
                      </div>
                      <div className="opp-stars">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={13} fill={i < (opp.stars || 5) ? '#e9b458' : 'none'} stroke={i < (opp.stars || 5) ? '#e9b458' : 'rgba(255, 255, 255, 0.2)'} />
                        ))}
                      </div>
                    </div>
                    <div className="opp-actions">
                      {opp.phone ? (
                        <a className="button whatsapp opp-btn" href={`https://wa.me/${opp.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                          <MessageCircle size={15} /> Chamar no WhatsApp
                        </a>
                      ) : (
                        <button className="button outline opp-btn" onClick={() => loadBusiness(opp.id, 'business', opp)}>
                          <Phone size={14} /> Ver contacto
                        </button>
                      )}
                      <button className="button outline opp-btn" onClick={() => loadBusiness(opp.id, 'business', opp)}>
                        Ver lead <ArrowRight size={14} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {/* ══ VIEW: Hoje ════════════════════════════════ */}
          {user.profile.onboarded && view === 'today' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow"><CalendarDays size={14} /> RESUMO DO DIA</div>
                  <h1>{greeting()}, {user.name.split(' ')[0]} 👋</h1>
                  <p>Aqui está o resumo das suas actividades de hoje.</p>
                </div>
                <button className="button" onClick={() => navigate('search')}><Plus size={18} /> Encontrar clientes</button>
              </div>

              {/* Stats */}
              <div className="stat-grid">
                {[
                  { label: 'Leads salvos', value: dashboard?.leads ?? 0, icon: Bookmark, color: 'blue', detail: 'Empresas no seu acompanhamento' },
                  { label: 'Seguimentos hoje', value: dashboard?.due ?? 0, icon: CalendarDays, color: 'amber', detail: 'Até ao final de hoje' },
                  { label: 'Créditos', value: user.credits.available, icon: Sparkles, color: 'blue', detail: 'Para preparar abordagens' },
                  { label: 'Em negociação', value: money(dashboard?.proposalsMinor ?? 0), icon: TrendingUp, color: 'green', detail: 'Soma das oportunidades em Proposta' },
                ].map(s => (
                  <article className="stat-card" key={s.label}>
                    <div className="row"><span>{s.label}</span><span className={'stat-icon ' + s.color}><s.icon size={18} /></span></div>
                    <strong>{s.value}</strong>
                    <p>{s.detail}</p>
                  </article>
                ))}
              </div>

              <div className="dashboard-grid">
                {/* Pipeline */}
                <section className="panel">
                  <div className="panel-heading">
                    <div><h2>O caminho de cada oportunidade</h2><p>Do primeiro contacto à próxima conquista.</p></div>
                    <Pill>{dashboard?.leads ?? 0} no total</Pill>
                  </div>
                  <div className="pipeline-summary">
                    {STAGES.map((stage, i) => (
                      <button key={stage} onClick={() => { setStageFilter(stage); navigate('leads'); }}>
                        <span className={'stage-dot stage-' + i} /><span>{stage}</span>
                        <b>{dashboard?.stages.find(s => s.stage === stage)?.count ?? 0}</b>
                        <div className="pipeline-bar"><span style={{ width: `${Math.max(3, (dashboard?.stages[i]?.count || 0) / Math.max(1, dashboard?.leads || 1) * 100)}%` }} /></div>
                      </button>
                    ))}
                  </div>
                  <div className="panel-footer">
                    <span><CircleCheck size={14} /> Etapas actualizadas por si</span>
                    <button className="text-button" onClick={() => navigate('leads')}>Ver oportunidades <ArrowRight size={14} /></button>
                  </div>
                </section>

                {/* Meta de hoje */}
                <section className="panel today-meta-card">
                  <div className="panel-heading">
                    <div><h2>Meta de hoje</h2><p>Contactos realizados hoje</p></div>
                    <Target size={19} />
                  </div>
                  <div className="meta-circle-wrap">
                    <CircleScore value={0} max={5} size={80} color="#1877F2" />
                    <div><strong>0 / 5</strong><small>contactos hoje</small></div>
                  </div>
                  <div className="meta-progress"><span style={{ width: '0%' }} /></div>
                  <p className="micro muted" style={{ padding: '12px 24px 20px' }}>Realize 5 contactos hoje para atingir a sua meta diária.</p>
                </section>
              </div>

              <div className="dashboard-grid">
                {/* Próximos passos */}
                <section className="panel">
                  <div className="panel-heading"><div><h2>Os seus próximos passos</h2><p>Pequenas acções mantêm as conversas vivas.</p></div><CalendarDays size={19} /></div>
                  {dashboard?.tasks.length
                    ? dashboard.tasks.map(l => (
                      <button className="task-row" key={l.id} onClick={() => { setSelectedLead(l); navigate('leads'); }}>
                        <span className="soft-icon"><CalendarDays size={20} /></span>
                        <span><b>{l.business.name}</b><small>{l.nextAction || 'Retomar a conversa'} · {l.nextActionAt && date(l.nextActionAt)}</small></span>
                        <ArrowUpRight size={17} />
                      </button>
                    ))
                    : <Empty icon={<CalendarDays size={26} />} title="Agenda livre, possibilidades abertas." description="Agende um seguimento numa oportunidade e encontre aqui o próximo passo." />
                  }
                </section>

                {/* Leads do Dia */}
                <section className="panel">
                  <div className="panel-heading"><div><h2>Leads do Dia</h2><p>Actividade recente no seu espaço.</p></div><CalendarDays size={18} /></div>
                  {dashboard?.recent.length
                    ? <div className="activity-list">
                      {dashboard.recent.slice(0, 5).map(a => (
                        <div key={a.id}><span className="activity-dot" /><div><p>{a.note}</p><small>{date(a.createdAt)}</small></div></div>
                      ))}
                    </div>
                    : <Empty icon={<ArrowUpRight size={26} />} title="A sua história começa agora." description="As empresas guardadas e as alterações aparecerão aqui." />
                  }
                </section>
              </div>
            </>
          )}

          {/* ══ VIEW: Encontrar clientes ══════════════════ */}
          {user.profile.onboarded && view === 'search' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow"><Compass size={14} /> RADAR DE OPORTUNIDADES</div>
                  <h1>O próximo cliente pode estar aqui.</h1>
                  <p>Defina o nicho e as cidades. Localize negócios reais e identifique pontos de contacto.</p>
                </div>
                <span className="national-badge"><Globe2 size={18} /> Cobertura nacional</span>
              </div>

              <div className="search-layout">
                {/* Radar form */}
                <section className="panel search-panel radar-search-panel">
                  <form onSubmit={e => { e.preventDefault(); doSearch(); }}>
                    <div className="filter-heading">
                      <span><Radar size={17} /> Nova busca</span>
                      <button type="button" className="text-button muted" onClick={() => setFilters({ niche: '', cities: '', phone: 'all', website: 'all', instagram: 'all', province: '', locality: '', category: '', service: user.profile.service, budget: 11 })}>Limpar campos</button>
                    </div>
                    <div className="radar-row-1">
                      <label className="field-group">
                        <span className="field-label">Nicho</span>
                        <input value={filters.niche || ''} onChange={e => setFilters({ ...filters, niche: e.target.value })} placeholder="Ex.: Clínicas odontológicas, Restaurantes, Salões" />
                      </label>
                      <label className="field-group">
                        <span className="field-label">Cidades (até 5, separadas por vírgula)</span>
                        <input value={filters.cities || ''} onChange={e => setFilters({ ...filters, cities: e.target.value })} placeholder="Maputo, Matola, Beira" />
                      </label>
                    </div>
                    <div className="radar-row-2">
                      <label className="field-group"><span className="field-label">Telefone</span>
                        <select value={filters.phone || 'all'} onChange={e => setFilters({ ...filters, phone: e.target.value })}>
                          <option value="all">Todos</option><option value="with_phone">Com telefone/WhatsApp</option>
                        </select>
                      </label>
                      <label className="field-group"><span className="field-label">Website</span>
                        <select value={filters.website || 'all'} onChange={e => setFilters({ ...filters, website: e.target.value })}>
                          <option value="all">Todos</option><option value="without_website">Sem website</option><option value="with_website">Com website</option>
                        </select>
                      </label>
                      <label className="field-group"><span className="field-label">Instagram</span>
                        <select value={filters.instagram || 'all'} onChange={e => setFilters({ ...filters, instagram: e.target.value })}>
                          <option value="all">Todos</option><option value="with_instagram">Com Instagram</option><option value="without_instagram">Sem Instagram</option>
                        </select>
                      </label>
                      <label className="field-group"><span className="field-label">O serviço que oferece</span>
                        <select value={filters.service || SERVICES[0]} onChange={e => setFilters({ ...filters, service: e.target.value })}>
                          {SERVICES.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </label>
                      <div className="radar-action-col">
                        <button className="button radar-submit-button" disabled={busy}>
                          {busy ? <LoaderCircle className="spin" size={17} /> : <Search size={17} />}Buscar negócios
                        </button>
                      </div>
                    </div>
                  </form>
                  {pastSearches.length > 0 && (
                    <div className="radar-my-searches">
                      <div className="radar-my-searches-header">
                        <span className="radar-my-searches-title"><Clock3 size={15} /> Minhas buscas <small>(Retome buscas anteriores)</small></span>
                      </div>
                      <div className="radar-search-pills">
                        {pastSearches.map(item => {
                          const nichePart = item.filters.niche || item.filters.category || 'Qualquer nicho';
                          const locPart = item.filters.cities || item.filters.locality || item.filters.province || 'Todo Moçambique';
                          const statusPart = item.status === 'succeeded' ? 'Concluída' : item.status === 'running' ? 'Em curso' : item.status === 'partial' ? 'Parcial' : 'Incompleta';
                          return (
                            <button key={item.id} type="button" className={cls('radar-search-pill', searchResult?.id === item.id && 'active')} onClick={() => resumeSearch(item)}>
                              <span className="pill-query">{nichePart} — {locPart}</span>
                              <span className="pill-dot">·</span>
                              <span className="pill-status">{statusPart}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </section>

                {/* Análise profunda card */}
                <aside className="analysis-card-aside">
                  <div className="analysis-deep-card">
                    <div className="adc-header"><span className="eyebrow"><Sparkles size={13} /> ANÁLISE PROFUNDA</span></div>
                    <div className="adc-score-row">
                      <CircleScore value={87} max={100} size={72} color="#1877F2" />
                      <div>
                        <strong className="adc-score-label">Score de oportunidade</strong>
                        <p>Alta probabilidade de interesse</p>
                      </div>
                    </div>
                    {(() => {
                      const currentService = filters.service || user.profile.service || 'Criação de websites';
                      const currentNiche = filters.niche || searchResult?.filters.niche || '';
                      const pricing = getRecommendedPricing(currentService, currentNiche);
                      return (
                        <div className="adc-pricing-box" style={{ background: 'rgba(24, 119, 242, 0.08)', border: '1px solid rgba(37, 99, 235, 0.25)', borderRadius: 10, padding: '10px 12px', margin: '12px 0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 10, color: '#93c5fd', fontWeight: 700, letterSpacing: '0.5px' }}>VALOR RECOMENDADO</span>
                            <span style={{ fontSize: 9, background: 'rgba(37, 99, 235, 0.25)', color: '#bfdbfe', padding: '1px 6px', borderRadius: 10 }}>{pricing.period === 'mês' ? 'Mensal' : 'Setup'}</span>
                          </div>
                          <strong style={{ fontSize: 18, color: '#60a5fa', display: 'block', letterSpacing: '-0.3px', marginBottom: 3 }}>{pricing.formattedRange}</strong>
                          <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, lineHeight: 1.35 }}>{pricing.rationale}</p>
                        </div>
                      );
                    })()}
                    <button className="button full" onClick={() => notify('Seleccione uma empresa para gerar análise profunda.')}>
                      <Sparkles size={16} /> Gerar análise · 1 crédito
                    </button>
                    <p className="micro muted" style={{ textAlign: 'center', marginTop: 10 }}>Baseado no perfil e dados disponíveis</p>
                  </div>
                </aside>
              </div>

              {/* Results */}
              {searchResult ? (
                <>
                  <div className="results-heading">
                    <div>
                      <h2>{searchResult.total} empresas encontradas <Pill>Fonte autorizada</Pill></h2>
                      <p>{[searchResult.filters.niche, searchResult.filters.cities].filter(Boolean).join(' — ') || [searchResult.filters.province, searchResult.filters.locality].filter(Boolean).join(' · ') || 'Todo Moçambique'} · Página {searchResult.page} de {searchResult.pages}</p>
                    </div>
                    <span className="muted micro">{searchResult.status === 'succeeded' ? 'Consulta concluída' : searchResult.status === 'partial' ? 'Consulta parcial' : searchResult.status === 'failed' ? 'Falha na consulta' : 'A consultar as zonas…'}</span>
                  </div>
                  <div className="coverage-progress">
                    {searchResult.tasks.map(task => (
                      <span key={task.province} className={cls(task.status === 'succeeded' && 'complete', task.status === 'failed' && 'failed')} title={task.error || `${task.count} resultados nesta fonte`}>
                        {task.status === 'succeeded' ? <Check size={12} /> : <Clock3 size={12} />} {task.province}<b>{task.count}</b>
                      </span>
                    ))}
                  </div>
                  {(() => {
                    const seenNames = new Set<string>();
                    const uniqueResults = searchResult.results.filter(b => {
                      const k = (b.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                      if (seenNames.has(k)) return false;
                      seenNames.add(k);
                      return true;
                    });
                    return uniqueResults.length
                      ? <div className="business-grid">{uniqueResults.map(b => <BusinessCard key={b.id} business={b} busy={busy} onView={() => run(() => loadBusiness(b.id, 'business', b))} onSave={() => saveBusiness(b)} onUpdatePhone={(phone) => handleUpdateBusinessPhone(b.id, phone)} />)}</div>
                      : <section className="panel"><Empty icon={<Search size={30} />} title={searchResult.status === 'failed' ? 'Não foi possível consultar a fonte.' : 'Não encontrámos resultados nesta consulta.'} description={searchResult.tasks.find(t => t.error)?.error || 'Experimente outro nicho ou cidade.'}><button className="button outline" onClick={() => doSearch()}>Tentar novamente</button></Empty></section>;
                  })()}
                  <div className="pagination">
                    <span>{searchResult.total} resultados nesta fonte · Não é um inventário completo</span>
                    <div>
                      <IconButton label="Página anterior" onClick={() => searchResult.page > 1 && doSearch(searchResult.page - 1)}><ChevronLeft size={18} /></IconButton>
                      <b>{searchResult.page}</b>
                      <IconButton label="Página seguinte" onClick={() => searchResult.page < searchResult.pages && doSearch(searchResult.page + 1)}><ChevronRight size={18} /></IconButton>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="results-heading"><h2>Oportunidades começam com uma pergunta.</h2></div>
                  <div className="search-start">
                    <div className="search-start-copy">
                      <span className="soft-icon"><Radar size={28} /></span>
                      <h2>Onde pode o seu<br />trabalho fazer diferença?</h2>
                      <p>Pesquise por nicho e cidade em Moçambique. Receba contexto para começar uma conversa relevante.</p>
                      <div className="quick-searches">
                        {[['Clínicas odontológicas', 'Maputo, Matola'], ['Restaurantes', 'Beira'], ['Salões de beleza', 'Nampula'], ['Oficinas e mecânica', 'Tete']].map(([n, c]) => (
                          <button key={n + c} onClick={() => setFilters({ ...filters, niche: n, cities: c })}><MapPin size={13} />{n} — {c}<ArrowUpRight size={13} /></button>
                        ))}
                      </div>
                    </div>
                    <div className="country-outline"><MozambiqueMap /><span><span className="live-dot" /> TODO MOÇAMBIQUE</span></div>
                  </div>
                </>
              )}

              <div className="integrity-note"><ShieldCheck size={18} /><p><b>Informação para conversar, não para presumir.</b> A disponibilidade varia por fonte. Confirme sempre as necessidades com a empresa.</p></div>
            </>
          )}

          {/* ══ VIEW: Buscas salvas ═══════════════════════ */}
          {user.profile.onboarded && view === 'saved-searches' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow"><Search size={14} /> BUSCAS SALVAS</div>
                  <h1>As suas pesquisas guardadas.</h1>
                  <p>Retome qualquer busca anterior com um clique.</p>
                </div>
                <button className="button" onClick={() => navigate('search')}><Plus size={18} /> Nova busca</button>
              </div>
              {pastSearches.length ? (
                <section className="panel">
                  <div className="panel-heading"><h2>Buscas anteriores</h2><span className="muted micro">{pastSearches.length} buscas guardadas</span></div>
                  <div style={{ paddingBottom: 16 }}>
                    {pastSearches.map(item => {
                      const nichePart = item.filters.niche || item.filters.category || 'Qualquer nicho';
                      const locPart = item.filters.cities || item.filters.locality || item.filters.province || 'Todo Moçambique';
                      return (
                        <button key={item.id} className="task-row" onClick={() => { navigate('search'); resumeSearch(item); }}>
                          <span className="soft-icon"><Search size={18} /></span>
                          <span><b>{nichePart} — {locPart}</b><small>{item.total} resultados · {item.status === 'succeeded' ? 'Concluída' : 'Parcial'}</small></span>
                          <ArrowRight size={17} />
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : (
                <section className="panel">
                  <Empty icon={<Search size={28} />} title="Ainda não tem buscas salvas." description="Realize uma pesquisa em Encontrar clientes e ela ficará guardada aqui automaticamente.">
                    <button className="button" onClick={() => navigate('search')}>Fazer primeira busca <ArrowRight size={16} /></button>
                  </Empty>
                </section>
              )}
            </>
          )}

          {/* ══ VIEW: Leads salvos ════════════════════════ */}
          {user.profile.onboarded && view === 'leads' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow"><Bookmark size={14} /> RELAÇÕES QUE AVANÇAM</div>
                  <h1>Cada conversa, no seu lugar.</h1>
                  <p>Acompanhe oportunidades e não perca o próximo passo.</p>
                </div>
                <button className="button" onClick={() => navigate('search')}><Plus size={17} /> Encontrar empresas</button>
              </div>
              <div className="stage-filters">
                <button className={!stageFilter ? 'active' : ''} onClick={() => setStageFilter('')}>Todas <b>{leads.length}</b></button>
                {STAGES.map((s, i) => (
                  <button key={s} className={stageFilter === s ? 'active' : ''} onClick={() => setStageFilter(s)}>
                    <span className={'stage-dot stage-' + i} />{s}<b>{leads.filter(l => l.stage === s).length}</b>
                  </button>
                ))}
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <h2>As suas oportunidades</h2>
                  <div className="inline-search"><Search size={16} /><input aria-label="Procurar oportunidades" placeholder="Procurar empresa…" value={leadSearch} onChange={e => setLeadSearch(e.target.value)} /></div>
                </div>
                {leads.filter(l => (!stageFilter || l.stage === stageFilter) && l.business.name.toLowerCase().includes(leadSearch.toLowerCase())).length
                  ? <div className="lead-list">
                    {leads.filter(l => (!stageFilter || l.stage === stageFilter) && l.business.name.toLowerCase().includes(leadSearch.toLowerCase())).map(l => (
                      <button className="lead-row" key={l.id} onClick={() => setSelectedLead(l)}>
                        <span className="business-icon"><Building2 size={21} /></span>
                        <div className="lead-name"><b>{l.business.name}</b><small>{l.business.locality} · {l.business.province}</small></div>
                        <Pill tone={'stage-tone-' + STAGES.indexOf(l.stage)}>{l.stage}</Pill>
                        <span className="lead-followup">{l.nextAction || 'Definir próximo passo'}<small>{l.nextActionAt ? date(l.nextActionAt) : 'Sem data agendada'}</small></span>
                        <strong className="lead-amount">{l.amountMinor !== null ? money(l.amountMinor) : '—'}</strong>
                        <ChevronRight size={17} />
                      </button>
                    ))}
                  </div>
                  : <Empty title={leads.length ? 'Nenhuma oportunidade neste filtro.' : 'A próxima relação começa aqui.'} description="Guarde empresas da pesquisa para acompanhar contactos, propostas e próximos passos.">
                    <button className="button" onClick={() => navigate('search')}>Encontrar empresas <ArrowRight size={16} /></button>
                  </Empty>
                }
              </section>
            </>
          )}

          {/* ══ VIEW: Portfólio (BETA) ════════════════════ */}
          {user.profile.onboarded && view === 'portfolio' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={14} /> PORTFÓLIO <Pill tone="amber">BETA</Pill></div>
                  <h1>O seu trabalho, apresentado.</h1>
                  <p>Crie um portfólio profissional para partilhar com clientes.</p>
                </div>
              </div>
              <section className="panel">
                <Empty icon={<FileText size={28} />} title="Portfólio em breve." description="Esta funcionalidade está em desenvolvimento. Em breve poderá criar e partilhar o seu portfólio profissional directamente pela Prospecta.">
                  <Pill tone="amber">BETA — Em desenvolvimento</Pill>
                </Empty>
              </section>
            </>
          )}

          {/* ══ VIEW: Cofre ══════════════════════════════ */}
          {user.profile.onboarded && view === 'vault' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ShieldCheck size={14} /> SCRIPTS DE PROSPECÇÃO, NEGOCIAÇÃO E FECHAMENTO</div>
                  <h1>Cofre de Scripts · Código Zero & Prospecta</h1>
                  <p>Modelos comerciais de alta conversão testados em Moçambique para WhatsApp, abordagem fria, objeções e M-Pesa / e-Mola.</p>
                </div>
              </div>

              {/* Filter bar */}
              <div className="vault-filter-panel">
                <div className="vault-search-row">
                  <Search size={18} />
                  <input
                    value={vaultSearch}
                    onChange={e => setVaultSearch(e.target.value)}
                    placeholder="Pesquisar scripts (ex.: caro, sem site, m-pesa, objeção, follow-up)..."
                  />
                  {vaultSearch && <button type="button" className="text-button" onClick={() => setVaultSearch('')}>Limpar</button>}
                </div>
                <div className="vault-category-pills">
                  {[
                    { key: 'all', label: `Todos (${vaultScripts.length || 23})` },
                    { key: 'primeiro-contato', label: 'Primeiro Contato (Frio)' },
                    { key: 'sem-site', label: 'Empresas Sem Site' },
                    { key: 'qualificacao', label: 'Qualificação & Diagnóstico' },
                    { key: 'oferta', label: 'Apresentação da Oferta' },
                    { key: 'objecoes', label: 'Quebra de Objeções' },
                    { key: 'fechamento', label: 'Fechamento M-Pesa / e-Mola' },
                    { key: 'followup', label: 'Follow-up e Retomada' },
                    { key: 'pos-venda', label: 'Pós-venda e Depoimentos' },
                  ].map(cat => (
                    <button
                      key={cat.key}
                      type="button"
                      className={cls('vault-cat-pill', vaultCategory === cat.key && 'active')}
                      onClick={() => setVaultCategory(cat.key)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Script list */}
              {vaultScripts.filter(s => {
                const matchCat = vaultCategory === 'all' || s.category === vaultCategory;
                const matchQ = !vaultSearch || s.title.toLowerCase().includes(vaultSearch.toLowerCase()) || s.template.toLowerCase().includes(vaultSearch.toLowerCase()) || s.scenario.toLowerCase().includes(vaultSearch.toLowerCase()) || s.keyPhrases.some(k => k.toLowerCase().includes(vaultSearch.toLowerCase()));
                return matchCat && matchQ;
              }).length > 0 ? (
                <div className="vault-grid">
                  {vaultScripts.filter(s => {
                    const matchCat = vaultCategory === 'all' || s.category === vaultCategory;
                    const matchQ = !vaultSearch || s.title.toLowerCase().includes(vaultSearch.toLowerCase()) || s.template.toLowerCase().includes(vaultSearch.toLowerCase()) || s.scenario.toLowerCase().includes(vaultSearch.toLowerCase()) || s.keyPhrases.some(k => k.toLowerCase().includes(vaultSearch.toLowerCase()));
                    return matchCat && matchQ;
                  }).map(script => (
                    <article key={script.id} className="vault-card">
                      <div className="vault-card-header">
                        <span className="vault-badge">{script.categoryLabel}</span>
                        <h3>{script.title}</h3>
                        <p className="vault-scenario">{script.scenario}</p>
                      </div>
                      <div className="vault-template-box">
                        <pre>{script.template}</pre>
                      </div>
                      <div className="vault-card-footer">
                        <button
                          type="button"
                          className="button outline compact"
                          onClick={() => {
                            navigator.clipboard.writeText(script.template);
                            notify('Script copiado para a área de transferência!');
                          }}
                        >
                          <Copy size={14} /> Copiar script
                        </button>
                        {business && (
                          <button
                            type="button"
                            className="button compact"
                            onClick={() => {
                              const filled = script.template
                                .replace(/{{empresa}}/g, business.name)
                                .replace(/{{nome}}/g, user.name)
                                .replace(/{{localidade}}/g, business.locality)
                                .replace(/{{categoria}}/g, business.category)
                                .replace(/{{servico}}/g, service);
                              setDraft(filled);
                              navigate('outreach', business);
                              notify('Script inserido na preparação da mensagem!');
                            }}
                          >
                            <ArrowRight size={14} /> Usar com {business.name}
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <section className="panel">
                  <Empty icon={<Search size={28} />} title="Nenhum script encontrado." description="Experimente outro termo de pesquisa ou selecione outra categoria do Cofre.">
                    <button type="button" className="button outline" onClick={() => { setVaultCategory('all'); setVaultSearch(''); }}>Ver todos os scripts</button>
                  </Empty>
                </section>
              )}
            </>
          )}


          {/* ══ VIEW: Ficha + Abordagem ═══════════════════ */}
          {user.profile.onboarded && ['business', 'outreach'].includes(view) && business && (
            <>
              <button className="back-link" onClick={() => navigate('search')}><ChevronLeft size={16} /> Voltar à pesquisa</button>
              <div className="company-heading">
                <div className="company-heading-left">
                  <span className="business-icon large"><Building2 size={32} /></span>
                  <div>
                    <div className="eyebrow">{business.category}</div>
                    <h1>{business.name}</h1>
                    <p>
                    <MapPin size={15} />{business.locality}, {business.province}
                    <a
                      href={getGoogleMapsUrl(business.name, business.locality, business.province)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="heading-map-link"
                      title="Pesquisar esta empresa no Google Maps"
                    >
                      · Ver no Google Maps <ExternalLink size={12} />
                    </a>
                    <a
                      href={getMetaAdLibraryUrl(business.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="heading-map-link"
                      title="Verificar anúncios desta empresa na Biblioteca de Anúncios do Meta"
                    >
                      · Biblioteca de Anúncios Meta <ExternalLink size={12} />
                    </a>
                  </p>
                  </div>
                </div>
                <button className="button outline" disabled={busy || business.saved} onClick={() => saveBusiness(business)}>
                  {business.saved ? <Check size={17} /> : <Bookmark size={17} />} {business.saved ? 'Guardada' : 'Guardar oportunidade'}
                </button>
              </div>
              <div className="tab-bar">
                <button className={view === 'business' ? 'active' : ''} onClick={() => navigate('business', business)}><FileText size={16} /> Empresa e oportunidades</button>
                <button className={view === 'outreach' ? 'active' : ''} onClick={() => navigate('outreach', business)}><MessageCircle size={16} /> Preparar abordagem</button>
              </div>
              {business.suppressed && <div className="alert danger"><ShieldCheck size={18} /> Este contacto está marcado para não contactar. A geração e a abordagem estão bloqueadas.</div>}
              {view === 'business'
                ? <div className="detail-grid">
                  <div>
                    <section className="panel">
                      <div className="panel-heading"><div><h2>Primeiro, os factos.</h2><p>O que a fonte consultada permite observar.</p></div><ShieldCheck size={21} /></div>
                      <div className="evidence-list">
                        {business.evidence.map(e => (
                          <article key={e.id}>
                            <span className="evidence-check"><Check size={14} /></span>
                            <div>
                              <span className="micro-label">{e.field === 'name' ? 'EMPRESA' : e.field === 'location' ? 'LOCALIZAÇÃO' : 'ACTIVIDADE'}</span>
                              <h3>{e.value}</h3><p>{e.source} · {date(e.observedAt)}</p>
                            </div>
                          </article>
                        ))}
                      </div>
                      <div className="panel-footer"><span><Database size={14} /> {business.source}</span><span>Consultado a {date(business.observedAt)}</span></div>
                    </section>
                    <section className="panel opportunity-panel">
                      <div className="panel-heading">
                        <div>
                          <h2><Sparkles size={19} /> Possibilidades para explorar</h2>
                          <p>Hipóteses de trabalho e valores de mercado recomendados em Moçambique.</p>
                        </div>
                      </div>
                      {(() => {
                        const currentService = service || filters.service || user.profile.service || 'Criação de websites';
                        const pricing = getRecommendedPricing(currentService, business.category);
                        return (
                          <div style={{ background: 'rgba(24, 119, 242, 0.08)', border: '1px solid rgba(37, 99, 235, 0.25)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span style={{ fontSize: 11, color: '#93c5fd', fontWeight: 700, letterSpacing: '0.5px' }}>
                                ESCALA RECOMENDADA · {pricing.tierName.toUpperCase()}
                              </span>
                              <span style={{ fontSize: 10, background: 'rgba(37, 99, 235, 0.2)', color: '#bfdbfe', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                                {pricing.period === 'mês' ? 'Mensalidade' : 'Valor de Setup'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '4px 0 6px' }}>
                              <span style={{ fontSize: 24, fontWeight: 800, color: '#60a5fa', letterSpacing: '-0.4px' }}>
                                {pricing.formattedRange}
                              </span>
                              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                                para {business.category || 'este nicho'}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: 12, color: '#cbd5e1', lineHeight: 1.45 }}>
                              {pricing.rationale}
                            </p>
                            <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 11, color: '#94a3b8' }}>
                              <span>Serviço: <strong style={{ color: '#f1f5f9' }}>{currentService}</strong></span>
                              <span>Piso viável: <strong style={{ color: '#f1f5f9' }}>{pricing.minMt.toLocaleString('pt-MZ')} MT</strong></span>
                              <span>Teto sugerido: <strong style={{ color: '#f1f5f9' }}>{pricing.maxMt.toLocaleString('pt-MZ')} MT</strong></span>
                            </div>
                          </div>
                        );
                      })()}
                      {analysis
                        ? <div className="opportunities-content">
                          <Pill>Análise por IA</Pill>
                          <h2>{analysis.recommendedService}</h2><p>{analysis.reason}</p>
                          {analysis.hypotheses.map((h, i) => <div className="hypothesis" key={i}><span>{String(i + 1).padStart(2, '0')}</span><p>{h}</p></div>)}
                          <div className="alert"><ShieldCheck size={17} /><span>{analysis.confidence}</span></div>
                          {analysis.missingData.length > 0 && <div><h4>O que ainda precisamos de saber</h4><ul className="missing-list">{analysis.missingData.map(m => <li key={m}>{m}</li>)}</ul></div>}
                          <button className="button" onClick={() => navigate('outreach', business)}>Preparar a conversa <ArrowRight size={17} /></button>
                        </div>
                        : <Empty icon={<Sparkles size={28} />} title="Uma análise com o seu serviço em mente." description="Relacione os dados disponíveis com o que oferece. Inclui uma primeira mensagem editável; custa 1 crédito.">
                          <button className="button" disabled={busy || business.suppressed} onClick={() => generate()}>{busy ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />} Analisar oportunidade · 1 crédito</button>
                        </Empty>
                      }
                    </section>
                  </div>
                  <aside className="detail-aside">
                    <section className="panel content">
                      <h3>Dados de contacto</h3>
                      <div className="contact-line">
                        <Phone size={17} />
                        <div style={{ flex: 1 }}>
                          <span>Telefone / WhatsApp</span>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
                            <b>{business.phone ? getPhoneBadgeLabel(business.phone) : 'Não listado na busca'}</b>
                            <button
                              type="button"
                              className="text-button"
                              style={{ fontSize: 11, color: '#38bdf8', padding: 0 }}
                              onClick={() => {
                                const newPhone = window.prompt(`Inserir número do Google Maps para "${business.name}" (ex: 84 060 0333):`, business.phone || '');
                                if (newPhone) {
                                  handleUpdateBusinessPhone(business.id, newPhone);
                                }
                              }}
                            >
                              {business.phone ? 'Editar' : '+ Inserir do Maps'}
                            </button>
                          </div>
                        </div>
                      </div>
                      {business.phone && (
                        <a
                          className="button whatsapp"
                          style={{ marginTop: 8, marginBottom: 8, width: '100%', justifyContent: 'center', gap: 6, fontSize: 13, textDecoration: 'none' }}
                          href={`https://wa.me/${business.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageCircle size={15} /> Abrir no WhatsApp ({business.phone})
                        </a>
                      )}
                      <p className="micro">O contacto fica salvo na sua base da Prospecta.</p>
                      <div className="contact-line"><Globe2 size={17} /><div><span>Website</span>{business.website ? <a href={business.website} target="_blank" rel="noreferrer">{business.website.replace('https://', '')} <ExternalLink size={12} /></a> : <b>Não identificado nesta fonte</b>}</div></div>
                      {business.instagram && <div className="contact-line"><Sparkles size={17} /><div><span>Instagram</span><b>{business.instagram}</b></div></div>}
                      <div className="contact-line"><MapPin size={17} /><div><span>Localização</span><a href={getGoogleMapsUrl(business.name, business.locality, business.province)} target="_blank" rel="noreferrer">Ver no Google Maps <ExternalLink size={12} /></a></div></div>
                      <div className="contact-line"><Target size={17} /><div><span>Anúncios Meta</span><a href={getMetaAdLibraryUrl(business.name)} target="_blank" rel="noreferrer">Verificar na Biblioteca <ExternalLink size={12} /></a></div></div>
                      <div className="alert"><ShieldCheck size={17} /><span>A ausência de informação não prova ausência de presença digital.</span></div>
                    </section>
                    <section className="blue-note">
                      <span className="soft-icon"><MessageCircle size={20} /></span>
                      <h3>Uma boa abordagem começa por ouvir.</h3>
                      <p>Apresente-se, faça uma pergunta e confirme se o seu serviço faz sentido.</p>
                    </section>
                    <section className="panel content">
                      <h4>Qualidade da informação</h4>
                      <button className="text-button" onClick={() => { const note = window.prompt('Que informação deve ser corrigida?'); if (note) run(async () => { await post('corrections', { businessId: business.id, note }); notify('Pedido de correcção registado.'); }); }}>Sinalizar informação incorrecta <ArrowUpRight size={14} /></button>
                      <button className="text-button danger-text" disabled={business.suppressed} onClick={() => { const reason = window.prompt('Motivo para não contactar esta empresa:'); if (reason) run(async () => { await post('suppressions', { businessId: business.id, reason }); setBusiness({ ...business, suppressed: true }); notify('Contacto bloqueado para futuras abordagens.'); }); }}>Marcar para não contactar</button>
                    </section>
                  </aside>
                </div>
                : <div className="outreach-grid">
                  <section className="panel content">
                    <div className="step-label"><span>1</span><div><h2>A sua voz, o seu serviço.</h2><p>Prepare o contexto da abordagem.</p></div></div>
                    <div className="two-fields">
                      <label>Tom da mensagem<select value={tone} onChange={e => setTone(e.target.value)}>{['Profissional', 'Amigável', 'Consultivo'].map(t => <option key={t}>{t}</option>)}</select></label>
                      <label>Serviço em destaque<select value={service} onChange={e => setService(e.target.value)}>{SERVICES.map(s => <option key={s}>{s}</option>)}</select></label>
                    </div>
                    <div className="editor-heading">
                      <div className="step-label"><span>2</span><div><h2>Prepare uma boa conversa.</h2><p>{analysis ? 'Reveja, personalize e guarde a mensagem.' : 'Uma nova análise inclui a primeira mensagem.'}</p></div></div>
                      <button className="button outline compact" disabled={busy || business.suppressed} onClick={() => generate(!!analysis)}>{busy ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />} {analysis ? 'Nova análise' : 'Gerar mensagem'} · 1 crédito</button>
                    </div>
                    <div className="vault-quick-bar">
                      <span className="vault-quick-label"><ShieldCheck size={13} /> Modelos do Cofre:</span>
                      <button type="button" className="vault-quick-pill" onClick={() => {
                        setDraft(`Olá, equipa do(a) ${business.name}! Tudo bem?\n\nO meu nome é ${user.name} e ajudo empresas no vosso sector a modernizar o atendimento no WhatsApp para nunca mais perderem clientes por demora.\n\nNotei que têm presença relevante em ${business.locality}. Faz sentido conversarmos 5 minutinhos sobre como isto funciona para o vosso caso? Prometo ser breve!`);
                        notify('Modelo de Primeiro Contato inserido!');
                      }}>Primeiro Contato</button>
                      <button type="button" className="vault-quick-pill" onClick={() => {
                        setDraft(`Olá, pessoal do(a) ${business.name}! Como estão?\n\nEstava a pesquisar serviços de ${business.category} em ${business.locality} e encontrei-vos no Google Maps. Vi que o perfil está super bem avaliado, mas notei que ainda não têm um website próprio, o que faz muitas pessoas desistirem antes de entrar em contacto.\n\nEm menos de 48h consigo colocar uma Landing Page no ar para o(a) ${business.name} que vai duplicar as pessoas que clicam para o WhatsApp de vocês.\n\nGostariam de ver um rascunho sem compromisso?`);
                        notify('Modelo para Empresa Sem Site inserido!');
                      }}>Sem Website</button>
                      <button type="button" className="vault-quick-pill" onClick={() => {
                        setDraft(`Entendo perfeitamente, [Nome do Cliente]. O valor pode parecer um investimento considerável num primeiro momento.\n\nMas vamos pensar juntos: quanto custa hoje o(a) ${business.name} perder 1 ou 2 clientes por semana porque o WhatsApp demorou a responder ou faltou um site?\n\nSe a solução vos trouxer apenas 2 vendas a mais neste mês, ele já não se pagou e gerou lucro limpo?`);
                        notify('Modelo de Quebra de Objeção ("Está Caro") inserido!');
                      }}>Quebra "Está Caro"</button>
                      <button type="button" className="vault-quick-pill" onClick={() => {
                        setDraft(`Perfeito, [Nome]! Fico muito contente por darmos este passo juntos.\n\nPara darmos início imediato ao setup do(a) ${business.name}:\n\n📱 Pagamento via M-Pesa / e-Mola:\n• Número: [SEU NÚMERO M-PESA]\n• Nome: ${user.name}\n• Valor: [VALOR] MT\n• Referência: ${business.name}\n\nAssim que enviarem o comprovativo aqui, crio o grupo no WhatsApp com a equipa técnica para iniciarmos hoje mesmo!`);
                        notify('Modelo de Fechamento via M-Pesa inserido!');
                      }}>Fechamento M-Pesa</button>
                      <button type="button" className="vault-quick-pill" onClick={() => {
                        setDraft(`Olá, [Nome], bom dia! Tudo certo no(a) ${business.name}?\n\nConseguiu dar uma olhada na proposta que enviei ontem? Sei que a rotina com o negócio é sempre corrida!\n\nSe preferir, posso ligar-lhe por 5 minutinhos apenas para tirar dúvidas rápidas. Como está a sua agenda para hoje à tarde?`);
                        notify('Modelo de Follow-up inserido!');
                      }}>Follow-up</button>
                      <button type="button" className="text-button" style={{ marginLeft: 'auto', fontSize: 11 }} onClick={() => navigate('vault')}>Ver todos no Cofre <ArrowRight size={12} /></button>
                    </div>
                    <label className="sr-only" htmlFor="draft">Mensagem de abordagem</label>
                    <textarea id="draft" className="message-editor" value={draft} onChange={e => setDraft(e.target.value)} placeholder="A sua mensagem aparece aqui após a análise. Também pode preparar um texto manualmente." />
                    <div className="editor-meta"><span>{draft.length} caracteres</span><span>Envio decidido por si</span></div>
                    <div className="outreach-actions">
                      <button className="button outline" disabled={!draft || busy || business.suppressed} onClick={copyDraft}><Copy size={16} /> Copiar mensagem</button>
                      <button className="button" disabled={!analysis || !draft || busy || business.suppressed} onClick={saveDraft}><Check size={16} /> Guardar edição</button>
                    </div>
                    {business.phone && !business.suppressed ? (
                      isMozambiqueMobile(business.phone) ? (
                        <>
                          <a className="button whatsapp full" href={`https://wa.me/${business.phone.replace(/\D/g, '')}?text=${encodeURIComponent(draft)}`} target="_blank" rel="noreferrer">
                            <MessageCircle size={18} /> Abrir WhatsApp ({formatPhone(business.phone)}) <ExternalLink size={15} />
                          </a>
                          <p className="micro">Abrir WhatsApp não confirma envio, entrega ou leitura da mensagem.</p>
                        </>
                      ) : isMozambiqueLandline(business.phone) ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                          <a className="button full" href={`tel:${business.phone}`} style={{ background: '#0284c7', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <Phone size={18} /> Ligar Telefone Fixo ({formatPhone(business.phone)})
                          </a>
                          <p className="micro" style={{ color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '8px 12px', borderRadius: 8, margin: 0, lineHeight: 1.4 }}>
                            ℹ️ <strong>Rede Fixa:</strong> Este contacto ({formatPhone(business.phone)}) pertence à rede fixa e normalmente não possui WhatsApp. Ligue diretamente ou consulte as redes sociais da empresa.
                          </p>
                          {business.instagram && (
                            <a className="button outline full" href={`https://instagram.com/${business.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                              <Sparkles size={16} /> Abrir Instagram ({business.instagram})
                            </a>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                          <a className="button full" href={`tel:${business.phone}`} style={{ background: '#0f172a', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <Phone size={18} /> Ligar ({formatPhone(business.phone)})
                          </a>
                          {business.instagram && (
                            <a className="button outline full" href={`https://instagram.com/${business.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                              <Sparkles size={16} /> Abrir Instagram ({business.instagram})
                            </a>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="alert">
                        <MessageCircle size={18} />
                        <span>{business.suppressed ? 'A abordagem está bloqueada por pedido de não contacto.' : 'Sem telefone disponível. Prepare o texto e confirme outro canal de contacto com a empresa.'}</span>
                      </div>
                    )}
                    {selectedLead && <button className="text-button" disabled={busy} onClick={() => run(async () => { await api('leads/' + selectedLead.id, { method: 'PATCH', body: JSON.stringify({ stage: 'Contactado' }) }); notify('Contacto confirmado por si. Etapa actualizada.'); })}><CheckCheck size={16} /> Já realizei o contacto · Marcar como Contactado</button>}
                  </section>
                  <aside className="message-preview">
                    <div className="preview-title"><span>PRÉ-VISUALIZAÇÃO</span><Pill>Rascunho</Pill></div>
                    <div className="phone-frame">
                      <div className="phone-contact"><span className="business-icon"><Building2 size={20} /></span><div><b>{business.name}</b><small>Pré-visualização da mensagem</small></div></div>
                      <div className="phone-body">
                        <span className="phone-day">RASCUNHO · NÃO ENVIADO</span>
                        <div className="message-bubble">{draft || 'A sua próxima conversa começa com uma mensagem relevante.'}<small>Pré-visualização</small></div>
                      </div>
                      <div className="phone-bottom"><span>A mensagem será enviada por si</span><Send size={17} /></div>
                    </div>
                    <div className="preview-tip"><ShieldCheck size={20} /><p>Não presuma as necessidades. Uma pergunta honesta abre mais espaço para conversar.</p></div>
                  </aside>
                </div>
              }
              {job && ['queued', 'running'].includes(job.status) && (
                <div className="job-bar"><LoaderCircle className="spin" size={18} /><span>Análise em curso. O crédito está reservado.</span>
                  <button onClick={() => run(async () => { const j = await post<Job>('jobs/' + job.id + '/cancel'); setJob(j); await refreshUser(); })}>Cancelar tarefa</button>
                </div>
              )}
            </>
          )}

          {/* ══ VIEW: Conta ══════════════════════════════ */}
          {user.profile.onboarded && view === 'account' && (
            <>
              <div className="page-heading">
                <div><div className="eyebrow"><Settings2 size={14} /> À SUA MEDIDA</div><h1>O seu espaço, as suas escolhas.</h1><p>Perfil comercial, utilização e controlo dos seus dados.</p></div>
              </div>
              <div className="detail-grid">
                <section className="panel content"><h2>Perfil comercial</h2><p className="muted">A base para mensagens mais relevantes.</p><ProfileForm user={user} profile={profile || user.profile} busy={busy} onSubmit={saveProfile} /></section>
                <div>
                  <section className="account-credit">
                    <Sparkles size={25} /><span>CRÉDITOS DISPONÍVEIS</span><strong>{user.credits.available}</strong>
                    <p>{user.credits.reserved} reservados · {user.credits.spent} utilizados</p>
                    <div><Check size={15} /> 1 análise com mensagem = 1 crédito</div>
                    <div><Check size={15} /> Editar e reabrir são gratuitos</div>
                    <p className="micro">Piloto gratuito. Sem renovação ou cobrança automática.</p>
                  </section>
                  <section className="panel content">
                    <h3>Os seus dados estão sob o seu controlo.</h3>
                    <p className="muted">Exporte o seu trabalho ou peça a eliminação da conta.</p>
                    <div className="actions">
                      <button className="button outline compact" onClick={() => requestPrivacy('export')} disabled={busy}><Download size={15} /> Exportar dados</button>
                      <button className="text-button danger-text" onClick={() => requestPrivacy('delete')} disabled={busy}>Pedir eliminação</button>
                    </div>
                    {requests.map(r => (
                      <div className="privacy-row" key={r.id}>
                        <span>{r.type === 'export' ? 'Exportação' : 'Eliminação'} · {r.status === 'ready' ? 'Pronta' : r.status === 'pending' ? 'Pendente' : r.status}</span>
                        {r.type === 'export' && <a href={'/api/privacy/' + r.id + '/export'} download>Descarregar <Download size={13} /></a>}
                      </div>
                    ))}
                  </section>
                </div>
              </div>
              <section className="panel">
                <div className="panel-heading"><h2>Histórico de utilização</h2><Wallet size={19} /></div>
                <div className="ledger">
                  {usage.map(e => (
                    <div key={e.id}>
                      <span className={cls('ledger-icon', e.kind === 'grant' && 'positive')}>{e.kind === 'grant' ? <Plus size={17} /> : <ArrowDownLeft size={17} />}</span>
                      <span><b>{e.description}</b><small>{date(e.createdAt)}</small></span>
                      <strong>{e.kind === 'grant' ? '+' : e.kind === 'consume' ? '-' : ''}{e.units} <small>crédito{e.units !== 1 ? 's' : ''}</small></strong>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ══ VIEW: Admin ══════════════════════════════ */}
          {user.profile.onboarded && view === 'admin' && user.role === 'admin' && (
            <>
              <div className="page-heading">
                <div><div className="eyebrow"><ShieldCheck size={14} /> ADMINISTRAÇÃO DO PILOTO</div><h1>Qualidade antes de quantidade.</h1><p>Importações autorizadas, operações e pedidos de dados.</p></div>
                <Pill tone="amber">Administrador</Pill>
              </div>
              <div className="detail-grid">
                <section className="panel content">
                  <h2>Importar empresas por CSV</h2><p className="muted">Até 500 linhas. Colunas: name, category, province, locality, sourceId, phone, website, countryCode.</p>
                  <form onSubmit={e => { e.preventDefault(); const form = new FormData(e.currentTarget); run(async () => { const r = await post<{ imported: number }>('admin/import', { csv: form.get('csv'), source: form.get('source'), authorized: form.get('authorized') === 'on' }); notify(`${r.imported} empresas importadas.`); }); }}>
                    <label>Origem dos dados<input name="source" required minLength={3} placeholder="Nome da fonte autorizada" /></label>
                    <label>Conteúdo CSV<textarea name="csv" rows={7} required placeholder={'name,category,province,locality,sourceId,phone,website,countryCode\nEmpresa Exemplo,Restauração,Sofala,Beira,ref-01,,,MZ'} /></label>
                    <label className="checkbox"><input name="authorized" type="checkbox" required /> Confirmo ter autorização de uso e armazenamento destes dados.</label>
                    <button className="button" disabled={busy}><Database size={16} /> Validar e importar</button>
                  </form>
                </section>
                <section className="panel content">
                  <h2>Atribuir créditos do piloto</h2>
                  <form onSubmit={e => { e.preventDefault(); const form = new FormData(e.currentTarget); run(async () => { await post('admin/grant', { workspaceId: form.get('workspaceId'), units: Number(form.get('units')), reason: form.get('reason') }); await refreshUser(); notify('Créditos atribuídos e registados.'); }); }}>
                    <label>Espaço de trabalho<select name="workspaceId">{admin?.workspaces.map(w => <option key={w.id} value={w.id}>{w.name} · {w.email}</option>)}</select></label>
                    <label>Quantidade<input name="units" type="number" min={1} max={10000} defaultValue={10} required /></label>
                    <label>Motivo<input name="reason" required minLength={3} placeholder="Ex.: extensão do piloto" /></label>
                    <button className="button outline" disabled={busy}><Plus size={16} /> Atribuir créditos</button>
                  </form>
                </section>
              </div>
              <section className="panel content"><h2>Tarefas de análise</h2>{admin?.jobs.length ? <div className="admin-rows">{admin.jobs.map(j => <div key={j.id}><code>{j.id.slice(0, 8)}</code><Pill tone={j.status === 'failed' ? 'red' : 'blue'}>{j.status}</Pill><span>{j.attempts} tentativa(s)</span><small>{j.error || '—'}</small></div>)}</div> : <p className="muted">Nenhuma tarefa de análise criada.</p>}<p className="micro">Após falha definitiva, a reserva é libertada.</p></section>
              <section className="panel content"><h2>Pedidos de privacidade</h2>{admin?.requests.length ? admin.requests.map(r => (<div className="privacy-row" key={r.id}><span>{r.type} · {r.status} · {r.id.slice(0, 8)}</span><button className="button outline compact" disabled={busy} onClick={() => { if (window.confirm(r.type === 'delete' ? 'Eliminar definitivamente?' : 'Concluir este pedido?')) run(async () => { await post('admin/privacy/' + r.id + '/complete'); const remaining = await refreshUser(); if (remaining) setAdmin(await api<AdminData>('admin')); notify('Pedido processado.'); }); }}>Processar</button></div>)) : <p className="muted">Sem pedidos registados.</p>}</section>
              <section className="panel content"><h2>Correcções de informação</h2>{admin?.corrections.length ? admin.corrections.map(c => (<div className="privacy-row" key={c.id}><span>{c.note} · {c.status}</span>{c.status === 'pending' && <button className="button outline compact" onClick={() => run(async () => { await post('admin/corrections/' + c.id + '/complete'); setAdmin(await api<AdminData>('admin')); notify('Correcção marcada como revista.'); })}>Marcar como revista</button>}</div>)) : <p className="muted">Sem correcções pendentes.</p>}</section>
            </>
          )}

          <footer className="workspace-footer">
            <span><Radar size={14} /> Prospecta · O próximo passo é seu.</span>
            <span>Feito para Moçambique <span className="country-dot" /></span>
          </footer>
        </main>
      </div>

      {/* ══ LEAD DRAWER ══════════════════════════════════ */}
      {view === 'leads' && selectedLead && (
        <div className="modal-backdrop drawer-backdrop" onClick={() => setSelectedLead(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="lead-title" className="lead-drawer" onClick={e => e.stopPropagation()}>
            <div className="row"><Pill>OPORTUNIDADE</Pill><IconButton label="Fechar oportunidade" onClick={() => setSelectedLead(null)}><X size={20} /></IconButton></div>
            <h2 id="lead-title">{selectedLead.business.name}</h2>
            <p className="muted">{selectedLead.business.locality} · {selectedLead.business.province}</p>
            <form onSubmit={updateLead}>
              <label>Etapa<select name="stage" defaultValue={selectedLead.stage}>{STAGES.map(s => <option key={s}>{s}</option>)}</select></label>
              <label>Próximo passo<input name="nextAction" defaultValue={selectedLead.nextAction} placeholder="Ex.: apresentar proposta comercial" /></label>
              <div className="two-fields">
                <label>Data de seguimento<input name="due" type="date" defaultValue={selectedLead.nextActionAt?.slice(0, 10) || ''} /></label>
                <label>Valor proposto (MT)<input name="amount" type="number" min={0} step="0.01" defaultValue={selectedLead.amountMinor !== null ? selectedLead.amountMinor / 100 : ''} /></label>
              </div>
              <label>Notas<textarea name="note" rows={4} defaultValue={selectedLead.note} placeholder="O que é importante para esta conversa?" /></label>
              <button className="button full" disabled={busy}><Check size={16} /> Guardar alterações</button>
            </form>
            <button className="button outline full" onClick={() => run(async () => { await loadBusiness(selectedLead.businessId, 'business', selectedLead.business); })}>Ver ficha da empresa <ArrowRight size={16} /></button>
            <h3>Histórico</h3>
            <div className="activity-list">{selectedLead.activities.map(a => <div key={a.id}><span className="activity-dot" /><div><p>{a.note}</p><small>{date(a.createdAt)}</small></div></div>)}</div>
          </section>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────
function ProfileForm({ user, profile, busy, onSubmit }: { user: User; profile: Profile; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="profile-form" key={user.id}>
      <div className="two-fields">
        <label>O seu nome<input name="name" defaultValue={user.name} required minLength={2} /></label>
        <label>Serviço principal<select name="service" defaultValue={profile.service}>{SERVICES.map(s => <option key={s}>{s}</option>)}</select></label>
      </div>
      <label>Como apresenta o seu trabalho?<textarea name="pitch" defaultValue={profile.pitch} maxLength={1000} rows={3} placeholder="Ajudo pequenos negócios a…" /></label>
      <div className="two-fields">
        <label>Localização de base<select name="province" defaultValue={profile.province}><option value="">Seleccionar província</option>{PROVINCES.map(p => <option key={p}>{p}</option>)}</select></label>
        <label>Contacto profissional (opcional)<input name="phone" type="tel" defaultValue={profile.phone} placeholder="+258 …" /></label>
      </div>
      <label className="checkbox"><input name="nationwide" type="checkbox" defaultChecked={profile.nationwide} /> Presto serviços em todo Moçambique.</label>
      <p className="micro">A sua localização não limita as zonas onde pode pesquisar empresas.</p>
      <button className="button" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Guardar perfil</button>
    </form>
  );
}

function formatPhone(p: string | null) {
  if (!p) return null;
  const digits = p.replace(/\D/g, '');
  if (digits.startsWith('258')) {
    const local = digits.slice(3);
    if (local.length >= 8) return `+258 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  }
  return p;
}

function getPhoneBadgeLabel(phone: string): string {
  const formatted = formatPhone(phone) || phone;
  if (isMozambiqueLandline(phone)) {
    return `${formatted} (Fixo)`;
  }
  if (isMozambiqueMobile(phone)) {
    return `${formatted} (WhatsApp)`;
  }
  return formatted;
}

function BusinessCard({ business: b, busy, onView, onSave, onUpdatePhone }: { business: Business; busy: boolean; onView: () => void; onSave: () => void; onUpdatePhone?: (phone: string) => void }) {
  return (
    <article className="business-card">
      <div className="row">
        <span className="business-icon"><Building2 size={23} /></span>
        <div className="card-tags">
          <Pill tone="blue">Fonte autorizada</Pill>
          <IconButton label={b.saved ? 'Empresa guardada' : 'Guardar ' + b.name} onClick={onSave}>{b.saved ? <Bookmark fill="currentColor" size={18} /> : <Bookmark size={18} />}</IconButton>
        </div>
      </div>
      <span className="business-category">{b.category}</span>
      <h3><button onClick={onView}>{b.name}</button></h3>
      <p className="location"><MapPin size={14} />{b.locality}, {b.province}</p>
      <div className="business-facts">
        {!b.phone ? (
          <button
            type="button"
            className="fact-pill fact-phone-none"
            style={{ cursor: 'pointer', background: 'rgba(239, 68, 68, 0.12)', border: '1px dashed rgba(239, 68, 68, 0.45)', color: '#fca5a5' }}
            title="Encontrou o número no Google Maps? Clique para registar."
            onClick={(e) => {
              e.stopPropagation();
              const phoneInput = window.prompt(`Inserir número do Google Maps para "${b.name}" (ex: 84 123 4567):`);
              if (phoneInput && onUpdatePhone) {
                onUpdatePhone(phoneInput);
              }
            }}
          >
            <Phone size={13} /> + Inserir contacto
          </button>
        ) : (
          <span className="fact-pill fact-phone"><Phone size={13} /><b>{getPhoneBadgeLabel(b.phone)}</b></span>
        )}
        <span className={cls('fact-pill', b.website ? 'fact-web' : 'fact-web-none')}><Globe2 size={13} />{b.website ? 'Com website' : 'Sem website'}</span>
        {b.instagram && <span className="fact-pill fact-ig"><Sparkles size={13} /><b>{b.instagram}</b></span>}
      </div>
      <div className="business-source"><Database size={13} /><span>{b.source}<small>Actualizado a {date(b.observedAt)}</small></span></div>
      <div className="card-actions-wrapper">
        <button className="card-action" onClick={onView} disabled={busy}>Ver empresa e possibilidades <ArrowUpRight size={17} /></button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, width: '100%' }}>
          <a
            href={getGoogleMapsUrl(b.name, b.locality, b.province)}
            target="_blank"
            rel="noopener noreferrer"
            className="card-map-action"
            title="Pesquisar esta empresa no Google Maps"
            onClick={e => e.stopPropagation()}
            style={{ margin: 0, justifyContent: 'center' }}
          >
            <MapPin size={13} /> Maps <ExternalLink size={11} />
          </a>
          <a
            href={getMetaAdLibraryUrl(b.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="card-map-action"
            title="Verificar anúncios desta empresa na Biblioteca de Anúncios do Meta"
            onClick={e => e.stopPropagation()}
            style={{ margin: 0, justifyContent: 'center' }}
          >
            <Target size={13} /> Anúncios <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </article>
  );
}

function MozambiqueMap() {
  const [activeProvince, setActiveProvince] = useState<string | null>(null);

  const provinces = [
    // Região Norte
    { id: 'cd', name: 'Cabo Delgado', region: 'Norte', x: 236, y: 64 },
    { id: 'nia', name: 'Niassa', region: 'Norte', x: 160, y: 72 },
    { id: 'nam', name: 'Nampula', region: 'Norte', x: 228, y: 116 },
    // Região Centro
    { id: 'zam', name: 'Zambézia', region: 'Centro', x: 184, y: 156 },
    { id: 'tet', name: 'Tete', region: 'Centro', x: 88, y: 132 },
    { id: 'man', name: 'Manica', region: 'Centro', x: 104, y: 202 },
    { id: 'sof', name: 'Sofala', region: 'Centro', x: 136, y: 218 },
    // Região Sul
    { id: 'inh', name: 'Inhambane', region: 'Sul', x: 146, y: 288 },
    { id: 'gaz', name: 'Gaza', region: 'Sul', x: 98, y: 312 },
    { id: 'map', name: 'Maputo', region: 'Sul', x: 82, y: 348 },
  ];

  return (
    <div className="moz-map-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '290px', margin: '0 auto' }}>
      <svg
        viewBox="0 0 300 380"
        aria-label="Mapa Oficial e Autêntico de Moçambique com 10 províncias e 3 regiões"
        role="img"
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <defs>
          <linearGradient id="moz-surface-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EAF2FF" />
            <stop offset="45%" stopColor="#D5E6FE" />
            <stop offset="100%" stopColor="#BFD9FD" />
          </linearGradient>
          <filter id="moz-subtle-shadow" x="-6%" y="-6%" width="115%" height="115%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#1877F2" floodOpacity="0.16" />
          </filter>
        </defs>

        {/* Authentic Geographic Outline of Mozambique */}
        <path
          d="M 134 46
             C 155 38, 185 30, 225 27
             C 245 26, 258 27, 263 32
             C 266 42, 260 56, 262 76
             C 264 92, 270 102, 268 114
             C 265 125, 256 135, 250 142
             C 240 152, 225 160, 209 165
             C 195 170, 186 174, 181 177
             C 174 182, 171 187, 170 192
             C 158 202, 142 208, 134 217
             C 132 228, 138 235, 143 241
             C 147 248, 148 255, 145 262
             C 146 275, 152 288, 150 301
             C 148 310, 140 315, 132 318
             C 124 321, 114 322, 107 324
             C 98 328, 90 334, 84 342
             C 80 348, 86 356, 91 361
             C 85 363, 76 362, 72 360
             C 68 354, 69 346, 70 344
             C 71 339, 69 332, 68 320
             C 67 308, 66 295, 66 285
             C 63 278, 56 272, 55 270
             C 62 255, 75 238, 88 221
             C 87 210, 86 202, 86 198
             C 84 180, 83 162, 82 148
             C 65 142, 45 136, 30 130
             C 32 118, 48 112, 59 107
             C 74 103, 85 101, 93 101
             C 105 108, 122 120, 132 138
             C 138 148, 142 155, 145 161
             C 148 152, 152 144, 157 138
             C 152 128, 155 116, 154 105
             C 148 95, 138 88, 134 87
             C 132 75, 133 62, 134 58
             Z"
          fill="url(#moz-surface-fill)"
          stroke="#1877F2"
          strokeWidth="1.8"
          strokeLinejoin="round"
          filter="url(#moz-subtle-shadow)"
        />

        {/* Lake Niassa Northwest Border Detail */}
        <path
          d="M 134 58 C 132 68, 133 78, 134 87 C 127 82, 124 74, 126 64 C 128 58, 131 56, 134 58 Z"
          fill="#FFFFFF"
          opacity="0.8"
        />

        {/* Zambezi River Channel */}
        <path
          d="M 30 130 Q 60 128, 93 132 T 136 170 T 170 192"
          fill="none"
          stroke="#1877F2"
          strokeWidth="1.2"
          strokeDasharray="2 2"
          opacity="0.45"
        />

        {/* Regional Boundaries: Norte/Centro and Centro/Sul */}
        <line x1="140" y1="130" x2="248" y2="140" stroke="#1877F2" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
        <line x1="86" y1="230" x2="145" y2="245" stroke="#1877F2" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />

        {/* Subtle Regional Typography Badges */}
        <text x="206" y="50" fill="#145DBF" fontSize="9" fontWeight="800" opacity="0.55" letterSpacing="1.2">NORTE</text>
        <text x="144" y="185" fill="#145DBF" fontSize="9" fontWeight="800" opacity="0.55" letterSpacing="1.2">CENTRO</text>
        <text x="96" y="270" fill="#145DBF" fontSize="9" fontWeight="800" opacity="0.55" letterSpacing="1.2">SUL</text>

        {/* 10 Real Provinces - Geographic Pins and High-Contrast Labels */}
        {provinces.map((p) => {
          const isHovered = activeProvince === p.id;
          return (
            <g
              key={p.id}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setActiveProvince(p.id)}
              onMouseLeave={() => setActiveProvince(null)}
            >
              <circle cx={p.x} cy={p.y} r={isHovered ? 11 : 6.5} fill="#1877F2" opacity={isHovered ? 0.3 : 0.14} />
              <circle cx={p.x} cy={p.y} r={isHovered ? 4.5 : 3.2} fill="#1877F2" stroke="#FFFFFF" strokeWidth={1.6} />
              <text
                x={p.x + (p.x > 180 ? -7 : 7)}
                y={p.y + 3}
                textAnchor={p.x > 180 ? 'end' : 'start'}
                fill="#142638"
                fontSize={isHovered ? '9.5' : '8'}
                fontWeight={isHovered ? '800' : '650'}
                style={{ pointerEvents: 'none', transition: 'all 0.15s ease' }}
              >
                {p.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

