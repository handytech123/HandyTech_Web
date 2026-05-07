import * as fs from 'fs';
import * as path from 'path';

// Define the service interface based on the services.json structure
export interface Service {
  id: number;
  name: string;
  suggestedHours: number;
  description: string;
  active: boolean;
  category: string;
  showAsQuickPick?: boolean;
  quickPickOrder?: number;
}

// Cache configuration
interface ServiceCache {
  services: Service[];
  lastModified: number;
  filePath: string;
}

let serviceCache: ServiceCache | null = null;

/**
 * Get the path to the services.json file
 */
function getServicesFilePath(): string {
  return path.join(process.cwd(), 'server/data/services.json');
}

/**
 * Check if the cache is still valid based on file modification time
 */
function isCacheValid(): boolean {
  if (!serviceCache) return false;
  
  try {
    const stats = fs.statSync(serviceCache.filePath);
    return stats.mtimeMs === serviceCache.lastModified;
  } catch (error) {
    console.error('Error checking service file modification time:', error);
    return false;
  }
}

/**
 * Load services from the JSON file and cache them
 * Returns cached data if file hasn't been modified since last load
 */
export function loadServices(): Service[] {
  const filePath = getServicesFilePath();
  
  // Return cached services if cache is still valid
  if (serviceCache && isCacheValid()) {
    return serviceCache.services;
  }
  
  try {
    // Read file stats for caching
    const stats = fs.statSync(filePath);
    
    // Read and parse the services file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const services: Service[] = JSON.parse(fileContent);
    
    // Validate the service data structure
    const validatedServices = services.map((service, index) => {
      if (!service.id || typeof service.id !== 'number') {
        throw new Error(`Service at index ${index} has invalid id`);
      }
      if (!service.name || typeof service.name !== 'string') {
        throw new Error(`Service at index ${index} has invalid name`);
      }
      if (!service.suggestedHours || typeof service.suggestedHours !== 'number') {
        throw new Error(`Service at index ${index} has invalid suggestedHours`);
      }
      if (!service.description || typeof service.description !== 'string') {
        throw new Error(`Service at index ${index} has invalid description`);
      }
      if (typeof service.active !== 'boolean') {
        throw new Error(`Service at index ${index} has invalid active flag`);
      }
      if (!service.category || typeof service.category !== 'string') {
        throw new Error(`Service at index ${index} has invalid category`);
      }
      return service;
    });
    
    // Update cache
    serviceCache = {
      services: validatedServices,
      lastModified: stats.mtimeMs,
      filePath
    };
    
    console.log(`[SERVICES] Loaded ${validatedServices.length} services from ${filePath}`);
    return validatedServices;
    
  } catch (error) {
    console.error('Error loading services:', error);
    throw new Error(`Failed to load services: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a specific service by ID
 * Returns null if service is not found or not active
 */
export function getServiceById(id: number): Service | null {
  try {
    const services = loadServices();
    const service = services.find(s => s.id === id);
    
    if (!service) {
      return null;
    }
    
    // Only return active services
    if (!service.active) {
      return null;
    }
    
    return service;
  } catch (error) {
    console.error(`Error getting service by ID ${id}:`, error);
    return null;
  }
}

/**
 * Get all active services from the catalog
 * Returns only services where active = true
 */
export function listActiveServices(): Service[] {
  try {
    const services = loadServices();
    return services.filter(service => service.active);
  } catch (error) {
    console.error('Error listing active services:', error);
    return [];
  }
}

/**
 * Get services by category
 * Returns only active services in the specified category
 */
export function getServicesByCategory(category: string): Service[] {
  try {
    const services = listActiveServices();
    return services.filter(service => service.category === category);
  } catch (error) {
    console.error(`Error getting services by category ${category}:`, error);
    return [];
  }
}

export function listServices(): Service[] {
  return loadServices();
}

/**
 * Clear the service cache (useful for testing or forced reload)
 */
export function clearServiceCache(): void {
  serviceCache = null;
  console.log('[SERVICES] Cache cleared');
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): { isCached: boolean; lastModified: Date | null; serviceCount: number } {
  return {
    isCached: serviceCache !== null && isCacheValid(),
    lastModified: serviceCache ? new Date(serviceCache.lastModified) : null,
    serviceCount: serviceCache ? serviceCache.services.length : 0
  };
}