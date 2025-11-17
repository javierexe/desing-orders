/**
 * Servicio de keepalive para mantener el backend de Render despierto
 * 
 * Render tier gratuito apaga el servicio después de 15 minutos de inactividad.
 * Este servicio hace ping al endpoint /health cada 10 minutos mientras la app esté abierta.
 */

const KEEPALIVE_INTERVAL = 10 * 60 * 1000; // 10 minutos en milisegundos
const HEALTH_ENDPOINT = '/health';

let intervalId = null;

/**
 * Inicia el servicio de keepalive
 */
export function startKeepalive() {
  // Si ya está corriendo, no iniciar otro intervalo
  if (intervalId) {
    console.log('⏰ Keepalive ya está activo');
    return;
  }

  console.log('🚀 Iniciando keepalive del backend (ping cada 10 min)');

  // Hacer ping inicial inmediato
  pingBackend();

  // Configurar ping periódico
  intervalId = setInterval(() => {
    pingBackend();
  }, KEEPALIVE_INTERVAL);
}

/**
 * Detiene el servicio de keepalive
 */
export function stopKeepalive() {
  if (intervalId) {
    console.log('🛑 Deteniendo keepalive del backend');
    clearInterval(intervalId);
    intervalId = null;
  }
}

/**
 * Hace ping al backend para mantenerlo despierto
 */
async function pingBackend() {
  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const url = `${baseUrl}${HEALTH_ENDPOINT}`;
    
    const response = await fetch(url, {
      method: 'GET',
      // No esperamos respuesta, solo queremos despertar el backend
      signal: AbortSignal.timeout(5000), // Timeout de 5 segundos
    });

    if (response.ok) {
      console.log('💚 Keepalive ping exitoso');
    } else {
      console.warn('⚠️ Keepalive ping falló:', response.status);
    }
  } catch (error) {
    // No mostrar error en desarrollo (el backend puede estar en otra URL)
    if (import.meta.env.PROD) {
      console.error('❌ Error en keepalive ping:', error.message);
    }
  }
}
