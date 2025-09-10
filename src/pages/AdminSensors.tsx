import React from 'react';
import { Activity, AlertTriangle, CheckCircle, Thermometer } from 'lucide-react';
import { useData } from '../context/DataContext';

const AdminSensors: React.FC = () => {
  const { sensors } = useData();

  const CircularProgressMeter: React.FC<{ 
    sensor: any;
    size?: number;
  }> = ({ sensor, size = 120 }) => {
    const percentage = (sensor.currentValue / sensor.thresholdValue) * 100;
    const radius = (size - 8) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const getStatusColor = () => {
      switch (sensor.status) {
        case 'critical':
          return { stroke: '#ef4444', bg: '#fee2e2', text: '#dc2626' };
        case 'warning':
          return { stroke: '#f59e0b', bg: '#fef3c7', text: '#d97706' };
        default:
          return { stroke: '#10b981', bg: '#dcfce7', text: '#059669' };
      }
    };

    const colors = getStatusColor();

    return (
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.stroke}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-xl font-bold ${colors.text}`}>
            {sensor.currentValue}
          </span>
          <span className="text-xs text-gray-500 font-medium">
            {sensor.unit}
          </span>
          <span className="text-xs text-gray-400">
            / {sensor.thresholdValue}
          </span>
        </div>
      </div>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <Thermometer className="h-5 w-5 text-yellow-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getSensorTypeIcon = (type: string) => {
    return <Activity className="h-6 w-6 text-blue-500" />;
  };

  const criticalSensors = sensors.filter(s => s.status === 'critical');
  const warningSensors = sensors.filter(s => s.status === 'warning');
  const normalSensors = sensors.filter(s => s.status === 'normal');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sensor Monitoring</h1>
            <p className="text-gray-600 dark:text-gray-300">Real-time monitoring of facility sensors</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Critical</p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">{criticalSensors.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Warning</p>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{warningSensors.length}</p>
              </div>
              <Thermometer className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Normal</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{normalSensors.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{sensors.length}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Sensor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sensors.map((sensor) => (
          <div key={sensor.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border-2 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
            {/* Sensor Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                {getSensorTypeIcon(sensor.type)}
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{sensor.name}</h3>
              </div>
              {getStatusIcon(sensor.status)}
            </div>

            {/* Circular Progress Meter */}
            <div className="flex justify-center mb-4">
              <CircularProgressMeter sensor={sensor} />
            </div>

            {/* Sensor Info */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Type:</span>
                <span className="text-gray-900 dark:text-white capitalize font-medium">
                  {sensor.type.replace('-', ' ')}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Current:</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {sensor.currentValue} {sensor.unit}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Threshold:</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {sensor.thresholdValue} {sensor.unit}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Variance:</span>
                <span className={`font-medium ${
                  sensor.currentValue > sensor.thresholdValue 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  {sensor.currentValue > sensor.thresholdValue ? '+' : ''}
                  {sensor.currentValue - sensor.thresholdValue} {sensor.unit}
                </span>
              </div>
            </div>

            {/* Status Badge */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  sensor.status === 'critical' 
                    ? 'bg-red-100 text-red-800'
                    : sensor.status === 'warning'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {sensor.status.toUpperCase()}
                </span>
                <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                  View History
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Critical Alerts */}
      {criticalSensors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">Critical Alerts</h2>
          </div>
          <div className="space-y-3">
            {criticalSensors.map((sensor) => (
              <div key={sensor.id} className="bg-white rounded-lg p-4 border border-red-300">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-red-900">{sensor.name}</h3>
                    <p className="text-red-700 text-sm">
                      Current value ({sensor.currentValue} {sensor.unit}) exceeds threshold ({sensor.thresholdValue} {sensor.unit})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-red-900 font-bold">
                      +{sensor.currentValue - sensor.thresholdValue} {sensor.unit}
                    </span>
                    <p className="text-red-600 text-xs">Over threshold</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSensors;