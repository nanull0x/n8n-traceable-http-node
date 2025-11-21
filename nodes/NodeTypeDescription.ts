import type { INodeTypeDescription } from 'n8n-workflow';

export const HttpNodeTraceExporterDescription: INodeTypeDescription = {
        displayName: 'HTTP Trace Exporter (OTLP)',
        name: 'httpTraceExporterOtlp',
        group: ['transform'],
        version: 1,
        description:
            'Perform an HTTP request and export OpenTelemetry spans to OTLP endpoint',
        defaults: { name: 'HTTP Trace Exporter (OTLP)' },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
            {
                displayName: 'Request URL',
                name: 'url',
                type: 'string',
                default: '',
                required: true,
            },
            {
                displayName: 'Method',
                name: 'method',
                type: 'options',
                options: [
                    { name: 'GET', value: 'GET' },
                    { name: 'POST', value: 'POST' },
                    { name: 'PUT', value: 'PUT' },
                    { name: 'DELETE', value: 'DELETE' },
                ],
                default: 'GET',
            },
            {
                displayName: 'Body (JSON)',
                name: 'body',
                type: 'json',
                default: '{}',
                displayOptions: {
                    show: { method: ['POST', 'PUT'] },
                },
            },
            {
                displayName: 'OTLP Endpoint',
                name: 'otlpEndpoint',
                type: 'string',
                default: 'http://localhost:4318/v1/traces',
                description: 'Tempo/Jaeger/Datadog OTLP HTTP endpoint',
            },
            {
                displayName: 'Service Name',
                name: 'serviceName',
                type: 'string',
                default: 'n8n-http-node',
            },
            {
                displayName: 'Service Version',
                name: 'serviceVersion',
                type: 'string',
                default: '1.0',
            },
        ],
};