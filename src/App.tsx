import { useGameState } from './hooks/useGameState';
import { Navbar } from './components/Navbar';
import { LandingStage } from './components/LandingStage';
import { LobbyStage } from './components/LobbyStage';
import { RecordingStage } from './components/RecordingStage';
import { MinigameStage } from './components/MinigameStage';
import { BreakoutStage } from './components/BreakoutStage';
import { GuessingStage } from './components/GuessingStage';
import { PickingStage } from './components/PickingStage';
import { RevealStage } from './components/RevealStage';

export function App() {
  const {
    room,
    playerList,
    currentPlayer,
    isHost,
    winner1,
    winner2,
    allRecorded,
    isLoading,
    error,
    joinRoom,
    quickMatch,
    hostRoom,
    startGameAsHost,
    avatarIndex,
    setAvatarIndex,
    submitAudio,
    startBalloonMinigame,
    submitMinigameScore,
    crownMinigameWinner,
    proceedFromMinigameToReveal,
    advanceBreakoutRound,
    startGuessingStage,
    submitVoiceGuess,
    advanceGuessVoice,
    finishGuessingAndCrownWinner,
    pickSecondWinner,
    nextConfession,
    playAgain,
    leaveRoom,
  } = useGameState();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Navigation & Room Bar */}
      <Navbar
        room={room}
        currentPlayer={currentPlayer}
        onLeaveRoom={leaveRoom}
      />

      {/* Global Error Notice if any */}
      {error && !room && (
        <div className="max-w-md mx-auto mt-4 px-4 py-2 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs rounded-lg text-center">
          {error}
        </div>
      )}

      {/* Game Stage Routing */}
      <main className="flex-1 flex flex-col">
        {!room ? (
          <LandingStage
            onQuickMatch={quickMatch}
            onCreateRoom={hostRoom}
            onJoinRoom={joinRoom}
            avatarIndex={avatarIndex}
            setAvatarIndex={setAvatarIndex}
            isLoading={isLoading}
            error={error}
          />
        ) : room.status === 'LOBBY' ? (
          <LobbyStage
            room={room}
            players={playerList}
            currentPlayer={currentPlayer}
            isHost={isHost}
            onStartGame={startGameAsHost}
          />
        ) : room.status === 'RECORDING' ? (
          <RecordingStage
            players={playerList}
            currentPlayer={currentPlayer}
            isHost={isHost}
            allRecorded={allRecorded}
            onSubmitAudio={submitAudio}
            onProceedToMinigame={startBalloonMinigame}
          />
        ) : room.status === 'MINIGAME' ? (
          <MinigameStage
            room={room}
            players={playerList}
            currentPlayer={currentPlayer}
            isHost={isHost}
            onStartMinigame={startBalloonMinigame}
            onSubmitScore={submitMinigameScore}
            onCrownWinner={crownMinigameWinner}
            onProceedToReveal={proceedFromMinigameToReveal}
          />
        ) : room.status === 'BREAKOUT' ? (
          <BreakoutStage
            room={room}
            players={playerList}
            currentPlayer={currentPlayer}
            isHost={isHost}
            onAdvanceRound={advanceBreakoutRound}
            onFinishBreakouts={startGuessingStage}
          />
        ) : room.status === 'GUESSING' ? (
          <GuessingStage
            room={room}
            players={playerList}
            currentPlayer={currentPlayer}
            isHost={isHost}
            onSubmitGuess={submitVoiceGuess}
            onAdvanceVoice={advanceGuessVoice}
            onFinishGuessing={finishGuessingAndCrownWinner}
          />
        ) : room.status === 'PICKING' ? (
          <PickingStage
            room={room}
            players={playerList}
            currentPlayer={currentPlayer}
            winner1={winner1}
            onPickSecondWinner={pickSecondWinner}
          />
        ) : room.status === 'REVEAL' ? (
          <RevealStage
            room={room}
            players={playerList}
            currentPlayer={currentPlayer}
            winner1={winner1}
            winner2={winner2}
            isHost={isHost}
            onNextConfession={nextConfession}
            onPlayAgain={playAgain}
          />
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-4 px-4 text-center text-xs text-white/40 font-serif">
        <p>
          Rupiko • Amazing space on the internet for amazing confessions around the bonfire
        </p>
      </footer>
    </div>
  );
}

export default App;
