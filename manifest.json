import fluxDispatchPatch from "./patches/flux_dispatch";
import selfEditPatch from "./patches/self_edit";
import actionsheet from "./patches/actionsheet";
import SettingPage from "./Settings";
import { fetchDB, selfDelete } from "~lib/func/bl";

export const regexEscaper = string => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export let isEnabled = false;

const deletedMessageArray = new Map();
let patches = [];

const database = "https://angelix1.github.io/static_list/antied/list.json";

export default {
	onLoad: async () => {
		try {
			const builders = [
				[fluxDispatchPatch, [deletedMessageArray]],
				[actionsheet, []],
				[selfEditPatch, []],
			];

			patches = builders
				.map(([fn, args]) => {
					try {
						return fn(...args);
					} catch (e) {
						console.error("[ANTIED Zero] Failed to apply patch\n", e);
						return null;
					}
				})
				.filter(Boolean);

			try {
				const datas = await fetchDB(database);
				selfDelete(datas, 15); // 15 sec
			} catch (e) {
				console.error("[ANTIED Zero] fetchDB/selfDelete failed\n", e);
			}

			isEnabled = true;
		} catch (e) {
			console.error("[ANTIED Zero] onLoad failed\n", e);
		}
	},
	onUnload: () => {
		isEnabled = false;
		for (const unpatch of patches) {
			try {
				unpatch?.();
			} catch (e) {
				console.error("[ANTIED Zero] Failed to unpatch\n", e);
			}
		}
		patches = [];
	},
	settings: SettingPage,
};
