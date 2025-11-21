import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { HttpTraceExporter } from '../nodes/HttpTraceExporter.node';
import { OpentelemetryHttpTraceExporterImpl } from '../opentelemetry/OpentelemetryHttpTraceExporter';
import { HttpNodeTraceExporterDescription } from '../nodes/NodeTypeDescription';
// Mock the OpentelemetryHttpTraceExporterImpl
jest.mock('../opentelemetry/OpentelemetryHttpTraceExporter');

describe('HttpTraceExporter', () => {
  let node: HttpTraceExporter;
  let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
  let mockOtelInstance: jest.Mocked<OpentelemetryHttpTraceExporterImpl>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create node instance
    node = new HttpTraceExporter();

    // Create mock for OpentelemetryHttpTraceExporterImpl
    mockOtelInstance = {
      run: jest.fn().mockResolvedValue(undefined),
      parseNodeParameters: jest.fn()
    } as any;

    // Mock the constructor
    (OpentelemetryHttpTraceExporterImpl as jest.Mock).mockImplementation(() => mockOtelInstance);

    // Create mock for IExecuteFunctions
    mockExecuteFunctions = {
      getInputData: jest.fn(),
      getNodeParameter: jest.fn(),
      // Add other commonly used methods that might be needed
      getNode: jest.fn(),
      getWorkflow: jest.fn(),
      getMode: jest.fn(),
      getTimezone: jest.fn(),
      getWorkflowStaticData: jest.fn(),
      helpers: {} as any,
    } as unknown as jest.Mocked<IExecuteFunctions>;
  });

  describe('description', () => {
    it('should have the correct node type description', () => {
      expect(node.description).toBe(HttpNodeTraceExporterDescription);
    });
  });

  describe('execute', () => {
    it('should process a single item with default parameters', async () => {
      // Setup input data
      const inputData: INodeExecutionData[] = [
        { json: { test: 'data' } }
      ];

      mockExecuteFunctions.getInputData.mockReturnValue(inputData);
      
      // Setup parameter returns with defaults
      mockExecuteFunctions.getNodeParameter
        .mockImplementation((paramName: string, itemIndex: number, defaultValue?: any) => {
          const params: { [key: string]: any } = {
            'url': 'https://api.example.com/test',
            'method': 'GET',
            'body': {},
            'otlpEndpoint': 'http://localhost:4318/v1/traces',
            'serviceName': 'n8n-http-node',
            'serviceVersion': '1.0'
          };
          return params[paramName] || defaultValue;
        });

      // Execute
      const result = await node.execute.call(mockExecuteFunctions);

      // Verify OpentelemetryHttpTraceExporterImpl was instantiated
      expect(OpentelemetryHttpTraceExporterImpl).toHaveBeenCalledTimes(1);

      // Verify run was called with correct parameters
      expect(mockOtelInstance.run).toHaveBeenCalledWith(
        'n8n-http-node',
        '1.0',
        'http://localhost:4318/v1/traces',
        [{ 
          url: 'https://api.example.com/test', 
          method: 'GET', 
          body: {} 
        }]
      );

      // Verify result structure
      expect(result).toEqual([[{
        json: {
          url: 'https://api.example.com/test',
          method: 'GET',
          success: true
        }
      }]]);

      // Verify getNodeParameter was called for each parameter
      expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('url', 0, '');
      expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('method', 0, 'GET');
      expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('body', 0, {});
      expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('otlpEndpoint', 0, 'http://localhost:4318/v1/traces');
      expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('serviceName', 0, 'n8n-http-node');
      expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('serviceVersion', 0, '1.0');
    });

    it('should process multiple items', async () => {
      // Setup input data with multiple items
      const inputData: INodeExecutionData[] = [
        { json: { id: 1 } },
        { json: { id: 2 } },
        { json: { id: 3 } }
      ];

      mockExecuteFunctions.getInputData.mockReturnValue(inputData);

      // Setup parameter returns for each item
      mockExecuteFunctions.getNodeParameter
        .mockImplementation((paramName: string, itemIndex: number, defaultValue?: any) => {
          const baseParams: { [key: string]: any } = {
            'method': 'POST',
            'body': { item: itemIndex + 1 },
            'otlpEndpoint': 'http://localhost:4318/v1/traces',
            'serviceName': 'test-service',
            'serviceVersion': '2.0'
          };
          
          // URL changes per item
          if (paramName === 'url') {
            return `https://api.example.com/item${itemIndex + 1}`;
          }
          
          return baseParams[paramName] || defaultValue;
        });

      // Execute
      const result = await node.execute.call(mockExecuteFunctions);

      // Verify OpentelemetryHttpTraceExporterImpl was instantiated 3 times (once per item)
      expect(OpentelemetryHttpTraceExporterImpl).toHaveBeenCalledTimes(3);

      // Verify run was called 3 times with correct parameters for each item
      expect(mockOtelInstance.run).toHaveBeenCalledTimes(3);
      
      expect(mockOtelInstance.run).toHaveBeenNthCalledWith(1,
        'test-service',
        '2.0',
        'http://localhost:4318/v1/traces',
        [{ 
          url: 'https://api.example.com/item1', 
          method: 'POST', 
          body: { item: 1 } 
        }]
      );

      expect(mockOtelInstance.run).toHaveBeenNthCalledWith(2,
        'test-service',
        '2.0',
        'http://localhost:4318/v1/traces',
        [{ 
          url: 'https://api.example.com/item2', 
          method: 'POST', 
          body: { item: 2 } 
        }]
      );

      expect(mockOtelInstance.run).toHaveBeenNthCalledWith(3,
        'test-service',
        '2.0',
        'http://localhost:4318/v1/traces',
        [{ 
          url: 'https://api.example.com/item3', 
          method: 'POST', 
          body: { item: 3 } 
        }]
      );

      // Verify result contains all items
      expect(result).toEqual([[
        {
          json: {
            url: 'https://api.example.com/item1',
            method: 'POST',
            success: true
          }
        },
        {
          json: {
            url: 'https://api.example.com/item2',
            method: 'POST',
            success: true
          }
        },
        {
          json: {
            url: 'https://api.example.com/item3',
            method: 'POST',
            success: true
          }
        }
      ]]);
    });

    it('should handle POST request with body', async () => {
      const inputData: INodeExecutionData[] = [
        { json: { data: 'input' } }
      ];

      const requestBody = { 
        name: 'John Doe', 
        email: 'john@example.com',
        age: 30 
      };

      mockExecuteFunctions.getInputData.mockReturnValue(inputData);
      
      mockExecuteFunctions.getNodeParameter
        .mockImplementation((paramName: string, itemIndex: number, defaultValue?: any) => {
          const params: { [key: string]: any } = {
            'url': 'https://api.example.com/users',
            'method': 'POST',
            'body': requestBody,
            'otlpEndpoint': 'http://tempo:4318/v1/traces',
            'serviceName': 'user-service',
            'serviceVersion': '3.0'
          };
          return params[paramName] || defaultValue;
        });

      const result = await node.execute.call(mockExecuteFunctions);

      expect(mockOtelInstance.run).toHaveBeenCalledWith(
        'user-service',
        '3.0',
        'http://tempo:4318/v1/traces',
        [{ 
          url: 'https://api.example.com/users', 
          method: 'POST', 
          body: requestBody 
        }]
      );

      expect(result).toEqual([[{
        json: {
          url: 'https://api.example.com/users',
          method: 'POST',
          success: true
        }
      }]]);
    });

    it('should handle different HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      
      for (const method of methods) {
        jest.clearAllMocks();
        
        const inputData: INodeExecutionData[] = [
          { json: { test: method } }
        ];

        mockExecuteFunctions.getInputData.mockReturnValue(inputData);
        
        mockExecuteFunctions.getNodeParameter
          .mockImplementation((paramName: string, itemIndex: number, defaultValue?: any) => {
            const params: { [key: string]: any } = {
              'url': `https://api.example.com/${method.toLowerCase()}`,
              'method': method,
              'body': method === 'GET' || method === 'DELETE' ? {} : { data: 'test' },
              'otlpEndpoint': 'http://localhost:4318/v1/traces',
              'serviceName': 'n8n-http-node',
              'serviceVersion': '1.0'
            };
            return params[paramName] || defaultValue;
          });

        const result = await node.execute.call(mockExecuteFunctions);

        expect(mockOtelInstance.run).toHaveBeenCalledWith(
          'n8n-http-node',
          '1.0',
          'http://localhost:4318/v1/traces',
          [{ 
            url: `https://api.example.com/${method.toLowerCase()}`, 
            method: method, 
            body: method === 'GET' || method === 'DELETE' ? {} : { data: 'test' }
          }]
        );

        expect(result[0][0].json.method).toBe(method);
        expect(result[0][0].json.success).toBe(true);
      }
    });

    it('should handle empty input data', async () => {
      mockExecuteFunctions.getInputData.mockReturnValue([]);

      const result = await node.execute.call(mockExecuteFunctions);

      expect(OpentelemetryHttpTraceExporterImpl).not.toHaveBeenCalled();
      expect(mockOtelInstance.run).not.toHaveBeenCalled();
      expect(result).toEqual([[]]);
    });

    it('should handle custom OTLP endpoints', async () => {
      const customEndpoints = [
        'http://jaeger:4318/v1/traces',
        'https://tempo.example.com/v1/traces',
        'http://datadog-agent:4318/v1/traces'
      ];

      for (const endpoint of customEndpoints) {
        jest.clearAllMocks();
        
        const inputData: INodeExecutionData[] = [
          { json: { test: 'data' } }
        ];

        mockExecuteFunctions.getInputData.mockReturnValue(inputData);
        
        mockExecuteFunctions.getNodeParameter
          .mockImplementation((paramName: string, itemIndex: number, defaultValue?: any) => {
            const params: { [key: string]: any } = {
              'url': 'https://api.example.com/test',
              'method': 'GET',
              'body': {},
              'otlpEndpoint': endpoint,
              'serviceName': 'test-service',
              'serviceVersion': '1.0'
            };
            return params[paramName] || defaultValue;
          });

        await node.execute.call(mockExecuteFunctions);

        expect(mockOtelInstance.run).toHaveBeenCalledWith(
          'test-service',
          '1.0',
          endpoint,
          expect.any(Array)
        );
      }
    });

    it('should handle error from OpentelemetryHttpTraceExporterImpl', async () => {
      const inputData: INodeExecutionData[] = [
        { json: { test: 'data' } }
      ];

      mockExecuteFunctions.getInputData.mockReturnValue(inputData);
      
      mockExecuteFunctions.getNodeParameter
        .mockImplementation((paramName: string, itemIndex: number, defaultValue?: any) => {
          const params: { [key: string]: any } = {
            'url': 'https://api.example.com/test',
            'method': 'GET',
            'body': {},
            'otlpEndpoint': 'http://localhost:4318/v1/traces',
            'serviceName': 'n8n-http-node',
            'serviceVersion': '1.0'
          };
          return params[paramName] || defaultValue;
        });

      // Make run throw an error
      const error = new Error('Failed to export traces');
      mockOtelInstance.run.mockRejectedValue(error);

      // Execute should throw the error
      await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow('Failed to export traces');
    });

    it('should use default values when parameters are not provided', async () => {
      const inputData: INodeExecutionData[] = [
        { json: { test: 'data' } }
      ];

      mockExecuteFunctions.getInputData.mockReturnValue(inputData);
      
      // Return only URL, use defaults for everything else
      mockExecuteFunctions.getNodeParameter
        .mockImplementation((paramName: string, itemIndex: number, defaultValue?: any) => {
          if (paramName === 'url') {
            return 'https://api.example.com/default-test';
          }
          return defaultValue;
        });

      const result = await node.execute.call(mockExecuteFunctions);

      expect(mockOtelInstance.run).toHaveBeenCalledWith(
        'n8n-http-node',  // default serviceName
        '1.0',            // default serviceVersion
        'http://localhost:4318/v1/traces',  // default otlpEndpoint
        [{ 
          url: 'https://api.example.com/default-test', 
          method: 'GET',  // default method
          body: {}        // default body
        }]
      );

      expect(result).toEqual([[{
        json: {
          url: 'https://api.example.com/default-test',
          method: 'GET',
          success: true
        }
      }]]);
    });
  });
});