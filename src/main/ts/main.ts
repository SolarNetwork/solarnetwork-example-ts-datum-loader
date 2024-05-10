import "../scss/style.scss";
import { Popover } from "bootstrap";
import { select } from "d3-selection";
import { Datum } from "solarnetwork-datum-loader";
import {
	loadData as snLoadData,
	lookupSources as snLookupSources,
	lookupDateRange as snLookupDateRange,
	setupSolarNetworkIntegration,
} from "./sn.ts";
import { SnSettingsFormElements } from "./forms";
import { replaceData } from "./utils";

const snSettingsForm =
	document.querySelector<HTMLFormElement>("#data-sn-settings")!;
const snSettings = snSettingsForm.elements as unknown as SnSettingsFormElements;

const loadDatumButton =
	document.querySelector<HTMLButtonElement>("#load-datum-button")!;

const lookupSourcesButton = document.querySelector<HTMLButtonElement>(
	"#lookup-sources-button"
)!;

const lookupDateRangeButton = document.querySelector<HTMLButtonElement>(
	"#lookup-date-range-button"
)!;

// populate app version and then display it
replaceData(document.querySelector<HTMLElement>("#app-version")!, {
	"app-version": APP_VERSION,
}).classList.add("d-md-block");

// enable popovers
document
	.querySelectorAll('[data-bs-toggle="popover"]')
	.forEach((el) => new Popover(el));

// lookup date range
lookupDateRangeButton.addEventListener("click", async () => {
	const range = await snLookupDateRange();
	if (range.sDate && range.eDate) {
		snSettings.startDate.valueAsDate = range.sDate;
		snSettings.endDate.valueAsDate = range.eDate;
	}
});

// lookup sources
lookupSourcesButton.addEventListener("click", async () => {
	const sources = await snLookupSources();
	const sourceIdSet = new Set<string>();
	for (const nodeId in sources) {
		const sIds = sources[nodeId];
		if (sIds) {
			for (const sourceId of sIds) {
				sourceIdSet.add(sourceId);
			}
		}
	}
	snSettings.snSourceIds.value = Array.from(sourceIdSet).join(", ");
});

setupSolarNetworkIntegration(snSettings);

snSettingsForm.addEventListener("change", () => {
	enableLookupDateRange();
	enableLookupSources();
	enableLoadDatum();
});

function enableLookupDateRange() {
	lookupDateRangeButton.disabled = !(
		snSettings.snToken.value &&
		snSettings.snTokenSecret.value &&
		snSettings.snNodeIds.value
	);
}

function enableLookupSources() {
	lookupSourcesButton.disabled = !(
		snSettings.snToken.value &&
		snSettings.snTokenSecret.value &&
		snSettings.snNodeIds.value
	);
}

function enableLoadDatum() {
	loadDatumButton.disabled = !(
		snSettings.snToken.value &&
		snSettings.snTokenSecret.value &&
		snSettings.snNodeIds.value &&
		snSettings.snSourceIds.value &&
		snSettings.startDate.valueAsDate &&
		snSettings.endDate.valueAsDate
	);
}

// load!
loadDatumButton.addEventListener("click", async () => {
	const loading = document.getElementById("loading");
	loading?.classList.remove("d-none");

	const container = select("#data-table-container");
	container.selectChildren().remove();

	const results = await snLoadData();

	// show how many datum loaded
	container
		.append("p")
		.append("small")
		.classed("text-secondary", true)
		.text(`Loaded ${results.length} datum.`);

	const table = container
		.append("table")
		.classed("table table-striped table-sm", true);
	const headerRow = table.append("thead").append("tr");
	const tableBody = table.append("tbody");

	// populate table rows, maintaining consistent column order
	const colOrder = new Map<string, number>([
		["created", 0],
		["nodeId", 1],
		["sourceId", 2],
	]);
	tableBody
		.selectAll("tr")
		.data<Datum>(results)
		.join("tr")
		.selectAll("td")
		.data((datum) => {
			const row = [] as any[];
			for (const key of Object.keys(datum)) {
				if (!colOrder.has(key)) {
					colOrder.set(key, colOrder.size);
				}
				let val = datum[key];
				const n = Number(val);
				if (!Number.isNaN(n)) {
					if (!Number.isInteger(n)) {
						val = Number(n.toFixed(3));
					}
				}
				row[colOrder.get(key)!] = val;
			}
			return row;
		})
		.join("td")
		.text((d) => d);

	const colNames = ["Date", "Node", "Source"];
	colNames.push(...Array.from(colOrder.keys()).slice(3));

	// populate header
	headerRow
		.selectAll("th")
		.data(colNames)
		.join("th")
		.text((d) => d);

	loading?.classList.add("d-none");
});
