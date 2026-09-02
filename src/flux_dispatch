import { before } from "@vendetta/patcher";
import { findByProps } from "@vendetta/metro";
import { showToast } from "@vendetta/ui/toasts";
import { FluxDispatcher } from "@vendetta/metro/common";
import { isEnabled } from "..";

export default deletedMessageArray => {
	const ChannelStore = findByProps("getChannel", "getDMFromUserId");
	const ChannelMessages = findByProps("_channelMessages");
	const MessageStore = findByProps('getMessage', 'getMessages');

	if (!ChannelStore || !ChannelMessages || !MessageStore) {
		console.error("[ANTIED Zero] flux_dispatch: required stores not found, skipping patch");
		return () => {};
	}

	return before("dispatch", FluxDispatcher, args => {
		if (!isEnabled) return;
		try {
			const ev = args[0];
			if (!ev || !ev.type) return;

			/* =========================================================
				MESSAGE_DELETE
			==========================================================*/
			if (ev.type === "MESSAGE_DELETE") {
				if (ev.otherPluginBypass) return;
				const orig = ChannelMessages.get(ev.channelId)?.get(ev.id);
				if (!orig?.author?.id || !orig.author.username) return;
				if ((orig?.author?.bot && orig?.flags == 64) || orig.author.bot) return;
				if (!orig.content && !orig.attachments?.length && !orig.embeds?.length) return;

				const entry = deletedMessageArray.get(ev.id);
				if (entry?.stage === 2) {
					if (deletedMessageArray.size >= 100) {
						deletedMessageArray.clear();
					}
					return;
				}
				if (entry?.stage === 1) {
					entry.stage = 2;
					return entry.message || args;
				}

				const guildId = ChannelStore.getChannel(orig.channel_id || ev.channelId)?.guild_id;

				ev.message = {
					...orig,
					content: orig.content,
					channel_id: orig.channel_id || ev.channelId,
					guild_id: guildId,
					message_reference: orig?.message_reference || orig?.messageReference || null,
					flags: 64,
				};
				ev.type = "MESSAGE_UPDATE";
				ev.channelId = orig.channel_id || ev.channelId;
				ev.optimistic = false;
				ev.sendMessageOptions = {};
				ev.isPushNotification = false;

				deletedMessageArray.set(ev.id, { message: args, stage: 1 });
				return args;
			}

			/* =========================================================
				MESSAGE_UPDATE
			==========================================================*/
			if (ev.type === "MESSAGE_UPDATE") {
				if (ev.otherPluginBypass) return;
				const msg = ev.message;
				if (!msg || msg.author?.bot) return;

				const chId = msg.channel_id || ev.channelId;
				const id = msg.id || ev.id;
				const orig = MessageStore.getMessage(chId, id) || ChannelMessages.get(chId)?.get(id);
				if (!orig?.author?.id || !orig.author.username) return;
				if (!orig.content && !orig.attachments?.length && !orig.embeds?.length) return;
				if (!msg.content || msg.content === orig.content) return;

				let prefix = "`[ EDITED ]`\n\n";

				ev.message = {
					...msg,
					content: `${orig.content} ${prefix}${msg.content}`,
					guild_id: ChannelStore.getChannel(chId)?.guild_id ?? msg.guild_id,
					edited_timestamp: "invalid_timestamp",
					message_reference: msg?.message_reference || orig?.messageReference || null,
				};
				return args;
			}
		} catch (e) {
			showToast("[ANTIED Zero] FluxDispatcher crash – check logs");
			console.error("[ANTIED Zero] Flux patch\n", e);
		}
	});
};
