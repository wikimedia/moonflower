export interface WikiCard {
	pageId: number;
	title: string;
	extract: string;
}

export interface ClaimedCard extends WikiCard {
	ownerId: string;
	claimedAt: Date;
}
