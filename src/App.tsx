import { useState, useEffect } from 'react';
import {
  ChefHat, ShoppingCart, Users, Wallet, Sparkles, Check,
  Utensils, AlertCircle, CalendarDays, Sunset, PartyPopper,
  Bookmark, Trash2, ArrowLeft, LogOut, Shield, UserPlus, Lock, User,
  MessageCircle, Image as ImageIcon, Loader2
} from 'lucide-react';

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'https://mealplanner-backend.e-miguel-ferreira29.workers.dev'
).replace(/\/$/, '');

const ELETRODOMESTICOS_LISTA = [
  'Fogão / Placa', 'Forno', 'Micro-ondas', 'Air Fryer',
  'Bimby / Robô', 'Varinha Mág.', 'Panela Pressão', 'Grelhador'
];

const MENUS_APP = [
  { id: 'hoje', icon: Utensils, label: 'Hoje (Rápido)' },
  { id: 'semana', icon: CalendarDays, label: 'Semana' },
  { id: 'fim_de_semana', icon: Sunset, label: 'Fim de Semana' },
  { id: 'convidados', icon: PartyPopper, label: 'Convidados' }
];

interface Utilizador {
  id: string;
  username: string;
  role: 'admin' | 'user';
  created_at?: string;
}

interface PlanoGuardado {
  id: string;
  data: string;
  categoria: string;
  pessoas: number;
  plano: any;
  ingredientesComprados: Record<string, boolean>;
}

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('jantar_auth_token'));
  const [utilizador, setUtilizador] = useState<Utilizador | null>(null);
  const [aValidarSessao, setAValidarSessao] = useState<boolean>(Boolean(localStorage.getItem('jantar_auth_token')));
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErro, setLoginErro] = useState('');
  const [aEntrar, setAEntrar] = useState(false);

  const [activeTab, setActiveTab] = useState('hoje');
  const [pessoas, setPessoas] = useState(4);
  const [orcamento, setOrcamento] = useState(80);
  const [eletrodomesticos, setEletrodomesticos] = useState(['Fogão / Placa', 'Forno']);
  const [preferencia, setPreferencia] = useState('');

  const [plano, setPlano] = useState<any>(null);
  const [ingredientesComprados, setIngredientesComprados] = useState<Record<string, boolean>>({});
  const [aCarregar, setACarregar] = useState(false);
  const [erro, setErro] = useState('');

  const [planosGuardados, setPlanosGuardados] = useState<PlanoGuardado[]>([]);
  const [aCarregarGuardadas, setACarregarGuardadas] = useState(false);
  const [planoGuardadoAtivoId, setPlanoGuardadoAtivoId] = useState<string | null>(null);
  const [receitasGuardadasMap, setReceitasGuardadasMap] = useState<Record<number, string>>({});

  const [listaUtilizadores, setListaUtilizadores] = useState<Utilizador[]>([]);
  const [novoUsername, setNovoUsername] = useState('');
  const [novaPassword, setNovaPassword] = useState('');
  const [novoRole, setNovoRole] = useState<'user' | 'admin'>('user');
  const [adminMensagem, setAdminMensagem] = useState('');
  const [adminErro, setAdminErro] = useState('');
  const [aCriarUtilizador, setACriarUtilizador] = useState(false);

  // Estados para Imagens Geradas por IA
  const [imagensGeradas, setImagensGeradas] = useState<Record<string, string>>({});
  const [aGerarImagem, setAGerarImagem] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const guardados = localStorage.getItem('app_jantar_config_mobile');
    if (guardados) {
      try {
        const dados = JSON.parse(guardados);
        setPessoas(dados.pessoas || 4);
        setOrcamento(dados.orcamento || 80);
        setEletrodomesticos(dados.eletrodomesticos || ['Fogão / Placa']);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setAValidarSessao(false);
      return;
    }
    const inicializarSessao = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) { terminarSessao(); return; }
        const data = await res.json();
        setUtilizador(data.user);
        await carregarReceitasNuvem(token);
        if (data.user?.role === 'admin') await carregarUtilizadores(token);
      } catch {
        setLoginErro('Não foi possível ligar ao servidor Cloudflare.');
      } finally {
        setAValidarSessao(false);
      }
    };
    inicializarSessao();
  }, [token]);

  const apiFetch = async (endpoint: string, options: RequestInit = {}, customToken?: string) => {
    const authToken = customToken || token;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(options.headers || {})
      }
    });
    if (response.status === 401 && endpoint !== '/api/login') {
      terminarSessao();
      throw new Error('Sessão expirada. Inicia sessão novamente.');
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Erro HTTP ${response.status}`);
    return data;
  };

  const fazerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErro('');
    setAEntrar(true);
    try {
      const data = await apiFetch('/api/login', { method: 'POST', body: JSON.stringify({ username: loginUsername, password: loginPassword }) });
      localStorage.setItem('jantar_auth_token', data.token);
      setToken(data.token);
      setUtilizador(data.user);
      setLoginUsername('');
      setLoginPassword('');
    } catch (err: any) {
      setLoginErro(err.message || 'Erro ao iniciar sessão.');
    } finally {
      setAEntrar(false);
    }
  };

  const terminarSessao = () => {
    localStorage.removeItem('jantar_auth_token');
    setToken(null);
    setUtilizador(null);
    setPlano(null);
    setPlanosGuardados([]);
    setListaUtilizadores([]);
    setPlanoGuardadoAtivoId(null);
    setReceitasGuardadasMap({});
    setImagensGeradas({});
    setActiveTab('hoje');
  };

  const carregarReceitasNuvem = async (customToken?: string) => {
    setACarregarGuardadas(true);
    try {
      const data = await apiFetch('/api/recipes', {}, customToken);
      setPlanosGuardados(data.recipes || []);
    } catch (err) {} finally { setACarregarGuardadas(false); }
  };

  const carregarUtilizadores = async (customToken?: string) => {
    try {
      const data = await apiFetch('/api/users', {}, customToken);
      setListaUtilizadores(data.users || []);
    } catch (err) {}
  };

  const criarNovoUtilizador = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminErro(''); setAdminMensagem(''); setACriarUtilizador(true);
    try {
      await apiFetch('/api/users', { method: 'POST', body: JSON.stringify({ username: novoUsername, password: novaPassword, role: novoRole }) });
      setAdminMensagem(`Conta "${novoUsername.trim()}" criada com sucesso!`);
      setNovoUsername(''); setNovaPassword(''); setNovoRole('user');
      await carregarUtilizadores();
    } catch (err: any) { setAdminErro(err.message || 'Erro ao criar utilizador.'); } finally { setACriarUtilizador(false); }
  };

  const apagarUtilizador = async (id: string, nome: string) => {
    if (!window.confirm(`Apagar a conta "${nome}" e as suas receitas?`)) return;
    setAdminErro(''); setAdminMensagem('');
    try {
      await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
      setListaUtilizadores((prev) => prev.filter((u) => u.id !== id));
      setAdminMensagem(`Utilizador "${nome}" removido.`);
    } catch (err: any) { setAdminErro(err.message || 'Erro ao apagar utilizador.'); }
  };

  const guardarConfiguracoes = (novosDados: any) => {
    const dadosAtuais = { pessoas, orcamento, eletrodomesticos, ...novosDados };
    localStorage.setItem('app_jantar_config_mobile', JSON.stringify(dadosAtuais));
  };

  const mudarTab = (tabId: string) => {
    setActiveTab(tabId);
    setPlano(null);
    setPlanoGuardadoAtivoId(null);
    setReceitasGuardadasMap({});
    setErro('');
    if (tabId === 'guardadas') carregarReceitasNuvem();
    else if (tabId === 'admin') carregarUtilizadores();
  };

  const toggleEletrodomestico = (item: string) => {
    const novaLista = eletrodomesticos.includes(item) ? eletrodomesticos.filter((i) => i !== item) : [...eletrodomesticos, item];
    setEletrodomesticos(novaLista);
    guardarConfiguracoes({ eletrodomesticos: novaLista });
  };

  const gerarPlano = async () => {
    setACarregar(true); setErro(''); setPlano(null); setPlanoGuardadoAtivoId(null);
    setReceitasGuardadasMap({}); setIngredientesComprados({}); setImagensGeradas({});
    try {
      let instrucoesRefeicao = ''; let instrucoesOrcamento = ''; let totalReceitas = 1;
      if (activeTab === 'hoje') {
        instrucoesRefeicao = 'UMA ÚNICA receita rápida para hoje.';
        instrucoesOrcamento = 'Económica, ingredientes comuns.';
        totalReceitas = 1;
      } else if (activeTab === 'semana') {
        instrucoesRefeicao = 'CINCO receitas para Segunda a Sexta-feira.';
        instrucoesOrcamento = `O custo total das 5 refeições não pode ultrapassar ${orcamento}€.`;
        totalReceitas = 5;
      } else if (activeTab === 'fim_de_semana') {
        instrucoesRefeicao = "UMA ÚNICA receita especial e elaborada ('fim de semana mood').";
        instrucoesOrcamento = 'Sem limite rígido de orçamento. Foca no sabor e conforto.';
        totalReceitas = 1;
      } else if (activeTab === 'convidados') {
        instrucoesRefeicao = 'UMA ÚNICA receita SOFISTICADA para convidados.';
        instrucoesOrcamento = `Orçamento máximo para este jantar: ${orcamento}€.`;
        totalReceitas = 1;
      }

      const prompt = `
        És um chef português prático. Cria ${instrucoesRefeicao}
        Para: ${pessoas} pessoas. Regras: ${instrucoesOrcamento}. Eletrodomésticos: ${eletrodomesticos.join(', ')}.
        Preferência: ${preferencia || 'Nenhuma'}. O array "receitas" tem de ter exatamente ${totalReceitas} receita(s).
        Responde APENAS JSON: {"mensagemChef": "...", "dicaSupermercado": "...", "custoTotalEstimado": 45.5, "receitas": [{"contextoDia": "...", "nome": "...", "tempo": "...", "custoDaReceita": 8.5, "ingredientes": [{"item": "...", "precoEstimado": 3.5}], "passos": ["..."]}]}
      `;
      const data = await apiFetch('/api/generate', { method: 'POST', body: JSON.stringify({ prompt }) });
      setPlano(data.plano);
    } catch (err: any) { setErro(`Erro: ${err.message}`); } finally { setACarregar(false); }
  };

  const guardarReceitaIndividual = async (receita: any, indexReceita: number) => {
    if (!plano || receitasGuardadasMap[indexReceita] || planoGuardadoAtivoId) return;
    const novoId = `${Date.now()}_${indexReceita}`;
    const dataFormatada = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const menuAtual = MENUS_APP.find((m) => m.id === activeTab);
    const ingredientesDestaReceita: Record<string, boolean> = {};
    (receita.ingredientes || []).forEach((_: any, idx: number) => {
      if (ingredientesComprados[`rec${indexReceita}_ing${idx}`]) ingredientesDestaReceita[`rec0_ing${idx}`] = true;
    });
    const planoIndividual = { mensagemChef: plano.mensagemChef, dicaSupermercado: plano.dicaSupermercado, custoTotalEstimado: Number(receita.custoDaReceita || 0), receitas: [receita] };
    const novoRegisto: PlanoGuardado = { id: novoId, data: dataFormatada, categoria: menuAtual?.label || 'Receita', pessoas, plano: planoIndividual, ingredientesComprados: ingredientesDestaReceita };
    setReceitasGuardadasMap((prev) => ({ ...prev, [indexReceita]: novoId }));
    setPlanosGuardados((prev) => [novoRegisto, ...prev]);
    try { await apiFetch('/api/recipes', { method: 'POST', body: JSON.stringify(novoRegisto) }); }
    catch (err: any) { setErro(`Erro a guardar: ${err.message}`); setReceitasGuardadasMap((prev) => { const copia = { ...prev }; delete copia[indexReceita]; return copia; }); setPlanosGuardados((prev) => prev.filter((item) => item.id !== novoId)); }
  };

  const abrirReceitaGuardada = (item: PlanoGuardado) => {
    setPlano(item.plano); setIngredientesComprados(item.ingredientesComprados || {});
    setPlanoGuardadoAtivoId(item.id); setReceitasGuardadasMap({}); setErro('');
  };

  const apagarReceitaGuardada = async (id: string) => {
    const backup = [...planosGuardados]; setPlanosGuardados((prev) => prev.filter((item) => item.id !== id));
    if (planoGuardadoAtivoId === id) { setPlano(null); setPlanoGuardadoAtivoId(null); }
    try { await apiFetch(`/api/recipes/${id}`, { method: 'DELETE' }); } catch (err: any) { setPlanosGuardados(backup); setErro(`Erro a apagar: ${err.message}`); }
  };

  const toggleIngrediente = async (indexReceita: number, idxIngrediente: number) => {
    const idUnico = `rec${indexReceita}_ing${idxIngrediente}`;
    const novosComprados = { ...ingredientesComprados, [idUnico]: !ingredientesComprados[idUnico] };
    setIngredientesComprados(novosComprados);
    const idGuardado = planoGuardadoAtivoId || receitasGuardadasMap[indexReceita];
    if (idGuardado) {
      let payloadParaServidor: Record<string, boolean> = {};
      const listaAtualizada = planosGuardados.map((item) => {
        if (item.id !== idGuardado) return item;
        if (planoGuardadoAtivoId) { payloadParaServidor = novosComprados; return { ...item, ingredientesComprados: novosComprados }; }
        const chaveNormalizada = `rec0_ing${idxIngrediente}`;
        payloadParaServidor = { ...item.ingredientesComprados, [chaveNormalizada]: novosComprados[idUnico] };
        return { ...item, ingredientesComprados: payloadParaServidor };
      });
      setPlanosGuardados(listaAtualizada);
      try { await apiFetch(`/api/recipes/${idGuardado}`, { method: 'PATCH', body: JSON.stringify({ ingredientesComprados: payloadParaServidor }) }); } catch (err) {}
    }
  };

  // Melhoria 1: Partilhar a Lista de Compras
  const partilharListaWhatsApp = (receita: any, indexReceita: number) => {
    const ingredientesEmFalta = receita.ingredientes.filter((ing: any, idx: number) => {
      const idUnico = `rec${indexReceita}_ing${idx}`;
      return !ingredientesComprados[idUnico];
    });

    if (ingredientesEmFalta.length === 0) {
      alert('Boa! Já tens todos os ingredientes marcados como comprados para esta receita.');
      return;
    }

    let texto = `🛒 *Lista de Compras: ${receita.nome}*\n\nFaltam comprar:\n`;
    ingredientesEmFalta.forEach((ing: any) => {
      texto += `• ${ing.item}\n`;
    });
    texto += `\n👨‍🍳 *Chef Ferreira*`;

    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  // Melhoria 2: Gerar Imagem do Prato com IA
  const gerarImagem = (nomePrato: string, indexReceita: number) => {
    const id = planoGuardadoAtivoId ? `${planoGuardadoAtivoId}_${indexReceita}` : `temp_${indexReceita}`;
    setAGerarImagem(prev => ({ ...prev, [id]: true }));

    const prompt = `A delicious plate of ${nomePrato}, traditional portuguese cuisine, professional food photography, 85mm lens, depth of field, appetizing lighting, ultra detailed, 4k`;
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;

    const img = new Image();
    img.onload = () => {
      setImagensGeradas(prev => ({ ...prev, [id]: url }));
      setAGerarImagem(prev => ({ ...prev, [id]: false }));
    };
    img.onerror = () => {
      setAGerarImagem(prev => ({ ...prev, [id]: false }));
      alert('Falha ao gerar imagem, a IA pode estar ocupada.');
    };
    img.src = url;
  };

  if (aValidarSessao) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#111827', margin: '-8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '14px', backgroundColor: '#374151', borderRadius: '50%', color: '#fbbf24', marginBottom: '12px' }}><ChefHat size={34} /></div>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: '14px' }}>A verificar sessão...</p>
        </div>
      </div>
    );
  }

  if (!utilizador) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#111827', margin: '-8px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', color: '#f9fafb' }}>
        <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#1f2937', padding: '28px 22px', borderRadius: '20px', border: '1px solid #374151', boxShadow: '0 10px 25px rgba(0,0,0,0.4)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'inline-flex', padding: '12px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '50%', color: '#fff', marginBottom: '10px', boxShadow: '0 4px 10px rgba(217, 119, 6, 0.4)' }}>
              <ChefHat size={32} />
            </div>
            <h1 style={{ margin: '0 0 6px 0', fontSize: '22px', background: 'linear-gradient(to right, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Ferreira? O que vai ser a Janta?</h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>Inicia sessão para aceder às receitas</p>
          </div>
          <form onSubmit={fazerLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#d1d5db' }}><User size={15} color="#fbbf24" /> Utilizador</label>
              <input type="text" required autoComplete="username" placeholder="Ex: admin" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', fontSize: '15px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#d1d5db' }}><Lock size={15} color="#fbbf24" /> Palavra-passe</label>
              <input type="password" required autoComplete="current-password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', fontSize: '15px', boxSizing: 'border-box' }} />
            </div>
            {loginErro && (
              <div style={{ padding: '10px 12px', backgroundColor: '#7f1d1d', color: '#fca5a5', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}><AlertCircle size={16} style={{ flexShrink: 0 }} /> <span>{loginErro}</span></div>
            )}
            <button type="submit" disabled={aEntrar} style={{ width: '100%', marginTop: '6px', padding: '14px', background: aEntrar ? '#4b5563' : 'linear-gradient(to right, #d97706, #b45309)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: aEntrar ? 'not-allowed' : 'pointer', boxShadow: '0 4px 6px -1px rgba(217, 119, 6, 0.3)' }}>{aEntrar ? 'A entrar...' : 'Entrar'}</button>
          </form>
        </div>
      </div>
    );
  }

  const precisaOrcamento = activeTab === 'semana' || activeTab === 'convidados';
  const menuAtivoInfo = MENUS_APP.find((m) => m.id === activeTab);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#111827', margin: '-8px', padding: '16px', fontFamily: 'system-ui, sans-serif', color: '#f9fafb' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '40px' }}>
        
        {/* Barra de Sessão */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '12px', color: '#9ca3af' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Olá, <strong style={{ color: '#f9fafb' }}>{utilizador.username}</strong></span>
            {utilizador.role === 'admin' && <span style={{ backgroundColor: '#78350f', color: '#fbbf24', padding: '2px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: '700' }}>ADMIN</span>}
          </div>
          <button onClick={terminarSessao} style={{ background: 'none', border: '1px solid #374151', color: '#d1d5db', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <LogOut size={13} /> Sair
          </button>
        </div>

        {/* Cabeçalho Melhorado */}
        <header style={{ textAlign: 'center', marginBottom: '24px', paddingTop: '6px' }}>
          <div style={{ display: 'inline-flex', padding: '12px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '50%', color: '#fff', marginBottom: '10px', boxShadow: '0 4px 10px rgba(217, 119, 6, 0.4)' }}>
            <ChefHat size={30} />
          </div>
          <h1 style={{ margin: '0', fontSize: '24px', fontWeight: '800', background: 'linear-gradient(to right, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Ferreira? O que vai ser a Janta?
          </h1>
        </header>

        {/* Navegação Mobile */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
          {MENUS_APP.map((menu) => {
            const isActive = activeTab === menu.id;
            return (
              <button key={menu.id} onClick={() => mudarTab(menu.id)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px 8px', borderRadius: '14px', border: '1px solid', borderColor: isActive ? '#f59e0b' : '#374151', background: isActive ? 'linear-gradient(135deg, #d97706, #b45309)' : '#1f2937', color: isActive ? '#fff' : '#9ca3af', cursor: 'pointer', transition: 'all 0.2s', boxShadow: isActive ? '0 4px 10px rgba(217, 119, 6, 0.3)' : 'none' }}>
                <menu.icon size={22} />
                <span style={{ fontSize: '13px', fontWeight: isActive ? '700' : '500' }}>{menu.label}</span>
              </button>
            );
          })}
          <button onClick={() => mudarTab('guardadas')}
            style={{ gridColumn: utilizador.role === 'admin' ? 'auto' : '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '14px', border: '1px solid', borderColor: activeTab === 'guardadas' ? '#f59e0b' : '#374151', background: activeTab === 'guardadas' ? 'linear-gradient(135deg, #d97706, #b45309)' : '#1f2937', color: activeTab === 'guardadas' ? '#fff' : '#e5e7eb', cursor: 'pointer', transition: 'all 0.2s', boxShadow: activeTab === 'guardadas' ? '0 4px 10px rgba(217, 119, 6, 0.3)' : 'none' }}>
            <Bookmark size={18} /> <span style={{ fontSize: '13px', fontWeight: '600' }}>Guardadas ({planosGuardados.length})</span>
          </button>
          {utilizador.role === 'admin' && (
            <button onClick={() => mudarTab('admin')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '14px', border: '1px solid', borderColor: activeTab === 'admin' ? '#f59e0b' : '#374151', background: activeTab === 'admin' ? 'linear-gradient(135deg, #d97706, #b45309)' : '#1f2937', color: activeTab === 'admin' ? '#fff' : '#fbbf24', cursor: 'pointer', transition: 'all 0.2s' }}>
              <Shield size={18} /> <span style={{ fontSize: '13px', fontWeight: '600' }}>Utilizadores</span>
            </button>
          )}
        </div>

        {/* Gestão Utilizadores */}
        {activeTab === 'admin' && utilizador.role === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#1f2937', padding: '20px', borderRadius: '16px', border: '1px solid #374151', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24' }}><UserPlus size={18} /> Criar Novo Acesso</h2>
              <form onSubmit={criarNovoUtilizador} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div><label style={{ display: 'block', fontSize: '12px', color: '#d1d5db', marginBottom: '4px' }}>Utilizador</label><input type="text" required value={novoUsername} onChange={(e) => setNovoUsername(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', fontSize: '14px', boxSizing: 'border-box' }} /></div>
                  <div><label style={{ display: 'block', fontSize: '12px', color: '#d1d5db', marginBottom: '4px' }}>Password</label><input type="text" required value={novaPassword} onChange={(e) => setNovaPassword(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', fontSize: '14px', boxSizing: 'border-box' }} /></div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#d1d5db', marginBottom: '4px' }}>Tipo de conta</label>
                  <select value={novoRole} onChange={(e) => setNovoRole(e.target.value as 'user' | 'admin')} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', fontSize: '14px', boxSizing: 'border-box' }}>
                    <option value="user">Utilizador Normal (gera/guarda receitas)</option>
                    <option value="admin">Administrador (gere utilizadores)</option>
                  </select>
                </div>
                {adminErro && <div style={{ padding: '10px', backgroundColor: '#7f1d1d', color: '#fca5a5', borderRadius: '8px', fontSize: '13px' }}>{adminErro}</div>}
                {adminMensagem && <div style={{ padding: '10px', backgroundColor: '#064e3b', color: '#a7f3d0', borderRadius: '8px', fontSize: '13px' }}>{adminMensagem}</div>}
                <button type="submit" disabled={aCriarUtilizador} style={{ width: '100%', padding: '12px', background: 'linear-gradient(to right, #2563eb, #1d4ed8)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>{aCriarUtilizador ? 'A criar...' : 'Criar Conta'}</button>
              </form>
            </div>
            <div style={{ backgroundColor: '#1f2937', padding: '20px', borderRadius: '16px', border: '1px solid #374151', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#f3f4f6' }}>Utilizadores ({listaUtilizadores.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {listaUtilizadores.map((u) => (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#111827', borderRadius: '10px', border: '1px solid #374151' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#f9fafb', display: 'flex', alignItems: 'center', gap: '8px' }}>{u.username} <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '5px', backgroundColor: u.role === 'admin' ? '#78350f' : '#374151', color: u.role === 'admin' ? '#fbbf24' : '#9ca3af' }}>{u.role === 'admin' ? 'ADMIN' : 'USER'}</span></div>
                    {u.id !== utilizador.id && <button onClick={() => apagarUtilizador(u.id, u.username)} style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #4b5563', backgroundColor: '#374151', color: '#fca5a5', cursor: 'pointer' }}><Trash2 size={15} /></button>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Vista Guardadas */}
        {activeTab === 'guardadas' && !plano && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {aCarregarGuardadas ? (
              <div style={{ backgroundColor: '#1f2937', padding: '24px', borderRadius: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>A carregar receitas...</div>
            ) : planosGuardados.length === 0 ? (
              <div style={{ backgroundColor: '#1f2937', padding: '32px 16px', borderRadius: '16px', textAlign: 'center', color: '#9ca3af', border: '1px solid #374151' }}>
                <Bookmark size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                <p style={{ margin: '0', fontSize: '15px' }}>Sem receitas guardadas.</p>
              </div>
            ) : (
              planosGuardados.map((item) => {
                const tituloPrincipal = item.plano.receitas?.[0]?.nome || 'Receita';
                return (
                  <div key={item.id} style={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '16px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <div onClick={() => abrirReceitaGuardada(item)} style={{ flex: 1, cursor: 'pointer' }}>
                      <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '700', marginBottom: '6px' }}>{item.categoria} • {item.data}</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#f9fafb', marginBottom: '6px' }}>{tituloPrincipal}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>👥 {item.pessoas} px • 💰 {Number(item.plano.custoTotalEstimado || 0).toFixed(2)}€</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button onClick={() => abrirReceitaGuardada(item)} style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Abrir</button>
                      <button onClick={() => apagarReceitaGuardada(item.id)} style={{ padding: '8px', borderRadius: '10px', border: '1px solid #4b5563', backgroundColor: '#374151', color: '#fca5a5', cursor: 'pointer' }}><Trash2 size={18} /></button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Gerador */}
        {activeTab !== 'guardadas' && activeTab !== 'admin' && (
          <div style={{ backgroundColor: '#1f2937', padding: '20px', borderRadius: '20px', marginBottom: '24px', border: '1px solid #374151', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#d1d5db' }}><Users size={16} color="#fbbf24" /> Pessoas</label>
                <input type="number" min="1" value={pessoas} onChange={(e) => { setPessoas(Number(e.target.value)); guardarConfiguracoes({ pessoas: Number(e.target.value) }); }} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', fontSize: '16px', boxSizing: 'border-box' }} />
              </div>
              {precisaOrcamento && (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#d1d5db' }}><Wallet size={16} color="#34d399" /> Orçamento (€)</label>
                  <input type="number" min="5" step="5" value={orcamento} onChange={(e) => { setOrcamento(Number(e.target.value)); guardarConfiguracoes({ orcamento: Number(e.target.value) }); }} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', fontSize: '16px', boxSizing: 'border-box' }} />
                </div>
              )}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#d1d5db' }}>Eletrodomésticos:</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {ELETRODOMESTICOS_LISTA.map((item) => {
                  const ativo = eletrodomesticos.includes(item);
                  return (
                    <button key={item} onClick={() => toggleEletrodomestico(item)} style={{ padding: '8px 14px', borderRadius: '20px', fontSize: '12px', border: ativo ? '1px solid #f59e0b' : '1px solid #4b5563', background: ativo ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#374151', color: ativo ? 'white' : '#9ca3af', fontWeight: ativo ? '600' : '500', boxShadow: ativo ? '0 2px 4px rgba(217, 119, 6, 0.3)' : 'none' }}>
                      {ativo ? '✓ ' : '+ '}{item}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#d1d5db' }}>Preferências (Opcional):</label>
              <input type="text" placeholder="Ex: Quero gastar o bacalhau..." value={preferencia} onChange={(e) => setPreferencia(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <button onClick={gerarPlano} disabled={aCarregar} style={{ width: '100%', padding: '16px', background: aCarregar ? '#4b5563' : 'linear-gradient(to right, #d97706, #b45309)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: aCarregar ? 'not-allowed' : 'pointer', boxShadow: aCarregar ? 'none' : '0 4px 10px rgba(217, 119, 6, 0.3)' }}>
              <Sparkles size={20} /> {aCarregar ? 'O Chef está a cozinhar ideias...' : `Gerar ${menuAtivoInfo?.label}`}
            </button>
          </div>
        )}

        {erro && (
          <div style={{ padding: '14px', backgroundColor: '#7f1d1d', color: '#fca5a5', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', border: '1px solid #b91c1c' }}><AlertCircle size={20} style={{ flexShrink: 0 }} /> <span>{erro}</span></div>
        )}

        {/* Resultados das Receitas */}
        {plano && activeTab !== 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {activeTab === 'guardadas' && (
              <div>
                <button onClick={() => { setPlano(null); setPlanoGuardadoAtivoId(null); }} style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid #4b5563', backgroundColor: '#1f2937', color: '#f9fafb', fontSize: '14px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <ArrowLeft size={18} /> Voltar às guardadas
                </button>
              </div>
            )}

            <div style={{ background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.4), rgba(4, 120, 87, 0.2))', border: '1px solid #047857', padding: '18px', borderRadius: '16px', color: '#a7f3d0' }}>
              <p style={{ margin: '0 0 12px 0', fontStyle: 'italic', fontSize: '15px' }}>"{plano.mensagemChef}"</p>
              {(precisaOrcamento || activeTab === 'guardadas') && (
                <div style={{ display: 'inline-block', backgroundColor: '#047857', padding: '6px 12px', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: '700', marginBottom: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                  Custo Estimado: {Number(plano.custoTotalEstimado || 0).toFixed(2)}€
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', lineHeight: '1.4' }}>
                <ShoppingCart size={18} style={{ marginTop: '2px', flexShrink: 0, color: '#fbbf24' }}/> {plano.dicaSupermercado}
              </div>
            </div>

            {plano.receitas.map((receita: any, indexReceita: number) => {
              const jaGuardada = Boolean(planoGuardadoAtivoId || receitasGuardadasMap[indexReceita]);
              const idImg = planoGuardadoAtivoId ? `${planoGuardadoAtivoId}_${indexReceita}` : `temp_${indexReceita}`;
              const imagemGerada = imagensGeradas[idImg];
              const gerando = aGerarImagem[idImg];

              return (
                <div key={indexReceita} style={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)' }}>
                  
                  {/* Zona da Imagem (Topo do Cartão) */}
                  {imagemGerada && (
                    <div style={{ width: '100%', height: '240px', backgroundImage: `url(${imagemGerada})`, backgroundSize: 'cover', backgroundPosition: 'center', borderBottom: '1px solid #374151' }} />
                  )}

                  <div style={{ backgroundColor: '#111827', padding: '20px', borderBottom: '1px solid #374151' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '12px', textTransform: 'uppercase', color: '#f59e0b', fontWeight: '800', letterSpacing: '0.5px' }}>{receita.contextoDia}</span>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {!imagemGerada && (
                          <button onClick={() => gerarImagem(receita.nome, indexReceita)} disabled={gerando} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #4f46e5', backgroundColor: gerando ? '#312e81' : '#4338ca', color: 'white', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: gerando ? 'wait' : 'pointer' }}>
                            {gerando ? <><Loader2 size={14} className="animate-spin" /> A Pintar...</> : <><ImageIcon size={14} /> Ver Prato</>}
                          </button>
                        )}
                        <button onClick={() => guardarReceitaIndividual(receita, indexReceita)} disabled={jaGuardada} style={{ padding: '8px 12px', borderRadius: '10px', border: 'none', background: jaGuardada ? '#065f46' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: jaGuardada ? 'default' : 'pointer' }}>
                          {jaGuardada ? <><Check size={14} /> Guardada</> : <><Bookmark size={14} /> Guardar</>}
                        </button>
                      </div>
                    </div>

                    <h2 style={{ margin: '0 0 12px 0', fontSize: '22px', color: '#f9fafb', lineHeight: '1.3', fontWeight: '700' }}>{receita.nome}</h2>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#9ca3af' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#374151', padding: '4px 10px', borderRadius: '8px' }}>⏱ {receita.tempo}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#374151', padding: '4px 10px', borderRadius: '8px', color: '#34d399', fontWeight: '600' }}>💰 {Number(receita.custoDaReceita || 0).toFixed(2)}€</span>
                    </div>
                  </div>

                  <div style={{ padding: '20px' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', color: '#f3f4f6', margin: '0 0 16px 0', fontWeight: '700' }}><ShoppingCart size={18} color="#fbbf24" /> Ingredientes</h3>
                    <ul style={{ listStyle: 'none', padding: '0', margin: '0 0 20px 0' }}>
                      {receita.ingredientes.map((ing: any, idx: number) => {
                        const idUnico = `rec${indexReceita}_ing${idx}`;
                        const comprado = ingredientesComprados[idUnico];
                        return (
                          <li key={idx} onClick={() => toggleIngrediente(indexReceita, idx)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #374151', cursor: 'pointer', transition: 'all 0.2s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: comprado ? '#6b7280' : '#d1d5db', textDecoration: comprado ? 'line-through' : 'none' }}>
                              <div style={{ width: '24px', height: '24px', borderRadius: '8px', border: comprado ? 'none' : '2px solid #4b5563', backgroundColor: comprado ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, transition: 'all 0.2s' }}>
                                {comprado && <Check size={16} />}
                              </div>
                              <span style={{ fontSize: '15px', lineHeight: '1.4' }}>{ing.item}</span>
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: comprado ? '#6b7280' : '#d1d5db' }}>{Number(ing.precoEstimado || 0).toFixed(2)}€</span>
                          </li>
                        );
                      })}
                    </ul>

                    {/* Botão de Envio para WhatsApp */}
                    <button onClick={() => partilharListaWhatsApp(receita, indexReceita)} style={{ width: '100%', marginBottom: '24px', padding: '12px', borderRadius: '12px', border: '1px solid #166534', backgroundColor: '#14532d', color: '#4ade80', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <MessageCircle size={18} /> Enviar p/ WhatsApp o que falta
                    </button>

                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', color: '#f3f4f6', margin: '0 0 16px 0', fontWeight: '700' }}><Utensils size={18} color="#fbbf24" /> Preparação</h3>
                    <ol style={{ paddingLeft: '20px', margin: '0', lineHeight: '1.7', color: '#d1d5db', fontSize: '15px' }}>
                      {receita.passos.map((passo: string, idx: number) => (
                        <li key={idx} style={{ marginBottom: '12px' }}>{passo}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}