import { OpentelemetryHttpTraceExporterImpl } from '../opentelemetry/OpentelemetryHttpTraceExporter';
import axios from 'axios';
import { context, trace } from '@opentelemetry/api';
import { HttpTraceExporterNodeParameter } from '../nodes/interfaces/HttpTraceExporterNodeParametersInterface';

// ------------------------
// GLOBAL MOCK OBJECTS
// ------------------------
const mockSpan = {
  setAttribute: jest.fn(),
  recordException: jest.fn(),
  setStatus: jest.fn(),
  end: jest.fn(),
};

const mockTracer = {
  startSpan: jest.fn(() => mockSpan),
};

const mockProvider = {
  getTracer: jest.fn(() => mockTracer),
  register: jest.fn(),
  shutdown: jest.fn().mockResolvedValue(undefined),
};

const mockProcessor = {};
const mockOTLPExporter = {};

// -----------------------------------
// FIXED FACTORY MOCKS FOR OPENTELEMETRY
// -----------------------------------
jest.mock('@opentelemetry/sdk-trace-node', () => ({
  NodeTracerProvider: jest.fn().mockImplementation(() => mockProvider),
}));

jest.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: jest.fn().mockImplementation(() => mockOTLPExporter),
}));

jest.mock('@opentelemetry/sdk-trace-base', () => ({
  BatchSpanProcessor: jest.fn().mockImplementation(() => mockProcessor),
}));

jest.mock('@opentelemetry/resources', () => ({
  resourceFromAttributes: jest.fn(attrs => ({ attributes: attrs })),
}));

jest.mock('@opentelemetry/semantic-conventions', () => ({
  ATTR_SERVICE_NAME: 'service.name',
  ATTR_SERVICE_VERSION: 'service.version',
}));

// -----------------------------------
// AXIOS MOCK
// -----------------------------------
jest.mock('axios');
const mockedAxios = axios as unknown as jest.Mock;

// -----------------------------------
// CONTEXT + TRACE MOCKS
// -----------------------------------
(context as any).with = jest.fn((_, fn) => fn());
(context as any).active = jest.fn(() => ({}));
(trace as any).setSpan = jest.fn(() => ({}));

describe('OpentelemetryHttpTraceExporterImpl', () => {
  let exporter: OpentelemetryHttpTraceExporterImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    exporter = new OpentelemetryHttpTraceExporterImpl();
  });

  // ------------------------------------------------
  // TESTS
  // ------------------------------------------------
  describe('run method', () => {
    it('should throw error when no node parameters are provided', async () => {
      await expect(
        exporter.run('service', '1.0', 'http://localhost:4318/v1/traces', [])
      ).rejects.toThrow('No node parameters provided');

      await expect(
        exporter.run('service', '1.0', 'http://localhost:4318/v1/traces', undefined)
      ).rejects.toThrow('No node parameters provided');
    });

    it('should successfully execute HTTP request and create span', async () => {
      const nodeParameters: HttpTraceExporterNodeParameter[] = [
        { url: 'https://api.example.com/data', method: 'GET', body: undefined as any },
      ];

      mockedAxios.mockResolvedValue({
        status: 200,
        data: { success: true },
      });

      await exporter.run('test-service', '2.0', 'http://localhost:4318/v1/traces', nodeParameters);

      expect(mockTracer.startSpan).toHaveBeenCalledWith('HTTP GET', {
        attributes: {
          'http.method': 'GET',
          'http.url': 'https://api.example.com/data',
        },
      });

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('http.status_code', 200);
    });

    it('should handle POST request with body', async () => {
      const body = { name: 'John' };
      const nodeParameters: HttpTraceExporterNodeParameter[] = [
        { url: 'https://api.example.com/users', method: 'POST', body: body as any },
      ];

      mockedAxios.mockResolvedValue({ status: 201, data: { id: 10 } });

      await exporter.run('user-service', '1.0', 'http://localhost:4318/v1/traces', nodeParameters);

      expect(mockedAxios).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://api.example.com/users',
        data: body,
        validateStatus: expect.any(Function),
      });

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('http.status_code', 201);
    });

    it('should handle axios errors properly', async () => {
      const nodeParameters: HttpTraceExporterNodeParameter[] = [
        { url: 'https://api.example.com/error', method: 'GET', body: undefined as any },
      ];

      const error = new Error('Network error');
      mockedAxios.mockRejectedValue(error);

      await exporter.run('error-service', '1.0', 'http://localhost:4318/v1/traces', nodeParameters);

      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.setStatus).toHaveBeenCalled();
    });

    it('should use default service name + tracer name', async () => {
      const nodeParameters: HttpTraceExporterNodeParameter[] = [
        { url: 'https://api.example.com/default', method: 'GET', body: undefined as any },
      ];

      mockedAxios.mockResolvedValue({ status: 200, data: 'ok' });

      await exporter.run(undefined, undefined, undefined, nodeParameters);

      expect(mockProvider.getTracer).toHaveBeenCalledWith('n8n-http-tracer');
    });

    it('should record non-object response data', async () => {
      mockedAxios.mockResolvedValue({ status: 200, data: 'TEXT' });

      const nodeParameters: HttpTraceExporterNodeParameter[] = [
        { url: 'https://api.example.com/text', method: 'GET', body: undefined as any },
      ];

      await exporter.run('service', '1.0', 'url', nodeParameters);

      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        'http.response',
        JSON.stringify({ data: 'TEXT' })
      );
    });

    it('should only process the first node parameter', async () => {
      mockedAxios.mockResolvedValue({ status: 200, data: 'ok' });

      const nodeParameters: HttpTraceExporterNodeParameter[] = [
        { url: 'https://first.com', method: 'GET', body: undefined as any },
        { url: 'https://second.com', method: 'POST', body: { x: 1 } as any },
      ];

      await exporter.run('svc', '1.0', 'url', nodeParameters);

      expect(mockedAxios).toHaveBeenCalledTimes(1);
      expect(mockedAxios).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://first.com',
        data: undefined,
        validateStatus: expect.any(Function),
      });
    });

    it('validateStatus should accept all codes', async () => {
      mockedAxios.mockResolvedValue({ status: 404, data: 'not found' });

      const nodeParameters: HttpTraceExporterNodeParameter[] = [
        { url: 'x', method: 'GET', body: undefined as any },
      ];

      await exporter.run('svc', '1.0', 'url', nodeParameters);

      const axiosCall = mockedAxios.mock.calls[0][0];
      const validateStatus = axiosCall.validateStatus;

      expect(validateStatus(200)).toBe(true);
      expect(validateStatus(404)).toBe(true);
      expect(validateStatus(500)).toBe(true);
    });
  });

  describe('parseNodeParameters', () => {
    it('should parse correctly', async () => {
      const params: HttpTraceExporterNodeParameter[] = [
        { url: 'x', method: 'GET', body: undefined as any },
        { url: 'y', method: 'POST', body: { a: 1 } as any },
      ];

      const parsed = exporter.parseNodeParameters(params);
      expect(await parsed[0]).toEqual({ url: 'x', method: 'GET', body: undefined });
      expect(await parsed[1]).toEqual({ url: 'y', method: 'POST', body: { a: 1 } });
    });

    it('should return empty array on empty input', () => {
      expect(exporter.parseNodeParameters([])).toEqual([]);
    });

    it('should return undefined when undefined is passed', () => {
      expect(exporter.parseNodeParameters(undefined as any)).toBeUndefined();
    });
  });
});
