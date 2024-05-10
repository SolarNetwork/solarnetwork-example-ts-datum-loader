import { Aggregation, DatumFilter } from "solarnetwork-api-core/lib/domain";
import {
	AuthorizationV2Builder,
	SolarQueryApi,
} from "solarnetwork-api-core/lib/net";

import {
	Datum,
	DatumLoader,
	DatumRange,
	DatumRangeFinder,
	DatumSourceFinder,
	NodeSources,
} from "solarnetwork-datum-loader";

import { SnSettingsFormElements } from "./forms";

const api = new SolarQueryApi();
const auth = new AuthorizationV2Builder();
let settingsForm: SnSettingsFormElements;

export function setupSolarNetworkIntegration(form: SnSettingsFormElements) {
	settingsForm = form;
	auth.tokenId = settingsForm.snToken.value;

	// track token/token secret changes to update auth builder
	settingsForm.snToken.addEventListener("change", () => {
		auth.tokenId = settingsForm.snToken.value;
		if (settingsForm.snTokenSecret.value) {
			auth.saveSigningKey(settingsForm.snTokenSecret.value);
		}
	});
	settingsForm.snTokenSecret.addEventListener("change", () => {
		auth.saveSigningKey(settingsForm.snTokenSecret.value);
	});
}

/**
 * Lookup a min/max date range based on the node IDs in the form.
 * @returns datum range
 */
export function lookupDateRange(): Promise<DatumRange> {
	const nodeIdStrs = settingsForm.snNodeIds.value.split(/\s*,\s*/);
	const filters = [] as DatumFilter[];
	for (const nodeIdStr of nodeIdStrs) {
		const nodeId = Number(nodeIdStr);
		if (!isNaN(nodeId)) {
			const filter = new DatumFilter();
			filter.nodeId = nodeId;
			filters.push(filter);
		}
	}
	if (filters.length < 1) {
		return Promise.reject(new Error("Node ID not provided."));
	}

	return new DatumRangeFinder(api, filters, auth).fetch();
}

/**
 * Lookup the available source IDs based on the _first_ node
 * and source ID values, and the start/end dates, in the form.
 * @returns the sources
 */
export function lookupSources(): Promise<NodeSources> {
	const nodeIdStrs = settingsForm.snNodeIds.value.split(/\s*,\s*/);
	if (nodeIdStrs.length < 1) {
		return Promise.reject(new Error("Node ID not provided."));
	}
	const sourceIds = settingsForm.snSourceIds.value.split(/\s*,\s*/);
	if (sourceIds.length < 1) {
		return Promise.reject(new Error("Source ID not provided."));
	}

	const filter = new DatumFilter();
	filter.nodeId = Number(nodeIdStrs[0]);
	filter.sourceId = sourceIds[0];
	if (settingsForm.startDate.valueAsDate) {
		filter.startDate = settingsForm.startDate.valueAsDate;
	}
	if (settingsForm.endDate.valueAsDate) {
		filter.endDate = settingsForm.endDate.valueAsDate;
	}

	return new DatumSourceFinder(api, filter, auth).fetch();
}

export async function loadData(): Promise<Datum[]> {
	const nodeIdStrs = settingsForm.snNodeIds.value.split(/\s*,\s*/);
	const sourceIds = settingsForm.snSourceIds.value.split(/\s*,\s*/);
	if (sourceIds.length < 1) {
		return Promise.reject(new Error("Source ID not provided."));
	}

	const startDate = settingsForm.startDate.valueAsDate;
	const endDate = settingsForm.endDate.valueAsDate;
	const aggregation = Aggregation.valueOf(
		settingsForm.aggregation.value
	) as Aggregation;

	const nodeIds = [] as number[];
	for (const nodeIdStr of nodeIdStrs) {
		const nodeId = Number(nodeIdStr);
		if (!isNaN(nodeId)) {
			nodeIds.push(nodeId);
		}
	}
	if (nodeIds.length < 1) {
		return Promise.reject(new Error("Node ID not provided."));
	}

	const filter = new DatumFilter();
	filter.aggregation = aggregation;
	filter.nodeIds = nodeIds;
	filter.sourceIds = sourceIds;
	filter.startDate = startDate;
	filter.endDate = endDate;

	return new DatumLoader(api, filter, auth)
		.readings(settingsForm.snDataStyle.value === "reading")
		.fetch();
}
