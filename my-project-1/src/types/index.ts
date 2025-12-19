// src/types/index.ts

// Define a type for a User object
export interface User {
    id: string;
    name: string;
    email: string;
}

// Define a type for a Response object
export interface Response<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// Define a type for a generic API request
export interface ApiRequest<T> {
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: T;
}

// Define a type for application settings
export interface AppSettings {
    environment: 'development' | 'production';
    port: number;
}

// Add any additional types or interfaces as needed