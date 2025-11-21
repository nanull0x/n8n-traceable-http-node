import { IDataObject } from 'n8n-workflow';

export interface HttpTraceExporterNodeParameter {
	url: string;
	method: string;
	body: IDataObject;
}
