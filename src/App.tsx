import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  ChefHat,
  ShoppingCart,
  Users,
  Wallet,
  Sparkles,
  Check,
  Utensils,
  AlertCircle,
} from 'lucide-react';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const ELETRODOMESTICOS_LISTA = [
  'Fogão / Placa',
  'Forno',
  'Micro-ondas',
  'Air Fryer',
  'Bimby / Robô de Cozinha',
  'Varinha Mágica',
  'Panela de Pressão',
  'Grelhador Elétrico',
];

export default function App() {
  const [pessoas, setPessoas] = useState(4);
  const [orcamentoSemanal, setOrcamentoSemanal] = useState(80);
  const [eletrodomesticos, setEletrodomesticos] = useState([
    'Fogão / Placa',
    'Forno',
    'Air Fryer',
  ]);
  const [preferencia, setPreferencia] = useState('');

  const [receita, setReceita] = useState<any>(null);
  const [ingredientesComprados, setIngredientesComprados] = useState<
    Record<number, boolean>
  >({});
  const [aCarregar, setACarregar] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const guardados = localStorage.getItem('app_jantar_config');
    if (guardados) {
      const dados = JSON.parse(guardados);
      setPessoas(dados.pessoas || 4);
      setOrcamentoSemanal(dados.orcamentoSemanal || 80);
      setEletrodomesticos(dados.eletrodomesticos || ['Fogão / Placa']);
    }
  }, []);

  const toggleEletrodomestico = (item: string) => {
    const novaLista = eletrodomesticos.includes(item)
      ? eletrodomesticos.filter((i) => i !== item)
      : [...eletrodomesticos, item];

    setEletrodomesticos(novaLista);
    localStorage.setItem(
      'app_jantar_config',
      JSON.stringify({ pessoas, orcamentoSemanal, eletrodomesticos: novaLista })
    );
  };

  const gerarJantar = async () => {
    if (
      !import.meta.env.VITE_GEMINI_API_KEY ||
      import.meta.env.VITE_GEMINI_API_KEY.includes('cole_aqui')
    ) {
      setErro('Falta colocar a chave verdadeira no ficheiro .env!');
      return;
    }

    setACarregar(true);
    setErro('');
    setReceita(null);
    setIngredientesComprados({});

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const orcamentoPorRefeicao = (orcamentoSemanal / 7).toFixed(2);

      const prompt = `
        És um chef português especialista em poupança familiar. Cria UMA receita de jantar para ${pessoas} pessoas.
        Orçamento máximo aproximado para este jantar: ${orcamentoPorRefeicao}€ (baseado num orçamento semanal de ${orcamentoSemanal}€).
        Eletrodomésticos disponíveis em casa: ${eletrodomesticos.join(', ')}.
        Preferência: ${preferencia || 'Qualquer coisa saborosa e prática'}.

        Responde APENAS com um objeto JSON válido com esta estrutura exata:
        {
          "nome": "Nome do Prato",
          "tempo": "30 min",
          "custoTotalEstimado": 8.50,
          "dicaSupermercado": "Onde compensa comprar os ingredientes principais em Portugal e porquê.",
          "ingredientes": [
            { "item": "500g de peito de frango", "precoEstimado": 3.50, "ondeComprar": "Lidl" }
          ],
          "passos": [
            "Passo 1 detalhado...",
            "Passo 2 detalhado..."
          ]
        }
      `;

      const result = await model.generateContent(prompt);
      const jsonLimpo = result.response
        .text()
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      setReceita(JSON.parse(jsonLimpo));
    } catch (err) {
      console.error(err);
      setErro(
        'Ups! Houve um problema ao falar com o Chef IA. Verifica a tua chave API.'
      );
    } finally {
      setACarregar(false);
    }
  };

  const toggleIngrediente = (index: number) => {
    setIngredientesComprados((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#111827',
        margin: '-8px',
        padding: '28px 20px',
        fontFamily: 'system-ui, sans-serif',
        color: '#f9fafb',
      }}
    >
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Cabeçalho */}
        <header style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '12px',
              backgroundColor: '#374151',
              borderRadius: '50%',
              color: '#fbbf24',
              marginBottom: '10px',
            }}
          >
            <ChefHat size={32} />
          </div>
          <h1 style={{ margin: '0', fontSize: '24px', color: '#f9fafb' }}>
            O Que Vai Ser o Jantar?
          </h1>
          <p style={{ margin: '5px 0 0', color: '#9ca3af', fontSize: '14px' }}>
            Planeamento sem stress, adaptado à sua cozinha e carteira
          </p>
        </header>

        {/* Cartão de Configuração */}
        <div
          style={{
            backgroundColor: '#1f2937',
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid #374151',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px',
              marginBottom: '20px',
            }}
          >
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  marginBottom: '6px',
                  color: '#d1d5db',
                }}
              >
                <Users size={16} color="#fbbf24" /> Pessoas à mesa
              </label>
              <input
                type="number"
                min="1"
                max="15"
                value={pessoas}
                onChange={(e) => setPessoas(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #4b5563',
                  backgroundColor: '#374151',
                  color: 'white',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  marginBottom: '6px',
                  color: '#d1d5db',
                }}
              >
                <Wallet size={16} color="#34d399" /> Orç. Semanal (€)
              </label>
              <input
                type="number"
                min="10"
                step="5"
                value={orcamentoSemanal}
                onChange={(e) => setOrcamentoSemanal(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #4b5563',
                  backgroundColor: '#374151',
                  color: 'white',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#d1d5db',
              }}
            >
              O que tem na sua cozinha?
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {ELETRODOMESTICOS_LISTA.map((item) => {
                const ativo = eletrodomesticos.includes(item);
                return (
                  <button
                    key={item}
                    onClick={() => toggleEletrodomestico(item)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      border: ativo ? '1px solid #f59e0b' : '1px solid #4b5563',
                      backgroundColor: ativo ? '#d97706' : '#374151',
                      color: ativo ? 'white' : '#9ca3af',
                      cursor: 'pointer',
                      fontWeight: ativo ? '600' : '400',
                    }}
                  >
                    {ativo ? '✓ ' : '+ '}
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '6px',
                color: '#d1d5db',
              }}
            >
              Desejo ou ingrediente a gastar? (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Tenho courgettes no frigorífico..."
              value={preferencia}
              onChange={(e) => setPreferencia(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #4b5563',
                backgroundColor: '#374151',
                color: 'white',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            onClick={gerarJantar}
            disabled={aCarregar}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: aCarregar ? '#4b5563' : '#d97706',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: aCarregar ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Sparkles size={20} />{' '}
            {aCarregar ? 'A pensar no jantar ideal...' : 'Sugerir Jantar'}
          </button>
        </div>

        {erro && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#7f1d1d',
              color: '#fca5a5',
              border: '1px solid #991b1b',
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
            }}
          >
            <AlertCircle size={18} /> {erro}
          </div>
        )}

        {/* Resultado */}
        {receita && (
          <div
            style={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div
              style={{
                backgroundColor: '#111827',
                padding: '20px',
                borderBottom: '1px solid #374151',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '13px',
                  color: '#fbbf24',
                  marginBottom: '6px',
                }}
              >
                <span>⏱ {receita.tempo}</span>
                <span>
                  💰 Custo Est.: {receita.custoTotalEstimado.toFixed(2)}€
                </span>
              </div>
              <h2 style={{ margin: '0', fontSize: '22px', color: '#f9fafb' }}>
                {receita.nome}
              </h2>
            </div>

            <div style={{ padding: '20px' }}>
              <div
                style={{
                  backgroundColor: '#064e3b',
                  border: '1px solid #047857',
                  padding: '12px',
                  borderRadius: '10px',
                  marginBottom: '20px',
                  fontSize: '14px',
                  color: '#a7f3d0',
                }}
              >
                <strong style={{ color: '#34d399' }}>🛒 Onde comprar:</strong>{' '}
                {receita.dicaSupermercado}
              </div>

              <h3
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '16px',
                  borderBottom: '1px solid #374151',
                  paddingBottom: '8px',
                  color: '#f3f4f6',
                }}
              >
                <ShoppingCart size={18} color="#fbbf24" /> Lista de Ingredientes
              </h3>
              <ul
                style={{
                  listStyle: 'none',
                  padding: '0',
                  margin: '0 0 24px 0',
                }}
              >
                {receita.ingredientes.map((ing: any, idx: number) => {
                  const comprado = ingredientesComprados[idx];
                  return (
                    <li
                      key={idx}
                      onClick={() => toggleIngrediente(idx)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 0',
                        borderBottom: '1px solid #374151',
                        cursor: 'pointer',
                        textDecoration: comprado ? 'line-through' : 'none',
                        color: comprado ? '#6b7280' : '#d1d5db',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            border: comprado ? 'none' : '2px solid #4b5563',
                            backgroundColor: comprado
                              ? '#10b981'
                              : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                          }}
                        >
                          {comprado && <Check size={14} />}
                        </div>
                        <span>{ing.item}</span>
                      </div>
                      <div style={{ fontSize: '13px', textAlign: 'right' }}>
                        <span style={{ fontWeight: '600', display: 'block' }}>
                          ~{ing.precoEstimado.toFixed(2)}€
                        </span>
                        <span style={{ color: '#9ca3af', fontSize: '11px' }}>
                          {ing.ondeComprar}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <h3
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '16px',
                  borderBottom: '1px solid #374151',
                  paddingBottom: '8px',
                  color: '#f3f4f6',
                }}
              >
                <Utensils size={18} color="#fbbf24" /> Modo de Preparação
              </h3>
              <ol
                style={{
                  paddingLeft: '20px',
                  margin: '0',
                  lineHeight: '1.6',
                  color: '#d1d5db',
                }}
              >
                {receita.passos.map((passo: string, idx: number) => (
                  <li key={idx} style={{ marginBottom: '10px' }}>
                    {passo}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
