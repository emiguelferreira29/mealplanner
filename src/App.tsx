import { useState, useEffect } from 'react';
import {
  ChefHat, ShoppingCart, Users, Wallet, Sparkles, Check,
  Utensils, AlertCircle, CalendarDays, Sunset, PartyPopper,
  Bookmark, Trash2, ArrowLeft, LogOut, Shield, UserPlus, Lock, User
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
  // Estados de Autenticação
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('jantar_auth_token'));
  const [utilizador, setUtilizador] = useState<Utilizador | null>(null);
  const [aValidarSessao, setAValidarSessao] = useState<boolean>(Boolean(localStorage.getItem('jantar_auth_token')));
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErro, setLoginErro] = useState('');
  const [aEntrar, setAEntrar] = useState(false);

  // Estados da Aplicação
  const [activeTab, setActiveTab] = useState('hoje');
  const [pessoas, setPessoas] = useState(4);
  const [orcamento, setOrcamento] = useState(80);
  const [eletrodomesticos, setEletrodomesticos] = useState(['Fogão / Placa', 'Forno']);
  const [preferencia, setPreferencia] = useState('');

  const [plano, setPlano] = useState<any>(null);
  const [ingredientesComprados, setIngredientesComprados] = useState<Record<string, boolean>>({});
  const [aCarregar, setACarregar] = useState(false);
  const [erro, setErro] = useState('');

  // Estados para Receitas Guardadas (Cloudflare D1)
  const [planosGuardados, setPlanosGuardados] = useState<PlanoGuardado[]>([]);
  const [aCarregarGuardadas, setACarregarGuardadas] = useState(false);
  const [planoGuardadoAtivoId, setPlanoGuardadoAtivoId] = useState<string | null>(null);
  const [receitasGuardadasMap, setReceitasGuardadasMap] = useState<Record<number, string>>({});

  // Estados de Administração (Utilizadores)
  const [listaUtilizadores, setListaUtilizadores] = useState<Utilizador[]>([]);
  const [novoUsername, setNovoUsername] = useState('');
  const [novaPassword, setNovaPassword] = useState('');
  const [novoRole, setNovoRole] = useState<'user' | 'admin'>('user');
  const [adminMensagem, setAdminMensagem] = useState('');
  const [adminErro, setAdminErro] = useState('');
  const [aCriarUtilizador, setACriarUtilizador] = useState(false);

  // Carregar preferências locais de eletrodomésticos/pessoas
  useEffect(() => {
    const guardados = localStorage.getItem('app_jantar_config_mobile');
    if (guardados) {
      try {
        const dados = JSON.parse(guardados);
        setPessoas(dados.pessoas || 4);
        setOrcamento(dados.orcamento || 80);
        setEletrodomesticos(dados.eletrodomesticos || ['Fogão / Placa']);
      } catch {
        // Ignora erro de parse
      }
    }
  }, []);

  // Validar sessão e carregar receitas do utilizador ao abrir
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

        if (!res.ok) {
          terminarSessao();
          return;
        }

        const data = await res.json();
        setUtilizador(data.user);
        await carregarReceitasNuvem(token);

        if (data.user?.role === 'admin') {
          await carregarUtilizadores(token);
        }
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
    if (!response.ok) {
      throw new Error(data.error || `Erro HTTP ${response.status}`);
    }
    return data;
  };

  const fazerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErro('');
    setAEntrar(true);

    try {
      const data = await apiFetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });

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
    setActiveTab('hoje');
  };

  const carregarReceitasNuvem = async (customToken?: string) => {
    setACarregarGuardadas(true);
    try {
      const data = await apiFetch('/api/recipes', {}, customToken);
      setPlanosGuardados(data.recipes || []);
    } catch (err) {
      console.error('Erro ao carregar receitas:', err);
    } finally {
      setACarregarGuardadas(false);
    }
  };

  const carregarUtilizadores = async (customToken?: string) => {
    try {
      const data = await apiFetch('/api/users', {}, customToken);
      setListaUtilizadores(data.users || []);
    } catch (err) {
      console.error('Erro ao carregar utilizadores:', err);
    }
  };

  const criarNovoUtilizador = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminErro('');
    setAdminMensagem('');
    setACriarUtilizador(true);

    try {
      await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          username: novoUsername,
          password: novaPassword,
          role: novoRole
        })
      });

      setAdminMensagem(`Conta "${novoUsername.trim()}" criada com sucesso!`);
      setNovoUsername('');
      setNovaPassword('');
      setNovoRole('user');
      await carregarUtilizadores();
    } catch (err: any) {
      setAdminErro(err.message || 'Não foi possível criar o utilizador.');
    } finally {
      setACriarUtilizador(false);
    }
  };

  const apagarUtilizador = async (id: string, nome: string) => {
    if (!window.confirm(`Tens a certeza que queres apagar a conta "${nome}" e todas as receitas guardadas por este utilizador?`)) {
      return;
    }

    setAdminErro('');
    setAdminMensagem('');
    try {
      await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
      setListaUtilizadores((prev) => prev.filter((u) => u.id !== id));
      setAdminMensagem(`Utilizador "${nome}" removido.`);
    } catch (err: any) {
      setAdminErro(err.message || 'Erro ao apagar utilizador.');
    }
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

    if (tabId === 'guardadas') {
      carregarReceitasNuvem();
    } else if (tabId === 'admin') {
      carregarUtilizadores();
    }
  };

  const toggleEletrodomestico = (item: string) => {
    const novaLista = eletrodomesticos.includes(item)
      ? eletrodomesticos.filter((i) => i !== item)
      : [...eletrodomesticos, item];
    setEletrodomesticos(novaLista);
    guardarConfiguracoes({ eletrodomesticos: novaLista });
  };

  const gerarPlano = async () => {
    setACarregar(true);
    setErro('');
    setPlano(null);
    setPlanoGuardadoAtivoId(null);
    setReceitasGuardadasMap({});
    setIngredientesComprados({});

    try {
      let instrucoesRefeicao = '';
      let instrucoesOrcamento = '';
      let totalReceitas = 1;

      if (activeTab === 'hoje') {
        instrucoesRefeicao = 'UMA ÚNICA receita de jantar muito rápida e prática para desenrascar hoje.';
        instrucoesOrcamento = 'Económica, ingredientes comuns, sem limite rígido.';
        totalReceitas = 1;
      } else if (activeTab === 'semana') {
        instrucoesRefeicao = 'CINCO receitas práticas e variadas para Segunda a Sexta-feira.';
        instrucoesOrcamento = `OBRIGATÓRIO: O custo total das 5 refeições não pode ultrapassar ${orcamento}€.`;
        totalReceitas = 5;
      } else if (activeTab === 'fim_de_semana') {
        instrucoesRefeicao =
          "UMA ÚNICA receita especial de fim de semana ('fim de semana mood'), mais elaborada, reconfortante e saborosa para cozinhar sem pressas. NÃO cries 3 receitas nem um plano para vários dias — devolve apenas 1 receita.";
        instrucoesOrcamento =
          'Sem limite rígido de orçamento. Foca-te no sabor, conforto e numa experiência gastronómica de fim de semana.';
        totalReceitas = 1;
      } else if (activeTab === 'convidados') {
        instrucoesRefeicao = 'UMA ÚNICA receita SOFISTICADA para impressionar convidados.';
        instrucoesOrcamento = `Orçamento máximo para este jantar: ${orcamento}€. Boa apresentação.`;
        totalReceitas = 1;
      }

      const prompt = `
        És um chef de cozinha português prático e criativo. Responde sempre em português de Portugal.
        Cria ${instrucoesRefeicao}
        - Para: ${pessoas} pessoas.
        - Regras de dinheiro: ${instrucoesOrcamento}
        - Eletrodomésticos: ${eletrodomesticos.join(', ')}.
        - Preferência: ${preferencia || 'Nenhuma'}.
        - IMPORTANTE: O array "receitas" tem de conter exatamente ${totalReceitas} receita(s).

        Responde APENAS com um objeto JSON válido com esta estrutura exata:
        {
          "mensagemChef": "Frase animadora.",
          "dicaSupermercado": "Onde compensa comprar os ingredientes principais.",
          "custoTotalEstimado": 45.50,
          "receitas": [
            {
              "contextoDia": "Ex: Segunda-feira ou Especial Fim de Semana",
              "nome": "Nome do Prato",
              "tempo": "30 min",
              "custoDaReceita": 8.50,
              "ingredientes": [{ "item": "500g de frango", "precoEstimado": 3.50 }],
              "passos": ["Passo 1...", "Passo 2..."]
            }
          ]
        }
      `;

      const data = await apiFetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt })
      });

      setPlano(data.plano);
    } catch (err: any) {
      console.error(err);
      setErro(`Erro do Chef IA: ${err.message || 'Falha na comunicação. Tente novamente.'}`);
    } finally {
      setACarregar(false);
    }
  };

  const guardarReceitaIndividual = async (receita: any, indexReceita: number) => {
    if (!plano || receitasGuardadasMap[indexReceita] || planoGuardadoAtivoId) return;

    const novoId = `${Date.now()}_${indexReceita}`;
    const dataFormatada = new Date().toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const menuAtual = MENUS_APP.find((m) => m.id === activeTab);

    const ingredientesDestaReceita: Record<string, boolean> = {};
    (receita.ingredientes || []).forEach((_: any, idx: number) => {
      if (ingredientesComprados[`rec${indexReceita}_ing${idx}`]) {
        ingredientesDestaReceita[`rec0_ing${idx}`] = true;
      }
    });

    const planoIndividual = {
      mensagemChef: plano.mensagemChef,
      dicaSupermercado: plano.dicaSupermercado,
      custoTotalEstimado: Number(receita.custoDaReceita || 0),
      receitas: [receita]
    };

    const novoRegisto: PlanoGuardado = {
      id: novoId,
      data: dataFormatada,
      categoria: menuAtual?.label || 'Receita',
      pessoas,
      plano: planoIndividual,
      ingredientesComprados: ingredientesDestaReceita
    };

    // Marca imediatamente na interface e grava na base de dados D1
    setReceitasGuardadasMap((prev) => ({ ...prev, [indexReceita]: novoId }));
    setPlanosGuardados((prev) => [novoRegisto, ...prev]);

    try {
      await apiFetch('/api/recipes', {
        method: 'POST',
        body: JSON.stringify(novoRegisto)
      });
    } catch (err: any) {
      setErro(`Erro ao guardar receita na nuvem: ${err.message}`);
      setReceitasGuardadasMap((prev) => {
        const copia = { ...prev };
        delete copia[indexReceita];
        return copia;
      });
      setPlanosGuardados((prev) => prev.filter((item) => item.id !== novoId));
    }
  };

  const abrirReceitaGuardada = (item: PlanoGuardado) => {
    setPlano(item.plano);
    setIngredientesComprados(item.ingredientesComprados || {});
    setPlanoGuardadoAtivoId(item.id);
    setReceitasGuardadasMap({});
    setErro('');
  };

  const apagarReceitaGuardada = async (id: string) => {
    const backup = [...planosGuardados];
    setPlanosGuardados((prev) => prev.filter((item) => item.id !== id));

    if (planoGuardadoAtivoId === id) {
      setPlano(null);
      setPlanoGuardadoAtivoId(null);
    }

    try {
      await apiFetch(`/api/recipes/${id}`, { method: 'DELETE' });
    } catch (err: any) {
      setPlanosGuardados(backup);
      setErro(`Erro ao apagar receita: ${err.message}`);
    }
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

        if (planoGuardadoAtivoId) {
          payloadParaServidor = novosComprados;
          return { ...item, ingredientesComprados: novosComprados };
        }

        const chaveNormalizada = `rec0_ing${idxIngrediente}`;
        payloadParaServidor = {
          ...item.ingredientesComprados,
          [chaveNormalizada]: novosComprados[idUnico]
        };
        return { ...item, ingredientesComprados: payloadParaServidor };
      });

      setPlanosGuardados(listaAtualizada);

      try {
        await apiFetch(`/api/recipes/${idGuardado}`, {
          method: 'PATCH',
          body: JSON.stringify({ ingredientesComprados: payloadParaServidor })
        });
      } catch (err) {
        console.error('Erro ao sincronizar ingrediente:', err);
      }
    }
  };

  // Ecrã de carregamento inicial
  if (aValidarSessao) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#111827', margin: '-8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '14px', backgroundColor: '#374151', borderRadius: '50%', color: '#fbbf24', marginBottom: '12px' }}>
            <ChefHat size={34} />
          </div>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: '14px' }}>A verificar sessão...</p>
        </div>
      </div>
    );
  }

  // Ecrã de Login (quando não há utilizador autenticado)
  if (!utilizador) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#111827', margin: '-8px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', color: '#f9fafb' }}>
        <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#1f2937', padding: '28px 22px', borderRadius: '20px', border: '1px solid #374151', boxShadow: '0 10px 25px rgba(0,0,0,0.4)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'inline-flex', padding: '12px', backgroundColor: '#374151', borderRadius: '50%', color: '#fbbf24', marginBottom: '10px' }}>
              <ChefHat size={32} />
            </div>
            <h1 style={{ margin: '0 0 6px 0', fontSize: '21px' }}>Ferreira? O que vai ser a Janta?</h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>Inicia sessão para aceder às receitas</p>
          </div>

          <form onSubmit={fazerLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#d1d5db' }}>
                <User size={15} color="#fbbf24" /> Utilizador
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="Ex: admin"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', fontSize: '15px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#d1d5db' }}>
                <Lock size={15} color="#fbbf24" /> Palavra-passe
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', fontSize: '15px', boxSizing: 'border-box' }}
              />
            </div>

            {loginErro && (
              <div style={{ padding: '10px 12px', backgroundColor: '#7f1d1d', color: '#fca5a5', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} /> <span>{loginErro}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={aEntrar}
              style={{ width: '100%', marginTop: '6px', padding: '14px', backgroundColor: aEntrar ? '#4b5563' : '#d97706', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: aEntrar ? 'not-allowed' : 'pointer' }}
            >
              {aEntrar ? 'A entrar...' : 'Entrar'}
            </button>
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
        
        {/* Barra Superior de Sessão */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12px', color: '#9ca3af' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Olá, <strong style={{ color: '#f9fafb' }}>{utilizador.username}</strong></span>
            {utilizador.role === 'admin' && (
              <span style={{ backgroundColor: '#78350f', color: '#fbbf24', padding: '2px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: '700' }}>
                ADMIN
              </span>
            )}
          </div>
          <button
            onClick={terminarSessao}
            style={{ background: 'none', border: '1px solid #374151', color: '#d1d5db', borderRadius: '8px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <LogOut size={13} /> Sair
          </button>
        </div>

        {/* Cabeçalho */}
        <header style={{ textAlign: 'center', marginBottom: '20px', paddingTop: '6px' }}>
          <div style={{ display: 'inline-flex', padding: '10px', backgroundColor: '#374151', borderRadius: '50%', color: '#fbbf24', marginBottom: '8px' }}>
            <ChefHat size={28} />
          </div>
          <h1 style={{ margin: '0', fontSize: '22px' }}>Ferreira? O que vai ser a Janta?</h1>
        </header>

        {/* Navegação Mobile (Grelha 2x2 + Guardadas + Admin) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '24px' }}>
          {MENUS_APP.map((menu) => {
            const isActive = activeTab === menu.id;
            return (
              <button
                key={menu.id}
                onClick={() => mudarTab(menu.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '12px 8px', borderRadius: '12px', border: 'none',
                  backgroundColor: isActive ? '#d97706' : '#1f2937',
                  color: isActive ? '#fff' : '#9ca3af',
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: isActive ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' : 'none'
                }}
              >
                <menu.icon size={20} />
                <span style={{ fontSize: '13px', fontWeight: isActive ? '600' : '500' }}>{menu.label}</span>
              </button>
            );
          })}

          <button
            onClick={() => mudarTab('guardadas')}
            style={{
              gridColumn: utilizador.role === 'admin' ? 'auto' : '1 / -1',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '12px', borderRadius: '12px',
              border: activeTab === 'guardadas' ? '1px solid #f59e0b' : '1px solid #374151',
              backgroundColor: activeTab === 'guardadas' ? '#d97706' : '#1f2937',
              color: activeTab === 'guardadas' ? '#fff' : '#e5e7eb',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <Bookmark size={18} />
            <span style={{ fontSize: '13px', fontWeight: '600' }}>
              Guardadas ({planosGuardados.length})
            </span>
          </button>

          {utilizador.role === 'admin' && (
            <button
              onClick={() => mudarTab('admin')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '12px', borderRadius: '12px',
                border: activeTab === 'admin' ? '1px solid #f59e0b' : '1px solid #374151',
                backgroundColor: activeTab === 'admin' ? '#d97706' : '#1f2937',
                color: activeTab === 'admin' ? '#fff' : '#fbbf24',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <Shield size={18} />
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Utilizadores</span>
            </button>
          )}
        </div>

        {/* Painel de Gestão de Utilizadores (Apenas Admin) */}
        {activeTab === 'admin' && utilizador.role === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#1f2937', padding: '16px', borderRadius: '16px', border: '1px solid #374151' }}>
              <h2 style={{ margin: '0 0 14px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24' }}>
                <UserPlus size={18} /> Criar Novo Acesso
              </h2>

              <form onSubmit={criarNovoUtilizador} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#d1d5db', marginBottom: '4px' }}>Nome de utilizador</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: joao"
                      value={novoUsername}
                      onChange={(e) => setNovoUsername(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#d1d5db', marginBottom: '4px' }}>Palavra-passe</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: janta2026"
                      value={novaPassword}
                      onChange={(e) => setNovaPassword(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#d1d5db', marginBottom: '4px' }}>Tipo de conta</label>
                  <select
                    value={novoRole}
                    onChange={(e) => setNovoRole(e.target.value as 'user' | 'admin')}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="user">Utilizador Normal (gera e guarda as suas receitas)</option>
                    <option value="admin">Administrador (pode gerir utilizadores)</option>
                  </select>
                </div>

                {adminErro && (
                  <div style={{ padding: '10px', backgroundColor: '#7f1d1d', color: '#fca5a5', borderRadius: '8px', fontSize: '13px' }}>
                    {adminErro}
                  </div>
                )}

                {adminMensagem && (
                  <div style={{ padding: '10px', backgroundColor: '#064e3b', color: '#a7f3d0', borderRadius: '8px', fontSize: '13px' }}>
                    {adminMensagem}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={aCriarUtilizador}
                  style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {aCriarUtilizador ? 'A criar...' : 'Criar Conta'}
                </button>
              </form>
            </div>

            {/* Lista de Utilizadores Registados */}
            <div style={{ backgroundColor: '#1f2937', padding: '16px', borderRadius: '16px', border: '1px solid #374151' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#f3f4f6' }}>
                Utilizadores Registados ({listaUtilizadores.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {listaUtilizadores.map((u) => (
                  <div
                    key={u.id}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#111827', borderRadius: '10px', border: '1px solid #374151' }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#f9fafb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {u.username}
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '5px', backgroundColor: u.role === 'admin' ? '#78350f' : '#374151', color: u.role === 'admin' ? '#fbbf24' : '#9ca3af' }}>
                          {u.role === 'admin' ? 'ADMIN' : 'UTILIZADOR'}
                        </span>
                      </div>
                    </div>

                    {u.id !== utilizador.id && (
                      <button
                        onClick={() => apagarUtilizador(u.id, u.username)}
                        title="Remover utilizador"
                        style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #4b5563', backgroundColor: '#374151', color: '#fca5a5', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Vista de Receitas Guardadas (Sincronizadas na Nuvem por Utilizador) */}
        {activeTab === 'guardadas' && !plano && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {aCarregarGuardadas ? (
              <div style={{ backgroundColor: '#1f2937', padding: '24px', borderRadius: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                A carregar receitas guardadas...
              </div>
            ) : planosGuardados.length === 0 ? (
              <div style={{ backgroundColor: '#1f2937', padding: '28px 16px', borderRadius: '16px', textAlign: 'center', color: '#9ca3af' }}>
                <Bookmark size={32} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
                <p style={{ margin: '0', fontSize: '14px' }}>Ainda não tens receitas guardadas na tua conta.</p>
                <p style={{ margin: '6px 0 0 0', fontSize: '12px' }}>Gera uma sugestão e clica em "Guardar Receita" para a abrir no computador ou telemóvel.</p>
              </div>
            ) : (
              planosGuardados.map((item) => {
                const tituloPrincipal = item.plano.receitas?.[0]?.nome || 'Receita Guardada';
                const extraReceitas = item.plano.receitas?.length > 1 ? ` (+${item.plano.receitas.length - 1})` : '';

                return (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '14px',
                      padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px'
                    }}
                  >
                    <div
                      onClick={() => abrirReceitaGuardada(item)}
                      style={{ flex: 1, cursor: 'pointer' }}
                    >
                      <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '600', marginBottom: '4px' }}>
                        {item.categoria} • {item.data}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#f9fafb', marginBottom: '4px' }}>
                        {tituloPrincipal}{extraReceitas}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        👥 {item.pessoas} pessoas • 💰 {Number(item.plano.custoTotalEstimado || 0).toFixed(2)}€
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => abrirReceitaGuardada(item)}
                        style={{
                          padding: '8px 12px', borderRadius: '8px', border: 'none',
                          backgroundColor: '#d97706', color: 'white', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
                        }}
                      >
                        Abrir
                      </button>
                      <button
                        onClick={() => apagarReceitaGuardada(item.id)}
                        title="Apagar"
                        style={{
                          padding: '8px', borderRadius: '8px', border: '1px solid #4b5563',
                          backgroundColor: '#374151', color: '#fca5a5', cursor: 'pointer', display: 'flex', alignItems: 'center'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Área de Configuração */}
        {activeTab !== 'guardadas' && activeTab !== 'admin' && (
          <div style={{ backgroundColor: '#1f2937', padding: '16px', borderRadius: '16px', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#d1d5db' }}>
                  <Users size={16} color="#fbbf24" /> Pessoas
                </label>
                <input type="number" min="1" value={pessoas} onChange={(e) => { setPessoas(Number(e.target.value)); guardarConfiguracoes({ pessoas: Number(e.target.value) }); }}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', fontSize: '16px', boxSizing: 'border-box' }} />
              </div>

              {precisaOrcamento && (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#d1d5db' }}>
                    <Wallet size={16} color="#34d399" /> Orçamento (€)
                  </label>
                  <input type="number" min="5" step="5" value={orcamento} onChange={(e) => { setOrcamento(Number(e.target.value)); guardarConfiguracoes({ orcamento: Number(e.target.value) }); }}
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', fontSize: '16px', boxSizing: 'border-box' }} />
                </div>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#d1d5db' }}>Eletrodomésticos:</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {ELETRODOMESTICOS_LISTA.map((item) => {
                  const ativo = eletrodomesticos.includes(item);
                  return (
                    <button key={item} onClick={() => toggleEletrodomestico(item)}
                      style={{
                        padding: '8px 12px', borderRadius: '20px', fontSize: '12px',
                        border: ativo ? '1px solid #f59e0b' : '1px solid #4b5563',
                        backgroundColor: ativo ? '#d97706' : '#374151', color: ativo ? 'white' : '#9ca3af',
                        fontWeight: ativo ? '600' : '400'
                      }}
                    >
                      {ativo ? '✓ ' : '+ '}{item}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#d1d5db' }}>Preferências (Opcional):</label>
              <input type="text" placeholder="Ex: Quero gastar o bacalhau..." value={preferencia} onChange={(e) => setPreferencia(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>

            <button onClick={gerarPlano} disabled={aCarregar}
              style={{ width: '100%', padding: '16px', backgroundColor: aCarregar ? '#4b5563' : '#d97706', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: aCarregar ? 'not-allowed' : 'pointer' }}>
              <Sparkles size={20} /> {aCarregar ? 'A cozinhar ideias...' : `Gerar ${menuAtivoInfo?.label}`}
            </button>
          </div>
        )}

        {erro && (
          <div style={{ padding: '12px', backgroundColor: '#7f1d1d', color: '#fca5a5', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} /> <span>{erro}</span>
          </div>
        )}

        {/* Resultados */}
        {plano && activeTab !== 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {activeTab === 'guardadas' && (
              <div>
                <button
                  onClick={() => { setPlano(null); setPlanoGuardadoAtivoId(null); }}
                  style={{
                    padding: '10px 14px', borderRadius: '12px', border: '1px solid #4b5563',
                    backgroundColor: '#1f2937', color: '#f9fafb', fontSize: '14px', fontWeight: '600',
                    display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={18} /> Voltar às receitas guardadas
                </button>
              </div>
            )}

            {/* Mensagem do Chef */}
            <div style={{ backgroundColor: 'rgba(6, 78, 59, 0.3)', border: '1px solid #047857', padding: '16px', borderRadius: '12px', color: '#a7f3d0' }}>
              <p style={{ margin: '0 0 10px 0', fontStyle: 'italic', fontSize: '14px' }}>"{plano.mensagemChef}"</p>
              
              {(precisaOrcamento || activeTab === 'guardadas') && (
                <div style={{ display: 'inline-block', backgroundColor: '#047857', padding: '4px 10px', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                  Custo Est.: {Number(plano.custoTotalEstimado || 0).toFixed(2)}€
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '13px' }}>
                <ShoppingCart size={16} style={{ marginTop: '2px', flexShrink: 0 }}/> {plano.dicaSupermercado}
              </div>
            </div>

            {/* Cartões das Receitas */}
            {plano.receitas.map((receita: any, indexReceita: number) => {
              const jaGuardada = Boolean(planoGuardadoAtivoId || receitasGuardadasMap[indexReceita]);

              return (
                <div key={indexReceita} style={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '16px', overflow: 'hidden' }}>
                  
                  <div style={{ backgroundColor: '#111827', padding: '16px', borderBottom: '1px solid #374151' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#f59e0b', fontWeight: 'bold' }}>
                        {receita.contextoDia}
                      </span>

                      <button
                        onClick={() => guardarReceitaIndividual(receita, indexReceita)}
                        disabled={jaGuardada}
                        style={{
                          padding: '6px 12px', borderRadius: '8px', border: 'none',
                          backgroundColor: jaGuardada ? '#065f46' : '#2563eb',
                          color: 'white', fontSize: '12px', fontWeight: '600',
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          cursor: jaGuardada ? 'default' : 'pointer'
                        }}
                      >
                        {jaGuardada ? (
                          <>
                            <Check size={14} /> Guardada
                          </>
                        ) : (
                          <>
                            <Bookmark size={14} /> Guardar Receita
                          </>
                        )}
                      </button>
                    </div>

                    <h2 style={{ margin: '0 0 10px 0', fontSize: '20px', color: '#f9fafb', lineHeight: '1.2' }}>{receita.nome}</h2>
                    <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: '#9ca3af' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>⏱ {receita.tempo}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>💰 {Number(receita.custoDaReceita || 0).toFixed(2)}€</span>
                    </div>
                  </div>

                  <div style={{ padding: '16px' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', color: '#f3f4f6', margin: '0 0 12px 0' }}>
                      <ShoppingCart size={16} color="#fbbf24" /> Ingredientes
                    </h3>
                    <ul style={{ listStyle: 'none', padding: '0', margin: '0 0 20px 0' }}>
                      {receita.ingredientes.map((ing: any, idx: number) => {
                        const idUnico = `rec${indexReceita}_ing${idx}`;
                        const comprado = ingredientesComprados[idUnico];
                        return (
                          <li key={idx} onClick={() => toggleIngrediente(indexReceita, idx)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #374151', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: comprado ? '#6b7280' : '#d1d5db', textDecoration: comprado ? 'line-through' : 'none' }}>
                              <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: comprado ? 'none' : '2px solid #4b5563', backgroundColor: comprado ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                                {comprado && <Check size={14} />}
                              </div>
                              <span style={{ fontSize: '14px', lineHeight: '1.3' }}>{ing.item}</span>
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: comprado ? '#6b7280' : '#d1d5db' }}>{Number(ing.precoEstimado || 0).toFixed(2)}€</span>
                          </li>
                        );
                      })}
                    </ul>

                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', color: '#f3f4f6', margin: '0 0 12px 0' }}>
                      <Utensils size={16} color="#fbbf24" /> Preparação
                    </h3>
                    <ol style={{ paddingLeft: '18px', margin: '0', lineHeight: '1.6', color: '#d1d5db', fontSize: '14px' }}>
                      {receita.passos.map((passo: string, idx: number) => (
                        <li key={idx} style={{ marginBottom: '10px' }}>{passo}</li>
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