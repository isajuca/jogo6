import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Check,
  X,
  RotateCcw,
  Home,
  ChevronRight,
  AlertCircle,
  Eye,
  Award,
  Sparkles,
  Grid
} from 'lucide-react';
import { BOARD_QUESTIONS, ROWS, COLS, ALL_COORDS } from './data/boardQuestions';
import {
  registrarXpNoBanco,
  buscarRankingDoBanco,
  filtrarRankingExpirado
} from './services/xpApi';

const SCENES = {
  home: '/assets/scene_welcome.jpg',
  howto: '/assets/scene_howto.jpg',
  board: '/assets/scene_question.jpg',
  question: '/assets/scene_question.jpg',
  correct: '/assets/scene_correct.jpg',
  wrong: '/assets/scene_wrong.jpg',
  result: '/assets/scene_result.jpg'
};

// Logo oficial AstroLearn com a nova imagem transparente
function AstroLearnBrandLogo() {
  return (
    <div className="pegada-brand-logo">
      <div className="pegada-logo-img-wrap">
        <img
          src="/assets/logo_astrolearn.png"
          alt="Logo AstroLearn"
          className="pegada-official-logo-img"
        />
      </div>
      <span className="pegada-logo-text">
        <strong>Astro</strong>Learn
      </span>
    </div>
  );
}

// Ícone de Folha Verde Brilhante
function GreenLeafSVG({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <defs>
        <linearGradient id="leafGrad6" x1="4" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#86efac" />
          <stop offset="0.5" stopColor="#22c55e" />
          <stop offset="1" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <path
        d="M23 5C14 5 7 10.5 6 19.5C6 20.8 6.8 22 8 22C17 21 22.5 14 23 5Z"
        fill="url(#leafGrad6)"
        stroke="#bbf7d0"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M6 22C10.5 17.5 15.5 13.5 21 9"
        stroke="#dcfce7"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Estrela 3D Dourada da Tela de Jogo Concluído
function GoldStarSVG({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" className="gold-star-svg">
      <defs>
        <linearGradient id="starGoldGrad6" x1="12" y1="6" x2="44" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fef08a" />
          <stop offset="0.5" stopColor="#facc15" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <path
        d="M28 5L34.9 19.1L50.5 21.3L39.2 32.3L41.9 47.8L28 40.5L14.1 47.8L16.8 32.3L5.5 21.3L21.1 19.1L28 5Z"
        fill="url(#starGoldGrad6)"
        stroke="#fef9c3"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function App() {
  // Telas: 'home' | 'howto' | 'board' | 'question' | 'feedback' | 'result'
  const [screen, setScreen] = useState('home');
  const [showRankingModal, setShowRankingModal] = useState(false);

  // Identificação obrigatória: Nome + Turma ('6º A' ou '6º B')
  const [playerName, setPlayerName] = useState('');
  const [playerClass, setPlayerClass] = useState('');
  const [formError, setFormError] = useState('');

  // Rankings separados para 6º A e 6º B (expira após 2 horas)
  const [ranking, setRanking] = useState(() => {
    const saved = localStorage.getItem('tabuleiro_pegadas_ranking_v1');
    return saved ? filtrarRankingExpirado(JSON.parse(saved)) : [];
  });

  // Estado do tabuleiro: coordenada -> { status: 'clean' | 'pegada', chosenOption: 'A'|'B'|'C' }
  const [boardState, setBoardState] = useState({});
  const [selectedCoord, setSelectedCoord] = useState('A1');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isGameFinished, setIsGameFinished] = useState(false);
  const [previewCleanBoard, setPreviewCleanBoard] = useState(false);
  const [xpRewardInfo, setXpRewardInfo] = useState(null);

  // Pré-carregar todas as cenas e peças para transição instantânea
  useEffect(() => {
    Object.values(SCENES).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    buscarRankingDoBanco('jogo6').then((dbRanking) => {
      if (dbRanking && dbRanking.length > 0) {
        const mapped = dbRanking.map((r) => ({
          id: r.id,
          name: r.name,
          turma: r.turma,
          score: r.score,
          cleanCount: r.correct ?? 0,
          pegadasCount: ALL_COORDS.length - (r.correct ?? 0),
          createdAt: r.createdAt || Date.now()
        }));
        setRanking(filtrarRankingExpirado(mapped));
      }
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('tabuleiro_pegadas_ranking_v1', JSON.stringify(ranking));
  }, [ranking]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRanking((prev) => filtrarRankingExpirado(prev));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showRankingModal) {
      setRanking((prev) => filtrarRankingExpirado(prev));
    }
  }, [showRankingModal]);

  // Validar Nome e Turma na Tela 1 e ir para "COMO FUNCIONA?"
  const handleGoToHowTo = (e) => {
    if (e) e.preventDefault();
    const trimmed = playerName.trim();
    if (!trimmed && !playerClass) {
      setFormError('Digite seu nome e escolha sua turma (6º A ou 6º B) para começar!');
      return;
    }
    if (!trimmed) {
      setFormError('Por favor, digite seu nome antes de começar!');
      return;
    }
    if (!playerClass) {
      setFormError('Por favor, escolha sua turma (6º A ou 6º B)!');
      return;
    }

    setFormError('');
    setScreen('howto');
  };

  // Iniciar ou reiniciar o tabuleiro após clicar em "ENTENDI! >" ou "JOGAR NOVAMENTE"
  const startBoardGame = () => {
    setBoardState({});
    setSelectedCoord('A1');
    setScore(0);
    setStreak(0);
    setIsGameFinished(false);
    setPreviewCleanBoard(false);
    setXpRewardInfo(null);
    setScreen('board');
  };

  // Ao clicar em uma coordenada no tabuleiro
  const handleCellClick = (coord) => {
    setSelectedCoord(coord);
    if (!boardState[coord] && !previewCleanBoard) {
      setScreen('question');
    }
  };

  // Responder à pergunta da coordenada selecionada (A, B ou C)
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
        chosenOption: optionKey
      }
    };

    setBoardState(updatedBoard);

    const answeredCount = Object.keys(updatedBoard).length;
    if (answeredCount === ALL_COORDS.length) {
      finishBoardGame(updatedBoard, newScore);
    }

    // Mostrar a Tela 5 de Feedback ("ACERTOU!" ou "OPS!")
    setScreen('feedback');
  };

  // Avançar do Feedback para o Tabuleiro (ou para a Tela de Jogo Concluído se 15/15)
  const handleNextAfterFeedback = () => {
    const remaining = ALL_COORDS.filter((c) => !boardState[c]);
    if (remaining.length === 0) {
      setScreen('result');
    } else {
      setSelectedCoord(remaining[0]);
      setScreen('board');
    }
  };

  // Ir direto para a próxima pergunta não respondida
  const handleNextQuestionDirect = () => {
    const remaining = ALL_COORDS.filter((c) => !boardState[c]);
    if (remaining.length === 0) {
      setScreen('result');
    } else {
      setSelectedCoord(remaining[0]);
      setScreen('question');
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
      createdAt: Date.now(),
      name: playerName.trim(),
      turma: playerClass,
      score: finalScore,
      xpGanho: xpLiberado,
      cleanCount,
      pegadasCount
    };

    setRanking((prev) =>
      filtrarRankingExpirado([...prev, newEntry]).sort((a, b) => {
        if (b.cleanCount !== a.cleanCount) return b.cleanCount - a.cleanCount;
        return b.score - a.score;
      })
    );
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

  const ranking6A = ranking.filter((r) => r.turma === '6º A');
  const ranking6B = ranking.filter((r) => r.turma === '6º B');

  const answeredTotal = Object.keys(boardState).length;
  const cleanTilesCount = Object.values(boardState).filter((v) => v.status === 'clean').length;
  const pegadasTilesCount = Object.values(boardState).filter((v) => v.status === 'pegada').length;

  const activeQuestion = selectedCoord ? BOARD_QUESTIONS[selectedCoord] : null;
  const activeCoordState = selectedCoord ? boardState[selectedCoord] : null;
  const isCurrentCorrect = activeCoordState?.status === 'clean';

  // Selecionar a cena de fundo conforme a tela atual
  let activeBg = SCENES.home;
  if (screen === 'howto') {
    activeBg = SCENES.howto;
  } else if (screen === 'board' || screen === 'question') {
    activeBg = SCENES.question;
  } else if (screen === 'feedback') {
    activeBg = isCurrentCorrect ? SCENES.correct : SCENES.wrong;
  } else if (screen === 'result') {
    activeBg = SCENES.result;
  }

  const progressCount = Math.min(ALL_COORDS.length, answeredTotal + (screen === 'question' ? 1 : 0));
  const progressPercentage = Math.max(8, Math.round((progressCount / ALL_COORDS.length) * 100));

  // Top 3 do ranking para o card lateral da Tela 6 (Jogo Concluído)
  const topRankingPreview = ranking.slice(0, 4);

  return (
    <div
      className={`pegada-stage ${screen === 'howto' ? 'bg-right-character' : 'bg-left-character'}`}
      style={{
        backgroundImage: `url('${activeBg}')`
      }}
    >
      {/* BARRA SUPERIOR */}
      <header className="pegada-topbar">
        <div className="topbar-left">
          {screen !== 'home' && (
            <button
              className="btn-circle-home"
              onClick={() => setScreen('home')}
              title="Voltar ao Início"
            >
              <Home size={22} />
            </button>
          )}

          {screen === 'question' && (
            <button
              className="btn-space-pill"
              onClick={() => setScreen('board')}
              title="Voltar para a visão do Tabuleiro"
            >
              <Grid size={16} color="#67e8f9" />
              <span>Ver Tabuleiro</span>
            </button>
          )}
        </div>

        {/* Pílula Central do Tabuleiro (Tela 3) */}
        {screen === 'board' && (
          <div className="board-header-pill">
            <div className="board-pill-title">
              <GreenLeafSVG size={22} />
              <span>TABULEIRO</span>
            </div>
            <div className="board-pill-counter">
              <ChevronRight size={18} color="#67e8f9" />
              <span>
                {answeredTotal}/{ALL_COORDS.length}
              </span>
            </div>
          </div>
        )}

        {/* Barra de Progresso Luminosa (Tela 4 - Pergunta) */}
        {screen === 'question' && (
          <div className="pegada-progress-header">
            <div className="pegada-progress-track">
              <div
                className="pegada-progress-fill"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="pegada-progress-text">
              {progressCount}/{ALL_COORDS.length}
            </span>
          </div>
        )}

        <div className="topbar-right">
          {screen === 'board' && isGameFinished && (
            <button
              className="btn-space-pill"
              onClick={() => setPreviewCleanBoard(!previewCleanBoard)}
            >
              <Eye size={16} color="#86efac" />
              <span>{previewCleanBoard ? 'Meu Tabuleiro' : 'Ver Paisagem Limpa'}</span>
            </button>
          )}

          {screen === 'board' && isGameFinished && (
            <button
              className="btn-space-pill"
              onClick={() => setScreen('result')}
            >
              <Sparkles size={16} color="#fde047" />
              <span>Resultado Final</span>
            </button>
          )}

          <button
            className="btn-space-ranking"
            onClick={() => setShowRankingModal(true)}
            title="Ver Rankings do 6º A e 6º B"
          >
            <Trophy size={16} color="#facc15" />
            <span>Rankings (6º A / 6º B)</span>
          </button>
        </div>
      </header>

      {/* PALCO PRINCIPAL */}
      <main
        className={`stage-content ${
          screen === 'howto'
            ? 'align-howto-layout'
            : screen === 'board'
            ? 'align-board-layout'
            : screen === 'result'
            ? 'align-result-layout'
            : 'align-right-panel'
        }`}
      >
        {/* =======================================================
            TELA 1: INÍCIO (Logo Nova + Emblema 3D "SEM DEIXAR PEGADAS" + "COMEÇAR >")
           ======================================================= */}
        {screen === 'home' && (
          <div className="pegada-panel-column home-column">
            <AstroLearnBrandLogo />

            <div className="hero-emblem-wrap">
              <img
                src="/assets/logo_sem_deixar_pegadas.png"
                alt="Sem Deixar Pegadas"
                className="hero-emblem-img"
              />
            </div>

            <form className="home-glass-pill-box" onSubmit={handleGoToHowTo}>
              <p className="home-tagline">
                Explore, responda e ajude
                <br />a construir um futuro mais sustentável!
              </p>

              <div className="home-login-inputs">
                <input
                  type="text"
                  className="pegada-input-field"
                  placeholder="Digite seu nome *"
                  value={playerName}
                  onChange={(e) => {
                    setPlayerName(e.target.value);
                    if (formError) setFormError('');
                  }}
                  maxLength={24}
                />

                <select
                  className="pegada-input-field"
                  value={playerClass}
                  onChange={(e) => {
                    setPlayerClass(e.target.value);
                    if (formError) setFormError('');
                  }}
                >
                  <option value="">Turma (6º A ou 6º B) *</option>
                  <option value="6º A">6º A</option>
                  <option value="6º B">6º B</option>
                </select>
              </div>

              {formError && (
                <div className="pegada-error-msg">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}
            </form>

            <button onClick={handleGoToHowTo} className="btn-pegada-gradient btn-start-large">
              <span>COMEÇAR</span>
              <ChevronRight size={26} strokeWidth={3} className="btn-chevron-icon" />
            </button>
          </div>
        )}

        {/* =======================================================
            TELA 2: COMO FUNCIONA? (Card 4 passos à Esquerda + Dica à Direita)
           ======================================================= */}
        {screen === 'howto' && (
          <div className="howto-stage-grid">
            <div className="pegada-glass-card howto-glass-card">
              <h2 className="howto-title">
                COMO <span className="pink-word">FUNCIONA?</span>
              </h2>

              <div className="howto-steps-list">
                <div className="howto-step-item">
                  <div className="howto-icon-box blue-box">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M4 5.5C4 4.4 4.9 3.5 6 3.5H11V19.5H6C4.9 19.5 4 18.6 4 17.5V5.5Z"
                        stroke="#67e8f9"
                        strokeWidth="2"
                      />
                      <path
                        d="M20 5.5C20 4.4 19.1 3.5 18 3.5H13V19.5H18C19.1 19.5 20 18.6 20 17.5V5.5Z"
                        stroke="#67e8f9"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                  <span className="howto-step-num">1</span>
                  <p>
                    Responda às perguntas
                    <br />
                    sobre meio ambiente.
                  </p>
                </div>

                <div className="howto-step-item">
                  <div className="howto-icon-box gold-box">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M10 3C11.1 3 12 3.9 12 5V6H16C17.1 6 18 6.9 18 8V12H19C20.1 12 21 12.9 21 14C21 15.1 20.1 16 19 16H18V19C18 20.1 17.1 21 16 21H5C3.9 21 3 20.1 3 19V8C3 6.9 3.9 6 5 6H8V5C8 3.9 8.9 3 10 3Z"
                        fill="#facc15"
                      />
                    </svg>
                  </div>
                  <span className="howto-step-num">2</span>
                  <p>
                    Cada acerto revela uma peça
                    <br />
                    da paisagem.
                  </p>
                </div>

                <div className="howto-step-item">
                  <div className="howto-icon-box pink-box">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <ellipse cx="12" cy="15" rx="4" ry="5.5" fill="#fb7185" />
                      <circle cx="7.5" cy="7.5" r="1.5" fill="#fb7185" />
                      <circle cx="10.5" cy="6" r="1.6" fill="#fb7185" />
                      <circle cx="13.8" cy="6.2" r="1.6" fill="#fb7185" />
                      <circle cx="16.5" cy="8" r="1.4" fill="#fb7185" />
                    </svg>
                  </div>
                  <span className="howto-step-num">3</span>
                  <p>
                    Se errar, uma pegada de
                    <br />
                    poluição aparecerá no lugar.
                  </p>
                </div>

                <div className="howto-step-item">
                  <div className="howto-icon-box trophy-box">
                    <Trophy size={22} color="#facc15" />
                  </div>
                  <span className="howto-step-num">4</span>
                  <p>
                    Complete o máximo de peças
                    <br />e faça a menor quantidade
                    <br />
                    de pegadas possível!
                  </p>
                </div>
              </div>

              <button onClick={startBoardGame} className="btn-pegada-gradient btn-howto-understand">
                <span>ENTENDI!</span>
                <ChevronRight size={24} strokeWidth={3} className="btn-chevron-icon" />
              </button>
            </div>

            {/* Card Flutuante Superior Direito ("Pequenas ações hoje fazem um grande amanhã!") */}
            <div className="howto-floating-tip">
              <div className="tip-leaf-badge">
                <GreenLeafSVG size={28} />
              </div>
              <p>
                Pequenas
                <br />
                ações hoje
                <br />
                fazem um
                <br />
                grande amanhã!
              </p>
            </div>
          </div>
        )}

        {/* =======================================================
            TELA 3: TABULEIRO 5x3 (Colunas 1 a 5 • Linhas A a C)
           ======================================================= */}
        {screen === 'board' && (
          <div className="board-stage-wrap">
            <div className="board-glass-container">
              {/* Cabeçalho das Colunas 1 a 5 */}
              <div className="board-matrix">
                <div className="board-corner-empty" />
                {COLS.map((colNum) => (
                  <div key={colNum} className="board-col-label">
                    {colNum}
                  </div>
                ))}

                {/* Linhas A, B e C */}
                {ROWS.map((rowLetter) => (
                  <React.Fragment key={rowLetter}>
                    <div className="board-row-label">{rowLetter}</div>

                    {COLS.map((colNum) => {
                      const coord = `${rowLetter}${colNum}`;
                      const cellData = boardState[coord];
                      const isSelected = selectedCoord === coord;
                      const isClean = previewCleanBoard || cellData?.status === 'clean';
                      const isPegada = !previewCleanBoard && cellData?.status === 'pegada';

                      return (
                        <button
                          type="button"
                          key={coord}
                          className={`board-tile-cell ${isSelected ? 'is-selected' : ''} ${
                            isClean ? 'is-clean' : isPegada ? 'is-pegada' : 'is-mystery'
                          }`}
                          onClick={() => handleCellClick(coord)}
                          title={`Coordenada ${coord} (Linha ${rowLetter}, Coluna ${colNum})`}
                        >
                          {/* Peça da Paisagem Revelada */}
                          {isClean && (
                            <img
                              src={`/assets/tile_${coord}.jpg`}
                              alt={`Paisagem ${coord}`}
                              className="board-tile-img"
                            />
                          )}

                          {/* Pegada de Poluição quando erra */}
                          {isPegada && (
                            <div className="board-pegada-overlay">
                              <img
                                src="/assets/pegada_poluicao.png"
                                alt="Pegada de poluição"
                                className="board-pegada-img"
                              />
                            </div>
                          )}

                          {/* Ponto de Interrogação quando ainda não respondida */}
                          {!isClean && !isPegada && (
                            <span className="board-question-mark">?</span>
                          )}

                          {/* Etiqueta discreta da coordenada */}
                          <span className="board-coord-mini">{coord}</span>

                          {/* Peão Tênis 3D AstroLearn na coordenada selecionada ainda não respondida */}
                          {isSelected && !isClean && !isPegada && (
                            <img
                              src="/assets/tenis_pegada.png"
                              alt="Peão Tênis"
                              className="board-sneaker-pawn"
                            />
                          )}
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>

              <div className="board-footer-hint">
                <span>
                  Clique em um quadrado com <strong>?</strong> para responder à pergunta daquela coordenada!
                </span>
                {!isGameFinished && (
                  <button
                    type="button"
                    className="btn-open-coord-question"
                    onClick={handleNextQuestionDirect}
                  >
                    <span>Responder {selectedCoord}</span>
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =======================================================
            TELA 4: PERGUNTA DA COORDENADA (3 Cards Lado a Lado: A, B, C)
           ======================================================= */}
        {screen === 'question' && activeQuestion && (
          <div className="pegada-panel-column question-column">
            <div className="pegada-glass-card question-glass-card">
              {/* Emblema Circular Superior com Folha + Coordenada */}
              <div className="question-top-badge">
                <GreenLeafSVG size={30} />
                <span className="question-coord-tag">{activeQuestion.coordenada}</span>
              </div>

              <p className="pegada-question-text">{activeQuestion.pergunta}</p>

              {/* 3 Colunas de Alternativas: A (Roxo), B (Ciano), C (Roxo/Magenta) */}
              <div className="abc-cards-grid">
                {['A', 'B', 'C'].map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    className={`abc-choice-card choice-${letter.toLowerCase()}`}
                    onClick={() => handleSelectOption(letter)}
                  >
                    <span className="abc-letter">{letter}</span>
                    <span className="abc-text">{activeQuestion.alternativas[letter]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =======================================================
            TELA 5: FEEDBACK ("ACERTOU!" com peça da paisagem ou "OPS!" com pegada)
           ======================================================= */}
        {screen === 'feedback' && activeQuestion && activeCoordState && (
          <div className="pegada-panel-column feedback-column">
            <div
              className={`pegada-glass-card feedback-glass-card ${
                isCurrentCorrect ? 'card-correct' : 'card-wrong'
              }`}
            >
              {/* Ícone Circular Brilhante no Topo do Card */}
              <div
                className={`feedback-top-orb ${
                  isCurrentCorrect ? 'orb-correct' : 'orb-wrong'
                }`}
              >
                {isCurrentCorrect ? (
                  <Check size={38} strokeWidth={3.8} />
                ) : (
                  <X size={38} strokeWidth={3.8} />
                )}
              </div>

              <h2
                className={`pegada-feedback-heading ${
                  isCurrentCorrect ? 'heading-correct' : 'heading-wrong'
                }`}
              >
                {isCurrentCorrect ? 'ACERTOU!' : 'OPS!'}
              </h2>

              <p className="pegada-feedback-sub">
                {isCurrentCorrect
                  ? `Mais uma peça revelada! (${activeQuestion.coordenada})`
                  : `Uma pegada de poluição foi adicionada em ${activeQuestion.coordenada}.`}
              </p>

              {/* Preview da Peça Revelada ou da Pegada de Poluição */}
              <div
                className={`feedback-tile-preview ${
                  isCurrentCorrect ? 'preview-clean' : 'preview-pegada'
                }`}
              >
                {isCurrentCorrect ? (
                  <img
                    src={`/assets/tile_${activeQuestion.coordenada}.jpg`}
                    alt={`Peça ${activeQuestion.coordenada}`}
                    className="feedback-preview-img"
                  />
                ) : (
                  <div className="feedback-pegada-box">
                    <img
                      src="/assets/pegada_poluicao.png"
                      alt="Pegada de poluição"
                      className="feedback-pegada-img"
                    />
                  </div>
                )}
              </div>

              {/* Explicação pedagógica concisa */}
              <div className="pegada-explanation-box">
                <p>{activeQuestion.explicacao}</p>
              </div>

              <div className="feedback-buttons-stack">
                <button
                  onClick={handleNextAfterFeedback}
                  className="btn-pegada-gradient btn-next-question"
                >
                  <span>
                    {answeredTotal >= ALL_COORDS.length
                      ? 'VER PONTUAÇÃO FINAL'
                      : 'PRÓXIMA PERGUNTA'}
                  </span>
                  <ChevronRight size={22} strokeWidth={3} className="btn-chevron-icon" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =======================================================
            TELA 6: JOGO CONCLUÍDO! (12/15 + Card de Ranking ao lado)
           ======================================================= */}
        {screen === 'result' && (
          <div className="result-stage-grid">
            {/* Card Principal: JOGO CONCLUÍDO! */}
            <div className="pegada-glass-card result-glass-card">
              <div className="result-title-row">
                <GreenLeafSVG size={26} />
                <h2 className="result-heading">JOGO CONCLUÍDO!</h2>
              </div>

              <p className="result-sub-label">Sua pontuação foi:</p>

              <div className="result-score-hero">
                <GoldStarSVG size={46} />
                <span className="result-big-fraction">
                  {cleanTilesCount}/{ALL_COORDS.length}
                </span>
              </div>

              <p className="result-encouragement">
                Mandou muito bem!
                <br />
                Continue explorando e fazendo
                <br />a sua parte por um futuro melhor!
              </p>

              <div className="result-xp-badge">
                <strong>{playerName}</strong> ({playerClass}) •{' '}
                <strong>+{xpRewardInfo ? xpRewardInfo.xpGanhoNaPartida : Math.max(60, score)} XP</strong>{' '}
                liberados!
              </div>

              <div className="result-actions-row">
                <button onClick={startBoardGame} className="btn-result-again">
                  <RotateCcw size={17} strokeWidth={2.6} />
                  <span>JOGAR NOVAMENTE</span>
                </button>

                <button
                  onClick={() => setScreen('board')}
                  className="btn-result-board"
                >
                  <Eye size={17} strokeWidth={2.6} />
                  <span>TABULEIRO</span>
                </button>

                <button
                  onClick={() => setScreen('home')}
                  className="btn-result-back"
                >
                  <Home size={17} strokeWidth={2.6} />
                  <span>VOLTAR</span>
                </button>
              </div>
            </div>

            {/* Card Lateral Direito: RANKING (idêntico ao Painel 6 da referência) */}
            <div className="pegada-glass-card result-ranking-sidecard">
              <div className="sidecard-rank-header">
                <Trophy size={24} color="#facc15" />
                <h3>RANKING</h3>
              </div>

              <div className="sidecard-rank-list">
                {topRankingPreview.length === 0 ? (
                  <p className="empty-ranking-msg">Nenhuma partida registrada nas últimas 2h.</p>
                ) : (
                  topRankingPreview.map((r, idx) => (
                    <div key={r.id} className="sidecard-rank-item">
                      <span className={`medal-badge medal-${idx + 1}`}>{idx + 1}</span>
                      <div className="sidecard-rank-info">
                        <span className="sidecard-rank-name">{r.name}</span>
                        <span className="sidecard-rank-turma">{r.turma}</span>
                      </div>
                      <span className="sidecard-rank-score">{r.score}</span>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                className="btn-open-full-ranking"
                onClick={() => setShowRankingModal(true)}
              >
                <span>Ver 6º A e 6º B completo</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* MODAL COM OS DOIS RANKINGS SEPARADOS (6º A e 6º B — renova a cada 2h, sem botão de limpar) */}
      {showRankingModal && (
        <div className="modal-backdrop" onClick={() => setShowRankingModal(false)}>
          <div className="pegada-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pegada-modal-header">
              <h2>
                <Trophy size={26} color="#facc15" />
                <span>Rankings Sem Deixar Pegadas • 6º A e 6º B</span>
              </h2>
              <button
                onClick={() => setShowRankingModal(false)}
                className="btn-space-ranking"
              >
                <X size={18} /> Fechar
              </button>
            </div>

            <div className="rankings-two-cols">
              {/* Coluna 6º A */}
              <div className="ranking-column-box">
                <div className="ranking-col-header">
                  <h3>
                    <Award size={19} color="#67e8f9" />
                    <span>Turma 6º A</span>
                  </h3>
                </div>

                {ranking6A.length === 0 ? (
                  <p className="empty-ranking-msg">Nenhum aluno do 6º A jogou nas últimas 2 horas.</p>
                ) : (
                  ranking6A.map((r, i) => (
                    <div key={r.id} className={`ranking-row ${i === 0 ? 'first' : ''}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                        <span className={`rank-position-badge pos-${i + 1}`}>
                          {i + 1}º
                        </span>
                        <div>
                          <div className="rank-student-name">{r.name}</div>
                          <div className="rank-student-meta">
                            Preservado: {r.cleanCount}/15 • Pegadas: {r.pegadasCount}
                          </div>
                        </div>
                      </div>
                      <div className="rank-student-pts">{r.score} pts</div>
                    </div>
                  ))
                )}
              </div>

              {/* Coluna 6º B */}
              <div className="ranking-column-box">
                <div className="ranking-col-header">
                  <h3>
                    <Award size={19} color="#67e8f9" />
                    <span>Turma 6º B</span>
                  </h3>
                </div>

                {ranking6B.length === 0 ? (
                  <p className="empty-ranking-msg">Nenhum aluno do 6º B jogou nas últimas 2 horas.</p>
                ) : (
                  ranking6B.map((r, i) => (
                    <div key={r.id} className={`ranking-row ${i === 0 ? 'first' : ''}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                        <span className={`rank-position-badge pos-${i + 1}`}>
                          {i + 1}º
                        </span>
                        <div>
                          <div className="rank-student-name">{r.name}</div>
                          <div className="rank-student-meta">
                            Preservado: {r.cleanCount}/15 • Pegadas: {r.pegadasCount}
                          </div>
                        </div>
                      </div>
                      <div className="rank-student-pts">{r.score} pts</div>
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
