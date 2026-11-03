// ============================================================================
// SERVIÇO DE INTEGRAÇÃO DOS JOGOS COM O SUPABASE / BACKEND ASTROLEARN
// Envia os pontos de XP ganhos na partida para o banco de dados (Supabase ou MySQL)
// para que o aluno possa usar seus pontos na Lojinha da plataforma!
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Se você quiser conectar o jogo DIRETO no Supabase (sem nem precisar abrir o backend local),
// basta colar a URL e a Anon Key do seu projeto Supabase aqui ou no arquivo .env!
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://pkbuupvufwuneooziapx.supabase.co').trim().replace(/\/$/, '');
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_R_CVb8GbL6KUv8BOhNdIHQ_lVileie_').trim();

/**
 * Registra o fim da partida no banco de dados (Supabase ou Backend Local) e libera o XP para o aluno.
 */
export async function registrarXpNoBanco({
  nome,
  turma,
  email = null,
  jogo,
  pontuacao,
  xpGanho,
  acertos,
  detalhes
}) {
  // 1. Se tiver chaves diretas do Supabase no frontend, chama a função RPC direto no Supabase
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/registrar_xp_jogo`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          p_nome: nome,
          p_turma: turma,
          p_jogo: jogo,
          p_pontuacao: pontuacao,
          p_xp_ganho: xpGanho,
          p_acertos: acertos,
          p_detalhes: detalhes,
          p_email: email
        })
      });
      if (response.ok) {
        const dados = await response.json();
        return { sucesso: true, banco: 'Supabase', dados };
      }
    } catch (err) {
      console.warn('Tentando via servidor backend local...', err.message);
    }
  }

  // 2. Chama o servidor Backend da AstroLearn (http://localhost:3001/api), que conecta ao Supabase ou ao MySQL
  try {
    const response = await fetch(`${API_BASE_URL}/jogos/registrar-xp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome,
        turma,
        email,
        jogo,
        pontuacao,
        xpGanho,
        acertos,
        detalhes
      })
    });
    const data = await response.json();
    return data;
  } catch (err) {
    console.warn('Backend offline no momento, salvando localmente:', err.message);
    return {
      sucesso: false,
      offline: true,
      dados: {
        xpGanhoNaPartida: xpGanho,
        xpTotalAcumulado: xpGanho
      }
    };
  }
}

/**
 * Busca o ranking atualizado daquele jogo direto do banco de dados (Supabase ou Backend).
 */
export async function buscarRankingDoBanco(jogo) {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/historico_partidas?jogo=eq.${encodeURIComponent(jogo)}&select=id,nome_jogador,turma,pontuacao_partida,xp_ganho,acertos,detalhes,jogado_em&order=pontuacao_partida.desc,id.asc&limit=50`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );
      if (response.ok) {
        const rows = await response.json();
        return rows.map((r) => ({
          id: r.id,
          name: r.nome_jogador,
          turma: r.turma,
          score: r.pontuacao_partida,
          xpGanho: r.xp_ganho,
          correct: r.acertos,
          detalhes: r.detalhes,
          jogado_em: r.jogado_em
        }));
      }
    } catch {
      // continua para o backend local
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/jogos/ranking/${jogo}`);
    const data = await response.json();
    if (data && data.sucesso && Array.isArray(data.ranking)) {
      return data.ranking;
    }
  } catch {
    // Silencioso caso o backend não esteja aberto
  }
  return null;
}

/**
 * Limpa o ranking de uma turma específica no banco de dados.
 */
export async function limparRankingTurmaNoBanco(jogo, turma) {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/historico_partidas?jogo=eq.${encodeURIComponent(jogo)}&turma=eq.${encodeURIComponent(turma)}`,
        {
          method: 'DELETE',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );
      return;
    } catch {
      // continua
    }
  }

  try {
    await fetch(`${API_BASE_URL}/jogos/ranking/${encodeURIComponent(jogo)}/${encodeURIComponent(turma)}`, {
      method: 'DELETE'
    });
  } catch {
    // Silencioso
  }
}
