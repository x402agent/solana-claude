/**
 * Solana Clawd — Chess Agent
 *
 * Autonomous Chess.com integration for agent-driven chess play,
 * player analysis, puzzle solving, and game monitoring.
 *
 * @module chess
 */

export {
	// Player data
	getPlayer,
	getPlayerStats,
	analyzePlayer,

	// Games
	getCurrentGames,
	getGamesToMove,
	getMonthlyGames,
	getMonthlyArchives,
	getRecentGames,

	// Puzzles
	getDailyPuzzle,
	getRandomPuzzle,

	// Community
	getTitledPlayers,
	getLeaderboards,
	getClub,
	getClubMembers,
	getPlayerTournaments,
	getTournament,
	getCountryPlayers,
} from "./chess-client.js";

export type {
	ChessPlayer,
	ChessStats,
	ChessRatingCategory,
	ChessGame,
	ChessGamePlayer,
	CurrentDailyGame,
	ChessTitle,
	LeaderboardPlayer,
	ChessPuzzle,
	PlayerSummary,
	RecentGamesReport,
} from "./chess-client.js";
