import { before, after } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { findInReactTree } from "@vendetta/utils";
import { FluxDispatcher, React } from "@vendetta/metro/common";
import { showToast } from "@vendetta/ui/toasts";
import { findByProps } from '@vendetta/metro';
import { regexEscaper, isEnabled } from "..";

function someFunc(a) {
	return a?.props?.label?.toLowerCase?.() == 'reply';
}

export default () => {
	const ActionSheet = findByProps("openLazy", "hideActionSheet");
	const MessageStore = findByProps("getMessage", "getMessages");
	const ChannelStore = findByProps("getChannel", "getDMFromUserId");
	const ChannelMessages = findByProps("_channelMessages");
	const ActionSheetRowModule = findByProps("ActionSheetRow");

	if (!ActionSheet || !MessageStore || !ChannelStore || !ChannelMessages || !ActionSheetRowModule) {
		console.error("[ANTIED Zero] actionsheet: required modules not found, skipping patch");
		return () => {};
	}
	const { ActionSheetRow } = ActionSheetRowModule;

	let renderUnpatch = null;

	const outerUnpatch = before("openLazy", ActionSheet, ([component, args, actionMessage]) => {
		if (!isEnabled) return;
		try {
			const message = actionMessage?.message;
			if (args !== "MessageLongPressActionSheet" || !message) return;

			component.then((instance) => {
				try {
					renderUnpatch?.();

					renderUnpatch = after("default", instance, (_, comp) => {
						try {
							React.useEffect(() => () => { renderUnpatch?.(); }, []);

							const buttons = findInReactTree(comp, c => c?.find?.(someFunc));
							if (!buttons) return comp;

							const position = Math.max(
								buttons.findIndex(someFunc),
								buttons.length - 1
							);

							let originalMessage = null;
							if (message?.channel_id && message?.id) {
								originalMessage = MessageStore.getMessage(message.channel_id, message.id);
								if (!originalMessage) {
									const channel = ChannelMessages.get(message.channel_id);
									originalMessage = channel?.get(message.id);
								}
							}
							if (!originalMessage) return comp;

							const escapedBuffer = regexEscaper("`[ EDITED ]`\n\n");
							const separator = new RegExp(escapedBuffer, 'gmi');
							const checkIfBufferExist = separator.test(message.content);

							if (checkIfBufferExist) {
								const targetPos = position || 1;

								buttons.splice(targetPos, 0, (
									<ActionSheetRow
										label="Remove Edit History"
										subLabel={`Added by Antied Zero`}
										icon={<ActionSheetRow.Icon source={getAssetIDByName("ic_edit_24px")} />}
										onPress={() => {
											try {
												const lats = message?.content?.split(separator);
												const targetMessage = lats[lats.length - 1];

												FluxDispatcher.dispatch({
													type: "MESSAGE_UPDATE",
													message: {
														...message,
														message_reference: message?.message_reference || message?.messageReference || null,
														content: `${targetMessage}`,
														guild_id: ChannelStore.getChannel(originalMessage.channel_id)?.guild_id,
													},
													otherPluginBypass: true,
												});
												ActionSheet.hideActionSheet();
												showToast("History Removed", getAssetIDByName("ic_edit_24px"));
											} catch (e) {
												showToast("[ANTIED Zero] Crash on Remove Edit History press");
												console.error("[ANTIED Zero] Error > ActionSheet:onPress\n", e);
											}
										}}
									/>
								));
							}
						} catch (e) {
							showToast("[ANTIED Zero] Crash on ActionSheet, check debug log for more info");
							console.error("[ANTIED Zero] Error > ActionSheet:Component Patch\n", e);
						}
					});
				} catch (e) {
					showToast("[ANTIED Zero] Crash resolving ActionSheet component");
					console.error("[ANTIED Zero] Error > ActionSheet:component.then\n", e);
				}
			});
		} catch (e) {
			showToast("[ANTIED Zero] Crash on ActionSheet, check debug log for more info");
			console.error("[ANTIED Zero] Error > ActionSheet Patch\n", e);
		}
	});

	return () => {
		outerUnpatch?.();
		renderUnpatch?.();
	};
};
