import axios from 'axios';
import { context, trace, SpanStatusCode } from '@opentelemetry/api';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpTraceExporterNodeParameter } from '../nodes/interfaces/HttpTraceExporterNodeParametersInterface';
import { CustomTracerProvider } from '../nodes/interfaces/NodeTracerProviderInterface';

export class OpentelemetryHttpTraceExporterImpl {
	constructor() {}

	public async run(
		serviceName?: string,
		serviceVersion?: string,
		otlpEndpoint?: string,
		nodeParameters?: HttpTraceExporterNodeParameter[],
	): Promise<void> {
		if (!nodeParameters || nodeParameters.length === 0) {
			throw new Error('No node parameters provided');
		}

		const { url, method, body } = await (this.parseNodeParameters(nodeParameters))[0];
		const CUSTOM_TRACER_PROVIDER = this.createTraceProvider(serviceName,serviceVersion, otlpEndpoint)

		const span = CUSTOM_TRACER_PROVIDER.tracer.startSpan(`HTTP ${method}`, {
			attributes: {
				'http.method': method,
				'http.url': url,
			},
		});

		await context.with(trace.setSpan(context.active(), span), async () => {
			try {
				const response = await axios({
					method,
					url,
					data: body,
					validateStatus: () => true,
				});

				const status: number = response.status;
				const responseData: any =
					typeof response.data === 'object' ? response.data : { data: response.data };

				span.setAttribute('http.status_code', status);
				span.setAttribute('http.response', JSON.stringify(responseData));
			} catch (error: unknown) {
				const spanError = {
					error: error instanceof Error ? error.message : 'Unknown error',
				};
				span.recordException(error as Error);
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: 'HTTP request failed',
				});
				span.setAttribute('http.response', JSON.stringify(spanError));
			} finally {
				span.end();
			}
		});

		await CUSTOM_TRACER_PROVIDER.provider.shutdown();
	}

	parseNodeParameters(nodeParameters: HttpTraceExporterNodeParameter[]): Promise<HttpTraceExporterNodeParameter>[] {
		const parameters = nodeParameters?.map(async (nodeParam) => {
			const url = nodeParam.url;
			const method = nodeParam.method;
			const body = nodeParam.body;
			return { url, method, body };
		});
		return parameters;
	}

	createTraceProvider(
		serviceName?: string,
		serviceVersion?: string,
		otlpEndpoint?: string
	): CustomTracerProvider {

		const exporter = new OTLPTraceExporter({ url: otlpEndpoint });
		const processor = new BatchSpanProcessor(exporter);

		const resource = resourceFromAttributes({
			[ATTR_SERVICE_NAME]: serviceName || 'n8n-http-node',
			[ATTR_SERVICE_VERSION]: serviceVersion || '1.0',
		});

		const provider = new NodeTracerProvider({
			resource,
			spanProcessors: [processor],
		});

		provider.register();

		const tracer = provider.getTracer(serviceName || 'n8n-http-tracer');

		return {
			tracer,
			provider
		};
	}

}