import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import {  Tracer  } from '@opentelemetry/api';

export interface CustomTracerProvider {
    tracer: Tracer;
    provider: NodeTracerProvider;
}