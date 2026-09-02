import fluxDispatchPatch from "./patches/flux_dispatch";
import selfEditPatch from "./patches/self_edit";
import actionsheet from "./patches/actionsheet";
import SettingPage from "./Settings";

export const regexEscaper = string => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export let isEnabled = false;

const deletedMessageArray = new Map();
let patches = [];

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
