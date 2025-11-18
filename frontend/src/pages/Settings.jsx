// frontend/src/pages/Settings.jsx
import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Mail, Lock, User, Palette, Database, Download } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: false,
      orderUpdates: true,
      paymentAlerts: true
    },
    display: {
      theme: 'light',
      language: 'es',
      currency: 'CLP'
    },
    business: {
      companyName: 'Mi Empresa de Diseño',
      email: 'contacto@empresa.cl',
      phone: '+56 9 1234 5678'
    }
  });

  const handleToggle = (category, key) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category][key]
      }
    }));
  };

  const handleChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleSave = () => {
    // TODO: Implementar guardado de configuración
    alert('Configuración guardada exitosamente');
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 mt-1">Personaliza tu experiencia en la plataforma</p>
      </div>

      {/* Información del Negocio */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-gray-700" />
          <h2 className="text-xl font-bold text-gray-900">Información del Negocio</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Empresa</label>
            <input
              type="text"
              value={settings.business.companyName}
              onChange={(e) => handleChange('business', 'companyName', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
            <input
              type="email"
              value={settings.business.email}
              onChange={(e) => handleChange('business', 'email', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              type="tel"
              value={settings.business.phone}
              onChange={(e) => handleChange('business', 'phone', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Notificaciones */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-gray-700" />
          <h2 className="text-xl font-bold text-gray-900">Notificaciones</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Notificaciones por Email</p>
              <p className="text-sm text-gray-500">Recibe actualizaciones por correo electrónico</p>
            </div>
            <button
              onClick={() => handleToggle('notifications', 'email')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.notifications.email ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notifications.email ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Actualizaciones de Pedidos</p>
              <p className="text-sm text-gray-500">Notificar cuando cambie el estado de un pedido</p>
            </div>
            <button
              onClick={() => handleToggle('notifications', 'orderUpdates')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.notifications.orderUpdates ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notifications.orderUpdates ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Alertas de Pago</p>
              <p className="text-sm text-gray-500">Notificar cuando se registre un nuevo pago</p>
            </div>
            <button
              onClick={() => handleToggle('notifications', 'paymentAlerts')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.notifications.paymentAlerts ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notifications.paymentAlerts ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Apariencia */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-gray-700" />
          <h2 className="text-xl font-bold text-gray-900">Apariencia</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tema</label>
            <select
              value={settings.display.theme}
              onChange={(e) => handleChange('display', 'theme', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
              <option value="auto">Automático</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Idioma</label>
            <select
              value={settings.display.language}
              onChange={(e) => handleChange('display', 'language', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Moneda</label>
            <select
              value={settings.display.currency}
              onChange={(e) => handleChange('display', 'currency', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="CLP">Peso Chileno (CLP)</option>
              <option value="USD">Dólar Americano (USD)</option>
              <option value="EUR">Euro (EUR)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Base de Datos */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-gray-700" />
          <h2 className="text-xl font-bold text-gray-900">Base de Datos</h2>
        </div>
        <div className="space-y-3">
          <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-gray-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Exportar Datos</p>
                <p className="text-sm text-gray-500">Descargar una copia de todos tus datos</p>
              </div>
            </div>
            <span className="text-sm text-blue-600 font-medium">Próximamente</span>
          </button>

          <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Respaldo Automático</p>
                <p className="text-sm text-gray-500">Configurar copias de seguridad periódicas</p>
              </div>
            </div>
            <span className="text-sm text-blue-600 font-medium">Próximamente</span>
          </button>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex gap-4">
        <button
          onClick={handleSave}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Guardar Cambios
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Cancelar
        </button>
      </div>

      {/* Nota informativa */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <p className="font-medium">⚙️ Configuración en Desarrollo</p>
        <p className="mt-1 text-blue-600">
          Esta sección está en construcción. Algunas funcionalidades estarán disponibles próximamente.
          Los cambios realizados se guardarán localmente en tu navegador.
        </p>
      </div>
    </div>
  );
}
