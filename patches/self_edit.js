import { before } from "@vendetta/patcher";
import { findByProps } from '@vendetta/metro';
import { regexEscaper, isEnabled } from "..";

export default () => {
	const Message = findByProps("sendMessage", "startEditMessage");
	if (!Message) {
		console.error("[ANTIED Zero] self_edit: Message module not found, skipping patch");
		return () => {};
	}

	return before('startEditMessage', Message, (args) => {
		try {
			if (!isEnabled) return;
			const [, , msg] = args;
			if (typeof msg !== "string") return;

			const DAN = regexEscaper("`[ EDITED ]`\n\n");
			const regexPattern = new RegExp(DAN, 'gmi');
			const lats = msg.split(regexPattern);
			args[2] = lats[lats.length - 1];
		} catch (e) {
			console.error("[ANTIED Zero] self_edit patch\n", e);
		}
	});
};
