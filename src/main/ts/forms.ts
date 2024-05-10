export interface SnSettingsFormElements extends HTMLFormControlsCollection {
	snToken: HTMLInputElement;
	snTokenSecret: HTMLInputElement;
	snNodeIds: HTMLInputElement;
	snSourceIds: HTMLInputElement;
	startDate: HTMLInputElement;
	endDate: HTMLInputElement;
	aggregation: HTMLSelectElement;
	snDataStyle: RadioNodeList;
}
