var mainWorld = (function() {
	//#region node_modules/wxt/dist/utils/define-unlisted-script.mjs
	function defineUnlistedScript(arg) {
		if (arg == null || typeof arg === "function") return { main: arg };
		return arg;
	}
	//#endregion
	//#region src/entrypoints/main-world.ts — Solana Clawd pAGENT GUI Vision
	var main_world_default = defineUnlistedScript(() => {
		let _lastId = 0;
		function getId() {
			_lastId += 1;
			return _lastId;
		}
		const execute = async (task, config) => {
			if (typeof task !== "string") throw new Error("Task must be a string");
			if (task.trim().length === 0) throw new Error("Task cannot be empty");
			if (!config) throw new Error("Config is required");
			if (!config.baseURL) throw new Error("Config must have a baseURL");
			if (!config.model) throw new Error("Config must have a model");
			const id = getId();
			const promise = new Promise((resolve, reject) => {
				function handleMessage(e) {
					const data = e.data;
					if (typeof data !== "object" || data === null) return;
					if (data.channel !== "PAGENT_RESPONSE") return;
					if (data.id !== id) return;
					if (data.action === "status_change_event" && config.onStatusChange) {
						config.onStatusChange(data.payload);
						return;
					}
					if (data.action === "activity_event" && config.onActivity) {
						config.onActivity(data.payload);
						return;
					}
					if (data.action === "history_change_event" && config.onHistoryUpdate) {
						config.onHistoryUpdate(data.payload);
						return;
					}
					if (data.action === "gui_vision_event" && config.onGuiVision) {
						config.onGuiVision(data.payload);
						return;
					}
					if (data.action !== "execute_result") return;
					window.removeEventListener("message", handleMessage);
					if (data.error) reject(new Error(data.error));
					else resolve(data.payload);
				}
				window.addEventListener("message", handleMessage);
			});
			window.postMessage({
				channel: "PAGENT_REQUEST",
				id,
				action: "execute",
				payload: {
					task,
					config: {
						baseURL: config.baseURL,
						model: config.model,
						apiKey: config.apiKey,
						includeInitialTab: config.includeInitialTab,
						guiVision: config.guiVision !== false
					}
				}
			}, "*");
			return promise;
		};
		const stop = () => {
			const id = getId();
			window.postMessage({
				channel: "PAGENT_REQUEST",
				id,
				action: "stop"
			}, "*");
		};
		const getVisualState = () => {
			const id = getId();
			return new Promise((resolve) => {
				function handleMessage(e) {
					const data = e.data;
					if (typeof data !== "object" || data === null) return;
					if (data.channel !== "PAGENT_RESPONSE") return;
					if (data.id !== id) return;
					if (data.action !== "visual_state_result") return;
					window.removeEventListener("message", handleMessage);
					resolve(data.payload);
				}
				window.addEventListener("message", handleMessage);
				window.postMessage({
					channel: "PAGENT_REQUEST",
					id,
					action: "get_visual_state"
				}, "*");
			});
		};
		window.PAGENT_VERSION = "2.0.0";
		window.PAGENT = {
			version: "2.0.0",
			execute,
			stop,
			getVisualState
		};
		// Backward compat
		window.PAGE_AGENT_EXT_VERSION = window.PAGENT_VERSION;
		window.PAGE_AGENT_EXT = window.PAGENT;
	});
	//#endregion
	//#region Solana Clawd pAGENT bootstrap
	function print(method, ...args) {}
	var logger = {
		debug: (...args) => print(console.debug, ...args),
		log: (...args) => print(console.log, ...args),
		warn: (...args) => print(console.warn, ...args),
		error: (...args) => print(console.error, ...args)
	};
	//#endregion
	return (() => {
		let result;
		try {
			result = main_world_default.main();
			if (result instanceof Promise) result = result.catch((err) => {
				logger.error("pAGENT main-world crashed on startup!", err);
				throw err;
			});
		} catch (err) {
			logger.error("pAGENT main-world crashed on startup!", err);
			throw err;
		}
		return result;
	})();
})();

mainWorld;
