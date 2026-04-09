/**
 * Solana Clawd Chess Client
 *
 * Wraps the Chess.com public data API for autonomous agent chess play.
 * Uses fetch directly against api.chess.com — no external deps required.
 */

const CHESS_API = "https://api.chess.com/pub";

async function chessGet<T = unknown>(path: string): Promise<T> {
	const res = await fetch(`${CHESS_API}/${path}`, {
		headers: { Accept: "application/json" },
		signal: AbortSignal.timeout(10_000),
	});
	if (!res.ok) throw new Error(`Chess.com API ${path} → ${res.status}`);
	return res.json() as Promise<T>;
}

// ── Player data ─────────────────────────────────────────────────────────────

export interface ChessPlayer {
	"@id": string;
	url: string;
	username: string;
	player_id: number;
	title?: string;
	status: string;
	name?: string;
	avatar?: string;
	location?: string;
	country: string;
	joined: number;
	last_online: number;
	followers: number;
	is_streamer: boolean;
}

export async function getPlayer(username: string): Promise<ChessPlayer> {
	return chessGet<ChessPlayer>(`player/${username}`);
}

export interface ChessRatingCategory {
	last?: { rating: number; date: number; rd: number };
	best?: { rating: number; date: number; game: string };
	record?: { win: number; loss: number; draw: number };
}

export interface ChessStats {
	chess_daily?: ChessRatingCategory;
	chess_rapid?: ChessRatingCategory;
	chess_bullet?: ChessRatingCategory;
	chess_blitz?: ChessRatingCategory;
	fide?: number;
	tactics?: { highest?: { rating: number }; lowest?: { rating: number } };
	puzzle_rush?: { best?: { total_attempts: number; score: number } };
}

export async function getPlayerStats(username: string): Promise<ChessStats> {
	return chessGet<ChessStats>(`player/${username}/stats`);
}

// ── Games ───────────────────────────────────────────────────────────────────

export interface ChessGamePlayer {
	username: string;
	rating: number;
	result: string;
	"@id": string;
}

export interface ChessGame {
	url: string;
	pgn: string;
	fen: string;
	time_control: string;
	time_class: string;
	rules: string;
	end_time: number;
	rated: boolean;
	accuracies?: { white: number; black: number };
	white: ChessGamePlayer;
	black: ChessGamePlayer;
	eco?: string;
}

export interface CurrentDailyGame {
	url: string;
	move_by: number;
	draw_offer?: boolean;
	last_activity: number;
	fen: string;
	pgn: string;
	turn: string;
	white: string;
	black: string;
}

export async function getCurrentGames(username: string): Promise<{ games: CurrentDailyGame[] }> {
	return chessGet(`player/${username}/games`);
}

export async function getGamesToMove(username: string): Promise<{ games: CurrentDailyGame[] }> {
	return chessGet(`player/${username}/games/to-move`);
}

export async function getMonthlyGames(
	username: string,
	year: number,
	month: number,
): Promise<{ games: ChessGame[] }> {
	const mm = String(month).padStart(2, "0");
	return chessGet(`player/${username}/games/${year}/${mm}`);
}

export async function getMonthlyArchives(username: string): Promise<{ archives: string[] }> {
	return chessGet(`player/${username}/games/archives`);
}

// ── Leaderboards & Titled Players ───────────────────────────────────────────

export type ChessTitle = "GM" | "WGM" | "IM" | "WIM" | "FM" | "WFM" | "NM" | "WNM" | "CM" | "WCM";

export async function getTitledPlayers(title: ChessTitle): Promise<{ players: string[] }> {
	return chessGet(`titled/${title}`);
}

export interface LeaderboardPlayer {
	player_id: number;
	username: string;
	score: number;
	rank: number;
	url: string;
	title?: string;
	country?: string;
	win_count?: number;
	loss_count?: number;
	draw_count?: number;
}

export async function getLeaderboards(): Promise<Record<string, LeaderboardPlayer[]>> {
	return chessGet("leaderboards");
}

// ── Puzzles ─────────────────────────────────────────────────────────────────

export interface ChessPuzzle {
	title: string;
	url: string;
	publish_time: number;
	fen: string;
	pgn: string;
	image: string;
}

export async function getDailyPuzzle(): Promise<ChessPuzzle> {
	return chessGet<ChessPuzzle>("puzzle");
}

export async function getRandomPuzzle(): Promise<ChessPuzzle> {
	return chessGet<ChessPuzzle>("puzzle/random");
}

// ── Clubs ───────────────────────────────────────────────────────────────────

export async function getClub(urlId: string): Promise<unknown> {
	return chessGet(`club/${urlId}`);
}

export async function getClubMembers(urlId: string): Promise<unknown> {
	return chessGet(`club/${urlId}/members`);
}

// ── Tournaments ─────────────────────────────────────────────────────────────

export async function getPlayerTournaments(username: string): Promise<unknown> {
	return chessGet(`player/${username}/tournaments`);
}

export async function getTournament(urlId: string): Promise<unknown> {
	return chessGet(`tournament/${urlId}`);
}

// ── Country ─────────────────────────────────────────────────────────────────

export async function getCountryPlayers(iso: string): Promise<{ players: string[] }> {
	return chessGet(`country/${iso.toUpperCase()}/players`);
}

// ── Analysis Helpers ────────────────────────────────────────────────────────

export interface PlayerSummary {
	username: string;
	title?: string;
	status: string;
	ratings: Record<string, number>;
	bestRating: { category: string; rating: number } | null;
	totalGames: number;
	winRate: number;
	lastOnline: string;
}

export async function analyzePlayer(username: string): Promise<PlayerSummary> {
	const [player, stats] = await Promise.all([
		getPlayer(username),
		getPlayerStats(username),
	]);

	const ratings: Record<string, number> = {};
	let totalWins = 0;
	let totalLosses = 0;
	let totalDraws = 0;
	let bestRating: { category: string; rating: number } | null = null;

	for (const key of ["chess_daily", "chess_rapid", "chess_bullet", "chess_blitz"] as const) {
		const cat = stats[key];
		if (!cat?.last) continue;
		const label = key.replace("chess_", "");
		ratings[label] = cat.last.rating;
		if (!bestRating || cat.last.rating > bestRating.rating) {
			bestRating = { category: label, rating: cat.last.rating };
		}
		if (cat.record) {
			totalWins += cat.record.win;
			totalLosses += cat.record.loss;
			totalDraws += cat.record.draw;
		}
	}

	const totalGames = totalWins + totalLosses + totalDraws;
	const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;

	return {
		username: player.username,
		title: player.title,
		status: player.status,
		ratings,
		bestRating,
		totalGames,
		winRate: Math.round(winRate * 100) / 100,
		lastOnline: new Date(player.last_online * 1000).toISOString(),
	};
}

export interface RecentGamesReport {
	username: string;
	games: Array<{
		opponent: string;
		result: string;
		color: "white" | "black";
		rating: number;
		opponentRating: number;
		timeClass: string;
		accuracy?: number;
		eco?: string;
		url: string;
	}>;
	stats: {
		wins: number;
		losses: number;
		draws: number;
		avgAccuracy: number | null;
	};
}

export async function getRecentGames(
	username: string,
	limit = 10,
): Promise<RecentGamesReport> {
	const archives = await getMonthlyArchives(username);
	if (!archives.archives.length) {
		return { username, games: [], stats: { wins: 0, losses: 0, draws: 0, avgAccuracy: null } };
	}

	// Get the most recent archive
	const latestUrl = archives.archives[archives.archives.length - 1];
	const parts = latestUrl.split("/");
	const year = parseInt(parts[parts.length - 2]);
	const month = parseInt(parts[parts.length - 1]);
	const monthly = await getMonthlyGames(username, year, month);

	const sorted = monthly.games
		.sort((a, b) => b.end_time - a.end_time)
		.slice(0, limit);

	let wins = 0;
	let losses = 0;
	let draws = 0;
	const accuracies: number[] = [];
	const uLower = username.toLowerCase();

	const games = sorted.map((g) => {
		const isWhite = g.white.username.toLowerCase() === uLower;
		const me = isWhite ? g.white : g.black;
		const opp = isWhite ? g.black : g.white;
		const color = isWhite ? "white" as const : "black" as const;

		if (me.result === "win") wins++;
		else if (["checkmated", "resigned", "timeout", "abandoned", "lose"].includes(me.result)) losses++;
		else draws++;

		const acc = g.accuracies?.[color];
		if (acc) accuracies.push(acc);

		return {
			opponent: opp.username,
			result: me.result,
			color,
			rating: me.rating,
			opponentRating: opp.rating,
			timeClass: g.time_class,
			accuracy: acc,
			eco: g.eco,
			url: g.url,
		};
	});

	return {
		username,
		games,
		stats: {
			wins,
			losses,
			draws,
			avgAccuracy: accuracies.length > 0
				? Math.round((accuracies.reduce((a, b) => a + b, 0) / accuracies.length) * 100) / 100
				: null,
		},
	};
}
