import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Compass,
  CheckCircle2,
  XCircle,
  Footprints,
  RotateCcw,
  UserPlus,
  Trash2,
  X,
  Eye,
  Play,
  ArrowRight
} from 'lucide-react';
import { BOARD_QUESTIONS, ROWS, COLS, ALL_COORDS } from './data/boardQuestions';
import {
  registrarXpNoBanco,
  buscarRankingDoBanco,
  limparRankingTurmaNoBanco
} from './services/xpApi';

export default function App() {
  // Telas: 'welcome' | 'playing'
  const [screen, setScreen] = useState('welcome');
  const [showRankingModal, setShowRankingModal] = useState(false);

  // Identificação obrigatória: Nome + Turma ('9º A' ou '9º B')
  const [playerName, setPlayerName] = useState('');
  const [playerClass, setPlayerClass] = useState('');
  const [formError, setFormError] = useState('');

  // Rankings separados para 9º A e 9º B (inicia 100% limpo)
  const [ranking, setRanking] = useState(() => {
    const saved = localStorage.getItem('tabuleiro_pegadas_ranking_v1');
    return saved ? JSON.parse(saved) : [];
  });

  // Estado do tabuleiro: mapa de coordenada -> { status: 'clean' | 'pegada', chosenOption: 'A'|'B'|'C', pegadaImg: string }
  const [boardState, setBoardState] = useState({});
  // Coordenada onde a peça Pegada (Tênis) está posicionada atualmente
  const [selectedCoord, setSelectedCoord] = useState('A1');
  // Pontuação e estatísticas da partida
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isGameFinished, setIsGameFinished] = useState(false);
  // Modo de visualização limpa após terminar o jogo
  const [previewCleanBoard, setPreviewCleanBoard] = useState(false);
  const [xpRewardInfo, setXpRewardInfo] = useState(null);

  useEffect(() => {
    buscarRankingDoBanco('jogo6').then((dbRanking) => {
      if (dbRanking && dbRanking.length > 0) {
        const mapped = dbRanking.map((r) => ({
          id: r.id,
          name: r.name,
          turma: r.turma,
          score: r.score,
          cleanCount: r.correct ?? 0,
          pegadasCount: ALL_COORDS.length - (r.correct ?? 0)
        }));
        setRanking(mapped);
      }
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('tabuleiro_pegadas_ranking_v1', JSON.stringify(ranking));
  }, [ranking]);

  // Validar Nome e Turma (6º A ou 6º B)
  const handleStartGame = (e) => {
    if (e) e.preventDefault();
    const trimmed = playerName.trim();
    if (!trimmed && !playerClass) {
      setFormError('Por favor, digite seu nome e selecione sua turma (6º A ou 6º B)!');
      return;
    }
    if (!trimmed) {
      setFormError('Por favor, digite seu nome antes de começar!');
      return;
    }
    if (!playerClass) {
      setFormError('Por favor, escolha sua turma (6º A ou 6º B) antes de começar!');
      return;
    }

    setFormError('');
    setBoardState({});
    setSelectedCoord('A1');
    setScore(0);
    setStreak(0);
    setIsGameFinished(false);
    setPreviewCleanBoard(false);
    setScreen('playing');
  };

  // Responder à pergunta da coordenada selecionada
  const handleSelectOption = (optionKey) => {
    if (!selectedCoord || boardState[selectedCoord]) return;

    const q = BOARD_QUESTIONS[selectedCoord];
    const isCorrect = optionKey === q.correta;

    let newScore = score;
    let newStreak = streak;

    if (isCorrect) {
      newStreak = streak + 1;
      newScore = score + 100 + newStreak * 20;
      setScore(newScore);
      setStreak(newStreak);
    } else {
      newStreak = 0;
      setStreak(0);
    }

    const updatedBoard = {
      ...boardState,
      [selectedCoord]: {
        status: isCorrect ? 'clean' : 'pegada',
        chosenOption: optionKey,
        pegadaImg: '/assets/pegada_neon.jpg'
      }
    };

    setBoardState(updatedBoard);

    // Verifica se todas as 15 coordenadas (A1 a C5) foram respondidas
    const answeredCount = Object.keys(updatedBoard).length;
    if (answeredCount === ALL_COORDS.length) {
      finishBoardGame(updatedBoard, newScore);
    }
  };

  // Ir para a próxima coordenada ainda vazia no tabuleiro
  const goToNextUnanswered = () => {
    const remaining = ALL_COORDS.filter((c) => !boardState[c]);
    if (remaining.length > 0) {
      setSelectedCoord(remaining[0]);
    }
  };

  // Finalizar o jogo quando as 15 coordenadas estiverem preenchidas e liberar XP no Banco de Dados
  const finishBoardGame = (finalBoard, finalScore) => {
    setIsGameFinished(true);
    const cleanCount = Object.values(finalBoard).filter((v) => v.status === 'clean').length;
    const pegadasCount = ALL_COORDS.length - cleanCount;
    const xpLiberado = Math.max(60, finalScore);

    const newEntry = {
      id: Date.now(),
      name: playerName.trim(),
      turma: playerClass,
      score: finalScore,
      xpGanho: xpLiberado,
      cleanCount,
      pegadasCount
    };

    setRanking((prev) => [...prev, newEntry].sort((a, b) => b.score - a.score));
    setXpRewardInfo({ xpGanhoNaPartida: xpLiberado, xpTotalAcumulado: xpLiberado });

    registrarXpNoBanco({
      nome: playerName.trim(),
      turma: playerClass,
      jogo: 'jogo6',
      pontuacao: finalScore,
      xpGanho: xpLiberado,
      acertos: cleanCount,
      detalhes: `Preservado: ${cleanCount}/15 • Pegadas: ${pegadasCount}`
    }).then((res) => {
      if (res && res.dados) {
        setXpRewardInfo(res.dados);
      }
    });

    if (cleanCount >= 10) {
      confetti({
        particleCount: 110,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  };

  const clearClassRanking = (turmaAlvo) => {
    setRanking((prev) => prev.filter((item) => item.turma !== turmaAlvo));
    limparRankingTurmaNoBanco('jogo6', turmaAlvo);
  };

  const ranking6A = ranking.filter((r) => r.turma === '6º A');
  const ranking6B = ranking.filter((r) => r.turma === '6º B');

  const answeredTotal = Object.keys(boardState).length;
  const cleanTilesCount = Object.values(boardState).filter((v) => v.status === 'clean').length;
  const pegadasTilesCount = Object.values(boardState).filter((v) => v.status === 'pegada').length;

  const activeQuestion = selectedCoord ? BOARD_QUESTIONS[selectedCoord] : null;
  const activeCoordState = selectedCoord ? boardState[selectedCoord] : null;

  return (
    <div className="board-app">
      {/* Barra Superior */}
      <header className="board-topbar">
        <div className="brand-area" onClick={() => setScreen('welcome')} style={{ cursor: 'pointer' }}>
          <img src="/assets/tenis_pegada.png" alt="Peça Pegada" className="brand-sneaker" />
          <div>
            <div className="brand-title">Sem Deixar Pegadas • Tabuleiro A1 a C5</div>
            <div className="brand-subtitle">Projeto Educativo TCC • Meio Ambiente e Sustentabilidade (6º Ano)</div>
          </div>
        </div>

        <div className="top-stats">
          {screen === 'playing' && (
            <>
              <div className="stat-pill">
                <span>👤 {playerName} ({playerClass})</span>
              </div>
              <div className="stat-pill" title="Peças limpas no tabuleiro">
                <CheckCircle2 size={17} color="#4ade80" />
                <span>Preservado: {cleanTilesCount}/15</span>
              </div>
              <div className="stat-pill" title="Cartas Pegadas deixadas no tabuleiro">
                <Footprints size={17} color="#f87171" />
                <span>Pegadas: {pegadasTilesCount}</span>
              </div>
              <div className="stat-pill">
                <Trophy size={17} color="#facc15" />
                <span>{score} pts</span>
              </div>
            </>
          )}

          <button className="btn-pill-action" onClick={() => setShowRankingModal(true)}>
            <Trophy size={16} />
            <span>Rankings (6º A / 6º B)</span>
          </button>
        </div>
      </header>

      {/* TELA DE BOAS-VINDAS E IDENTIFICAÇÃO */}
      {screen === 'welcome' && (
        <main className="welcome-container">
          <div className="welcome-card">
            <div>
              <span className="steam-badge">JOGO DE TABULEIRO DIGITAL • STEAM</span>
              <h1 className="welcome-title">Complete a Paisagem Sem Deixar Pegadas!</h1>
              <p style={{ fontSize: '0.98rem', lineHeight: 1.5, fontWeight: 700, color: '#475569' }}>
                No tabuleiro com coordenadas de <strong>1 a 5</strong> (horizontal) e <strong>A até C</strong> (vertical),
                cada escolha revela uma parte da nossa cidade costeira e da floresta!
              </p>

              <ul className="rules-steps">
                <li>
                  <span>1.</span> Escolha uma coordenada no tabuleiro (por exemplo: <strong>C1 – linha C, coluna 1</strong>) para posicionar o tênis Pegada.
                </li>
                <li>
                  <span>2.</span> Leia a pergunta do Cartão-Resposta correspondente à coordenada escolhida (alternativas A, B ou C).
                </li>
                <li>
                  <span>3.</span> <strong>Se acertar:</strong> a peça original da paisagem daquela coordenada é revelada no tabuleiro!
                </li>
                <li>
                  <span>4.</span> <strong>Se errar:</strong> uma carta do baralho <em>Pegadas</em> (poluição/impacto ambiental) ocupa o local.
                </li>
                <li>
                  <span>5.</span> O jogo termina quando todas as 15 coordenadas (A1 a C5) forem respondidas!
                </li>
              </ul>
            </div>

            <form className="login-box" onSubmit={handleStartGame}>
              <img
                src="/assets/tenis_pegada.png"
                alt="Peça Pegada"
                style={{ width: '120px', height: '86px', objectFit: 'contain', marginBottom: '0.5rem' }}
              />
              <h2 style={{ fontSize: '1.4rem', marginBottom: '0.9rem', color: '#2b194d' }}>
                Identificação do Jogador
              </h2>

              <input
                type="text"
                className="input-board"
                placeholder="Digite seu nome *"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value);
                  if (formError) setFormError('');
                }}
                maxLength={26}
              />

              <select
                className="input-board"
                value={playerClass}
                onChange={(e) => {
                  setPlayerClass(e.target.value);
                  if (formError) setFormError('');
                }}
                style={{ cursor: 'pointer' }}
              >
                <option value="">Escolha sua turma (6º A ou 6º B) *</option>
                <option value="6º A">6º A</option>
                <option value="6º B">6º B</option>
              </select>

              {formError && (
                <div
                  style={{
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: '1.5px solid #f87171',
                    borderRadius: '12px',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    marginBottom: '0.75rem'
                  }}
                >
                  ⚠️ {formError}
                </div>
              )}

              <button type="submit" className="btn-start-board">
                <Play size={22} fill="currentColor" />
                <span>Montar Tabuleiro</span>
              </button>
            </form>
          </div>
        </main>
      )}

      {/* TELA PRINCIPAL DO TABULEIRO + CARTÃO RESPOSTA */}
      {screen === 'playing' && (
        <main className="game-workspace">
          {/* Lado Esquerdo: Tabuleiro com Eixo Horizontal (1 a 5) e Eixo Vertical (A a C) */}
          <section className="board-frame">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                <Compass size={20} color="#22d3ee" />
                <span>
                  Clique em uma coordenada (ex: <strong>C1</strong>) para posicionar o Tênis Pegada! ({answeredTotal}/15 concluídas)
                </span>
              </div>

              {isGameFinished && (
                <button
                  className="btn-pill-action"
                  onClick={() => setPreviewCleanBoard(!previewCleanBoard)}
                  style={{ background: previewCleanBoard ? '#16a34a' : '#0891b2' }}
                >
                  <Eye size={16} />
                  <span>
                    {previewCleanBoard ? 'Voltar ao Meu Tabuleiro' : 'Ver Imagem Sem Pegadas'}
                  </span>
                </button>
              )}
            </div>

            <div className="board-grid-wrapper">
              {/* Canto vazio entre as faixas */}
              <div className="axis-corner">
                <img
                  src="/assets/tenis_pegada.png"
                  alt="Guia"
                  style={{ width: '42px', height: '30px', objectFit: 'contain' }}
                />
              </div>

              {/* Faixa Horizontal Numerada de 1 a 5 */}
              {COLS.map((colNum) => (
                <div key={colNum} className={`axis-col-header col-${colNum}`}>
                  {colNum}
                </div>
              ))}

              {/* Linhas A, B e C com suas 5 colunas */}
              {ROWS.map((rowLetter) => (
                <React.Fragment key={rowLetter}>
                  {/* Cabeçalho da Linha (A, B ou C) */}
                  <div className={`axis-row-header row-${rowLetter}`}>
                    {rowLetter}
                  </div>

                  {/* As 5 Coordenadas daquela linha */}
                  {COLS.map((colNum) => {
                    const coord = `${rowLetter}${colNum}`;
                    const cellData = boardState[coord];
                    const isSelected = selectedCoord === coord;
                    const isRevealed = Boolean(cellData) || previewCleanBoard;

                    let imgSrc = null;
                    if (previewCleanBoard) {
                      imgSrc = `/assets/tile_${coord}.jpg`;
                    } else if (cellData) {
                      imgSrc =
                        cellData.status === 'clean'
                          ? `/assets/tile_${coord}.jpg`
                          : cellData.pegadaImg;
                    }

                    return (
                      <div
                        key={coord}
                        className={`coord-cell ${isSelected ? 'selected' : ''} ${
                          isRevealed ? 'revealed' : ''
                        } ${cellData ? cellData.status : ''}`}
                        onClick={() => setSelectedCoord(coord)}
                        title={`Coordenada ${coord} (Linha ${rowLetter}, Coluna ${colNum})`}
                      >
                        {imgSrc && (
                          <img
                            src={imgSrc}
                            alt={`Peça ${coord}`}
                            className="tile-image"
                          />
                        )}

                        <span className="coord-badge">{coord}</span>

                        {!previewCleanBoard && cellData?.status === 'pegada' && (
                          <span className="pegada-warning-tag">👣 PEGADA</span>
                        )}

                        {/* Peça Pegada (Tênis) sobre a coordenada atualmente selecionada */}
                        {isSelected && !previewCleanBoard && (
                          <img
                            src="/assets/tenis_pegada.png"
                            alt="Peça Pegada"
                            className="pawn-sneaker-overlay"
                          />
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </section>

          {/* Lado Direito: Cartão-Resposta Correspondente à Coordenada */}
          <aside className="card-panel">
            {/* Atalho rápido de coordenadas A1..C5 */}
            <div className="coord-picker-bar">
              {ALL_COORDS.map((c) => {
                const st = boardState[c];
                return (
                  <button
                    key={c}
                    onClick={() => setSelectedCoord(c)}
                    className={`coord-mini-btn ${selectedCoord === c ? 'active' : ''} ${
                      st?.status === 'clean' ? 'done-ok' : st?.status === 'pegada' ? 'done-err' : ''
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>

            {/* Resumo de Fim de Jogo quando completar as 15 coordenadas */}
            {isGameFinished && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #fef9c3, #dcfce7)',
                  color: '#14532d',
                  borderRadius: '18px',
                  padding: '1.15rem',
                  marginBottom: '1rem',
                  border: '2px solid #4ade80'
                }}
              >
                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.35rem' }}>
                  🎉 Tabuleiro Completo! ({cleanTilesCount}/15 sem pegadas)
                </h3>
                <p style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.85rem' }}>
                  <strong>{playerName}</strong> ({playerClass}) finalizou com <strong>{score} pontos</strong> e deixou{' '}
                  <strong>{pegadasTilesCount}</strong> pegada(s) no tabuleiro.{' '}
                  <strong>+{xpRewardInfo ? xpRewardInfo.xpGanhoNaPartida : score} XP</strong> liberados no Banco de Dados para a Loja AstroLearn
                  {xpRewardInfo?.xpTotalAcumulado ? ` (Saldo Total: ${xpRewardInfo.xpTotalAcumulado} XP)` : ''}!
                </p>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleStartGame}
                    className="btn-pill-action"
                    style={{ background: '#16a34a' }}
                  >
                    <RotateCcw size={16} /> Jogar Novamente
                  </button>
                  <button
                    onClick={() => {
                      setPlayerName('');
                      setPlayerClass('');
                      setScreen('welcome');
                    }}
                    className="btn-pill-action"
                    style={{ background: '#e94295' }}
                  >
                    <UserPlus size={16} /> Novo Jogador
                  </button>
                  <button
                    onClick={() => setShowRankingModal(true)}
                    className="btn-pill-action"
                    style={{ background: '#0891b2' }}
                  >
                    <Trophy size={16} /> Ver Rankings
                  </button>
                </div>
              </div>
            )}

            {/* Cartão-Resposta Oficial STEAM da Coordenada Selecionada com Moldura de Vidro Neon (Azul, Verde ou Rosa) */}
            {activeQuestion && (
              <div
                className={`steam-question-card ${
                  activeCoordState
                    ? activeCoordState.status === 'clean'
                      ? 'frame-correct'
                      : 'frame-wrong'
                    : ''
                }`}
              >
                <div className="steam-card-header">
                  <div>
                    <div className="steam-logo-pill">STEAM+</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b' }}>
                      Linha {activeQuestion.linha}, Coluna {activeQuestion.coluna}
                    </div>
                  </div>
                  <div className="coord-circle-teal">{activeQuestion.coordenada}</div>
                </div>

                <p className="question-title-text">{activeQuestion.pergunta}</p>

                <div className="options-list">
                  {['A', 'B', 'C'].map((letter) => {
                    let btnClass = 'option-btn';
                    if (activeCoordState) {
                      if (letter === activeQuestion.correta) {
                        btnClass += ' correct-choice';
                      } else if (letter === activeCoordState.chosenOption) {
                        btnClass += ' wrong-choice';
                      }
                    }

                    return (
                      <button
                        key={letter}
                        className={btnClass}
                        disabled={Boolean(activeCoordState)}
                        onClick={() => handleSelectOption(letter)}
                      >
                        <span className="option-letter">{letter}</span>
                        <span>{activeQuestion.alternativas[letter]}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Explicação Oficial após responder a coordenada */}
                {activeCoordState && (
                  <div
                    className={`official-explanation-box ${
                      activeCoordState.status === 'clean' ? 'ok' : 'err'
                    }`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '1.02rem', fontWeight: 900, marginBottom: '0.4rem' }}>
                      {activeCoordState.status === 'clean' ? (
                        <>
                          <CheckCircle2 size={20} color="#16a34a" />
                          <span>
                            Resposta correta: {activeQuestion.correta}! Peça {activeQuestion.coordenada} posicionada!
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle size={20} color="#dc2626" />
                          <span>
                            Resposta incorreta! (Correta: {activeQuestion.correta}) • Carta Pegada posicionada!
                          </span>
                        </>
                      )}
                    </div>

                    <p style={{ marginBottom: '0.85rem' }}>{activeQuestion.explicacao}</p>

                    {!isGameFinished && (
                      <button
                        onClick={goToNextUnanswered}
                        className="btn-start-board"
                        style={{ fontSize: '1.05rem', padding: '0.65rem 1.2rem' }}
                      >
                        <span>Ir para a Próxima Coordenada</span>
                        <ArrowRight size={19} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </aside>
        </main>
      )}

      {/* MODAL DOS DOIS RANKINGS SEPARADOS (6º A e 6º B) */}
      {showRankingModal && (
        <div className="modal-backdrop" onClick={() => setShowRankingModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.55rem' }}>
                <Trophy size={26} color="#eab308" />
                Rankings do Tabuleiro • 6º A e 6º B
              </h2>
              <button
                onClick={() => setShowRankingModal(false)}
                className="btn-pill-action"
                style={{ background: '#1e293b' }}
              >
                <X size={18} /> Fechar
              </button>
            </div>

            <div className="rankings-grid">
              {/* Coluna 6º A */}
              <div className="ranking-col">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.2rem', color: '#1e293b' }}>🏆 Ranking 6º A</h3>
                  {ranking6A.length > 0 && (
                    <button
                      onClick={() => clearClassRanking('6º A')}
                      className="btn-pill-action"
                      style={{ background: '#dc2626', padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                    >
                      <Trash2 size={13} /> Limpar 6º A
                    </button>
                  )}
                </div>

                {ranking6A.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '1.5rem 0', opacity: 0.65, fontWeight: 700 }}>
                    Nenhum aluno do 6º A jogou ainda.
                  </p>
                ) : (
                  ranking6A.map((r, i) => (
                    <div key={r.id} className={`ranking-item-row ${i === 0 ? 'top1' : ''}`}>
                      <div>
                        <div style={{ fontWeight: 800 }}>
                          {i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : `${i + 1}º `}
                          {r.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', opacity: 0.75, fontWeight: 700 }}>
                          Preservado: {r.cleanCount}/15 • Pegadas: {r.pegadasCount}
                        </div>
                      </div>
                      <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#0891b2' }}>
                        {r.score} pts
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Coluna 6º B */}
              <div className="ranking-col">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.2rem', color: '#1e293b' }}>🏆 Ranking 6º B</h3>
                  {ranking6B.length > 0 && (
                    <button
                      onClick={() => clearClassRanking('6º B')}
                      className="btn-pill-action"
                      style={{ background: '#dc2626', padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                    >
                      <Trash2 size={13} /> Limpar 6º B
                    </button>
                  )}
                </div>

                {ranking6B.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '1.5rem 0', opacity: 0.65, fontWeight: 700 }}>
                    Nenhum aluno do 6º B jogou ainda.
                  </p>
                ) : (
                  ranking6B.map((r, i) => (
                    <div key={r.id} className={`ranking-item-row ${i === 0 ? 'top1' : ''}`}>
                      <div>
                        <div style={{ fontWeight: 800 }}>
                          {i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : `${i + 1}º `}
                          {r.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', opacity: 0.75, fontWeight: 700 }}>
                          Preservado: {r.cleanCount}/15 • Pegadas: {r.pegadasCount}
                        </div>
                      </div>
                      <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#0891b2' }}>
                        {r.score} pts
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
