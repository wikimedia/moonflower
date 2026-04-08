interface ToastMessage {
	id: number;
	message: string;
	type: 'info' | 'error';
}

let toasts = $state<ToastMessage[]>([]);
let nextId = 0;

export const toastStore = {
	get items() {
		return toasts;
	},
	show(message: string, type: 'info' | 'error' = 'info') {
		const id = nextId++;
		toasts = [...toasts, { id, message, type }];
		setTimeout(() => {
			toasts = toasts.filter((t) => t.id !== id);
		}, 3000);
	}
};
