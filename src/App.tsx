import { useState, useEffect } from 'react';
import {
  ChefHat, ShoppingCart, Users, Wallet, Sparkles, Check,
  Utensils, AlertCircle, CalendarDays, Sunset, PartyPopper,
  Bookmark, Trash2, ArrowLeft
} from 'lucide-react';

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

interface PlanoGuardado {
  id: string;
  data: string;
  categoria: string;
  pessoas: number;
  plano: any;
  ingredientesComprados: Record<string, boolean>;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('hoje');
  const [pessoas, setPessoas] = useState(4);
  const [orcamento, setOrcamento] = useState(80);
  const [eletrodomesticos, setEletrodomesticos] = useState(['Fogão / Placa', 'Forno']);
  const [preferencia, setPreferencia] = useState('');
  
  const [plano, setPlano] = useState<any>(null);
  const [ingredientesComprados, setIngredientesComprados] = useState<Record<string, boolean>>({});
  const [aCarregar, setACarregar] = useState(false);
  const [erro, setErro] = useState('');

  // Estados para receitas guardadas
  const [planosGuardados, setPlanosGuardados] = useState<PlanoGuardado[]>([]);
  const [planoGuardadoAtivoId, setPlanoGuardadoAtivoId] = useState<string | null>(null);

  useEffect(() => {
    const guardados = localStorage.getItem('app_jantar_config_mobile');
    if (guardados) {
      const dados = JSON.parse(guardados);
      setPessoas(dados.pessoas || 4);
      setOrcamento(dados.orcamento || 80);
      setEletrodomesticos(dados.eletrodomesticos || ['Fogão / Placa']);
      if (dados.activeTab && dados.activeTab !== 'guardadas') {
        setActiveTab(dados.activeTab);
      }
    }

    const receitasSalvas = localStorage.getItem('app_jantar_guardados');
    if (receitasSalvas) {
      try {
        setPlanosGuardados(JSON.parse(receitasSalvas));
      } catch (e) {
        console.error('Erro ao ler receitas guardadas:', e);
      }
    }
  }, []);

  const guardarConfiguracoes = (novosDados: any) => {
    const dadosAtuais = { pessoas, orcamento, eletrodomesticos, activeTab, ...novosDados };
    localStorage.setItem('app_jantar_config_mobile', JSON.stringify(dadosAtuais));
  };

  const atualizarStorageGuardados = (novaLista: PlanoGuardado[]) => {
    setPlanosGuardados(novaLista);
    localStorage.setItem('app_jantar_guardados', JSON.stringify(novaLista));
  };

  const mudarTab = (tabId: string) => {
    setActiveTab(tabId);
    setPlano(null);
    setPlanoGuardadoAtivoId(null);
    setErro('');
    if (tabId !== 'guardadas') {
      guardarConfiguracoes({ activeTab: tabId });
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
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();

    if (!apiKey || apiKey.includes('cole_aqui')) {
      setErro('Aviso: Chave API do Gemini não detetada. Verifique o ficheiro .env ou o Vercel.');
      return;
    }

    setACarregar(true);
    setErro('');
    setPlano(null);
    setPlanoGuardadoAtivoId(null);
    setIngredientesComprados({});

    try {
      // 1. Listar e ordenar todos os modelos Gemini ativos por prioridade
      let candidatosModelo = [
        'models/gemini-2.5-flash',
        'models/gemini-2.5-flash-lite',
        'models/gemini-2.0-flash'
      ];

      const modelsRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: { 'x-goog-api-key': apiKey }
      });

      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        const validModels = (modelsData.models || []).filter((m: any) => {
          const name = (m.name || '').toLowerCase();
          const methods = m.supportedGenerationMethods || [];
          return (
            methods.includes('generateContent') &&
            name.includes('gemini') &&
            !name.includes('embedding') &&
            !name.includes('vision') &&
            !name.includes('image') &&
            !name.includes('tts') &&
            !name.includes('audio') &&
            !name.includes('robotics') &&
            !name.includes('computer')
          );
        });

        if (validModels.length > 0) {
          const regrasPrioridade = [
            (n: string) => n.includes('2.5-flash') && !n.includes('lite') && !n.includes('preview'),
            (n: string) => n.includes('2.5-flash-lite'),
            (n: string) => n.includes('2.5-flash'),
            (n: string) => n.includes('2.0-flash'),
            (n: string) => n.includes('flash'),
            (n: string) => n.includes('pro')
          ];

          const ordenados: string[] = [];
          for (const regra of regrasPrioridade) {
            for (const m of validModels) {
              if (regra(m.name) && !ordenados.includes(m.name)) {
                ordenados.push(m.name);
              }
            }
          }
          for (const m of validModels) {
            if (!ordenados.includes(m.name)) {
              ordenados.push(m.name);
            }
          }

          candidatosModelo = ordenados;
        }
      } else if (modelsRes.status === 401 || modelsRes.status === 403) {
        const errData = await modelsRes.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Chave API rejeitada (${modelsRes.status}).`);
      }

      // 2. Preparar o pedido das receitas
      let instrucoesRefeicao = "";
      let instrucoesOrcamento = "";

      if (activeTab === 'hoje') {
        instrucoesRefeicao = "UMA receita de jantar muito rápida e prática para desenrascar hoje.";
        instrucoesOrcamento = "Económica, ingredientes comuns, sem limite rígido.";
      } else if (activeTab === 'semana') {
        instrucoesRefeicao = "CINCO receitas práticas para Segunda a Sexta-feira.";
        instrucoesOrcamento = `OBRIGATÓRIO: O custo total das 5 refeições não pode ultrapassar ${orcamento}€.`;
      } else if (activeTab === 'fim_de_semana') {
        instrucoesRefeicao = "TRÊS SUGESTÕES diferentes e elaboradas para escolher no fim de semana.";
        instrucoesOrcamento = "Sem limite de orçamento. Foca-te no sabor e experiência.";
      } else if (activeTab === 'convidados') {
        instrucoesRefeicao = "UMA receita SOFISTICADA para impressionar convidados.";
        instrucoesOrcamento = `Orçamento máximo para este jantar: ${orcamento}€. Boa apresentação.`;
      }

      const prompt = `
        És um chef de cozinha português prático e criativo. Responde sempre em português de Portugal.
        Cria ${instrucoesRefeicao}
        - Para: ${pessoas} pessoas.
        - Regras de dinheiro: ${instrucoesOrcamento}
        - Eletrodomésticos: ${eletrodomesticos.join(', ')}.
        - Preferência: ${preferencia || 'Nenhuma'}.

        Responde APENAS com um objeto JSON válido com esta estrutura exata:
        {
          "mensagemChef": "Frase animadora.",
          "dicaSupermercado": "Onde compensa comprar os ingredientes principais.",
          "custoTotalEstimado": 45.50,
          "receitas": [
            {
              "contextoDia": "Ex: Segunda-feira ou Sugestão 1",
              "nome": "Nome do Prato",
              "tempo": "30 min",
              "custoDaReceita": 8.50,
              "ingredientes": [{ "item": "500g de frango", "precoEstimado": 3.50 }],
              "passos": ["Passo 1...", "Passo 2..."]
            }
          ]
        }
      `;

      // 3. Tentar os modelos por ordem; se algum estiver sobrecarregado (503/429), passa ao próximo
      let data: any = null;
      let ultimoErro = '';

      for (const modeloPath of candidatosModelo) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${modeloPath}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.7
              }
            })
          }
        );

        if (response.ok) {
          data = await response.json();
          break;
        } else {
          const errorData = await response.json().catch(() => ({}));
          ultimoErro = errorData.error?.message || `Erro HTTP ${response.status}`;
          if (response.status === 400 || response.status === 401 || response.status === 403) {
            break;
          }
        }
      }

      if (!data) {
        throw new Error(ultimoErro || 'Todos os modelos Gemini estão temporariamente ocupados. Tenta novamente dentro de segundos.');
      }

      const conteudo = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!conteudo) {
        throw new Error('O Gemini devolveu uma resposta vazia. Tenta novamente.');
      }

      const jsonLimpo = conteudo.replace(/```json/g, '').replace(/```/g, '').trim();
      setPlano(JSON.parse(jsonLimpo));
    } catch (err: any) {
      console.error(err);
      setErro(`Erro do Chef IA: ${err.message || 'Falha na comunicação. Tente novamente.'}`);
    } finally {
      setACarregar(false);
    }
  };

  const guardarReceitaAtual = () => {
    if (!plano || planoGuardadoAtivoId) return;

    const novoId = Date.now().toString();
    const dataFormatada = new Date().toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const menuAtual = MENUS_APP.find(m => m.id === activeTab);

    const novoRegisto: PlanoGuardado = {
      id: novoId,
      data: dataFormatada,
      categoria: menuAtual?.label || 'Receita',
      pessoas,
      plano,
      ingredientesComprados
    };

    atualizarStorageGuardados([novoRegisto, ...planosGuardados]);
    setPlanoGuardadoAtivoId(novoId);
  };

  const abrirReceitaGuardada = (item: PlanoGuardado) => {
    setPlano(item.plano);
    setIngredientesComprados(item.ingredientesComprados || {});
    setPlanoGuardadoAtivoId(item.id);
    setErro('');
  };

  const apagarReceitaGuardada = (id: string) => {
    const filtrada = planosGuardados.filter(item => item.id !== id);
    atualizarStorageGuardados(filtrada);
    if (planoGuardadoAtivoId === id) {
      setPlano(null);
      setPlanoGuardadoAtivoId(null);
    }
  };

  const toggleIngrediente = (idUnico: string) => {
    const novosComprados = { ...ingredientesComprados, [idUnico]: !ingredientesComprados[idUnico] };
    setIngredientesComprados(novosComprados);

    if (planoGuardadoAtivoId) {
      const listaAtualizada = planosGuardados.map(item =>
        item.id === planoGuardadoAtivoId
          ? { ...item, ingredientesComprados: novosComprados }
          : item
      );
      atualizarStorageGuardados(listaAtualizada);
    }
  };

  const precisaOrcamento = activeTab === 'semana' || activeTab === 'convidados';
  const menuAtivoInfo = MENUS_APP.find(m => m.id === activeTab);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#111827', margin: '-8px', padding: '16px', fontFamily: 'system-ui, sans-serif', color: '#f9fafb' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '40px' }}>
        
        {/* Cabeçalho */}
        <header style={{ textAlign: 'center', marginBottom: '20px', paddingTop: '10px' }}>
          <div style={{ display: 'inline-flex', padding: '10px', backgroundColor: '#374151', borderRadius: '50%', color: '#fbbf24', marginBottom: '8px' }}>
            <ChefHat size={28} />
          </div>
          <h1 style={{ margin: '0', fontSize: '22px' }}>O Que Vai Ser o Jantar?</h1>
        </header>

        {/* Navegação Mobile (Grelha 2x2 + Botão Guardadas) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '24px' }}>
          {MENUS_APP.map(menu => {
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
              gridColumn: '1 / -1',
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
              Receitas Guardadas ({planosGuardados.length})
            </span>
          </button>
        </div>

        {/* Vista de Receitas Guardadas */}
        {activeTab === 'guardadas' && !plano && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {planosGuardados.length === 0 ? (
              <div style={{ backgroundColor: '#1f2937', padding: '28px 16px', borderRadius: '16px', textAlign: 'center', color: '#9ca3af' }}>
                <Bookmark size={32} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
                <p style={{ margin: '0', fontSize: '14px' }}>Ainda não tens receitas guardadas.</p>
                <p style={{ margin: '6px 0 0 0', fontSize: '12px' }}>Gera uma sugestão e clica em "Guardar Receita" para a consultar mais tarde.</p>
              </div>
            ) : (
              planosGuardados.map(item => {
                const tituloPrincipal = item.plano.receitas?.[0]?.nome || 'Plano de Refeições';
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
        {activeTab !== 'guardadas' && (
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
        {plano && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Barra de Ação: Voltar ou Guardar Receita */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {activeTab === 'guardadas' && (
                <button
                  onClick={() => { setPlano(null); setPlanoGuardadoAtivoId(null); }}
                  style={{
                    padding: '12px 14px', borderRadius: '12px', border: '1px solid #4b5563',
                    backgroundColor: '#1f2937', color: '#f9fafb', fontSize: '14px', fontWeight: '600',
                    display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={18} /> Voltar à lista
                </button>
              )}

              <button
                onClick={guardarReceitaAtual}
                disabled={Boolean(planoGuardadoAtivoId)}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: '12px', border: 'none',
                  backgroundColor: planoGuardadoAtivoId ? '#065f46' : '#2563eb',
                  color: 'white', fontSize: '14px', fontWeight: '700',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  cursor: planoGuardadoAtivoId ? 'default' : 'pointer'
                }}
              >
                {planoGuardadoAtivoId ? (
                  <>
                    <Check size={18} /> Receita Guardada (Lista atualiza automaticamente)
                  </>
                ) : (
                  <>
                    <Bookmark size={18} /> Guardar Receita e Lista de Compras
                  </>
                )}
              </button>
            </div>

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
            {plano.receitas.map((receita: any, indexReceita: number) => (
              <div key={indexReceita} style={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '16px', overflow: 'hidden' }}>
                
                <div style={{ backgroundColor: '#111827', padding: '16px', borderBottom: '1px solid #374151' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#f59e0b', marginBottom: '6px', fontWeight: 'bold' }}>
                    {receita.contextoDia}
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
                        <li key={idx} onClick={() => toggleIngrediente(idUnico)}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}