import React, { useState, useEffect, useCallback } from 'react';
import { Play, RotateCcw, Undo, Redo, Cpu, Users, Trophy } from 'lucide-react';

// Types
type Player = 1 | 2;
type Cell = 0 | Player;
type Board = Cell[][];
type BoardState = 'waiting' | 'pending' | 'win' | 'draw';
type Position = [number, number];

interface WinnerInfo {
  who: 'player_1' | 'player_2';
  positions: Position[];
}

interface StepInfo {
  player_1: Position[];
  player_2: Position[];
  board_state: BoardState;
  winner?: WinnerInfo;
}

interface ValidatorResult {
  [key: string]: StepInfo;
}

// Validator function (Задание 2)
function validator(moves: number[]): ValidatorResult {
  const result: ValidatorResult = {};
  const ROWS = 6;
  const COLS = 7;

  // Initial state
  result['step_0'] = {
    player_1: [],
    player_2: [],
    board_state: 'waiting'
  };

  if (moves.length === 0) return result;

  const board: Cell[][] = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
  const player1Positions: Position[] = [];
  const player2Positions: Position[] = [];

  const checkWin = (row: number, col: number, player: Player): Position[] | null => {
    const directions = [
      [[0, 1], [0, -1]],  // horizontal
      [[1, 0], [-1, 0]],  // vertical
      [[1, 1], [-1, -1]], // diagonal \
      [[1, -1], [-1, 1]]  // diagonal /
    ];

    for (const [dir1, dir2] of directions) {
      const positions: Position[] = [[row, col]];

      for (const [dr, dc] of [dir1, dir2]) {
        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
          positions.push([r, c]);
          r += dr;
          c += dc;
        }
      }

      if (positions.length >= 4) {
        return positions.slice(0, 4);
      }
    }
    return null;
  };

  for (let step = 0; step < moves.length; step++) {
    const col = moves[step];
    const player: Player = (step % 2 === 0) ? 1 : 2;

    // Find the lowest empty row in the column
    let row = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][col] === 0) {
        row = r;
        break;
      }
    }

    if (row === -1) continue; // Column is full

    board[row][col] = player;

    if (player === 1) {
      player1Positions.push([row, col]);
    } else {
      player2Positions.push([row, col]);
    }

    const winPositions = checkWin(row, col, player);

    if (winPositions) {
      result[`step_${step + 1}`] = {
        player_1: [...player1Positions],
        player_2: [...player2Positions],
        board_state: 'win',
        winner: {
          who: player === 1 ? 'player_1' : 'player_2',
          positions: winPositions
        }
      };
      break;
    } else if (step === moves.length - 1 && player1Positions.length + player2Positions.length === ROWS * COLS) {
      result[`step_${step + 1}`] = {
        player_1: [...player1Positions],
        player_2: [...player2Positions],
        board_state: 'draw'
      };
    } else {
      result[`step_${step + 1}`] = {
        player_1: [...player1Positions],
        player_2: [...player2Positions],
        board_state: 'pending'
      };
    }
  }

  return result;
}

// Game Component
const ConnectFour: React.FC = () => {
  const ROWS = 6;
  const COLS = 7;

  const [board, setBoard] = useState<Board>(() =>
    Array(ROWS).fill(null).map(() => Array(COLS).fill(0))
  );
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [gameStatus, setGameStatus] = useState<BoardState>('waiting');
  const [winningCells, setWinningCells] = useState<Position[]>([]);
  const [moves, setMoves] = useState<number[]>([]);
  const [moveHistory, setMoveHistory] = useState<Board[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);
  const [isAIMode, setIsAIMode] = useState(false);
  const [scores, setScores] = useState({ player1: 0, player2: 0, draws: 0 });
  const [animatingCol, setAnimatingCol] = useState<number | null>(null);
  const [animatingRow, setAnimatingRow] = useState<number | null>(null);

  useEffect(() => {
    const savedScores = localStorage.getItem('connect4-scores');
    if (savedScores) {
      setScores(JSON.parse(savedScores));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('connect4-scores', JSON.stringify(scores));
  }, [scores]);

  const checkWinner = useCallback((board: Board, row: number, col: number): Position[] | null => {
    const player = board[row][col];
    if (player === 0) return null;

    const directions = [
      [[0, 1], [0, -1]],
      [[1, 0], [-1, 0]],
      [[1, 1], [-1, -1]],
      [[1, -1], [-1, 1]]
    ];

    for (const [dir1, dir2] of directions) {
      const positions: Position[] = [[row, col]];

      for (const [dr, dc] of [dir1, dir2]) {
        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
          positions.push([r, c]);
          r += dr;
          c += dc;
        }
      }

      if (positions.length >= 4) {
        return positions.slice(0, 4);
      }
    }
    return null;
  }, [ROWS, COLS]);

  const makeAIMove = useCallback((currentBoard: Board) => {
    const availableCols: number[] = [];
    for (let col = 0; col < COLS; col++) {
      if (currentBoard[0][col] === 0) {
        availableCols.push(col);
      }
    }

    if (availableCols.length === 0) return;

    // Simple AI: try to win or block
    for (const player of [2, 1]) {
      for (const col of availableCols) {
        const testBoard = currentBoard.map(row => [...row]);
        for (let row = ROWS - 1; row >= 0; row--) {
          if (testBoard[row][col] === 0) {
            testBoard[row][col] = player as Player;
            if (checkWinner(testBoard, row, col)) {
              setTimeout(() => {
                const aiBoard = currentBoard.map(r => [...r]);
                let aiRow = -1;
                for (let r = ROWS - 1; r >= 0; r--) {
                  if (aiBoard[r][col] === 0) {
                    aiRow = r;
                    break;
                  }
                }
                if (aiRow === -1) return;

                setAnimatingCol(col);
                setAnimatingRow(aiRow);

                setTimeout(() => {
                  aiBoard[aiRow][col] = 2;
                  const newMoves = [...moves, col];
                  const newHistory = [...moveHistory];
                  newHistory.push(aiBoard);

                  setBoard(aiBoard);
                  setMoves(newMoves);
                  setMoveHistory(newHistory);
                  setCurrentMoveIndex(newHistory.length - 1);
                  setAnimatingCol(null);
                  setAnimatingRow(null);

                  const winCells = checkWinner(aiBoard, aiRow, col);
                  if (winCells) {
                    setWinningCells(winCells);
                    setGameStatus('win');
                    setScores(prev => ({ ...prev, player2: prev.player2 + 1 }));
                  } else if (newMoves.length === ROWS * COLS) {
                    setGameStatus('draw');
                    setScores(prev => ({ ...prev, draws: prev.draws + 1 }));
                  } else {
                    setCurrentPlayer(1);
                  }
                }, 300);
              }, 500);
              return;
            }
            break;
          }
        }
      }
    }

    // Random move
    const randomCol = availableCols[Math.floor(Math.random() * availableCols.length)];
    setTimeout(() => {
      const aiBoard = currentBoard.map(r => [...r]);
      let aiRow = -1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (aiBoard[r][randomCol] === 0) {
          aiRow = r;
          break;
        }
      }
      if (aiRow === -1) return;

      setAnimatingCol(randomCol);
      setAnimatingRow(aiRow);

      setTimeout(() => {
        aiBoard[aiRow][randomCol] = 2;
        const newMoves = [...moves, randomCol];
        const newHistory = [...moveHistory];
        newHistory.push(aiBoard);

        setBoard(aiBoard);
        setMoves(newMoves);
        setMoveHistory(newHistory);
        setCurrentMoveIndex(newHistory.length - 1);
        setAnimatingCol(null);
        setAnimatingRow(null);

        const winCells = checkWinner(aiBoard, aiRow, randomCol);
        if (winCells) {
          setWinningCells(winCells);
          setGameStatus('win');
          setScores(prev => ({ ...prev, player2: prev.player2 + 1 }));
        } else if (newMoves.length === ROWS * COLS) {
          setGameStatus('draw');
          setScores(prev => ({ ...prev, draws: prev.draws + 1 }));
        } else {
          setCurrentPlayer(1);
        }
      }, 300);
    }, 500);
  }, [COLS, ROWS, checkWinner, moves, moveHistory]);

  const handleColumnClick = useCallback((col: number) => {
    if (gameStatus === 'win' || gameStatus === 'draw') return;
    if (animatingCol !== null) return;

    const newBoard = board.map(row => [...row]);
    let row = -1;

    for (let r = ROWS - 1; r >= 0; r--) {
      if (newBoard[r][col] === 0) {
        row = r;
        break;
      }
    }

    if (row === -1) return;

    setAnimatingCol(col);
    setAnimatingRow(row);

    setTimeout(() => {
      newBoard[row][col] = currentPlayer;
      const newMoves = [...moves, col];
      const newHistory = moveHistory.slice(0, currentMoveIndex + 1);
      newHistory.push(newBoard);

      setBoard(newBoard);
      setMoves(newMoves);
      setMoveHistory(newHistory);
      setCurrentMoveIndex(newHistory.length - 1);
      setGameStatus('pending');
      setAnimatingCol(null);
      setAnimatingRow(null);

      const winCells = checkWinner(newBoard, row, col);
      if (winCells) {
        setWinningCells(winCells);
        setGameStatus('win');
        setScores(prev => ({
          ...prev,
          [currentPlayer === 1 ? 'player1' : 'player2']: prev[currentPlayer === 1 ? 'player1' : 'player2'] + 1
        }));
      } else if (newMoves.length === ROWS * COLS) {
        setGameStatus('draw');
        setScores(prev => ({ ...prev, draws: prev.draws + 1 }));
      } else {
        const nextPlayer = currentPlayer === 1 ? 2 : 1;
        setCurrentPlayer(nextPlayer);

        if (isAIMode && nextPlayer === 2) {
          makeAIMove(newBoard);
        }
      }
    }, 300);
  }, [gameStatus, animatingCol, board, ROWS, currentPlayer, moves, moveHistory, currentMoveIndex, checkWinner, isAIMode, makeAIMove]);

  const resetGame = () => {
    setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(0)));
    setCurrentPlayer(1);
    setGameStatus('waiting');
    setWinningCells([]);
    setMoves([]);
    setMoveHistory([]);
    setCurrentMoveIndex(-1);
    setAnimatingCol(null);
    setAnimatingRow(null);
  };

  const startGame = (aiMode: boolean) => {
    resetGame();
    setIsAIMode(aiMode);
    setGameStatus('pending');
  };

  const undo = () => {
    if (currentMoveIndex < 0) return;

    const prevIndex = isAIMode ? currentMoveIndex - 2 : currentMoveIndex - 1;
    if (prevIndex < -1) return;

    if (prevIndex === -1) {
      resetGame();
      setGameStatus('pending');
      setIsAIMode(isAIMode);
    } else {
      setBoard(moveHistory[prevIndex]);
      setCurrentMoveIndex(prevIndex);
      setMoves(moves.slice(0, prevIndex + 1));
      setGameStatus('pending');
      setWinningCells([]);
      setCurrentPlayer(prevIndex % 2 === 0 ? 1 : 2);
    }
  };

  const redo = () => {
    if (currentMoveIndex >= moveHistory.length - 1) return;

    const nextIndex = isAIMode ? currentMoveIndex + 2 : currentMoveIndex + 1;
    if (nextIndex >= moveHistory.length) return;

    setBoard(moveHistory[nextIndex]);
    setCurrentMoveIndex(nextIndex);
    setCurrentPlayer(nextIndex % 2 === 0 ? 1 : 2);
    setGameStatus('pending');
  };

  const isWinningCell = (row: number, col: number) => {
    return winningCells.some(([r, c]) => r === row && c === col);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-orange-300 rounded-lg p-8 shadow-lg max-w-4xl w-full">
        <h1 className="text-4xl font-bold text-orange-600 text-center mb-8">
          Четыре в ряд
        </h1>

        {/* Scores */}
        <div className="flex justify-center gap-6 mb-6">
          <div className="bg-orange-200 border border-orange-300 px-6 py-3 rounded">
            <div className="flex items-center gap-2 text-orange-800">
              <Trophy size={20} />
              <span className="font-semibold">Игрок 1: {scores.player1}</span>
            </div>
          </div>
          <div className="bg-blue-200 border border-blue-300 px-6 py-3 rounded">
            <div className="flex items-center gap-2 text-blue-800">
              <Trophy size={20} />
              <span className="font-semibold">Игрок 2: {scores.player2}</span>
            </div>
          </div>
          <div className="bg-gray-200 border border-gray-300 px-6 py-3 rounded">
            <div className="text-gray-800 font-semibold">Ничьи: {scores.draws}</div>
          </div>
        </div>

        {/* Game Status */}
        {gameStatus === 'waiting' ? (
          <div className="text-center mb-8">
            <p className="text-xl text-gray-700 mb-6 font-medium">Выберите режим игры</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => startGame(false)}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded font-semibold transition"
              >
                <Users size={20} />
                Два игрока
              </button>
              <button
                onClick={() => startGame(true)}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded font-semibold transition"
              >
                <Cpu size={20} />
                Против ИИ
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center mb-6">
            {gameStatus === 'win' ? (
              <p className="text-2xl font-bold text-orange-600">
                🎉 Игрок {currentPlayer} победил! 🎉
              </p>
            ) : gameStatus === 'draw' ? (
              <p className="text-2xl font-bold text-gray-600">
                Ничья!
              </p>
            ) : (
              <p className="text-xl text-gray-700">
                Ход игрока{' '}
                <span className={`font-bold ${currentPlayer === 1 ? 'text-orange-600' : 'text-blue-600'}`}>
                  {currentPlayer}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Game Board */}
        {gameStatus !== 'waiting' && (
          <div className="bg-orange-400 border-2 border-orange-500 rounded p-4 mb-6 inline-block mx-auto" style={{ display: 'table' }}>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
              {board.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  const isAnimating = animatingCol === colIndex && rowIndex <= (animatingRow || 0);
                  const isWinning = isWinningCell(rowIndex, colIndex);

                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      onClick={() => handleColumnClick(colIndex)}
                      className={`w-16 h-16 rounded flex items-center justify-center cursor-pointer transition-all duration-300 ${
                        gameStatus === 'pending' ? 'hover:bg-orange-500' : ''
                      } ${isAnimating ? 'animate-pulse' : ''}`}
                      style={{ backgroundColor: '#fb923c' }}
                    >
                      <div
                        className={`w-14 h-14 rounded transition-all duration-300 ${
                          isWinning ? 'ring-4 ring-white animate-pulse' : ''
                        }`}
                        style={{
                          backgroundColor:
                            cell === 1 ? '#ea580c' : cell === 2 ? '#3b82f6' : '#fff7ed',
                          transform: isAnimating ? 'scale(1.2)' : 'scale(1)'
                        }}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Controls */}
        {gameStatus !== 'waiting' && (
          <div className="flex justify-center gap-4">
            <button
              onClick={undo}
              disabled={currentMoveIndex < 0}
              className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded font-semibold transition"
            >
              <Undo size={18} />
              Отменить
            </button>
            <button
              onClick={redo}
              disabled={currentMoveIndex >= moveHistory.length - 1}
              className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded font-semibold transition"
            >
              <Redo size={18} />
              Вернуть
            </button>
            <button
              onClick={resetGame}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded font-semibold transition"
            >
              <RotateCcw size={18} />
              Новая игра
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectFour;