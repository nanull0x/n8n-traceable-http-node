import { IExecuteFunctions } from 'n8n-workflow';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';

import { OpentelemetryHttpTraceExporterImpl } from '../opentelemetry/OpentelemetryHttpTraceExporter';
import { HttpNodeTraceExporterDescription } from './NodeTypeDescription';

export class HttpTraceExporter implements INodeType {
	
	description: INodeTypeDescription =  HttpNodeTraceExporterDescription;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const results: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const url = this.getNodeParameter('url', i, '') as string;
			const method = this.getNodeParameter('method', i, 'GET') as string;
			const body = this.getNodeParameter('body', i, {}) as IDataObject;
			const otlpEndpoint = this.getNodeParameter('otlpEndpoint', i, 'http://localhost:4318/v1/traces') as string;
			const serviceName = this.getNodeParameter('serviceName', i, 'n8n-http-node') as string;
			const serviceVersion = this.getNodeParameter('serviceVersion', i, '1.0') as string;

			const otel = new OpentelemetryHttpTraceExporterImpl();

			await otel.run(
			serviceName,
			serviceVersion,
			otlpEndpoint,
			[{ url, method, body }],
			);

			results.push({ json: { url, method, success: true } });
		}

		return [results];
	}

}
