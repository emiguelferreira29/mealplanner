import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChefHat, ShoppingCart, Users, Wallet, Sparkles, Check, Utensils, AlertCircle, CalendarDays, Sunset, PartyPopper } from 'lucide-react';

// Inicializa a IA usando a chave do ficheiro .env
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

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

  // Carregar dados guardados no telemóvel/computador
  useEffect(() => {
    const guardados = localStorage.getItem('app_jantar_config_mobile');
    if (guardados) {
      const dados = JSON.parse(guardados);
      setPessoas(dados.pessoas || 4);
      setOrcamento(dados.orcamento || 80);
      setEletrodomesticos(dados.eletrodomesticos || ['Fogão / Placa']);
      setActiveTab(dados.activeTab || 'hoje');
    }
  }, []);

  const guardarConfiguracoes = (novosDados: any) => {
    const dadosAtuais = { pessoas, orcamento, eletrodomesticos, activeTab, ...novosDados };
    localStorage.setItem('app_jantar_config_mobile', JSON.stringify(dadosAtuais));
  };

  const mudarTab = (tabId: string) => {
    setActiveTab(tabId);
    setPlano(null); 
    setErro('');
    guardarConfiguracoes({ activeTab: tabId });
  };

  const toggleEletrodomestico = (item: string) => {
    const novaLista = eletrodomesticos.includes(item)
      ? eletrodomesticos.filter((i) => i !== item)
      : [...eletrodomesticos, item];
    setEletrodomesticos(novaLista);
    guardarConfiguracoes({ eletrodomesticos: novaLista });
  };

  const gerarPlano = async () => {
    if (!import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY.includes('cole_aqui')) {
      setErro('Aviso: Chave API não detetada. Verifique o ficheiro .env');
      return;
    }

    setACarregar(true);
    setErro('');
    setPlano(null);
    setIngredientesComprados({});

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
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
        És um chef português. Cria ${instrucoesRefeicao}
        - Para: ${pessoas} pessoas.
        - Regras de dinheiro: ${instrucoesOrcamento}
        - Eletrodomésticos: ${eletrodomesticos.join(', ')}.
        - Preferência: ${preferencia || 'Nenhuma'}.

        Responde APENAS com um objeto JSON (sem formatação markdown) com esta estrutura exata:
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

      const result = await model.generateContent(prompt);
      const jsonLimpo = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      setPlano(JSON.parse(jsonLimpo));
    } catch (err: any) {
      console.error(err);
      setErro(`Falha na comunicação com o Chef IA. Tente novamente.`);
    } finally {
      setACarregar(false);
    }
  };

  const toggleIngrediente = (idUnico: string) => {
    setIngredientesComprados(prev => ({ ...prev, [idUnico]: !prev[idUnico] }));
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

        {/* Navegação Mobile (Grelha 2x2) */}
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
        </div>

        {/* Área de Configuração */}
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

        {erro && (
          <div style={{ padding: '12px', backgroundColor: '#7f1d1d', color: '#fca5a5', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <AlertCircle size={18} /> {erro}
          </div>
        )}

        {/* Resultados */}
        {plano && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Mensagem do Chef */}
            <div style={{ backgroundColor: 'rgba(6, 78, 59, 0.3)', border: '1px solid #047857', padding: '16px', borderRadius: '12px', color: '#a7f3d0' }}>
              <p style={{ margin: '0 0 10px 0', fontStyle: 'italic', fontSize: '14px' }}>"{plano.mensagemChef}"</p>
              
              {precisaOrcamento && (
                <div style={{ display: 'inline-block', backgroundColor: '#047857', padding: '4px 10px', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                  Custo Est.: {plano.custoTotalEstimado.toFixed(2)}€
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
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>💰 {receita.custoDaReceita.toFixed(2)}€</span>
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
                          <span style={{ fontSize: '13px', fontWeight: '600', color: comprado ? '#6b7280' : '#d1d5db' }}>{ing.precoEstimado.toFixed(2)}€</span>
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